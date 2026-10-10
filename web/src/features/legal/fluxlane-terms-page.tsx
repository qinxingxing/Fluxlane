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
import type { ReactNode } from 'react'

import {
  FLUXLANE_API_SITE,
  FLUXLANE_CONSOLE_SITE,
  FLUXLANE_LEGAL_ENTITY,
  FLUXLANE_PUBLIC_SITE,
} from './fluxlane-privacy-policy'
import {
  FLUXLANE_SUPPORT_EMAIL,
  FLUXLANE_TERMS_EFFECTIVE_DATE,
} from './fluxlane-terms'

const supportMailto = `mailto:${FLUXLANE_SUPPORT_EMAIL}`
const termsPageUrl = `${FLUXLANE_PUBLIC_SITE}/user-agreement`
const privacyPageUrl = `${FLUXLANE_PUBLIC_SITE}/privacy-policy`
const bodyClass = 'text-muted-foreground text-sm leading-relaxed md:text-base'
const listClass = `${bodyClass} list-disc space-y-2 pl-5`

function ExternalLink(props: { href: string; children: ReactNode }) {
  return (
    <a href={props.href} className='text-primary underline underline-offset-4'>
      {props.children}
    </a>
  )
}

function TermsList(props: { items: string[] }) {
  return (
    <ul className={listClass}>
      {props.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function FluxlaneTerms() {
  return (
    <article className='mx-auto max-w-4xl space-y-8 py-12'>
      <header className='space-y-3'>
        <h1 className='text-3xl font-semibold tracking-tight'>
          Terms of Service
        </h1>
        <p className='text-muted-foreground text-sm'>
          <strong>Effective Date: {FLUXLANE_TERMS_EFFECTIVE_DATE}</strong>
          <br />
          <strong>Last Updated: {FLUXLANE_TERMS_EFFECTIVE_DATE}</strong>
        </p>
      </header>

      <div className={`${bodyClass} space-y-4`}>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a contract between you
          and <strong>{FLUXLANE_LEGAL_ENTITY}</strong> (&quot;Fluxlane&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). They govern your
          access to and use of the Fluxlane website, console, API, and related
          services.
        </p>
        <p>The Services include:</p>
        <ul className={listClass}>
          <li>
            <strong>Website:</strong>{' '}
            <ExternalLink href={FLUXLANE_PUBLIC_SITE}>
              {FLUXLANE_PUBLIC_SITE}
            </ExternalLink>
          </li>
          <li>
            <strong>Console:</strong>{' '}
            <ExternalLink href={FLUXLANE_CONSOLE_SITE}>
              {FLUXLANE_CONSOLE_SITE}
            </ExternalLink>
          </li>
          <li>
            <strong>API:</strong>{' '}
            <ExternalLink href={FLUXLANE_API_SITE}>{FLUXLANE_API_SITE}</ExternalLink>
          </li>
        </ul>
        <p>
          Together, these are referred to as the <strong>&quot;Services&quot;</strong>.
          {FLUXLANE_LEGAL_ENTITY} is incorporated in Singapore.
        </p>
        <p>
          By creating an account, purchasing credits, calling the API, or
          otherwise using the Services, you agree to these Terms and to our{' '}
          <ExternalLink href={privacyPageUrl}>Privacy Policy</ExternalLink>. If
          you use the Services for an organisation, you represent that you have
          authority to bind that organisation, and &quot;you&quot; includes that
          organisation.
        </p>
        <p>If you do not agree to these Terms, do not use the Services.</p>
      </div>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>1. The Services</h2>
        <p className={bodyClass}>
          Fluxlane provides a unified interface for sending requests to
          third-party AI models and related capabilities. We provide access,
          routing, metering, and billing. We do not operate the underlying
          models ourselves unless we expressly say so.
        </p>
        <p className={bodyClass}>
          We may change, suspend, or discontinue any part of the Services,
          including available models, endpoints, limits, and features. Model
          availability, latency, quality, and pricing can change because they
          depend on upstream providers and on our own operations.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          2. Eligibility and accounts
        </h2>
        <p className={bodyClass}>
          You must be able to form a binding contract to use the Services. You
          are responsible for activity under your account and API keys,
          including activity by people and applications you authorise.
        </p>
        <TermsList
          items={[
            'Provide accurate account information and keep it current.',
            'Keep passwords, API keys, and other credentials confidential.',
            'Tell us promptly if you believe an account or credential has been compromised.',
          ]}
        />
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>3. Acceptable use</h2>
        <p className={bodyClass}>You must not use the Services to:</p>
        <TermsList
          items={[
            'Break applicable law, or infringe privacy, intellectual-property, or other rights.',
            'Generate or distribute child sexual abuse material, or sexually exploitative content involving minors.',
            'Engage in fraud, phishing, scams, or unauthorised access to any system or data.',
            'Overload or interfere with the Services, or bypass authentication, rate limits, quotas, or billing.',
            'Use a model in a way that violates the usage policy of the upstream provider for that model.',
          ]}
        />
        <p className={bodyClass}>
          You are responsible for the prompts and files you submit, and for how
          you use model output. Review output before you rely on it.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          4. Customer Content and model output
        </h2>
        <p className={bodyClass}>
          You retain your rights in prompts, files, and other material you
          submit (&quot;Customer Content&quot;). You grant Fluxlane a limited
          licence to host, transmit, and process Customer Content only as
          needed to provide, secure, meter, and support the Services, including
          sending it to the upstream provider that handles your request.
        </p>
        <p className={bodyClass}>
          Model output is generated by third-party models. It may be
          inaccurate or incomplete, and it is not professional advice. You are
          responsible for determining whether you can use output for your
          purpose.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          5. Fees, credits, and payment
        </h2>
        <p className={bodyClass}>
          Paid use is billed in prepaid credits or other charges shown before
          you pay. Payment credentials are processed by our payment processors,
          not stored as full card numbers on Fluxlane systems.
        </p>
        <TermsList
          items={[
            'Credits are a prepaid balance for the Services. They are not a bank deposit.',
            'Credits have no cash value except where applicable law requires otherwise.',
            'Except where applicable law requires a refund, or where we expressly agree in writing, fees and purchased credits are non-refundable.',
          ]}
        />
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          6. Disclaimers and liability
        </h2>
        <p className={bodyClass}>
          The Services are provided &quot;as is&quot; and &quot;as
          available&quot;. To the fullest extent permitted by law, Fluxlane
          disclaims warranties of merchantability, fitness for a particular
          purpose, and non-infringement, and any warranty that the Services or
          model output will be uninterrupted, accurate, or error-free.
        </p>
        <p className={bodyClass}>
          To the fullest extent permitted by law, Fluxlane&apos;s total
          liability arising out of the Services or these Terms will not exceed
          the amount you paid to Fluxlane for the Services in the three months
          before the claim. These limits do not apply where applicable law does
          not allow them, including liability for fraud.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          7. Suspension, changes, and governing law
        </h2>
        <p className={bodyClass}>
          We may suspend or terminate access if you breach these Terms, a
          payment is unpaid or reversed, or continued access creates legal or
          security risk. We may update these Terms by publishing the new
          version at:
        </p>
        <p className={bodyClass}>
          <ExternalLink href={termsPageUrl}>{termsPageUrl}</ExternalLink>
        </p>
        <p className={bodyClass}>
          These Terms are governed by the laws of Singapore. Subject to
          applicable law, the courts of Singapore have exclusive jurisdiction
          over disputes arising out of these Terms or the Services.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>8. Contact</h2>
        <p className={bodyClass}>
          <strong>{FLUXLANE_LEGAL_ENTITY}</strong>
        </p>
        <p className={bodyClass}>
          Email:{' '}
          <ExternalLink href={supportMailto}>{FLUXLANE_SUPPORT_EMAIL}</ExternalLink>
        </p>
        <p className={bodyClass}>
          Privacy:{' '}
          <ExternalLink href={privacyPageUrl}>{privacyPageUrl}</ExternalLink>
        </p>
      </section>
    </article>
  )
}
