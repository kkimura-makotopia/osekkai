'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface UserLite {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
  role?: string
}

interface UserFull {
  id: string
  email: string
  fullName: string | null
  name: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  employeeCount: number | null
  foundingYear: number | null
  recentRevenue: string | null
  serviceUnitPrice: string | null
  bio: string | null
  image: string | null
  role: string
  snsLinks: Record<string, string>
}

interface FeedbackDetail {
  id: string
  type: string
  content: string
  createdAt: string
  fromUser: UserLite
  toUser: UserLite
  event: { id: string; title: string; heldAt: string } | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: UserLite
}

const FB_LABELS: Record<string, string> = {
  intro: '知人の紹介',
  feedback: 'サービスの紹介',
  advice: 'ナレッジの共有',
  other: 'その他',
}
const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  feedback: 'bg-emerald-500/20 text-emerald-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
}

const SNS_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  website: 'Webサイト',
}

export default function FeedbackDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [fb, setFb] = useState<FeedbackDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [allUsers, setAllUsers] = useState<UserFull[]>([])
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const [fbRes, comRes, usRes] = await Promise.all([
          fetch(`/api/feedbacks/${id}`),
          fetch(`/api/feedbacks/${id}/comments`),
          fetch('/api/users'),
        ])
        if (fbRes.ok) {
          const data = await fbRes.json()
          if (data?.id) setFb(data)
        }
        if (comRes.ok) {
          const data = await comRes.json()
          if (Array.isArray(data)) setComments(data)
        }
        if (usRes.ok) {
          const data = await usRes.json()
          if (Array.isArray(data)) setAllUsers(data)
        }
      } catch (e) {
        console.warn('detail fetch failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, id, router])

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>
  if (!fb) return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-slate-500">おせっかいが見つかりません</div>

  const myId = session?.dbUserId
  const isAdmin = session?.role === 'admin'
  const viewerIsGuest = session?.role === 'guest'
  const shouldHide = (u: UserLite | null | undefined) => {
    if (!u) return false
    if (u.id === myId) return false
    return viewerIsGuest || u.role === 'guest'
  }
  const handleNameClick = (u: UserLite) => {
    if (shouldHide(u)) return
    setOpenUserId(u.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/feedbacks/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setContent('')
      } else {
        const text = await res.text()
        let msg = text
        try { msg = JSON.parse(text).error ?? text } catch {}
        alert(`投稿に失敗しました\n${msg}`)
      }
    } catch (err) {
      alert('通信エラー: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (cid: string) => {
    if (!confirm('このコメントを削除しますか? 元に戻せません。')) return
    const res = await fetch(`/api/feedbacks/comments/${cid}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== cid))
    } else {
      alert('削除に失敗しました')
    }
  }

  const renderUserText = (u: UserLite, fallbackSelf = false) => {
    if (fallbackSelf && u.id === myId) return <span>自分</span>
    if (shouldHide(u)) return <span>匿名</span>
    return (
      <button onClick={() => handleNameClick(u)} className="text-brand-sky-400 hover:underline">
        {u.fullName ?? u.name ?? '-'}{u.company && ` (${u.company})`}
      </button>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/feedbacks" className="text-slate-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1">
        ← 一覧に戻る
      </Link>

      {/* おせっかい本体 */}
      <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[fb.type] ?? FB_COLORS.other}`}>{FB_LABELS[fb.type] ?? 'その他'}</span>
          {fb.event && <span className="text-slate-500 text-xs">交流会: {fb.event.title}</span>}
          <span className="text-slate-500 text-xs ml-auto">{new Date(fb.createdAt).toLocaleString('ja-JP')}</span>
        </div>
        <div className="bg-brand-navy-900/60 border border-brand-navy-700 rounded-xl p-4 mb-4">
          <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{fb.content}</p>
        </div>
        <p className="text-slate-500 text-xs flex items-center gap-2 flex-wrap">
          {renderUserText(fb.fromUser)}
          <span>→</span>
          {renderUserText(fb.toUser, true)}
        </p>
      </div>

      {/* コメント一覧 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">コメント ({comments.length})</h2>
      </div>

      <div className="space-y-3 mb-6">
        {comments.length === 0 && <p className="text-slate-500 text-sm text-center py-6">まだコメントがありません</p>}
        {comments.map(c => {
          const canDelete = c.user.id === myId || isAdmin
          const hidden = shouldHide(c.user)
          return (
            <div key={c.id} className="bg-brand-navy-800 border border-brand-navy-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {hidden ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-brand-navy-700 flex items-center justify-center text-slate-400 text-sm shrink-0">?</div>
                    <div className="min-w-0">
                      <p className="text-slate-300 text-sm font-medium">匿名</p>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleNameClick(c.user)}
                    className="flex items-center gap-2 min-w-0 hover:bg-brand-navy-700 rounded-lg px-1 py-0.5 -mx-1 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-sky flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                      {c.user.image ? <Image src={c.user.image} alt="" width={32} height={32} className="rounded-full" /> : (c.user.fullName ?? c.user.name ?? '?')[0]}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-brand-sky-400 hover:underline text-sm font-medium truncate">{c.user.fullName ?? c.user.name ?? '-'}</p>
                      {c.user.company && <p className="text-slate-500 text-xs truncate">{c.user.company}</p>}
                    </div>
                  </button>
                )}
                <span className="text-slate-500 text-xs ml-auto shrink-0">{new Date(c.createdAt).toLocaleDateString('ja-JP')}</span>
                {canDelete && (
                  <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 hover:text-red-300 text-xs font-medium ml-1">
                    削除
                  </button>
                )}
              </div>
              <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
            </div>
          )
        })}
      </div>

      {/* コメント投稿フォーム */}
      <form onSubmit={handleSubmit} className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5">
        <label className="text-slate-400 text-sm block mb-2">コメントを投稿</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          placeholder="このおせっかいに対するコメントを入力..."
          className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-brand-sky resize-y min-h-[100px] mb-3"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="bg-brand-sky hover:bg-brand-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-medium"
        >
          {submitting ? '投稿中...' : 'コメントを投稿'}
        </button>
      </form>

      {/* 会員詳細ポップアップ */}
      {openUserId && (() => {
        const u = allUsers.find(x => x.id === openUserId)
        if (!u || u.role === 'guest' || viewerIsGuest) return null
        const sns = Object.entries(u.snsLinks ?? {}).filter(([, v]) => v) as [string, string][]
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setOpenUserId(null)}>
            <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-brand-sky flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
                      {u.image ? <Image src={u.image} alt="" width={56} height={56} className="rounded-full" /> : (u.fullName ?? u.name ?? '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-lg">{u.fullName ?? u.name ?? '-'}</h3>
                      <p className="text-slate-400 text-sm">{u.company ?? ''}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setOpenUserId(null)} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center shrink-0">×</button>
                </div>
                <div className="space-y-1.5 text-xs mb-4">
                  {u.industry && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">業界:</span><span className="text-slate-200">{u.industry}</span></div>
                  )}
                  {u.employeeCount != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">従業員数:</span><span className="text-slate-200">{u.employeeCount}名</span></div>
                  )}
                  {u.foundingYear != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">設立年:</span><span className="text-slate-200">{u.foundingYear}年</span></div>
                  )}
                  {u.recentRevenue && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">直近の売上:</span><span className="text-slate-200">{u.recentRevenue}</span></div>
                  )}
                  {u.serviceUnitPrice && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">平均単価:</span><span className="text-slate-200">{u.serviceUnitPrice}</span></div>
                  )}
                </div>
                {u.bio && (
                  <div className="pt-3 border-t border-brand-navy-700 mb-3">
                    <p className="text-slate-400 text-xs mb-1">自己紹介</p>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{u.bio}</p>
                  </div>
                )}
                {sns.length > 0 && (
                  <div className="pt-3 border-t border-brand-navy-700">
                    <p className="text-slate-400 text-xs mb-2">SNS</p>
                    <div className="flex gap-3 flex-wrap">
                      {sns.map(([key, url]) => (
                        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-brand-sky-400 hover:text-brand-sky text-sm underline">
                          {SNS_LABELS[key] ?? key}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
