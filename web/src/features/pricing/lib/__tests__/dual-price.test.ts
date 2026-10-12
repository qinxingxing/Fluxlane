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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { PricingModel } from '../../types'
import {
  formatDiscountFold,
  formatDiscountOffPercent,
  formatDualPriceDiscount,
  getChannelOffer,
  getFableDualPriceOffers,
} from '../dual-price'
import {
  channelDiscountRatio,
  channelPriceBasis,
  officialPriceFor,
} from '../official-catalog'

const fableExpr =
  'tier("standard", p * 10 + cr * 1 + cc * 12.5 + cc1h * 20 + c * 50)'

function fableModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'claude-fable-5',
    quota_type: 0,
    model_ratio: 37.5,
    completion_ratio: 1,
    billing_mode: 'tiered_expr',
    billing_expr: fableExpr,
    enable_groups: ['Claude/OpenAI特价'],
    group_ratio: {
      官方: 1,
      'Claude/OpenAI特价': 0.6,
    },
    ...overrides,
  }
}

describe('fable dual price offers', () => {
  test('uses the official group ratio for both official and platform pricing', () => {
    const offers = getFableDualPriceOffers(
      fableModel({
        enable_groups: ['官方'],
        group_ratio: { 官方: 0.8, 特价: 0.6 },
      })
    )

    assert.deepEqual(offers, [
      { key: 'list', labelKey: 'Official pricing', ratio: 0.8 },
      { key: 'special', labelKey: 'Platform pricing', ratio: 0.8 },
    ])
  })

  test('uses the official group ratio for platform pricing', () => {
    const offers = getFableDualPriceOffers(
      fableModel({
        enable_groups: ['官方', 'Claude/OpenAI特价'],
        group_ratio: {
          其他特价: 0.5,
          官方: 1,
          'Claude/OpenAI特价': 0.6,
        },
      })
    )

    assert.equal(offers?.[0]?.ratio, 1)
    assert.equal(offers?.[1]?.ratio, 1)
  })

  test('falls back to the list ratio when group ratios are missing', () => {
    const offers = getFableDualPriceOffers(
      fableModel({ group_ratio: undefined })
    )

    assert.equal(offers?.[0]?.ratio, 1)
    assert.equal(offers?.[1]?.ratio, 1)
  })

  test('leaves other models on a single price', () => {
    assert.equal(
      getFableDualPriceOffers(fableModel({ model_name: 'claude-fable-5-1' })),
      null
    )
    assert.equal(
      getFableDualPriceOffers(fableModel({ model_name: 'claude-opus-5' })),
      null
    )
    assert.equal(
      getFableDualPriceOffers(
        fableModel({ billing_mode: undefined, billing_expr: undefined })
      ),
      null
    )
  })

  test('prices a model on the DeepSeek group at that group ratio', () => {
    const deepseek = fableModel({
      model_name: 'deepseek-v4-pro',
      enable_groups: ['官方', 'DeepSeek'],
      group_ratio: { 官方: 1, DeepSeek: 0.8, 特价: 0.6 },
    })
    assert.equal(getChannelOffer(deepseek, 'list')?.group, '官方')
    assert.equal(getChannelOffer(deepseek, 'list')?.ratio, 1)
    assert.equal(getChannelOffer(deepseek, 'special')?.group, 'DeepSeek')
    assert.equal(getChannelOffer(deepseek, 'special')?.ratio, 0.8)
  })

  test('uses the vendor group instead of the special-price group', () => {
    const claude = fableModel({
      enable_groups: ['Claude/OpenAI特价', '官方', 'Anthropic'],
      group_ratio: { 官方: 1, 'Claude/OpenAI特价': 0.6, Anthropic: 0.9 },
    })
    assert.equal(getChannelOffer(claude, 'list')?.ratio, 1)
    assert.equal(getChannelOffer(claude, 'special')?.group, 'Anthropic')
    assert.equal(getChannelOffer(claude, 'special')?.ratio, 0.9)
  })

  test('prices platform pricing from the official group', () => {
    const renamed = fableModel({
      enable_groups: ['官方', 'Claude/OpenAI特价'],
      group_ratio: { 官方: 1, 特价: 0.6 },
    })
    assert.equal(getChannelOffer(renamed, 'list')?.group, '官方')
    assert.equal(getChannelOffer(renamed, 'special')?.group, '官方')
    assert.equal(getChannelOffer(renamed, 'special')?.ratio, 1)

    const officialOnly = fableModel({
      model_name: 'claude-haiku-5',
      enable_groups: ['官方'],
      group_ratio: { 官方: 1, 特价: 0.6 },
    })
    assert.equal(getChannelOffer(officialOnly, 'list')?.group, '官方')
    assert.equal(getChannelOffer(officialOnly, 'special')?.group, '官方')
    assert.equal(getChannelOffer(officialOnly, 'special')?.ratio, 1)
  })

  test('omits both prices when the model is not sold on the official group', () => {
    const both = fableModel({
      enable_groups: ['官方', 'Claude/OpenAI特价'],
    })
    assert.equal(getChannelOffer(both, 'list')?.ratio, 1)
    assert.equal(getChannelOffer(both, 'special')?.ratio, 1)
    assert.equal(
      getChannelOffer(
        fableModel({
          model_name: 'claude-sonnet-5',
          enable_groups: ['Claude/OpenAI特价'],
        }),
        'list'
      ),
      null
    )
    assert.equal(
      getChannelOffer(
        fableModel({
          model_name: 'claude-sonnet-5',
          enable_groups: ['Claude/OpenAI特价'],
        }),
        'special'
      ),
      null
    )
  })

  test('reads official price and the vendor factor from the stored catalog', () => {
    const stored = officialPriceFor('deepseek-v4-pro')
    assert.equal(stored?.group, 'DeepSeek')
    assert.equal(stored?.factor, 0.8)
    const model = fableModel({
      model_name: 'deepseek-v4-pro',
      billing_expr: 'tier("peak", p * 1.056 + c * 3.168)',
      enable_groups: ['官方', 'DeepSeek'],
      group_ratio: { 官方: 1, DeepSeek: 0.8 },
    })
    const list = channelPriceBasis(model, 'list')
    const platform = channelPriceBasis(model, 'special')
    assert.equal(list?.ratio, 1)
    assert.match(list?.model.billing_expr ?? '', /p \* 1\.32/)
    assert.equal(platform?.ratio, 1)
    assert.match(platform?.model.billing_expr ?? '', /p \* 1\.056/)
    assert.equal(channelDiscountRatio(model), 0.8)
    assert.equal(officialPriceFor('claude-fable-5')?.factor, 0.95)
  })

  test('writes a 0.6 ratio as 6折 and omits a full-price multiplier', () => {
    assert.equal(formatDualPriceDiscount(0.6), '6折')
    assert.equal(formatDiscountFold(0.6), '6折')
    assert.equal(formatDiscountFold(1), null)
  })

  test('writes the backend group ratio as a percent off the list price', () => {
    assert.equal(formatDiscountOffPercent(0.6), '-40%')
    assert.equal(formatDiscountOffPercent(0.7), '-30%')
    assert.equal(formatDiscountOffPercent(1), null)
  })
})
