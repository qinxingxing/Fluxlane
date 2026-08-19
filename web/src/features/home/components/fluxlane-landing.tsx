/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Globe2,
  Gauge,
  ShieldCheck,
  Zap,
} from 'lucide-react'

import { Footer } from '@/components/layout/components/footer'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

interface FluxlaneLandingProps {
  isAuthenticated: boolean
}

const stats = [
  ['50+', '上游服务适配'],
  ['100+', '模型计费支持'],
  ['50+', '兼容 API 路由'],
  ['10+', '调度控制能力'],
]

const features = [
  {
    icon: Zap,
    title: '极速',
    description: '优化的网络层与智能路由，面向高并发、高吞吐场景提供稳定响应。',
    color: 'text-cyan-300',
  },
  {
    icon: ShieldCheck,
    title: '安全可靠',
    description: '企业级安全防护、Token 权限控制、用量审计与透明计费。',
    color: 'text-violet-300',
  },
  {
    icon: Globe2,
    title: '全球覆盖',
    description: '通过统一接口连接多个模型服务，降低跨供应商接入和维护成本。',
    color: 'text-cyan-300',
  },
]

export function FluxlaneLanding({
  isAuthenticated,
}: FluxlaneLandingProps) {
  const { status } = useStatus()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://doc.fluxlane.ai'

  return (
    <div className='min-h-screen bg-[#0c112e] text-[#dee0ff]'>
      <main className='relative overflow-hidden pt-16'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:40px_40px]'
        />

        <section className='relative mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center md:py-28'>
          <div className='absolute inset-x-1/4 top-12 h-72 rounded-full bg-violet-600/20 blur-[110px]' />
          <p className='relative mb-5 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-cyan-300 uppercase'>
            Fluxlane · AI Application Infrastructure
          </p>
          <h1 className='relative max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.08] font-bold tracking-[-0.035em]'>
            统一 API 网关，服务于
            <span className='mt-2 block bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent'>
              海量 AI 模型
            </span>
          </h1>
          <p className='relative mt-6 max-w-2xl text-base leading-relaxed text-[#ccc3d7] md:text-lg'>
            通过统一、标准的接口协议接入海量模型。承载 AI 应用，高效管理数字资产，连接未来。
          </p>
          <div className='relative mt-9 flex flex-wrap justify-center gap-3'>
            <Button
              className='h-12 bg-gradient-to-r from-violet-600 to-purple-500 px-7 text-white shadow-[0_0_24px_rgba(109,40,217,0.35)] hover:from-violet-500 hover:to-purple-400'
              render={<Link to={isAuthenticated ? '/dashboard' : '/sign-up'} />}
            >
              {isAuthenticated ? '进入控制台' : '立即开始'}
              <ArrowRight className='ml-1 size-4' />
            </Button>
            <Button
              variant='outline'
              className='h-12 border-cyan-300/50 bg-transparent px-7 text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-200'
              render={<a href={docsUrl} target='_blank' rel='noopener noreferrer' />}
            >
              <BookOpen className='mr-1 size-4' />
              查看文档
            </Button>
          </div>

          <div className='relative mt-16 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#070b28]/90 text-left shadow-[0_0_40px_rgba(0,210,253,0.10)]'>
            <div className='flex h-11 items-center justify-between border-b border-white/10 bg-[#191d3b] px-4'>
              <div className='flex gap-1.5'>
                <span className='size-2.5 rounded-full bg-rose-400/80' />
                <span className='size-2.5 rounded-full bg-amber-300/80' />
                <span className='size-2.5 rounded-full bg-emerald-400/80' />
              </div>
              <span className='font-mono text-[10px] tracking-widest text-[#958da1] uppercase'>API Gateway · Live</span>
              <Copy className='size-4 text-[#958da1]' />
            </div>
            <div className='grid gap-0 md:grid-cols-[1.25fr_0.75fr]'>
              <pre className='overflow-x-auto p-6 font-mono text-xs leading-7 text-[#ccc3d7] md:text-sm'>
                <code>
                  <span className='text-fuchsia-300'>curl</span>{' '}
                  <span className='text-cyan-300'>-X POST</span>{' '}
                  <span className='text-emerald-300'>https://www.fluxlane.ai/v1/chat/completions</span>
                  {'\n'}  -H <span className='text-amber-200'>&quot;Authorization: Bearer $FLUXLANE_API_KEY&quot;</span>
                  {'\n'}  -d <span className='text-amber-100'>{'{"model":"your-model","messages":[...]}'}</span>
                </code>
              </pre>
              <div className='flex flex-col justify-center gap-3 border-t border-white/10 bg-[#141936]/70 p-6 md:border-t-0 md:border-l'>
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-xs text-[#958da1]'>STATUS</span>
                  <span className='flex items-center gap-2 font-mono text-xs text-emerald-300'><CheckCircle2 className='size-4' /> 200 OK</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-xs text-[#958da1]'>ENDPOINT</span>
                  <span className='font-mono text-xs text-cyan-300'>OpenAI Compatible</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-xs text-[#958da1]'>BILLING</span>
                  <span className='font-mono text-xs text-violet-300'>Usage Based</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='relative border-y border-white/5 bg-[#0c112e]/80'>
          <div className='mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-11 md:grid-cols-4'>
            {stats.map(([value, label], index) => (
              <div key={label} className='text-center'>
                <p className={`text-3xl font-bold md:text-4xl ${index % 2 === 0 ? 'text-violet-300' : 'text-cyan-300'}`}>{value}</p>
                <p className='mt-2 font-mono text-[10px] tracking-widest text-[#958da1] uppercase'>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id='features' className='relative mx-auto max-w-7xl scroll-mt-20 px-6 py-24'>
          <div className='mb-14 text-center'>
            <p className='font-mono text-xs font-semibold tracking-widest text-cyan-300 uppercase'>Core Features</p>
            <h2 className='mt-4 text-3xl font-bold tracking-tight md:text-4xl'>为开发者打造，为规模而设计</h2>
          </div>
          <div className='grid gap-6 md:grid-cols-3'>
            {features.map(({ icon: Icon, title, description, color }) => (
              <article key={title} className='group relative overflow-hidden rounded-2xl border border-white/10 bg-[#161b33] p-8 transition hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_0_28px_rgba(109,40,217,0.18)]'>
                <div className='absolute -top-12 -right-12 size-36 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-violet-500/20' />
                <Icon className={`relative size-8 ${color}`} />
                <h3 className='relative mt-6 text-xl font-semibold'>{title}</h3>
                <p className='relative mt-3 text-sm leading-relaxed text-[#ccc3d7]'>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='relative mx-auto max-w-7xl px-6 pb-24'>
          <div className='rounded-2xl border border-white/10 bg-[#191d3b]/70 p-8 md:p-12'>
            <div className='grid items-center gap-10 md:grid-cols-2'>
              <div>
                <Gauge className='size-9 text-cyan-300' />
                <h2 className='mt-5 text-3xl font-bold'>三步快速接入</h2>
                <p className='mt-4 text-[#ccc3d7]'>创建账号和 API Key，选择适合的模型，将现有 OpenAI SDK 端点替换为 Fluxlane。</p>
              </div>
              <div className='space-y-4'>
                {[
                  ['01', '创建 API Key'],
                  ['02', '选择模型与计费组'],
                  ['03', '调用统一 API 端点'],
                ].map(([step, label]) => (
                  <div key={step} className='flex items-center gap-4 rounded-xl border border-white/10 bg-[#070b28]/60 p-4'>
                    <span className='font-mono text-sm text-violet-300'>{step}</span>
                    <span className='text-sm font-medium'>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
