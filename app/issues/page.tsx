'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MODE_LABELS } from '@/lib/issueOptions'

interface Issue { id: string; category: string; hotTopic: string | null; summary: string; detail: string | null }
interface Submission {
  id: string
  mode: 'text' | 'qa'
  updatedAt: string
  event: { id: string; title: string; heldAt: string }
  issues: Issue[]
}

export default function IssuesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    if (session.role === 'guest') { router.push('/feedbacks'); return }
    fetch('/api/issues').then(r => r.json()).then(data => {
      setSubmissions(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [status, session, router])

  if (status === 'loading' || loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">経営課題</h1>
          <p className="text-slate-400 text-sm">提出した経営課題の一覧です。提出後も編集できます。</p>
        </div>
        <Link href="/issues/new"
          className="bg-brand-sky hover:bg-brand-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium shrink-0">
          + 新規提出
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-10 text-center">
          <p className="text-slate-400 mb-4">まだ経営課題を提出していません。</p>
          <Link href="/issues/new"
            className="inline-block bg-brand-sky hover:bg-brand-sky-400 text-white px-5 py-2 rounded-xl text-sm font-medium">
            経営課題を提出する
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(sub => (
            <Link key={sub.id} href={`/issues/${sub.id}`}
              className="block bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5 hover:border-brand-sky/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{sub.event.title}</p>
                  <p className="text-slate-500 text-xs">{new Date(sub.event.heldAt).toLocaleDateString('ja-JP')}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-navy-700 text-slate-300 shrink-0">
                  {MODE_LABELS[sub.mode]}
                </span>
              </div>
              <div className="space-y-2">
                {sub.issues.map(issue => (
                  <div key={issue.id} className="flex items-start gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky-400 border border-brand-sky/30 shrink-0 mt-0.5">
                      {issue.category}
                    </span>
                    <div className="min-w-0">
                      {issue.hotTopic && <p className="text-white text-sm font-medium truncate">{issue.hotTopic}</p>}
                      <p className="text-slate-400 text-xs line-clamp-2">{issue.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
