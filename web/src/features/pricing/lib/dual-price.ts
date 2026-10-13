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

export type DualPriceOffer = {
  key: 'list' | 'special'
  labelKey: 'Official pricing' | 'Platform pricing'
  ratio: number
}

function readPositiveRatio(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function isOfficialGroupName(name: string): boolean {
  return name.includes(OFFICIAL_GROUP) && !name.includes(SPECIAL_GROUP_MARK)
}

function isPlatformGroupName(name: string): boolean {
  return !name.includes(SPECIAL_GROUP_MARK) && !isOfficialGroupName(name)
}

function isGlmGroupName(name: string): boolean {
  return name === 'GLM' || name === '智谱' || name === '智普'
}

function isSameChannelGroup(left: string, right: string): boolean {
  if (left === right) return true
  if (isGlmGroupName(left) && isGlmGroupName(right)) return true
  const leftSpecial = left.includes(SPECIAL_GROUP_MARK)
  const rightSpecial = right.includes(SPECIAL_GROUP_MARK)
  if (leftSpecial && rightSpecial) {
    return left.includes(right) || right.includes(left)
  }
  const leftOfficial = isOfficialGroupName(left)
  const rightOfficial = isOfficialGroupName(right)
  if (leftOfficial && rightOfficial) {
    return left.includes(right) || right.includes(left)
  }
  return false
}

function lookupGroupRatio(model: PricingModel, groupName: string): number | null {
  const ratios = model.group_ratio ?? {}
  const exact = readPositiveRatio(ratios[groupName])
  if (exact != null) return exact
  for (const [name, ratio] of Object.entries(ratios)) {
    if (!isSameChannelGroup(name, groupName)) continue
    const value = readPositiveRatio(ratio)
    if (value != null) return value
  }
  return null
}

function officialOffer(
  model: PricingModel
): { group: string; ratio: number } | null {
  const name = (model.enable_groups ?? []).find(isOfficialGroupName)
  if (!name) return null
  const ratio = lookupGroupRatio(model, name)
  return ratio == null ? null : { group: name, ratio }
}

function platformOffer(
  model: PricingModel
): { group: string; ratio: number } | null {
  for (const name of model.enable_groups ?? []) {
    if (!isPlatformGroupName(name)) continue
    const ratio = lookupGroupRatio(model, name)
    if (ratio != null) return { group: name, ratio }
  }
  return officialOffer(model)
}

/**
 * Official pricing reads the 官方 group. Platform pricing reads the model's
 * own group, such as DeepSeek at 0.8, and falls back to 官方 when that is
 * the only group.
 */
export function getFableDualPriceOffers(
  model: PricingModel
): DualPriceOffer[] | null {
  if (model.model_name !== FABLE_DUAL_PRICE_MODEL) return null
  if (!isDynamicPricingModel(model)) return null

  const listRatio = getChannelOffer(model, 'list')?.ratio ?? DEFAULT_LIST_RATIO
  const platformRatio =
    getChannelOffer(model, 'special')?.ratio ?? listRatio

  return [
    {
      key: 'list',
      labelKey: 'Official pricing',
      ratio: listRatio,
    },
    {
      key: 'special',
      labelKey: 'Platform pricing',
      ratio: platformRatio,
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

/** Official pricing uses 官方. Platform pricing uses the model's own group. */
export function getChannelOffer(
  model: PricingModel,
  channel: ChannelKey
): { group: string; ratio: number } | null {
  if (channel === 'list') return officialOffer(model)
  return platformOffer(model)
}
