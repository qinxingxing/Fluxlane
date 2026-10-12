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
import catalog from '../data/official-prices.json'
import type { PricingModel } from '../types'
import { getChannelOffer, type ChannelKey } from './dual-price'

export type OfficialPrice = {
  group: string
  factor: number
  billing_mode: string
  billing_expr: string
  model_ratio: number
  completion_ratio: number
}

const officialPrices = catalog.models as Record<string, OfficialPrice>

const OFFICIAL_GROUP = '官方'

export function officialPriceFor(modelName: string): OfficialPrice | null {
  return officialPrices[modelName] ?? null
}

export type ChannelPriceBasis = {
  model: PricingModel
  ratio: number
  group: string
}

function withOfficialPrice(
  model: PricingModel,
  stored: OfficialPrice
): PricingModel {
  if (!stored.billing_expr) {
    return {
      ...model,
      billing_mode: undefined,
      billing_expr: undefined,
      model_ratio: stored.model_ratio,
      completion_ratio: stored.completion_ratio,
    }
  }
  return {
    ...model,
    billing_mode: stored.billing_mode,
    billing_expr: stored.billing_expr,
    model_ratio: stored.model_ratio,
    completion_ratio: stored.completion_ratio,
  }
}

/**
 * Official column reads the stored list price. Platform column reads the live
 * model price. Both use ratio 1 because the group factor is already baked
 * into the live price.
 */
export function channelPriceBasis(
  model: PricingModel,
  channel: ChannelKey
): ChannelPriceBasis | null {
  const stored = officialPriceFor(model.model_name)
  if (stored) {
    if (channel === 'list') {
      return {
        model: withOfficialPrice(model, stored),
        ratio: 1,
        group: OFFICIAL_GROUP,
      }
    }
    return { model, ratio: 1, group: OFFICIAL_GROUP }
  }

  const offer = getChannelOffer(model, channel)
  if (!offer) return null
  return { model, ratio: offer.ratio, group: offer.group }
}

/** Discount column reads the vendor group factor stored with the list price. */
export function channelDiscountRatio(model: PricingModel): number | null {
  const stored = officialPriceFor(model.model_name)
  if (stored) return stored.factor

  const list = getChannelOffer(model, 'list')
  const special = getChannelOffer(model, 'special')
  if (!list || !special || !(list.ratio > 0)) return null
  if (list.group === special.group && list.ratio === special.ratio) return null
  return special.ratio / list.ratio
}
