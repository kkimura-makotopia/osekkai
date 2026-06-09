'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { INDUSTRIES } from '@/lib/industries'
import { JOB_TITLES } from '@/lib/jobTitles'
import { REVENUE_RANGES, FISCAL_MONTHS, MARKETING_CHANNELS, OPERATING_MARGINS, REVENUE_GROWTH_RATES } from '@/lib/profileOptions'
import { isPublicField } from '@/lib/publicFields'

interface BreakdownItem { name: string; percentage: number | '' }

interface UserProfile {
  id: string
  email: string
  name: string | null
  fullName: string | null
  company: string | null
  jobTitle: string | null
  bio: string | null
  industry: string | null
  employeeCount: number | null
  recentRevenue: string | null
  fiscalMonth: number | null
  targetRevenueScale: string | null
  marketingChannels: string[]
  foundingYear: number | null
  fullTimeEmployees: string | null
  branchCount: string | null
  operatingMargin: string | null
  serviceUnitPrice: string | null
  serviceBreakdown: BreakdownItem[]
  customerCount: string | null
  revenueGrowth: string | null
  image: string | null
  role: string
  snsLinks: Record<string, string>
}

const SNS_FIELDS = [
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'website', label: 'Webサイト', placeholder: 'https://...' },
]

interface FormState {
  fullName: string
  company: string
  jobTitle: string
  bio: string
  industry: string
  employeeCount: string | number
  recentRevenue: string
  fiscalMonth: string | number
  targetRevenueScale: string
  marketingChannels: string[]
  foundingYear: string | number
  fullTimeEmployees: string
  branchCount: string
  operatingMargin: string
  serviceUnitPrice: string
  serviceBreakdown: BreakdownItem[]
  customerCount: string
  revenueGrowth: string
  snsLinks: Record<string, string>
}

const emptyForm: FormState = {
  fullName: '', company: '', jobTitle: '', bio: '', industry: '', employeeCount: '',
  recentRevenue: '', fiscalMonth: '', targetRevenueScale: '', marketingChannels: [],
  foundingYear: '', fullTimeEmployees: '', branchCount: '', operatingMargin: '',
  serviceUnitPrice: '', serviceBreakdown: [], customerCount: '', revenueGrowth: '',
  snsLinks: {},
}

function FieldLabel({ children, field }: { children: React.ReactNode; field: string }) {
  const isPublic = isPublicField(field)
  return (
    <div className="flex items-center gap-2 mb-1">
      <label className="text-slate-400 text-sm">{children}</label>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
        isPublic
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
      }`}>
        {isPublic ? '公開' : '非公開'}
      </span>
    </div>
  )
}

export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/users').then(r => r.json()).then(users => {
      const me = Array.isArray(users) ? users.find((u: UserProfile) => u.id === session.dbUserId) : null
      if (me) {
        setProfile(me)
        setForm({
          fullName: me.fullName ?? '',
          company: me.company ?? '',
          jobTitle: me.jobTitle ?? '',
          bio: me.bio ?? '',
          industry: me.industry ?? '',
          employeeCount: me.employeeCount ?? '',
          recentRevenue: me.recentRevenue ?? '',
          fiscalMonth: me.fiscalMonth ?? '',
          targetRevenueScale: me.targetRevenueScale ?? '',
          marketingChannels: Array.isArray(me.marketingChannels) ? me.marketingChannels : [],
          foundingYear: me.foundingYear ?? '',
          fullTimeEmployees: me.fullTimeEmployees ?? '',
          branchCount: me.branchCount ?? '',
          operatingMargin: me.operatingMargin ?? '',
          serviceUnitPrice: me.serviceUnitPrice ?? '',
          serviceBreakdown: Array.isArray(me.serviceBreakdown)
            ? me.serviceBreakdown.map(it => ({ name: it.name ?? '', percentage: typeof it.percentage === 'number' ? it.percentage : '' }))
            : [],
          customerCount: me.customerCount ?? '',
          revenueGrowth: me.revenueGrowth ?? '',
          snsLinks: (me.snsLinks as Record<string, string>) ?? {},
        })
      }
      setLoading(false)
    })
  }, [status, session, router])

  const toggleChannel = (c: string) => {
    setForm(p => ({
      ...p,
      marketingChannels: p.marketingChannels.includes(c)
        ? p.marketingChannels.filter(x => x !== c)
        : [...p.marketingChannels, c],
    }))
  }

  // サービス売上構成比 — 操作系
  const addBreakdownItem = () => setForm(p => ({ ...p, serviceBreakdown: [...p.serviceBreakdown, { name: '', percentage: '' }] }))
  const removeBreakdownItem = (i: number) => setForm(p => ({ ...p, serviceBreakdown: p.serviceBreakdown.filter((_, idx) => idx !== i) }))
  const updateBreakdownItem = (i: number, patch: Partial<BreakdownItem>) => setForm(p => ({
    ...p,
    serviceBreakdown: p.serviceBreakdown.map((it, idx) => idx === i ? { ...it, ...patch } : it),
  }))

  const breakdownTotal = form.serviceBreakdown.reduce((s, it) => s + (typeof it.percentage === 'number' ? it.percentage : 0), 0)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      serviceBreakdown: form.serviceBreakdown
        .filter(it => it.name.trim())
        .map(it => ({ name: it.name.trim(), percentage: typeof it.percentage === 'number' ? it.percentage : 0 })),
    }
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated = await res.json()
      setProfile(prev => prev ? { ...prev, ...updated } : null)
      setEditing(false)
    }
    setSaving(false)
  }

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>
  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">マイページ</h1>

      <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-sky flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {profile.image ? <Image src={profile.image} alt="" width={64} height={64} className="rounded-full" /> : (profile.fullName ?? profile.name ?? 'U')[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.fullName ?? profile.name ?? '名前未設定'}</h2>
              <p className="text-slate-400">{profile.company ?? '会社未設定'} {profile.jobTitle ? `· ${profile.jobTitle}` : ''}</p>
              <p className="text-slate-500 text-sm">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="bg-brand-navy-700 hover:bg-brand-navy-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {editing ? '閉じる' : '編集'}
          </button>
        </div>

        {editing && (
          <div className="space-y-4">
            <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2 mb-2">
              <span className="text-emerald-400 shrink-0">●</span>
              <span>
                <strong className="text-emerald-400">公開</strong>項目は「おせっかい一覧」などで他会員に表示されます。
                <strong className="text-slate-300 ml-2">非公開</strong>項目は運営管理者と自分のみ閲覧可能です。
              </span>
            </div>

            {/* 基本情報 */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel field="fullName">氏名</FieldLabel>
                <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="company">会社名</FieldLabel>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="jobTitle">役職</FieldLabel>
                <select value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="industry">業界</FieldLabel>
                <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="employeeCount">従業員数(業務委託なども含む)</FieldLabel>
                <input type="number" min="0" value={form.employeeCount}
                  onChange={e => setForm(p => ({ ...p, employeeCount: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="例: 50"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="foundingYear">設立年</FieldLabel>
                <input type="number" min="1800" max="2099" value={form.foundingYear}
                  onChange={e => setForm(p => ({ ...p, foundingYear: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="例: 2015"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="fullTimeEmployees">正社員数</FieldLabel>
                <input value={form.fullTimeEmployees} onChange={e => setForm(p => ({ ...p, fullTimeEmployees: e.target.value }))}
                  placeholder="例: 30名 / 約20名"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="branchCount">拠点数</FieldLabel>
                <input value={form.branchCount} onChange={e => setForm(p => ({ ...p, branchCount: e.target.value }))}
                  placeholder="例: 3拠点 / 全国15拠点"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="fiscalMonth">決算月</FieldLabel>
                <select value={form.fiscalMonth} onChange={e => setForm(p => ({ ...p, fiscalMonth: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="recentRevenue">直近の確定している期の売上</FieldLabel>
                <select value={form.recentRevenue} onChange={e => setForm(p => ({ ...p, recentRevenue: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="targetRevenueScale">メイン商材のターゲット売上規模</FieldLabel>
                <select value={form.targetRevenueScale} onChange={e => setForm(p => ({ ...p, targetRevenueScale: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="operatingMargin">営業利益率</FieldLabel>
                <select value={form.operatingMargin} onChange={e => setForm(p => ({ ...p, operatingMargin: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {OPERATING_MARGINS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel field="serviceUnitPrice">サービス平均単価</FieldLabel>
                <input value={form.serviceUnitPrice} onChange={e => setForm(p => ({ ...p, serviceUnitPrice: e.target.value }))}
                  placeholder="例: 月額10万円 / 単発100万円"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="customerCount">顧客数</FieldLabel>
                <input value={form.customerCount} onChange={e => setForm(p => ({ ...p, customerCount: e.target.value }))}
                  placeholder="例: 100社 / 月間1万人"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <FieldLabel field="revenueGrowth">3年前からの売上成長率</FieldLabel>
                <select value={form.revenueGrowth} onChange={e => setForm(p => ({ ...p, revenueGrowth: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {REVENUE_GROWTH_RATES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* サービスの売上構成比 */}
            <div>
              <FieldLabel field="serviceBreakdown">サービスの売上構成比</FieldLabel>
              <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 space-y-2">
                {form.serviceBreakdown.length === 0 && <p className="text-slate-500 text-xs">「+ 追加」で事業を追加してください</p>}
                {form.serviceBreakdown.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={item.name}
                      onChange={e => updateBreakdownItem(i, { name: e.target.value })}
                      placeholder="事業名（例: A事業）"
                      className="flex-1 bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.percentage}
                      onChange={e => updateBreakdownItem(i, { percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="%"
                      className="w-20 bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-2 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky"
                    />
                    <span className="text-slate-400 text-sm shrink-0">%</span>
                    <button type="button" onClick={() => removeBreakdownItem(i)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 shrink-0">削除</button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1">
                  <button type="button" onClick={addBreakdownItem}
                    className="bg-brand-navy-700 hover:bg-brand-navy-900 text-white px-3 py-1.5 rounded-lg text-xs">
                    + 事業を追加
                  </button>
                  {form.serviceBreakdown.length > 0 && (
                    <span className={`text-xs ${breakdownTotal === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      合計: {breakdownTotal}%{breakdownTotal !== 100 && '（100%にしてください）'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* マーケティングチャネル */}
            <div>
              <FieldLabel field="marketingChannels">現在使っているマーケティングチャネル(複数選択可)</FieldLabel>
              <div className="grid sm:grid-cols-2 gap-1 bg-brand-navy-900 border border-brand-navy-700 rounded-xl p-3 max-h-64 overflow-y-auto">
                {MARKETING_CHANNELS.map(c => {
                  const on = form.marketingChannels.includes(c)
                  return (
                    <label key={c} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-brand-navy-700 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={() => toggleChannel(c)}
                        className="w-4 h-4 accent-brand-sky" />
                      <span className="text-slate-200 text-sm">{c}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <FieldLabel field="bio">自己紹介(経歴や事業内容)</FieldLabel>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={5} placeholder="経歴や現在の事業内容などを自由にご記入ください"
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky resize-none" />
            </div>
            <div>
              <FieldLabel field="snsLinks">SNSリンク</FieldLabel>
              <div className="space-y-2">
                {SNS_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm w-28 shrink-0">{field.label}</span>
                    <input
                      value={form.snsLinks[field.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, snsLinks: { ...p.snsLinks, [field.key]: e.target.value } }))}
                      placeholder={field.placeholder}
                      className="flex-1 bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="bg-brand-sky hover:bg-brand-sky-400 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
