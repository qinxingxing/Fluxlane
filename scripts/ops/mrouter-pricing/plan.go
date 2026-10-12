package main

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"text/tabwriter"

	"github.com/shopspring/decimal"
)

const (
	sourcePreset = "官方预设"
	sourceManual = "手工覆盖"
)

type pricedModel struct {
	Name           string
	Source         string
	Official       string
	Scaled         string
	OfficialQuotes []TierQuote
	ScaledQuotes   []TierQuote
}

func resolveModels(models []string, preset, manual map[string]string, factor decimal.Decimal) ([]pricedModel, []string, error) {
	if len(models) == 0 {
		return nil, nil, fmt.Errorf("模型列表为空")
	}
	seen := make(map[string]struct{}, len(models))
	resolved := make([]pricedModel, 0, len(models))
	var missing []string
	for _, name := range models {
		name = strings.TrimSpace(name)
		if name == "" {
			return nil, nil, fmt.Errorf("模型列表里有空名称")
		}
		if _, ok := seen[name]; ok {
			return nil, nil, fmt.Errorf("模型 %s 在列表里重复", name)
		}
		seen[name] = struct{}{}

		official, source, ok := lookupOfficial(name, preset, manual)
		if !ok {
			missing = append(missing, name)
			continue
		}
		officialQuotes, err := ParseTierQuotes(official)
		if err != nil {
			return nil, nil, fmt.Errorf("%s: %w", name, err)
		}
		scaled, scaledQuotes, err := ScaleOfficialExpr(official, factor)
		if err != nil {
			return nil, nil, fmt.Errorf("%s: %w", name, err)
		}
		resolved = append(resolved, pricedModel{
			Name:           name,
			Source:         source,
			Official:       official,
			Scaled:         scaled,
			OfficialQuotes: officialQuotes,
			ScaledQuotes:   scaledQuotes,
		})
	}
	return resolved, missing, nil
}

func lookupOfficial(name string, preset, manual map[string]string) (string, string, bool) {
	if expr := strings.TrimSpace(manual[name]); expr != "" {
		return expr, sourceManual, true
	}
	if expr := strings.TrimSpace(preset[name]); expr != "" {
		return expr, sourcePreset, true
	}
	return "", "", false
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
		exprs[model.Name] = model.Scaled
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
			problems = append(problems, fmt.Sprintf("模型 %s 写入后的值与缩放结果不一致", key))
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

func sourceCounts(models []pricedModel) (preset, manual int) {
	for _, model := range models {
		switch model.Source {
		case sourceManual:
			manual++
		default:
			preset++
		}
	}
	return preset, manual
}

func writePlan(w io.Writer, factor string, models []pricedModel, applying bool) {
	preset, manual := sourceCounts(models)
	mode := "dry-run，未写入"
	if applying {
		mode = "即将写入"
	}
	fmt.Fprintf(w, "MRouter 渠道定价  系数 %s  模型 %d  官方预设 %d  手工覆盖 %d  %s\n", factor, len(models), preset, manual, mode)
	fmt.Fprintln(w, "展示价单位为 $/1M tokens。分档模型下面每个档位单独列出。")
	fmt.Fprintln(w)

	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "模型\t来源\t档位\t输入\t输出\t其他")
	for _, model := range models {
		for i, quote := range model.ScaledQuotes {
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
		fmt.Fprintf(w, "  官方  %s\n", model.Official)
		fmt.Fprintf(w, "  ×%s  %s\n", factor, model.Scaled)
	}
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
