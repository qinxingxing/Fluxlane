/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { PricingModel } from '../types'
import { isDynamicPricingModel } from './dynamic-price'

const FABLE_DUAL_PRICE_MODEL = 'claude-fable-5'
const OFFICIAL_GROUP = '官方'
const SPECIAL_GROUP_MARK = '特价'
const DEFAULT_LIST_RATIO = 1
const DEFAULT_SPECIAL_RATIO = 0.6

export type DualPriceOffer = {
  key: 'list' | 'special'
  labelKey: 'List price' | 'Special price'
  ratio: number
}

function readPositiveRatio(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function ratioEntries(model: PricingModel): Array<[string, number]> {
  const ratios = model.group_ratio ?? {}
  const enabled = new Set(model.enable_groups ?? [])
  const parsed = Object.entries(ratios).flatMap(([name, ratio]) => {
    const value = readPositiveRatio(ratio)
    return value == null ? [] : [[name, value] as [string, number]]
  })
  if (enabled.size === 0) return parsed
  const enabledEntries = parsed.filter(([name]) => enabled.has(name))
  return enabledEntries.length > 0 ? enabledEntries : parsed
}

/**
 * claude-fable-5 is sold on two groups: official list price, and a special
 * group priced at a fraction of that list (currently 60%).
 */
export function getFableDualPriceOffers(
  model: PricingModel
): DualPriceOffer[] | null {
  if (model.model_name !== FABLE_DUAL_PRICE_MODEL) return null
  if (!isDynamicPricingModel(model)) return null

  const entries = ratioEntries(model)
  const official = entries.find(
    ([name]) => name === OFFICIAL_GROUP || name.includes(OFFICIAL_GROUP)
  )
  const special = entries.find(
    ([name, ratio]) => name.includes(SPECIAL_GROUP_MARK) && ratio < 1
  )

  return [
    {
      key: 'list',
      labelKey: 'List price',
      ratio: official?.[1] ?? DEFAULT_LIST_RATIO,
    },
    {
      key: 'special',
      labelKey: 'Special price',
      ratio: special?.[1] ?? DEFAULT_SPECIAL_RATIO,
    },
  ]
}

/** 0.6 is written as 6折. Full price has no multiplier label. */
export function formatDiscountFold(ratio: number): string | null {
  if (!(ratio > 0) || ratio >= 1) return null
  const fold = Math.round(ratio * 100) / 10
  if (!Number.isFinite(fold)) return null
  return `${fold}折`
}

export function formatDualPriceDiscount(ratio: number): string {
  return formatDiscountFold(ratio) ?? '6折'
}

/** A 0.6 group ratio is 40% off the list price, written as -40%. */
export function formatDiscountOffPercent(ratio: number): string | null {
  if (!(ratio > 0) || ratio >= 1) return null
  const percent = Math.round((1 - ratio) * 100)
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return null
  return `-${percent}%`
}

export function modelHasChannelRates(model: PricingModel): boolean {
  return Boolean(
    getChannelOffer(model, 'list') || getChannelOffer(model, 'special')
  )
}

export type ChannelKey = 'list' | 'special'

/** The official or special group this model is actually sold on. */
export function getChannelOffer(
  model: PricingModel,
  channel: ChannelKey
): { group: string; ratio: number } | null {
  const entries = ratioEntries(model)
  if (channel === 'list') {
    const official = entries.find(
      ([name]) => name === OFFICIAL_GROUP || name.includes(OFFICIAL_GROUP)
    )
    return official ? { group: official[0], ratio: official[1] } : null
  }
  const special = entries.find(
    ([name, ratio]) => name.includes(SPECIAL_GROUP_MARK) && ratio < 1
  )
  return special ? { group: special[0], ratio: special[1] } : null
}
