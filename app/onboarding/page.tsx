'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { INDUSTRIES } from '@/lib/industries'
import { JOB_TITLES } from '@/lib/jobTitles'

interface MeProfile {
  id: string
  fullName: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  employeeCount: number | null
}

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ fullName: '', company: '', jobTitle: '', industry: '', employeeCount: '' as string | number })

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const r = await fetch('/api/users')
        if (!r.ok) { setLoading(false); return }
        const us = await r.json()
        const me: MeProfile | undefined = Array.isArray(us) ? us.find((u: MeProfile) => u.id === session?.dbUserId) : undefined
        if (me) {
          setForm({
            fullName: me.fullName ?? '',
            company: me.company ?? '',
            jobTitle: me.jobTitle ?? '',
            industry: me.industry ?? '',
            employeeCount: me.employeeCount ?? '',
          })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!form.fullName.trim() || !form.company.trim() || !form.jobTitle.trim() || !form.industry.trim() || form.employeeCount === '' || form.employeeCount === null) {
      setErr('すべての項目を入力してください')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName.trim(),
        company: form.company.trim(),
        jobTitle: form.jobTitle.trim(),
        industry: form.industry,
        employeeCount: Number(form.employeeCount),
      }),
    })
    if (res.ok) {
      const dest = session?.role === 'admin' ? '/admin' : '/mypage'
      router.push(dest)
    } else {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text).error ?? text } catch {}
      setErr(`保存に失敗しました: ${msg}`)
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">プロフィールを登録</h1>
        <p className="text-slate-400 mt-2 text-sm">
          サービスを利用するには、まず基本情報の登録が必要です。
          下記のすべての項目を入力してください。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-slate-300 text-sm block mb-1">氏名 <span className="text-red-400">*</span></label>
          <input required value={form.fullName}
            onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            placeholder="山田 太郎"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-slate-300 text-sm block mb-1">会社名 <span className="text-red-400">*</span></label>
          <input required value={form.company}
            onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            placeholder="株式会社サンプル"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-slate-300 text-sm block mb-1">役職 <span className="text-red-400">*</span></label>
          <select required value={form.jobTitle}
            onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
            <option value="">選択してください</option>
            {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-slate-500 text-xs mt-1">※ 部長以上の方のみご利用いただけます</p>
        </div>
        <div>
          <label className="text-slate-300 text-sm block mb-1">業界 <span className="text-red-400">*</span></label>
          <select required value={form.industry}
            onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500">
            <option value="">選択してください</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-300 text-sm block mb-1">従業員数（業務委託なども含む） <span className="text-red-400">*</span></label>
          <input required type="number" min="0" value={form.employeeCount}
            onChange={e => setForm(p => ({ ...p, employeeCount: e.target.value === '' ? '' : Number(e.target.value) }))}
            placeholder="50"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-colors">
          {saving ? '登録中...' : 'この内容で利用を開始'}
        </button>
      </form>
    </div>
  )
}
