/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import { ArrowRight, Code2, Eye, Network, ShieldCheck } from 'lucide-react'

import { Footer } from '@/components/layout/components/footer'
import { Button } from '@/components/ui/button'

const values = [
  {
    icon: Code2,
    title: '保持简单',
    description:
      '用统一接口和清晰文档降低接入成本，让团队专注于产品创新，而非繁琐的适配。',
    accent: 'text-violet-400',
  },
  {
    icon: Eye,
    title: '透明可信',
    description:
      '明确展示价格、Token 用量和消费记录，让成本可理解、可追踪，杜绝隐形开销。',
    accent: 'text-cyan-400',
  },
  {
    icon: ShieldCheck,
    title: '稳定优先',
    description:
      '通过持续压测、容量保护、监控告警和故障演练保障每次请求，构建企业级高可用架构。',
    accent: 'text-purple-300',
  },
]

export function FluxlaneAbout() {
  return (
    <>
      <main className='relative overflow-hidden pt-20'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-[0.06]'
        />

        <section className='mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28'>
          <div className='space-y-6'>
            <span className='inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold tracking-widest text-violet-300 uppercase'>
              About Fluxlane.ai
            </span>
            <h1 className='text-[clamp(2.35rem,5vw,3.6rem)] leading-[1.1] font-bold tracking-tight'>
              让 AI 能力更顺畅地进入每一个产品
            </h1>
            <p className='text-muted-foreground max-w-xl text-base leading-relaxed'>
              Fluxlane.ai
              提供统一、稳定、透明的 AI 模型 API 服务，帮助开发者与企业简化模型接入和用量管理，降低开发与运维成本，让
              AI 产品更快从创意走向生产。
            </p>
            <div className='flex flex-wrap gap-3 pt-2'>
              <Button render={<Link to='/sign-up' />}>创建账号</Button>
              <Button
                variant='outline'
                render={
                  <a
                    href='https://doc.fluxlane.ai'
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                }
              >
                查看文档
              </Button>
            </div>
          </div>

          <div className='border-border/50 bg-muted/10 relative flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border'>
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,210,253,0.18),transparent_60%)]' />
            <Network className='size-28 text-cyan-300/70' strokeWidth={1} />
            <div className='bg-background/75 border-border/50 absolute right-5 bottom-5 left-5 flex items-center gap-3 rounded-xl border p-4 backdrop-blur-xl'>
              <span className='relative flex size-2'>
                <span className='absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70' />
                <span className='relative inline-flex size-2 rounded-full bg-emerald-400' />
              </span>
              <span className='font-mono text-sm'>API Gateway Active</span>
            </div>
          </div>
        </section>

        <section className='border-border/40 border-t'>
          <div className='mx-auto max-w-3xl space-y-6 px-6 py-20'>
            <p className='text-xs font-semibold tracking-widest text-cyan-400 uppercase'>
              关于我们
            </p>
            <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
              连接模型、开发者与真实业务
            </h2>
            <div className='text-muted-foreground space-y-5 leading-relaxed'>
              <p>
                Fluxlane.ai
                是面向开发者与企业的 AI 模型 API 聚合与用量管理平台。通过兼容 OpenAI
                的统一接口，开发者无需针对不同模型重复适配，即可完成模型调用、Token
                管理、用量查询与成本核对。
              </p>
              <p>
                平台已接入多家权威模型服务，并通过标准化接入层屏蔽不同模型与服务商之间的调用差异，为业务提供更简单、更稳定、更易管理的
                AI 基础设施。
              </p>
            </div>
          </div>
        </section>

        <section className='border-border/40 border-t'>
          <div className='mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2'>
            <div className='space-y-5'>
              <p className='text-xs font-semibold tracking-widest text-cyan-400 uppercase'>
                Our Backing
              </p>
              <div className='text-muted-foreground space-y-4 leading-relaxed'>
                <p>
                  Fluxlane.ai 是 Access Technology Ventures 控股并支持发展的 AI
                  基础设施平台，由卓普云科技日常运营。Access Technology Ventures 是
                  Access Industries 旗下专注科技领域的长期投资平台。
                </p>
                <p>
                  其科技投资组合包括 DigitalOcean、Alibaba、Amazon、Agora、Pinduoduo、PingCAP、SpaceX
                  和 Zhihu 等企业。
                </p>
              </div>
              <a
                className='inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline'
                href='https://www.accesstechnologyventures.com'
                target='_blank'
                rel='noopener noreferrer'
              >
                了解 Access Technology Ventures <ArrowRight className='size-4' />
              </a>
              <a
                className='inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline'
                href='https://www.aidroplet.com'
                target='_blank'
                rel='noopener noreferrer'
              >
                了解 卓普云科技 AI Droplet <ArrowRight className='size-4' />
              </a>
            </div>
            <div className='border-border/50 bg-muted/15 rounded-2xl border p-8'>
              <h3 className='text-xl font-semibold'>长期资本，长期建设</h3>
              <p className='text-muted-foreground mt-4 leading-relaxed'>
                Access 强调灵活、长期的合作方式，为消费科技、企业软件、云计算与基础设施领域的成长型公司提供资本和战略支持。
              </p>
              <div className='mt-8 grid grid-cols-2 gap-3'>
                {['DigitalOcean', 'SpaceX', 'Amazon', 'Alibaba'].map((name) => (
                  <div key={name} className='border-border/50 rounded-lg border px-3 py-2 text-center text-xs'>
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className='border-border/40 border-y'>
          <div className='mx-auto max-w-6xl px-6 py-20'>
            <div className='mb-12 text-center'>
              <p className='text-xs font-semibold tracking-widest text-violet-300 uppercase'>我们的价值观</p>
              <h2 className='mt-3 text-2xl font-bold tracking-tight md:text-3xl'>以可靠工程和清晰体验创造长期价值</h2>
            </div>
            <div className='grid gap-5 md:grid-cols-3'>
              {values.map(({ icon: Icon, title, description, accent }) => (
                <article key={title} className='border-border/50 bg-muted/10 rounded-2xl border p-7'>
                  <Icon className={`size-7 ${accent}`} />
                  <h3 className='mt-6 text-lg font-semibold'>{title}</h3>
                  <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
