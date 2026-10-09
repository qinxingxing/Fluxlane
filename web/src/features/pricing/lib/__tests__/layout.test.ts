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

import { pricingLayout } from '../layout'

describe('pricing marketplace layout', () => {
  test('stacks the catalog in one column under the provider filter', () => {
    const classes = pricingLayout.pageGrid.split(' ')

    assert.ok(classes.includes('flex'))
    assert.ok(classes.includes('flex-col'))
    assert.equal(classes.includes('xl:grid-cols-[260px_minmax(0,1fr)]'), false)
  })

  test('renders marketplace cards in a two-column grid from the large breakpoint', () => {
    const classes = pricingLayout.cardGrid.split(' ')

    assert.ok(classes.includes('grid-cols-1'))
    assert.ok(classes.includes('lg:grid-cols-2'))
    assert.equal(classes.includes('lg:grid-cols-3'), false)
  })

  test('uses a rounded command search field', () => {
    assert.ok(pricingLayout.searchInput.split(' ').includes('rounded-lg'))
    assert.equal(
      pricingLayout.searchInput.split(' ').includes('rounded-full'),
      false
    )
  })

  test('uses the homepage navy field and 40px stripe grid', () => {
    assert.ok(pricingLayout.pageShell.includes('bg-[#0c112e]'))
    assert.ok(pricingLayout.atmosphereFill.includes('bg-[#0c112e]'))
    assert.equal(pricingLayout.atmosphereFill.includes('color-mix'), false)
    assert.ok(pricingLayout.atmosphereGrid.includes('bg-[size:40px_40px]'))
    assert.ok(pricingLayout.atmosphereGrid.includes('rgba(255,255,255,0.045)'))
  })
})
