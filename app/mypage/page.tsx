'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { INDUSTRIES } from '@/lib/industries'
import { JOB_TITLES } from '@/lib/jobTitles'

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
  image: string | null
  role: string
  snsLinks: Record<string, string>
}

const SNS_FIELDS = [
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'website', label: 'Webサイト', placeholder: 'https://...' },
]

export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ fullName: '', company: '', jobTitle: '', bio: '', industry: '', employeeCount: '' as string | number | '', snsLinks: {} as Record<string, string> })
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
          snsLinks: (me.snsLinks as Record<string, string>) ?? {},
        })
      }
      setLoading(false)
    })
  }, [status, session, router])

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

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">マイページ</h1>

      {/* Profile Card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
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
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
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
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">会社名</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">役職</label>
                <select value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                  <option value="">選択してください</option>
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">業界</label>
                <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                  <option value="">選択してください</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">従業員数（業務委託なども含む）</label>
                <input type="number" min="0" value={form.employeeCount}
                  onChange={e => setForm(p => ({ ...p, employeeCount: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="例: 50"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">自己紹介(経歴や事業内容)</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={5} placeholder="経歴や現在の事業内容などを自由にご記入ください"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
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
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {(profile.industry || profile.employeeCount != null) && (
              <div className="flex gap-4 flex-wrap text-xs text-slate-400 mb-3">
                {profile.industry && <span><span className="text-slate-500">業界:</span> <span className="text-slate-200">{profile.industry}</span></span>}
                {profile.employeeCount != null && <span><span className="text-slate-500">従業員数:</span> <span className="text-slate-200">{profile.employeeCount}名</span></span>}
              </div>
            )}
            {profile.bio && <p className="text-slate-300 text-sm mb-4 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>}
            {Object.entries(profile.snsLinks ?? {}).filter(([, v]) => v).length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {SNS_FIELDS.map(f => {
                  const url = (profile.snsLinks ?? {})[f.key]
                  if (!url) return null
                  return <a key={f.key} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">{f.label}</a>
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
