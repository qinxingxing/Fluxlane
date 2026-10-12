package main

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"text/tabwriter"
)

const (
	sourcePreset = "官方预设"
	sourceManual = "手工覆盖"
)

type pricedModel struct {
	Name           string
	Source         string
	Current        string
	Official       string
	Scaled         string
	OfficialQuotes []TierQuote
	ScaledQuotes   []TierQuote
}

func siteModelNames(catalog []string, exprMap map[string]string) []string {
	seen := make(map[string]struct{})
	names := make([]string, 0, len(catalog)+len(exprMap))
	for _, name := range catalog {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		names = append(names, name)
	}
	extra := make([]string, 0)
	for name, expr := range exprMap {
		name = strings.TrimSpace(name)
		if name == "" || strings.TrimSpace(expr) == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		extra = append(extra, name)
	}
	sort.Strings(extra)
	return append(names, extra...)
}

func lookupOfficial(name string, preset, manual map[string]string) (string, string, bool) {
	if expr := strings.TrimSpace(manual[name]); expr != "" {
		return expr, sourceManual, true
	}
	if target := strings.TrimSpace(officialAliases()[name]); target != "" {
		if expr := strings.TrimSpace(preset[target]); expr != "" {
			return expr, sourcePreset + " " + target, true
		}
	}
	if expr := strings.TrimSpace(preset[name]); expr != "" {
		return expr, sourcePreset, true
	}
	foldedKey := ""
	foldedExpr := ""
	for key, value := range preset {
		if !strings.EqualFold(key, name) || strings.TrimSpace(value) == "" {
			continue
		}
		if foldedKey != "" && foldedKey != key {
			return "", "", false
		}
		foldedKey = key
		foldedExpr = value
	}
	if foldedKey != "" {
		return foldedExpr, sourcePreset + " " + foldedKey, true
	}
	return "", "", false
}

func resolveOfficial(names []string, preset, manual, current map[string]string) (updates []pricedModel, unchanged []string, missing []string, err error) {
	for _, name := range names {
		official, source, ok := lookupOfficial(name, preset, manual)
		if !ok {
			missing = append(missing, name)
			continue
		}
		quotes, parseErr := ParseTierQuotes(official)
		if parseErr != nil {
			return nil, nil, nil, fmt.Errorf("%s: %w", name, parseErr)
		}
		if smokeErr := compileAndSmoke(official); smokeErr != nil {
			return nil, nil, nil, fmt.Errorf("%s: %w", name, smokeErr)
		}
		existing := strings.TrimSpace(current[name])
		if existing == official {
			unchanged = append(unchanged, name)
			continue
		}
		updates = append(updates, pricedModel{
			Name:           name,
			Source:         source,
			Current:        existing,
			Official:       official,
			Scaled:         official,
			OfficialQuotes: quotes,
			ScaledQuotes:   quotes,
		})
	}
	return updates, unchanged, missing, nil
}

func mergeStringMaps(base, updates map[string]string) map[string]string {
	merged := make(map[string]string, len(base)+len(updates))
	for key, value := range base {
		merged[key] = value
	}
	for key, value := range updates {
		merged[key] = value
	}
	return merged
}

func billingUpdates(models []pricedModel) (map[string]string, map[string]string) {
	exprs := make(map[string]string, len(models))
	modes := make(map[string]string, len(models))
	for _, model := range models {
		exprs[model.Name] = model.Official
		modes[model.Name] = tieredMode
	}
	return exprs, modes
}

func sameStringMap(got, want map[string]string) bool {
	if len(got) != len(want) {
		return false
	}
	for key, value := range want {
		if got[key] != value {
			return false
		}
	}
	return true
}

func diffStringMap(got, want map[string]string, updated map[string]string) []string {
	var problems []string
	for key, value := range want {
		actual, ok := got[key]
		if !ok {
			problems = append(problems, fmt.Sprintf("模型 %s 在写回结果中消失", key))
			continue
		}
		if actual == value {
			continue
		}
		if _, ok := updated[key]; ok {
			problems = append(problems, fmt.Sprintf("模型 %s 写入后的值与原价不一致", key))
			continue
		}
		problems = append(problems, fmt.Sprintf("模型 %s 不在本次清单内，但原有定价被改动", key))
	}
	for key := range got {
		if _, ok := want[key]; ok {
			continue
		}
		problems = append(problems, fmt.Sprintf("写回结果多出清单外模型 %s", key))
	}
	sort.Strings(problems)
	return problems
}

func coeffText(quote TierQuote, key string) string {
	value, ok := quote.Coeffs[key]
	if !ok {
		return "-"
	}
	text, err := formatCoeff(value)
	if err != nil {
		return value.String()
	}
	return text
}

func otherCoeffText(quote TierQuote) string {
	parts := make([]string, 0, len(quote.Coeffs))
	for _, item := range priceVarOrder {
		if item.key == "p" || item.key == "c" {
			continue
		}
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
	if len(parts) == 0 {
		return "-"
	}
	return strings.Join(parts, "，")
}

func writePlan(w io.Writer, models []pricedModel, applying bool) {
	mode := "dry-run，未写入"
	if applying {
		mode = "即将写入"
	}
	fmt.Fprintf(w, "全站改回原价  本次写入 %d  %s\n", len(models), mode)
	fmt.Fprintln(w, "展示价单位为 $/1M tokens。写入值是官方表达式，不再乘系数。")
	fmt.Fprintln(w)
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "模型\t来源\t档位\t输入\t输出\t其他")
	for _, model := range models {
		for i, quote := range model.OfficialQuotes {
			name, source := "", ""
			if i == 0 {
				name = model.Name
				source = model.Source
			}
			fmt.Fprintf(tw, "%s\t%s\t%s\t%s\t%s\t%s\n",
				name,
				source,
				quote.Label,
				coeffText(quote, "p"),
				coeffText(quote, "c"),
				otherCoeffText(quote),
			)
		}
	}
	_ = tw.Flush()
	fmt.Fprintln(w)
	for _, model := range models {
		fmt.Fprintf(w, "%s\t%s\n", model.Name, model.Source)
		if model.Current == "" {
			fmt.Fprintln(w, "  当前  （无表达式）")
		} else {
			fmt.Fprintf(w, "  当前  %s\n", model.Current)
		}
		fmt.Fprintf(w, "  原价  %s\n", model.Official)
	}
}
