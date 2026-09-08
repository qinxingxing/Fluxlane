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
  FLUXLANE_PRIVACY_EFFECTIVE_DATE,
  FLUXLANE_PRIVACY_EMAIL,
  FLUXLANE_PUBLIC_SITE,
} from './fluxlane-privacy-policy'

const privacyMailto = `mailto:${FLUXLANE_PRIVACY_EMAIL}`
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

function PolicyList(props: { items: string[] }) {
  return (
    <ul className={listClass}>
      {props.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function FluxlanePrivacyPolicy() {
  return (
    <article className='mx-auto max-w-4xl space-y-8 py-12'>
      <header className='space-y-3'>
        <h1 className='text-3xl font-semibold tracking-tight'>Privacy Policy</h1>
        <p className='text-muted-foreground text-sm'>
          <strong>Effective Date: {FLUXLANE_PRIVACY_EFFECTIVE_DATE}</strong>
          <br />
          <strong>Last Updated: {FLUXLANE_PRIVACY_EFFECTIVE_DATE}</strong>
        </p>
      </header>

      <div className={`${bodyClass} space-y-4`}>
        <p>
          This Privacy Policy explains how <strong>{FLUXLANE_LEGAL_ENTITY}</strong>{' '}
          (&quot;Fluxlane&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          collects, uses, stores, discloses, and protects personal data when you
          visit or use our website, console, API, and related services.
        </p>
        <p>Our Services include:</p>
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
            <ExternalLink href={FLUXLANE_API_SITE}>
              {FLUXLANE_API_SITE}
            </ExternalLink>
          </li>
        </ul>
        <p>
          Together, these are referred to as the <strong>&quot;Services&quot;</strong>.
        </p>
        <p>
          {FLUXLANE_LEGAL_ENTITY} is incorporated in Singapore. We are responsible for
          the personal data that we collect and control in connection with the
          Services and seek to comply with the{' '}
          <strong>
            Personal Data Protection Act 2012 of Singapore (&quot;PDPA&quot;)
          </strong>{' '}
          and other applicable data protection laws.
        </p>
        <p>
          By using the Services, you acknowledge that you have read this Privacy
          Policy.
        </p>
      </div>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          1. Personal Data We Collect
        </h2>
        <p className={bodyClass}>
          The information we collect depends on how you use the Services.
        </p>

        <h3 className='text-lg font-semibold tracking-tight'>
          1.1 Account Information
        </h3>
        <p className={bodyClass}>
          When you create or manage a Fluxlane account, we may collect:
        </p>
        <PolicyList
          items={[
            'Email address;',
            'Username or account name;',
            'Password credentials, stored in hashed form;',
            'Organisation or company information that you choose to provide;',
            'Account status and related account information; and',
            'Other information you voluntarily provide to us.',
          ]}
        />

        <h3 className='text-lg font-semibold tracking-tight'>
          1.2 Billing and Transaction Information
        </h3>
        <p className={bodyClass}>
          If you purchase credits or other Services from us, we may collect:
        </p>
        <PolicyList
          items={[
            'Billing name and company information;',
            'Billing and invoice information;',
            'Transaction records;',
            'Payment status;',
            'Credit or balance information; and',
            'Limited payment information provided by our payment processors.',
          ]}
        />
        <p className={bodyClass}>
          Where payments are processed by third-party payment providers such as
          Stripe, payment card numbers and other full payment credentials are
          processed by those providers rather than stored directly on Fluxlane&apos;s
          systems.
        </p>
        <p className={bodyClass}>
          We may retain transaction and billing records for accounting, tax, fraud
          prevention, dispute resolution, and other legitimate business or legal
          purposes.
        </p>

        <h3 className='text-lg font-semibold tracking-tight'>
          1.3 API and Service Usage Information
        </h3>
        <p className={bodyClass}>
          When you use the Fluxlane API, we may collect technical and operational
          information such as:
        </p>
        <PolicyList
          items={[
            'API key identifiers;',
            'Model requested;',
            'Request timestamp;',
            'Token and quota consumption;',
            'Request and response status codes;',
            'Latency and performance information;',
            'IP address;',
            'User agent;',
            'Error information;',
            'Rate-limit information; and',
            'Other information reasonably necessary to operate, secure, monitor, and support the Services.',
          ]}
        />
        <p className={bodyClass}>
          We do not need to store the secret value of an API key after it has been
          securely provided to you, except where necessary to operate the relevant
          functionality.
        </p>

        <h3 className='text-lg font-semibold tracking-tight'>1.4 Customer Content</h3>
        <p className={bodyClass}>
          When you use the Fluxlane API, you may submit information to an upstream
          AI model through our Services. This may include:
        </p>
        <PolicyList
          items={[
            'Text prompts;',
            'Code;',
            'Files;',
            'Images;',
            'Audio;',
            'Other inputs submitted to an AI model; and',
            'Outputs generated in response to those inputs.',
          ]}
        />
        <p className={bodyClass}>
          We refer to this information collectively as{' '}
          <strong>&quot;Customer Content&quot;</strong>.
        </p>
        <p className={bodyClass}>
          Customer Content may contain personal data if you choose to include
          personal data in your requests.
        </p>
        <p className={bodyClass}>
          You are responsible for ensuring that you have the appropriate rights,
          permissions, and legal basis to submit Customer Content to the Services.
        </p>

        <h3 className='text-lg font-semibold tracking-tight'>1.5 Communications</h3>
        <p className={bodyClass}>
          We may collect information contained in communications you send to us,
          including:
        </p>
        <PolicyList
          items={[
            'Support requests;',
            'Privacy requests;',
            'Emails;',
            'Feedback;',
            'Business enquiries; and',
            'Other communications with Fluxlane.',
          ]}
        />

        <h3 className='text-lg font-semibold tracking-tight'>
          1.6 Website and Cookie Information
        </h3>
        <p className={bodyClass}>
          When you visit our public website, we may collect information such as:
        </p>
        <PolicyList
          items={[
            'Pages visited;',
            'Referring URLs;',
            'Browser and device information;',
            'Approximate location derived from IP address;',
            'Website interaction information;',
            'Cookies and similar identifiers; and',
            'Analytics information.',
          ]}
        />
        <p className={bodyClass}>
          We may use analytics and website-management technologies, including Google
          Tag Manager and other analytics services, to understand how visitors
          use our website and to improve the Services.
        </p>
        <p className={bodyClass}>
          You can control or disable cookies through your browser settings. Disabling
          certain essential cookies may affect the functionality of the website or
          Services.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          2. How We Collect Personal Data
        </h2>
        <p className={bodyClass}>We collect personal data through:</p>
        <h3 className='text-lg font-semibold tracking-tight'>Directly from you</h3>
        <p className={bodyClass}>For example, when you:</p>
        <PolicyList
          items={[
            'Create an account;',
            'Update account information;',
            'Purchase credits or Services;',
            'Contact us;',
            'Submit a support request; or',
            'Make API requests.',
          ]}
        />
        <h3 className='text-lg font-semibold tracking-tight'>Automatically</h3>
        <p className={bodyClass}>For example, when you:</p>
        <PolicyList
          items={[
            'Visit our website;',
            'Sign in to the console;',
            'Use our API; or',
            'Interact with our Services.',
          ]}
        />
        <p className={bodyClass}>
          This may include technical logs, IP addresses, cookies, and service
          usage information.
        </p>
        <h3 className='text-lg font-semibold tracking-tight'>From service providers</h3>
        <p className={bodyClass}>
          We may receive information from third parties that help us operate the
          Services, such as payment processors, hosting providers, infrastructure
          providers, email providers, security services, and other technology
          providers.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          3. How We Use Personal Data
        </h2>
        <p className={bodyClass}>
          We may use personal data for the following purposes:
        </p>
        <PolicyList
          items={[
            'To create and manage accounts;',
            'To authenticate users;',
            'To issue, manage, and secure API keys;',
            'To provide and operate the Services;',
            'To route API requests to the applicable AI model provider;',
            'To return model responses to users;',
            'To measure API usage and token consumption;',
            'To enforce quotas and rate limits;',
            'To process payments and maintain billing records;',
            'To provide customer support;',
            'To diagnose errors and technical problems;',
            'To monitor system performance;',
            'To prevent fraud, abuse, attacks, and unauthorised access;',
            'To maintain the security and integrity of our systems;',
            'To communicate with you about your account, security, billing, and the Services;',
            'To understand and improve our website and Services;',
            'To comply with applicable laws and regulations;',
            'To establish, exercise, or defend legal claims; and',
            'To protect the rights, property, safety, and security of Fluxlane, our users, and others.',
          ]}
        />
        <p className={bodyClass}>
          Where required by applicable law, we will obtain consent before
          collecting, using, or disclosing personal data. We may also process
          personal data where permitted or required by applicable law without
          consent.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          4. Customer Content and AI Model Providers
        </h2>
        <p className={bodyClass}>
          Fluxlane provides an API gateway that allows users to access AI models
          provided by third-party model providers.
        </p>
        <p className={bodyClass}>
          When you submit a request through Fluxlane, the request may be transmitted
          to the applicable upstream AI model provider in order to provide the
          requested service.
        </p>
        <p className={bodyClass}>
          For example, a request submitted to a particular model through Fluxlane may
          need to be transmitted to the provider responsible for serving that
          model.
        </p>
        <h3 className='text-lg font-semibold tracking-tight'>4.1 Upstream Processing</h3>
        <p className={bodyClass}>
          The applicable AI model provider may process Customer Content in
          accordance with its own terms, documentation, and privacy practices.
        </p>
        <p className={bodyClass}>
          The way an upstream provider handles Customer Content may differ between
          providers and may change over time.
        </p>
        <p className={bodyClass}>
          You should review the applicable provider&apos;s terms and privacy
          documentation when using a particular model.
        </p>
        <h3 className='text-lg font-semibold tracking-tight'>
          4.2 Fluxlane&apos;s Use of Customer Content
        </h3>
        <p className={bodyClass}>
          Fluxlane does <strong>not sell Customer Content</strong>.
        </p>
        <p className={bodyClass}>We do not use Customer Content for advertising.</p>
        <p className={bodyClass}>
          We do not intentionally use Customer Content to train our own AI models.
        </p>
        <p className={bodyClass}>
          We may process and retain Customer Content to the extent reasonably
          necessary to:
        </p>
        <PolicyList
          items={[
            'Provide the requested API service;',
            'Maintain and operate the Services;',
            'Detect and investigate security incidents;',
            'Prevent abuse or misuse;',
            'Diagnose technical problems;',
            'Provide customer support;',
            'Comply with legal obligations; or',
            'Protect our rights and the security of the Services.',
          ]}
        />
        <h3 className='text-lg font-semibold tracking-tight'>4.3 Your Responsibilities</h3>
        <p className={bodyClass}>
          You are responsible for the information you submit through the Services.
        </p>
        <p className={bodyClass}>
          You should not submit sensitive personal information, confidential
          information, regulated data, or other information that you are not
          authorised to disclose unless the relevant use is permitted and
          appropriate safeguards are in place.
        </p>
        <p className={bodyClass}>
          If you use Fluxlane on behalf of an organisation, you represent that you
          are authorised to do so and that the organisation has the appropriate rights
          and permissions for the data submitted through the Services.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          5. Service Providers and Disclosure of Personal Data
        </h2>
        <p className={bodyClass}>
          We may disclose personal data to third parties where reasonably necessary
          to operate the Services or for the purposes described in this Policy.
        </p>
        <p className={bodyClass}>These third parties may include:</p>
        <PolicyList
          items={[
            'AI model providers;',
            'Payment processors;',
            'Cloud and hosting providers;',
            'Database and infrastructure providers;',
            'Content-delivery and network providers;',
            'Email and communication providers;',
            'Security and monitoring providers;',
            'Error monitoring and technical service providers;',
            'Professional advisers, including legal, accounting, and financial advisers; and',
            'Government authorities or regulators where required or permitted by law.',
          ]}
        />
        <p className={bodyClass}>
          We may also disclose information in connection with a merger, acquisition,
          financing, restructuring, sale of assets, or other corporate transaction
          involving Fluxlane.
        </p>
        <p className={bodyClass}>
          We do <strong>not sell personal data</strong> to third parties.
        </p>
        <p className={bodyClass}>
          We seek to require relevant service providers to protect personal data
          appropriately and to process it only for legitimate purposes connected
          with the Services or their relationship with Fluxlane.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          6. International Data Transfers
        </h2>
        <p className={bodyClass}>Fluxlane is incorporated in Singapore.</p>
        <p className={bodyClass}>
          Some of our service providers and upstream AI model providers may operate
          or process information outside Singapore.
        </p>
        <p className={bodyClass}>
          As a result, personal data may be transferred to and processed in
          countries outside Singapore.
        </p>
        <p className={bodyClass}>
          Where personal data is transferred outside Singapore, we take steps
          required under applicable data protection laws to ensure that the
          transferred personal data receives a standard of protection comparable
          to that required under the Singapore PDPA, including contractual or other
          appropriate safeguards where applicable.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>7. Data Retention</h2>
        <p className={bodyClass}>
          We retain personal data only for as long as reasonably necessary for the
          purposes described in this Policy, including to:
        </p>
        <PolicyList
          items={[
            'Provide the Services;',
            'Maintain account information;',
            'Maintain billing and transaction records;',
            'Detect and investigate security incidents;',
            'Resolve disputes;',
            'Enforce our agreements;',
            'Comply with accounting, tax, regulatory, and legal obligations; and',
            'Protect the security and integrity of our Services.',
          ]}
        />
        <p className={bodyClass}>
          Different categories of information may be retained for different
          periods.
        </p>
        <p className={bodyClass}>
          We do not retain personal data indefinitely where it is no longer
          reasonably required for a business or legal purpose.
        </p>
        <p className={bodyClass}>
          When personal data is no longer required, we may delete, anonymise, or
          securely isolate it in accordance with our applicable retention practices.
        </p>
        <p className={bodyClass}>
          Because Fluxlane is an API gateway, certain technical and usage records may
          need to be retained for a period of time to maintain billing accuracy,
          security, abuse prevention, troubleshooting, and service reliability.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>8. Security</h2>
        <p className={bodyClass}>
          We take reasonable technical and organisational measures designed to
          protect personal data against unauthorised access, collection, use,
          disclosure, alteration, or destruction.
        </p>
        <p className={bodyClass}>
          Depending on the nature of the information and the Services involved,
          these measures may include:
        </p>
        <PolicyList
          items={[
            'Network access controls and firewalls;',
            'Separation of public-facing and backend services;',
            'Separation of application and database environments;',
            'Access controls for production systems;',
            'Encryption in transit where appropriate;',
            'Password hashing;',
            'API authentication and access controls;',
            'Logging and monitoring;',
            'Least-privilege access where reasonably practicable; and',
            'Measures designed to detect and prevent unauthorised access and abuse.',
          ]}
        />
        <p className={bodyClass}>
          However, no method of transmission, storage, or electronic security is
          completely secure.
        </p>
        <p className={bodyClass}>
          You are responsible for protecting your account credentials and API keys
          and should not disclose API keys to unauthorised persons.
        </p>
        <p className={bodyClass}>
          If you believe that your account or API key has been compromised, you
          should immediately revoke the affected key and contact us.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>9. Data Breach</h2>
        <p className={bodyClass}>
          If Fluxlane becomes aware of a data breach involving personal data, we
          will assess the incident and take appropriate steps in accordance with
          applicable law.
        </p>
        <p className={bodyClass}>
          Where applicable law requires notification to affected individuals or
          regulators, we will make the required notifications within the applicable
          timeframes.
        </p>
        <p className={bodyClass}>
          We may also take measures such as restricting access, revoking
          credentials, investigating the incident, and implementing remedial
          measures.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          10. Your Rights and Choices
        </h2>
        <p className={bodyClass}>
          Subject to applicable law and relevant exceptions, you may have
          rights to:
        </p>
        <PolicyList
          items={[
            'Request access to personal data that we hold about you;',
            'Request information about how we have used or disclosed your personal data;',
            'Request correction of inaccurate or incomplete personal data;',
            'Withdraw consent where we rely on consent as the legal basis for processing;',
            'Request deletion or cessation of processing where applicable under relevant law; and',
            'Close your Fluxlane account.',
          ]}
        />
        <p className={bodyClass}>
          Withdrawing consent does not affect processing that we are permitted or
          required to continue under applicable law.
        </p>
        <p className={bodyClass}>
          Depending on the nature of your request, withdrawing consent or deleting
          certain information may affect our ability to continue providing some
          or all of the Services.
        </p>
        <p className={bodyClass}>You may also:</p>
        <PolicyList
          items={[
            'Update certain account information through the Fluxlane console;',
            'Revoke API keys that you no longer need; and',
            'Manage cookies through your browser settings.',
          ]}
        />
        <p className={bodyClass}>
          We may need to verify your identity before processing certain privacy
          requests.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          11. Data Protection Officer
        </h2>
        <p className={bodyClass}>
          Fluxlane has designated a person responsible for overseeing data
          protection matters and handling privacy-related enquiries.
        </p>
        <p className={bodyClass}>
          For privacy questions, access requests, correction requests, consent
          withdrawal requests, or complaints relating to personal data, please
          contact:
        </p>
        <p className={bodyClass}>
          <strong>Data Protection Officer</strong>
          <br />
          <strong>{FLUXLANE_LEGAL_ENTITY}</strong>
          <br />
          Email:{' '}
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
        </p>
        <p className={bodyClass}>
          We will consider and respond to privacy requests within the timeframe
          required by applicable law or, where no specific timeframe applies, within
          a reasonable period.
        </p>
        <p className={bodyClass}>
          If you are not satisfied with our response, you may contact the{' '}
          <strong>Personal Data Protection Commission of Singapore (PDPC)</strong>{' '}
          or the relevant data protection authority applicable to your circumstances.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>12. Children</h2>
        <p className={bodyClass}>The Services are not directed to children.</p>
        <p className={bodyClass}>
          We do not knowingly collect personal data from children where such
          collection is prohibited by applicable law.
        </p>
        <p className={bodyClass}>
          If you believe that a child has provided personal data to Fluxlane,
          please contact us at:
        </p>
        <p className={bodyClass}>
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
        </p>
        <p className={bodyClass}>
          We will take reasonable steps to investigate and, where appropriate,
          delete the relevant information.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          13. Third-Party Websites and Services
        </h2>
        <p className={bodyClass}>
          The Services may contain links to third-party websites, documentation,
          AI model providers, payment providers, or other services.
        </p>
        <p className={bodyClass}>
          Those third parties operate under their own terms and privacy policies.
        </p>
        <p className={bodyClass}>
          Fluxlane is not responsible for the privacy practices of third-party
          services that we do not control.
        </p>
        <p className={bodyClass}>
          We recommend reviewing the applicable third party&apos;s privacy policy
          before providing personal data or Customer Content to that service.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>
          14. Changes to This Privacy Policy
        </h2>
        <p className={bodyClass}>
          We may update this Privacy Policy from time to time to reflect changes
          to our Services, business practices, legal requirements, or data
          protection practices.
        </p>
        <p className={bodyClass}>The updated version will be published at:</p>
        <p className={bodyClass}>
          <ExternalLink href={privacyPageUrl}>{privacyPageUrl}</ExternalLink>
        </p>
        <p className={bodyClass}>
          The &quot;Last Updated&quot; date at the beginning of this Policy will
          indicate when the Policy was most recently revised.
        </p>
        <p className={bodyClass}>
          Where required by applicable law, we will provide additional notice or
          obtain consent for material changes.
        </p>
      </section>

      <section className='space-y-4'>
        <h2 className='text-xl font-semibold tracking-tight'>15. Contact Us</h2>
        <p className={bodyClass}>
          If you have questions about this Privacy Policy or how Fluxlane handles
          personal data, please contact us.
        </p>
        <p className={bodyClass}>
          <strong>{FLUXLANE_LEGAL_ENTITY}</strong>
        </p>
        <p className={bodyClass}>
          Email:{' '}
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
        </p>
        <p className={bodyClass}>
          Website:{' '}
          <ExternalLink href={FLUXLANE_PUBLIC_SITE}>
            {FLUXLANE_PUBLIC_SITE}
          </ExternalLink>
        </p>
        <p className={bodyClass}>
          For data protection matters, you may also contact our Data Protection
          Officer at:
        </p>
        <p className={bodyClass}>
          <ExternalLink href={privacyMailto}>
            {FLUXLANE_PRIVACY_EMAIL}
          </ExternalLink>
        </p>
      </section>
    </article>
  )
}
