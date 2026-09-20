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
import { after, afterEach, describe, test } from 'node:test'

import { Window } from 'happy-dom'
import type { ReactElement } from 'react'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'HTMLFormElement',
  'HTMLLabelElement',
  'HTMLFieldSetElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'KeyboardEvent',
  'PointerEvent',
  'MouseEvent',
  'FocusEvent',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { ContactForm } = await import('../contact-form')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        'Acme Robotics, Inc.': 'Acme Robotics, Inc.',
        'A number we can reach you on': 'A number we can reach you on',
        'A solutions architect received your request and will email a tailored evaluation shortly.':
          'A solutions architect received your request and will email a tailored evaluation shortly.',
        'Claude, GPT-4o, DeepSeek-V3': 'Claude, GPT-4o, DeepSeek-V3',
        'Company name': 'Company name',
        'Describe your workload, concurrency, or latency needs':
          'Describe your workload, concurrency, or latency needs',
        'Inquiry submitted.': 'Inquiry submitted.',
        'Monthly budget': 'Monthly budget',
        'Phone / WeChat': 'Phone / WeChat',
        'Please enter a phone number': 'Please enter a phone number',
        'Please enter a valid email address':
          'Please enter a valid email address',
        'Please enter the models you need': 'Please enter the models you need',
        'Please enter your company name': 'Please enter your company name',
        'Please select a monthly budget': 'Please select a monthly budget',
        'Privacy Policy': 'Privacy Policy',
        'Requested models': 'Requested models',
        'Requirements (optional)': 'Requirements (optional)',
        Submitting: 'Submitting',
        'Submit another inquiry': 'Submit another inquiry',
        'Submit inquiry': 'Submit inquiry',
        'Unable to submit your inquiry. Please try again later.':
          'Unable to submit your inquiry. Please try again later.',
        'We protect your business information. We do not retain request logs or share company details with third parties.':
          'We protect your business information. We do not retain request logs or share company details with third parties.',
        'Work email': 'Work email',
        '$0 – $1,000': '$0 – $1,000',
        '$1,000 – $5,000': '$1,000 – $5,000',
        '$5,000 – $20,000': '$5,000 – $20,000',
        'More than $20,000': 'More than $20,000',
        'name@company.com': 'name@company.com',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type ApiMethod = (
  url: string,
  data?: unknown,
  config?: unknown
) => Promise<{ data: unknown }>
type MockableApi = {
  get: ApiMethod
  post: ApiMethod
}

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
const originalPost = apiClient.post

type Rendered = {
  host: HTMLDivElement
  root: ReturnType<typeof createRoot>
}

let rendered: Rendered | null = null

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(
    ['status'],
    {
      turnstile_check: false,
      turnstile_site_key: '',
      privacy_policy_enabled: true,
    },
    { updatedAt: Date.now() + 60_000 }
  )
  return queryClient
}

async function renderTree(tree: ReactElement) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  rendered = { host, root }
  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <I18nextProvider i18n={i18n}>{tree}</I18nextProvider>
      </QueryClientProvider>
    )
  })
  return host
}

async function changeInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      domWindow.HTMLInputElement.prototype,
      'value'
    )?.set
    assert.ok(valueSetter)
    valueSetter.call(input, value)
    input.dispatchEvent(
      new domWindow.Event('input', { bubbles: true }) as unknown as Event
    )
  })
}

async function waitForCondition(
  condition: () => boolean,
  failureMessage: string
): Promise<void> {
  if (condition()) return

  await new Promise<void>((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (!condition()) return
      clearTimeout(timeoutId)
      observer.disconnect()
      resolve()
    })
    const timeoutId = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`${failureMessage}: ${document.body.textContent}`))
    }, 1500)

    observer.observe(document, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })
  })
}

afterEach(async () => {
  apiClient.get = originalGet
  apiClient.post = originalPost
  if (!rendered) return
  await act(async () => rendered?.root.unmount())
  rendered.host.remove()
  rendered = null
})

after(() => {
  domWindow.close()
})

describe('contact form submit', () => {
  test('starts on the fields without the dispatch intro or divider', async () => {
    const host = await renderTree(<ContactForm />)

    assert.equal(host.textContent?.includes('Inquiry dispatch'), false)
    assert.equal(host.textContent?.includes('Secure encrypted'), false)
    assert.equal(
      host.textContent?.includes(
        'Share a few details about your business. A solutions architect will follow up within 24 hours with a tailored onboarding review.'
      ),
      false
    )
    assert.equal(host.querySelector('.border-b'), null)
    assert.ok(host.querySelector('form'))
  })

  test('shows the success state after a valid inquiry is accepted', async () => {
    const payloads: unknown[] = []
    apiClient.post = async (url, data) => {
      assert.equal(url, '/api/sales-inquiry')
      payloads.push(data)
      return { data: { success: true } }
    }

    const host = await renderTree(<ContactForm />)
    const company = host.querySelector<HTMLInputElement>(
      'input[autocomplete="organization"]'
    )
    const email = host.querySelector<HTMLInputElement>('input[type="email"]')
    const phone = host.querySelector<HTMLInputElement>('input[type="tel"]')
    const model = [...host.querySelectorAll<HTMLInputElement>('input')].find(
      (input) => input.placeholder === 'Claude, GPT-4o, DeepSeek-V3'
    )
    const budgetLabel = [...host.querySelectorAll('label')].find((label) =>
      label.textContent?.includes('$1,000 – $5,000')
    )
    const form = host.querySelector('form')

    assert.ok(company)
    assert.ok(email)
    assert.ok(phone)
    assert.ok(model)
    assert.ok(budgetLabel)
    assert.ok(form)

    await changeInput(company, 'Fluxlane')
    await changeInput(email, 'ops@example.com')
    await changeInput(phone, '+14155552671')
    await changeInput(model, 'GPT-4o')
    await act(async () => {
      budgetLabel.click()
    })

    await act(async () => {
      form.dispatchEvent(
        new domWindow.Event('submit', {
          bubbles: true,
          cancelable: true,
        }) as unknown as Event
      )
    })

    await waitForCondition(
      () => host.textContent?.includes('Inquiry submitted.') === true,
      'contact form did not show the success state'
    )

    assert.equal(payloads.length, 1)
    assert.deepEqual(payloads[0], {
      company: 'Fluxlane',
      email: 'ops@example.com',
      phone: '+14155552671',
      requested_model: 'GPT-4o',
      monthly_budget: '1000-5000',
      description: '',
      website: '',
    })
    assert.ok(
      [...host.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Submit another inquiry')
      )
    )
  })
})
