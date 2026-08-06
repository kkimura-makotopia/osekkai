'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { IssueCardsEditor, EditableIssue } from '@/components/issues/IssueCardsEditor'
import { SubmissionPreview } from '@/components/issues/SubmissionPreview'
import { QA_QUESTIONS, MODE_LABELS } from '@/lib/issueOptions'

interface QaItem { q: string; a: string }
interface Submission {
  id: string
  userId: string
  mode: 'text' | 'qa' | 'manual'
  sourceText: string | null
  qaAnswers: QaItem[] | null
  updatedAt: string
  user: {
    id: string; fullName: string | null; name: string | null; company: string | null
    industry: string | null; employeeCount: number | null; foundingYear: number | null; recentRevenue: string | null
  }
  event: { id: string; title: string; heldAt: string }
  issues: { id: string; category: string; requestType: string | null; summary: string; detail: string | null }[]
}

export default function IssueDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [issues, setIssues] = useState<EditableIssue[]>([])
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    fetch(`/api/issues/${id}`).then(async r => {
      if (!r.ok) { setError('課題が見つかりませんでした'); setLoading(false); return }
      const data: Submission = await r.json()
      setSubmission(data)
      setIssues(data.issues.map(i => ({
        category: i.category, requestType: i.requestType ?? '原因分析型', summary: i.summary, detail: i.detail ?? '',
      })))
      setLoading(false)
    })
  }, [status, id, router])

  const goPreview = () => {
    setError(''); setSavedMsg('')
    if (issues.length === 0 || issues.some(i => !i.summary.trim())) {
      setError('各相談の「見出し」を入力してください'); return
    }
    if (issues.some(i => (i.detail ?? '').length > 250)) {
      setError('「背景・具体的に聞きたいこと」は各250文字以内にしてください'); return
    }
    setView('preview')
  }

  const submit = async () => {
    setError(''); setSavedMsg('')
    setSaving(true)
    const res = await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues }),
    })
    setSaving(false)
    if (res.ok) { setSavedMsg('運営に提出しました（内容を更新しました）'); setView('edit') }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? '提出に失敗しました') }
  }

  const remove = async () => {
    if (!confirm('この提出を削除しますか？この操作は取り消せません。')) return
    setDeleting(true)
    const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/issues')
    else { setDeleting(false); setError('削除に失敗しました') }
  }

  if (status === 'loading' || loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>

  if (!submission)
    return <div className="max-w-3xl mx-auto px-4 py-8"><p className="text-slate-400">{error || '課題が見つかりませんでした'}</p></div>

  const isAdmin = session?.role === 'admin'
  const isOwner = submission.userId === session?.dbUserId
  const authorName = submission.user.fullName ?? submission.user.name ?? '不明'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={isAdmin && !isOwner ? '/admin/issues' : '/issues'} className="text-slate-400 hover:text-white text-sm">← 一覧へ戻る</Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{submission.event.title}</h1>
          <p className="text-slate-400 text-sm">
            {isAdmin && !isOwner && <span className="text-brand-sky-400">{authorName}{submission.user.company ? `・${submission.user.company}` : ''} ／ </span>}
            {new Date(submission.event.heldAt).toLocaleDateString('ja-JP')}
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-navy-700 text-slate-300">{MODE_LABELS[submission.mode]}</span>
          </p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
      {savedMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl px-4 py-3 mb-4">{savedMsg}</div>}

      {view === 'edit' ? (
        <>
          {/* 元入力（読み取り専用） */}
          {submission.mode === 'text' && submission.sourceText && (
            <details className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-4 mb-4">
              <summary className="text-slate-300 text-sm cursor-pointer">入力したテキストを表示</summary>
              <p className="text-slate-400 text-sm whitespace-pre-wrap mt-3">{submission.sourceText}</p>
            </details>
          )}
          {submission.mode === 'qa' && Array.isArray(submission.qaAnswers) && (
            <details className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-4 mb-4">
              <summary className="text-slate-300 text-sm cursor-pointer">質疑応答の回答を表示</summary>
              <div className="space-y-3 mt-3">
                {submission.qaAnswers.map((qa, i) => (
                  <div key={i}>
                    <p className="text-slate-300 text-sm"><span className="text-brand-sky-400 font-bold mr-1">Q{i + 1}.</span>{qa.q || QA_QUESTIONS[i]}</p>
                    <p className="text-slate-400 text-sm whitespace-pre-wrap pl-5">{qa.a || '（未回答）'}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          <h2 className="text-white font-medium mb-3">経営課題</h2>
          <IssueCardsEditor issues={issues} setIssues={setIssues} />

          <div className="flex justify-between items-center mt-6">
            {(isOwner || isAdmin) ? (
              <button onClick={remove} disabled={deleting} className="text-red-400 hover:text-red-300 text-sm disabled:opacity-60">
                {deleting ? '削除中...' : 'この提出を削除'}
              </button>
            ) : <span />}
            <button onClick={goPreview}
              className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium">
              次へ（最終確認）
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300 mb-4">
            この内容で運営に提出します（既存の内容を更新します）。問題がなければ「運営へ提出する」を押してください。
          </div>
          <SubmissionPreview
            company={submission.user.company}
            fullName={authorName}
            industry={submission.user.industry}
            employeeCount={submission.user.employeeCount}
            foundingYear={submission.user.foundingYear}
            eventTitle={submission.event.title}
            eventDate={submission.event.heldAt}
            issues={issues}
          />
          <div className="flex justify-between items-center mt-6">
            <button onClick={() => setView('edit')} className="text-slate-300 hover:text-white px-4 py-2 text-sm">編集に戻る</button>
            <button onClick={submit} disabled={saving}
              className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              {saving ? '提出中...' : '運営へ提出する'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
