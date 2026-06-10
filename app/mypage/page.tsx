'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ProfileFieldsForm,
  ProfileFormState,
  emptyProfileForm,
  profileToForm,
  formToPayload,
} from '@/components/profile/ProfileFieldsForm'

interface UserProfile {
  id: string
  email: string
  name: string | null
  fullName: string | null
  company: string | null
  jobTitle: string | null
  image: string | null
  role: string
}

export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm)
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
        setForm(profileToForm(me))
      }
      setLoading(false)
    })
  }, [status, session, router])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(form)),
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

            <ProfileFieldsForm form={form} setForm={setForm} />

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
