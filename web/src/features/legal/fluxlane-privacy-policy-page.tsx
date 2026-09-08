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
  FLUXLANE_LEGAL_ENTITY,
  FLUXLANE_PRIVACY_EFFECTIVE_DATE,
  FLUXLANE_PRIVACY_EMAIL,
  FLUXLANE_PUBLIC_SITE,
} from './fluxlane-privacy-policy'

const privacyMailto = `mailto:${FLUXLANE_PRIVACY_EMAIL}`
const privacyPageUrl = `${FLUXLANE_PUBLIC_SITE}/privacy-policy`

function ExternalLink(props: { href: string; children: ReactNode }) {
  return (
    <a href={props.href} className='text-primary underline underline-offset-4'>
      {props.children}
    </a>
  )
}

export function FluxlanePrivacyPolicy() {
  return (
    <article className='mx-auto max-w-4xl space-y-8 py-12'>
      <header className='space-y-3'>
        <h1 className='text-3xl font-semibold tracking-tight'>Privacy Policy</h1>
        <p className='text-muted-foreground text-sm'>
          Effective date: {FLUXLANE_PRIVACY_EFFECTIVE_DATE}
          <br />
          Last updated: {FLUXLANE_PRIVACY_EFFECTIVE_DATE}
        </p>
      </header>

      <div className='text-muted-foreground space-y-4 text-sm leading-relaxed md:text-base'>
        <p>
          This Privacy Policy describes how <strong>{FLUXLANE_LEGAL_ENTITY}</strong>{' '}
          (&quot;Fluxlane&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          collects, uses, discloses, and protects personal data when you visit{' '}
          <ExternalLink href={FLUXLANE_PUBLIC_SITE}>
            {FLUXLANE_PUBLIC_SITE}
          </ExternalLink>
          , use the Fluxlane console at{' '}
          <ExternalLink href='https://console.fluxlane.ai'>
            https://console.fluxlane.ai
          </ExternalLink>
          , or access the Fluxlane API at{' '}
          <ExternalLink href='https://run.fluxlane.ai'>
            https://run.fluxlane.ai
          </ExternalLink>{' '}
          and related services (together, the &quot;Services&quot;).
        </p>
        <p>
          {FLUXLANE_LEGAL_ENTITY} is a company incorporated in Singapore. For the
          purposes of Singapore&apos;s Personal Data Protection Act 2012
          (&quot;PDPA&quot;), we are the organisation responsible for the personal
          data described in this Policy.
        </p>
        <p>If you do not agree with this Policy, please do not use the Services.</p>
      </div>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          1. Personal data we collect
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          Depending on how you use the Services, we may collect:
        </p>
        <ul className='text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed md:text-base'>
          <li>
            <strong>Account and identity data.</strong> Email address, username,
            password (stored in hashed form), organisation or team details you
            provide, and similar profile information.
          </li>
          <li>
            <strong>Billing and transaction data.</strong> Billing name, payment
            status, top-up and invoice records, and limited payment metadata
            returned by our payment processors. We do not store full payment card
            numbers on Fluxlane systems when cards are processed by a third-party
            processor such as Stripe.
          </li>
          <li>
            <strong>Service and usage data.</strong> API key identifiers (not the
            secret itself after creation, except as needed to operate the product),
            model names, request timestamps, token and quota consumption, HTTP
            status codes, latency, IP address, user agent, and similar operational
            logs needed to provide, bill, secure, and support the Services.
          </li>
          <li>
            <strong>Request content.</strong> Prompts, files, images, audio, and
            other inputs you submit to a model, and the outputs returned by that
            model. This content is processed to fulfil your request and may be
            stored in logs or support records as described below.
          </li>
          <li>
            <strong>Communications.</strong> Messages you send to us (for example
            privacy requests, support tickets, or email).
          </li>
          <li>
            <strong>Website data.</strong> Pages viewed, referring URLs,
            approximate location derived from IP address, and similar analytics
            events on the public website. We use Google Tag Manager on{' '}
            <ExternalLink href={FLUXLANE_PUBLIC_SITE}>www.fluxlane.ai</ExternalLink>{' '}
            for this purpose.
          </li>
          <li>
            <strong>Cookies and similar technologies.</strong> Session and
            authentication cookies needed to keep you signed in, remember
            preferences, and protect the Services. Analytics tags may set or read
            cookies on the public website.
          </li>
        </ul>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We do not require you to provide more personal data than is reasonably
          needed for the relevant purpose.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          2. How we collect personal data
        </h2>
        <ul className='text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed md:text-base'>
          <li>
            directly from you, when you create an account, update your profile,
            make a payment, contact us, or submit API requests;
          </li>
          <li>
            automatically, when you browse the website or call the API (logs,
            cookies, and device data); and
          </li>
          <li>
            from service providers that help us operate the Services, such as
            payment processors, email delivery, hosting, and security vendors.
          </li>
        </ul>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          3. How we use personal data
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We use personal data to:
        </p>
        <ul className='text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed md:text-base'>
          <li>
            create and manage accounts, authenticate users, and issue and enforce
            API keys;
          </li>
          <li>
            route requests to the AI model providers you use through Fluxlane and
            return their responses;
          </li>
          <li>
            calculate usage, apply quotas and rate limits, prevent abuse, and bill
            for the Services;
          </li>
          <li>
            provide customer support and respond to privacy or legal requests;
          </li>
          <li>
            operate, secure, debug, and improve the Services, including detecting
            fraud, attacks, and policy violations;
          </li>
          <li>
            send transactional messages (such as sign-in, security, and billing
            notices);
          </li>
          <li>
            measure public-website performance and understand how visitors use{' '}
            <ExternalLink href={FLUXLANE_PUBLIC_SITE}>www.fluxlane.ai</ExternalLink>
            ; and
          </li>
          <li>
            comply with law, enforce our terms, and protect Fluxlane, our users,
            and the public.
          </li>
        </ul>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          Where the PDPA requires consent, we will collect and use personal data
          with your consent, or as otherwise permitted (for example where the
          collection is necessary for the Services you request, or where use is
          required or authorised by law).
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          4. AI model providers and other disclosures
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          Fluxlane is an API gateway. When you send a request to a model, we
          transmit the request (including prompts and other inputs) to the
          upstream provider that serves that model. Those providers process the
          data under their own terms and privacy policies. We do not control how
          an upstream provider trains, retains, or further uses content except as
          stated in that provider&apos;s documentation and in any contractual terms
          that apply to our account with them.
        </p>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We may also disclose personal data to payment processors; infrastructure
          and operations vendors (including hosting, databases, logging, email,
          error monitoring, and content-delivery providers); professional advisers;
          a buyer or successor if we are involved in a merger, acquisition, or
          sale of assets; and authorities if we believe disclosure is required by
          law, regulation, legal process, or to protect rights, safety, or
          security. We do not sell personal data.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          5. International transfers
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          {FLUXLANE_LEGAL_ENTITY} is based in Singapore. Our vendors and upstream
          model providers may process personal data in other countries, including
          jurisdictions that do not have the same data-protection laws as
          Singapore. Where we transfer personal data outside Singapore, we take
          steps required under the PDPA so that the recipient provides a standard
          of protection comparable to the PDPA, including contractual safeguards
          where appropriate.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>6. Retention</h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We retain personal data only for as long as needed for the purposes in
          this Policy, including to keep your account active, provide the
          Services, maintain billing, tax, security, and audit records, resolve
          disputes, and meet legal, accounting, or reporting requirements. When
          personal data is no longer required, we will delete or anonymise it, or
          securely isolate it from further use, in line with our retention
          practices.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>7. Security</h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We use reasonable technical and organisational measures to protect
          personal data, including access controls, encryption in transit where
          applicable, hashed passwords, and least-privilege access to production
          systems. No method of transmission or storage is completely secure. You are
          responsible for keeping your credentials and API keys confidential.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          8. Your choices and PDPA rights
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          Subject to the PDPA and applicable exceptions, you may request access to
          personal data we hold about you, request correction of personal data that
          is inaccurate or incomplete, withdraw consent where we rely on consent
          (withdrawal may mean we cannot continue to provide some or all of the
          Services), and close your account by contacting us.
        </p>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          You can also update certain account details in the console, delete API
          keys you no longer need, and control cookies through your browser
          settings. Blocking essential cookies may prevent sign-in or other core
          features from working.
        </p>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          To make a privacy request, email{' '}
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
          . We may need to verify your identity before fulfilling a request. If you
          are not satisfied with our response, you may contact the Personal Data
          Protection Commission (PDPC) of Singapore.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>9. Children</h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          The Services are not directed to children. We do not knowingly collect
          personal data from children. If you believe a child has provided
          personal data to us, contact{' '}
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>{' '}
          and we will take appropriate steps to delete it.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          10. Third-party sites and models
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          The Services may link to third-party websites, documentation, or model
          providers. Their privacy practices are governed by their own policies.
          Please read those policies before providing personal data to them.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>
          11. Changes to this Policy
        </h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          We may update this Policy from time to time. The updated version will be
          posted at{' '}
          <ExternalLink href={privacyPageUrl}>{privacyPageUrl}</ExternalLink> and
          the &quot;Last updated&quot; date will change. Continued use of the Services
          after an update means you accept the revised Policy. If changes are
          material, we will take additional steps to notify you where required by
          law.
        </p>
      </section>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>12. Contact us</h2>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          For questions or requests about this Policy or our handling of personal
          data:
        </p>
        <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
          <strong>{FLUXLANE_LEGAL_ENTITY}</strong>
          <br />
          Email:{' '}
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
          <br />
          Website:{' '}
          <ExternalLink href={FLUXLANE_PUBLIC_SITE}>
            {FLUXLANE_PUBLIC_SITE}
          </ExternalLink>
        </p>
      </section>
    </article>
  )
}
