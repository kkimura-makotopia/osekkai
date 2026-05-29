'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { INDUSTRIES } from '@/lib/industries'
import { JOB_TITLES } from '@/lib/jobTitles'
import { REVENUE_RANGES, FISCAL_MONTHS, MARKETING_CHANNELS } from '@/lib/profileOptions'

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
  snsLinks: Record<string, string>
}

const emptyForm: FormState = {
  fullName: '', company: '', jobTitle: '', bio: '', industry: '', employeeCount: '',
  recentRevenue: '', fiscalMonth: '', targetRevenueScale: '', marketingChannels: [],
  snsLinks: {},
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

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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

  const monthLabel = (m: number | null) => m ? `${m}月` : '未設定'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">マイページ</h1>

      {/* Profile Card */}
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

        {editing ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">氏名</label>
                <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">会社名</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">役職</label>
                <select value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">業界</label>
                <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">従業員数(業務委託なども含む)</label>
                <input type="number" min="0" value={form.employeeCount}
                  onChange={e => setForm(p => ({ ...p, employeeCount: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="例: 50"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">決算月</label>
                <select value={form.fiscalMonth} onChange={e => setForm(p => ({ ...p, fiscalMonth: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {FISCAL_MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">直近の確定している期の売上</label>
                <select value={form.recentRevenue} onChange={e => setForm(p => ({ ...p, recentRevenue: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">メイン商材のターゲット売上規模</label>
                <select value={form.targetRevenueScale} onChange={e => setForm(p => ({ ...p, targetRevenueScale: e.target.value }))}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* マーケティングチャネル（複数選択） */}
            <div>
              <label className="text-slate-400 text-sm block mb-2">現在使っているマーケティングチャネル（複数選択可）</label>
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
              <label className="text-slate-400 text-sm block mb-1">自己紹介(経歴や事業内容)</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={5} placeholder="経歴や現在の事業内容などを自由にご記入ください"
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky resize-none" />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-2">SNSリンク</label>
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
        ) : (
          <div className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              {profile.industry && <InfoRow label="業界" value={profile.industry} />}
              {profile.employeeCount != null && <InfoRow label="従業員数" value={`${profile.employeeCount}名`} />}
              {profile.fiscalMonth != null && <InfoRow label="決算月" value={monthLabel(profile.fiscalMonth)} />}
              {profile.recentRevenue && <InfoRow label="直近期売上" value={profile.recentRevenue} />}
              {profile.targetRevenueScale && <InfoRow label="ターゲット売上規模" value={profile.targetRevenueScale} />}
            </div>
            {profile.marketingChannels?.length > 0 && (
              <div className="pt-2">
                <p className="text-slate-500 text-xs mb-1">利用中マーケチャネル</p>
                <div className="flex gap-1.5 flex-wrap">
                  {profile.marketingChannels.map(c => (
                    <span key={c} className="text-xs bg-brand-navy-700 text-slate-200 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.bio && <p className="text-slate-300 text-sm mt-4 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>}
            {Object.entries(profile.snsLinks ?? {}).filter(([k, v]) => v && SNS_FIELDS.some(f => f.key === k)).length > 0 && (
              <div className="flex gap-3 flex-wrap pt-3">
                {SNS_FIELDS.map(f => {
                  const url = (profile.snsLinks ?? {})[f.key]
                  if (!url) return null
                  return <a key={f.key} href={url} target="_blank" rel="noopener noreferrer" className="text-brand-sky-400 hover:text-brand-sky text-sm underline">{f.label}</a>
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 w-32 shrink-0">{label}:</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}
