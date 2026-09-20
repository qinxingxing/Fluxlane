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

import { publicButtonVariants } from '../public-button-variants'
import {
  PUBLIC_HEADER_SCROLL_THRESHOLD_PX,
  publicHeaderBarClassName,
  publicHeaderRootClassName,
} from '../public-chrome'

describe('public chrome tokens', () => {
  test('keeps the public header full-width and fixed to the top', () => {
    assert.match(publicHeaderRootClassName, /fixed/)
    assert.match(publicHeaderRootClassName, /inset-x-0/)
    assert.match(publicHeaderRootClassName, /top-0/)
    assert.equal(publicHeaderRootClassName.includes('max-w-[52rem]'), false)
  })

  test('uses a transparent bar at the top and a frosted purple rim after 20px of scroll', () => {
    assert.equal(PUBLIC_HEADER_SCROLL_THRESHOLD_PX, 20)

    const rest = publicHeaderBarClassName(false)
    assert.match(rest, /bg-\[#0c112e\]\/40/)
    assert.match(rest, /backdrop-blur-md/)
    assert.match(rest, /border-white\/\[0\.06\]/)
    assert.equal(rest.includes('rounded-2xl'), false)

    const scrolled = publicHeaderBarClassName(true)
    assert.match(scrolled, /bg-\[#0c112e\]\/85/)
    assert.match(scrolled, /backdrop-blur-xl/)
    assert.match(scrolled, /border-purple-500\/25/)
    assert.equal(scrolled.includes('max-w-[52rem]'), false)
  })
})

describe('public button variants', () => {
  test('primary buttons use violet-600 with glow and a pressed scale', () => {
    const className = publicButtonVariants({
      variant: 'default',
      size: 'default',
    })
    assert.match(className, /bg-purple-600/)
    assert.match(className, /hover:bg-purple-700/)
    assert.match(className, /active:bg-purple-800/)
    assert.match(className, /active:scale-\[0\.98\]/)
    assert.match(className, /shadow-purple-600\/30/)
    assert.match(className, /rounded-lg/)
  })

  test('outline, ghost, and destructive variants stay on the public navy palette', () => {
    assert.match(
      publicButtonVariants({ variant: 'outline' }),
      /border-white\/15/
    )
    assert.match(
      publicButtonVariants({ variant: 'ghost' }),
      /hover:bg-purple-500\/10/
    )
    assert.match(
      publicButtonVariants({ variant: 'destructive' }),
      /text-rose-400/
    )
  })

  test('size scale covers small, medium, and large CTAs', () => {
    assert.match(publicButtonVariants({ size: 'sm' }), /h-7/)
    assert.match(publicButtonVariants({ size: 'default' }), /h-\[38px\]/)
    assert.match(publicButtonVariants({ size: 'lg' }), /h-12/)
  })
})
