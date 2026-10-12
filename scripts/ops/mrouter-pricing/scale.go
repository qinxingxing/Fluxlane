package main

import (
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/pkg/billingexpr"
	"github.com/expr-lang/expr/ast"
	"github.com/expr-lang/expr/parser"
	"github.com/shopspring/decimal"
)

// priceVars 是档位价格表达式里的 $/1M tokens 系数变量。
// len 只用于分档条件，不在此列，缩放时不能改它。
var priceVars = map[string]struct{}{
	"p": {}, "c": {}, "cr": {}, "cc": {}, "cc1h": {},
	"img": {}, "img_o": {}, "ai": {}, "ao": {},
}

var priceVarOrder = []struct {
	key   string
	label string
}{
	{"p", "输入"},
	{"c", "输出"},
	{"cr", "缓存读"},
	{"cc", "缓存写"},
	{"cc1h", "缓存写1h"},
	{"img", "图片输入"},
	{"img_o", "图片输出"},
	{"ai", "音频输入"},
	{"ao", "音频输出"},
}

// TierQuote 是一个 tier() 档位里各价格变量的系数，单位 $/1M tokens。
type TierQuote struct {
	Label  string
	Coeffs map[string]decimal.Decimal
}

type coeffEdit struct {
	from    int
	to      int
	literal string
}

type replacement struct {
	from int
	to   int
	text string
}

// ScaleOfficialExpr 用 billingexpr 同一套 expr 解析器读取官方表达式，
// 把每个 tier() 价格体里的价格系数乘以 factor，再按原文字位置写回。
// 分档阈值（如 len <= 200000）和 tier 之外的请求规则乘数保持原样。
func ScaleOfficialExpr(expr string, factor decimal.Decimal) (string, []TierQuote, error) {
	if factor.Sign() <= 0 {
		return "", nil, fmt.Errorf("系数必须是正数")
	}
	quotes, err := ParseTierQuotes(expr)
	if err != nil {
		return "", nil, err
	}
	scaled := scaleQuotes(quotes, factor)

	prefix, body, edits, err := priceEdits(expr)
	if err != nil {
		return "", nil, err
	}
	reps := make([]replacement, len(edits))
	for i, edit := range edits {
		value, err := decimal.NewFromString(edit.literal)
		if err != nil {
			return "", nil, fmt.Errorf("价格系数 %q 无法解析", edit.literal)
		}
		text, err := formatCoeff(value.Mul(factor))
		if err != nil {
			return "", nil, err
		}
		reps[i] = replacement{from: edit.from, to: edit.to, text: text}
	}
	rewritten, err := spliceRunes(body, reps)
	if err != nil {
		return "", nil, err
	}
	result := prefix + rewritten
	if err := compileAndSmoke(result); err != nil {
		return "", nil, err
	}
	got, err := ParseTierQuotes(result)
	if err != nil {
		return "", nil, err
	}
	if err := quotesEqual(got, scaled); err != nil {
		return "", nil, fmt.Errorf("缩放后的表达式与系数不一致: %w", err)
	}
	return result, scaled, nil
}

// ParseTierQuotes 解析表达式中每个 tier() 的价格系数，不修改原文字。
func ParseTierQuotes(expr string) ([]TierQuote, error) {
	_, _, quotes, _, err := inspectExpr(expr)
	if err != nil {
		return nil, err
	}
	return quotes, nil
}

func priceEdits(expr string) (string, string, []coeffEdit, error) {
	prefix, body, _, edits, err := inspectExpr(expr)
	return prefix, body, edits, err
}

func inspectExpr(expr string) (string, string, []TierQuote, []coeffEdit, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return "", "", nil, nil, fmt.Errorf("表达式为空")
	}
	version, body := billingexpr.ParseExprVersion(expr)
	if version != billingexpr.DefaultExprVersion {
		return "", "", nil, nil, fmt.Errorf("不支持的表达式版本 %d", version)
	}
	prefix := ""
	if strings.HasPrefix(expr, "v1:") {
		prefix = "v1:"
		if body != expr[len("v1:"):] {
			return "", "", nil, nil, fmt.Errorf("表达式版本前缀无法分离")
		}
	} else if body != expr {
		return "", "", nil, nil, fmt.Errorf("表达式版本前缀无法分离")
	}

	tree, err := parser.Parse(body)
	if err != nil {
		return "", "", nil, nil, fmt.Errorf("解析表达式失败: %w", err)
	}
	quotes, edits, err := walkNode(tree.Node, body)
	if err != nil {
		return "", "", nil, nil, err
	}
	if len(quotes) == 0 {
		return "", "", nil, nil, fmt.Errorf("表达式里没有 tier() 档位，拒绝按 0 定价")
	}
	return prefix, body, quotes, edits, nil
}

func walkNode(node ast.Node, src string) ([]TierQuote, []coeffEdit, error) {
	if node == nil {
		return nil, nil, fmt.Errorf("表达式为空")
	}
	var quotes []TierQuote
	var edits []coeffEdit
	err := visit(node, src, &quotes, &edits)
	if err != nil {
		return nil, nil, err
	}
	seen := make(map[string]struct{}, len(quotes))
	for _, quote := range quotes {
		if _, ok := seen[quote.Label]; ok {
			return nil, nil, fmt.Errorf("档位名称 %q 重复", quote.Label)
		}
		seen[quote.Label] = struct{}{}
		if len(quote.Coeffs) == 0 {
			return nil, nil, fmt.Errorf("档位 %q 没有价格系数", quote.Label)
		}
	}
	return quotes, edits, nil
}

func visit(node ast.Node, src string, quotes *[]TierQuote, edits *[]coeffEdit) error {
	switch n := node.(type) {
	case *ast.NilNode, *ast.IdentifierNode, *ast.IntegerNode, *ast.FloatNode, *ast.BoolNode, *ast.StringNode:
		return nil
	case *ast.UnaryNode:
		return visit(n.Node, src, quotes, edits)
	case *ast.BinaryNode:
		if err := visit(n.Left, src, quotes, edits); err != nil {
			return err
		}
		return visit(n.Right, src, quotes, edits)
	case *ast.CallNode:
		if id, ok := n.Callee.(*ast.IdentifierNode); ok && id.Value == "tier" {
			quote, tierEdits, err := collectTier(n, src)
			if err != nil {
				return err
			}
			*quotes = append(*quotes, quote)
			*edits = append(*edits, tierEdits...)
			return nil
		}
		if err := visit(n.Callee, src, quotes, edits); err != nil {
			return err
		}
		for _, arg := range n.Arguments {
			if err := visit(arg, src, quotes, edits); err != nil {
				return err
			}
		}
		return nil
	case *ast.BuiltinNode:
		for _, arg := range n.Arguments {
			if err := visit(arg, src, quotes, edits); err != nil {
				return err
			}
		}
		return nil
	case *ast.ConditionalNode:
		if err := visit(n.Cond, src, quotes, edits); err != nil {
			return err
		}
		if err := visit(n.Exp1, src, quotes, edits); err != nil {
			return err
		}
		return visit(n.Exp2, src, quotes, edits)
	default:
		return fmt.Errorf("表达式含有无法缩放的语法 %T", node)
	}
}

func collectTier(call *ast.CallNode, src string) (TierQuote, []coeffEdit, error) {
	if len(call.Arguments) != 2 {
		return TierQuote{}, nil, fmt.Errorf("tier() 必须是 tier(名称, 价格表达式)")
	}
	name, ok := call.Arguments[0].(*ast.StringNode)
	if !ok || strings.TrimSpace(name.Value) == "" {
		return TierQuote{}, nil, fmt.Errorf("tier() 名称必须是非空字符串")
	}
	quote := TierQuote{Label: name.Value, Coeffs: map[string]decimal.Decimal{}}
	edits, err := collectCost(call.Arguments[1], src, quote.Coeffs)
	if err != nil {
		return TierQuote{}, nil, fmt.Errorf("档位 %q: %w", name.Value, err)
	}
	return quote, edits, nil
}

func collectCost(node ast.Node, src string, coeffs map[string]decimal.Decimal) ([]coeffEdit, error) {
	binary, ok := node.(*ast.BinaryNode)
	if !ok {
		return nil, fmt.Errorf("价格表达式必须是价格变量乘系数之和，实际为 %s", node.String())
	}
	if binary.Operator == "+" {
		left, err := collectCost(binary.Left, src, coeffs)
		if err != nil {
			return nil, err
		}
		right, err := collectCost(binary.Right, src, coeffs)
		if err != nil {
			return nil, err
		}
		return append(left, right...), nil
	}
	if binary.Operator != "*" {
		return nil, fmt.Errorf("价格表达式不支持运算符 %q", binary.Operator)
	}
	edit, err := collectProduct(binary, src, coeffs)
	if err != nil {
		return nil, err
	}
	return []coeffEdit{edit}, nil
}

func collectProduct(n *ast.BinaryNode, src string, coeffs map[string]decimal.Decimal) (coeffEdit, error) {
	variable, num, ok := priceProduct(n)
	if !ok {
		return coeffEdit{}, fmt.Errorf("价格项必须是「价格变量 * 数字」，实际为 %s", n.String())
	}
	if _, exists := coeffs[variable]; exists {
		return coeffEdit{}, fmt.Errorf("变量 %s 重复定价", variable)
	}
	literal, err := runeSlice(src, num.Location().From, num.Location().To)
	if err != nil {
		return coeffEdit{}, err
	}
	value, err := decimal.NewFromString(literal)
	if err != nil {
		return coeffEdit{}, fmt.Errorf("价格系数位置 %d:%d 不是数字 %q", num.Location().From, num.Location().To, literal)
	}
	if err := coeffMatchesNode(value, num); err != nil {
		return coeffEdit{}, err
	}
	if value.Sign() <= 0 {
		return coeffEdit{}, fmt.Errorf("价格系数必须为正数，%s = %s", variable, literal)
	}
	coeffs[variable] = value
	return coeffEdit{from: num.Location().From, to: num.Location().To, literal: literal}, nil
}

func priceProduct(n *ast.BinaryNode) (string, ast.Node, bool) {
	if name, ok := priceIdent(n.Left); ok && isNumberNode(n.Right) {
		return name, n.Right, true
	}
	if name, ok := priceIdent(n.Right); ok && isNumberNode(n.Left) {
		return name, n.Left, true
	}
	return "", nil, false
}

func priceIdent(node ast.Node) (string, bool) {
	id, ok := node.(*ast.IdentifierNode)
	if !ok {
		return "", false
	}
	if _, ok := priceVars[id.Value]; !ok {
		return "", false
	}
	return id.Value, true
}

func isNumberNode(node ast.Node) bool {
	switch node.(type) {
	case *ast.IntegerNode, *ast.FloatNode:
		return true
	default:
		return false
	}
}

func coeffMatchesNode(value decimal.Decimal, node ast.Node) error {
	switch n := node.(type) {
	case *ast.IntegerNode:
		if !value.Equal(decimal.NewFromInt(int64(n.Value))) {
			return fmt.Errorf("整数系数 %s 与语法节点 %d 不一致", value, n.Value)
		}
	case *ast.FloatNode:
		asFloat, _ := value.Float64()
		if math.Abs(asFloat-n.Value) > 1e-9*math.Max(1, math.Abs(n.Value)) {
			return fmt.Errorf("小数系数 %s 与语法节点 %v 不一致", value, n.Value)
		}
	default:
		return fmt.Errorf("价格系数不是数字")
	}
	return nil
}

func scaleQuotes(quotes []TierQuote, factor decimal.Decimal) []TierQuote {
	scaled := make([]TierQuote, len(quotes))
	for i, quote := range quotes {
		coeffs := make(map[string]decimal.Decimal, len(quote.Coeffs))
		for key, value := range quote.Coeffs {
			coeffs[key] = value.Mul(factor)
		}
		scaled[i] = TierQuote{Label: quote.Label, Coeffs: coeffs}
	}
	return scaled
}

func formatCoeff(value decimal.Decimal) (string, error) {
	if value.Sign() <= 0 {
		return "", fmt.Errorf("缩放后的价格系数不是正数: %s", value)
	}
	text := value.String()
	if strings.ContainsAny(text, "eE") {
		text = strings.TrimRight(strings.TrimRight(value.StringFixed(12), "0"), ".")
	}
	if text == "" || strings.ContainsAny(text, "eE") {
		return "", fmt.Errorf("价格系数 %s 无法写成普通小数", value)
	}
	return text, nil
}

func runeSlice(src string, from, to int) (string, error) {
	runes := []rune(src)
	if from < 0 || to > len(runes) || from >= to {
		return "", fmt.Errorf("位置 %d:%d 超出表达式", from, to)
	}
	return string(runes[from:to]), nil
}

func spliceRunes(src string, reps []replacement) (string, error) {
	runes := []rune(src)
	ordered := append([]replacement(nil), reps...)
	sort.Slice(ordered, func(i, j int) bool { return ordered[i].from < ordered[j].from })
	var b strings.Builder
	cursor := 0
	for _, rep := range ordered {
		if rep.from < cursor || rep.to < rep.from || rep.to > len(runes) {
			return "", fmt.Errorf("价格系数位置重叠或越界 (%d:%d)", rep.from, rep.to)
		}
		b.WriteString(string(runes[cursor:rep.from]))
		b.WriteString(rep.text)
		cursor = rep.to
	}
	b.WriteString(string(runes[cursor:]))
	return b.String(), nil
}

func compileAndSmoke(expr string) error {
	if _, err := billingexpr.CompileFromCache(expr); err != nil {
		return fmt.Errorf("缩放后的表达式无法编译: %w", err)
	}
	samples := []billingexpr.TokenParams{
		{Len: 1, P: 1, C: 1},
		{Len: 1000, P: 1000, C: 1000, CR: 10, CC: 10, CC1h: 10, AI: 10, AO: 10, Img: 10, ImgO: 10},
		{Len: 200000, P: 200000, C: 1000},
		{Len: 200001, P: 200001, C: 1000},
		{Len: 272000, P: 272000, C: 1000},
		{Len: 272001, P: 272001, C: 1000},
		{Len: 1000000, P: 1000000, C: 1000},
	}
	for _, sample := range samples {
		cost, _, err := billingexpr.RunExpr(expr, sample)
		if err != nil {
			return fmt.Errorf("缩放后的表达式试算失败: %w", err)
		}
		if cost < 0 || math.IsNaN(cost) || math.IsInf(cost, 0) {
			return fmt.Errorf("缩放后的表达式试算结果无效: %v", cost)
		}
	}
	return nil
}

func quotesEqual(got, want []TierQuote) error {
	if len(got) != len(want) {
		return fmt.Errorf("档位数量 %d，期望 %d", len(got), len(want))
	}
	for i := range want {
		if got[i].Label != want[i].Label {
			return fmt.Errorf("第 %d 档名称 %q，期望 %q", i+1, got[i].Label, want[i].Label)
		}
		if len(got[i].Coeffs) != len(want[i].Coeffs) {
			return fmt.Errorf("档位 %s 的价格项数量不一致", want[i].Label)
		}
		for key, wantValue := range want[i].Coeffs {
			gotValue, ok := got[i].Coeffs[key]
			if !ok {
				return fmt.Errorf("档位 %s 缺少 %s", want[i].Label, key)
			}
			if !gotValue.Equal(wantValue) {
				return fmt.Errorf("档位 %s 的 %s = %s，期望 %s", want[i].Label, key, gotValue, wantValue)
			}
		}
	}
	return nil
}

func formatTierPrices(quote TierQuote) string {
	parts := make([]string, 0, len(quote.Coeffs))
	for _, item := range priceVarOrder {
		value, ok := quote.Coeffs[item.key]
		if !ok {
			continue
		}
		text, err := formatCoeff(value)
		if err != nil {
			text = value.String()
		}
		parts = append(parts, item.label+" "+text)
	}
	return strings.Join(parts, "  ")
}
