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
  test('uses the official group ratio and the special group ratio for claude-fable-5', () => {
    const offers = getFableDualPriceOffers(fableModel())

    assert.deepEqual(offers, [
      { key: 'list', labelKey: 'List price', ratio: 1 },
      { key: 'special', labelKey: 'Special price', ratio: 0.6 },
    ])
  })

  test('uses the special ratio of the group this model is actually sold on', () => {
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
    assert.equal(offers?.[1]?.ratio, 0.6)
  })

  test('falls back to list price and 60% when group ratios are missing', () => {
    const offers = getFableDualPriceOffers(
      fableModel({ group_ratio: undefined })
    )

    assert.equal(offers?.[0]?.ratio, 1)
    assert.equal(offers?.[1]?.ratio, 0.6)
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

  test('puts official and special prices on the groups a model is sold on', () => {
    const both = fableModel({
      enable_groups: ['官方', 'Claude/OpenAI特价'],
    })
    assert.equal(getChannelOffer(both, 'list')?.ratio, 1)
    assert.equal(getChannelOffer(both, 'special')?.ratio, 0.6)
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
      )?.ratio,
      0.6
    )
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
