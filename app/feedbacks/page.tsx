'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserLite {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
}

interface Feedback {
  id: string
  type: string
  content: string
  createdAt: string
  fromUser: UserLite
  toUser: UserLite
  event: { id: string; title: string; heldAt: string } | null
}

const FB_LABELS: Record<string, string> = { intro: '紹介', advice: '知見', other: 'その他', feedback: 'その他' }
const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
  feedback: 'bg-slate-500/20 text-slate-300',
}

type Tab = 'received' | 'others'
type FbFilter = 'all' | 'intro' | 'advice' | 'other'

export default function FeedbacksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('received')
  const [filter, setFilter] = useState<FbFilter>('all')
  const [openFb, setOpenFb] = useState<Feedback | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const r = await fetch('/api/feedbacks')
        if (!r.ok) { console.warn('/api/feedbacks returned', r.status); return }
        const text = await r.text()
        const d = text ? JSON.parse(text) : []
        if (Array.isArray(d)) setFeedbacks(d)
      } catch (e) {
        console.warn('/api/feedbacks fetch failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router])

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const myId = session?.dbUserId
  const isAdmin = session?.role === 'admin'
  const received = feedbacks.filter(f => f.toUser.id === myId)
  const others = feedbacks.filter(f => f.fromUser.id !== myId && f.toUser.id !== myId)

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('このおせっかいを削除しますか? 元に戻せません。')) return
    const res = await fetch(`/api/feedbacks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFeedbacks(prev => prev.filter(f => f.id !== id))
      setOpenFb(prev => prev?.id === id ? null : prev)
    } else {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text).error ?? text } catch {}
      alert(`削除に失敗しました\n${msg}`)
    }
  }
  const visibleAll = tab === 'received' ? received : others
  const visible = filter === 'all' ? visibleAll : visibleAll.filter(f => {
    if (filter === 'other') return f.type === 'other' || f.type === 'feedback'
    return f.type === filter
  })

  const filterChips: { key: FbFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'intro', label: '紹介' },
    { key: 'advice', label: '知見' },
    { key: 'other', label: 'その他' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">おせっかい一覧</h1>
        <p className="text-slate-400 mt-1 text-sm">自分宛のおせっかいと、他のメンバー間で交わされたおせっかいを参照できます</p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'received', label: '受け取ったおせっかい', count: received.length },
          { key: 'others', label: '他の人のおせっかい', count: others.length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
            {t.label}（{t.count}）
          </button>
        ))}
      </div>

      {/* 種別フィルタ */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filterChips.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === c.key ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {tab === 'received' ? 'まだ受け取ったおせっかいがありません' : '他の人のおせっかいはまだありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(f => (
            <div key={f.id} onClick={() => setOpenFb(f)}
              className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[f.type] ?? FB_COLORS.other}`}>{FB_LABELS[f.type] ?? 'その他'}</span>
                {f.event && <span className="text-slate-500 text-xs truncate">交流会: {f.event.title}</span>}
                <span className="text-slate-500 text-xs ml-auto">{new Date(f.createdAt).toLocaleDateString('ja-JP')}</span>
                {isAdmin && (
                  <button
                    onClick={e => handleDelete(f.id, e)}
                    className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-0.5 rounded hover:bg-red-500/10"
                  >
                    削除
                  </button>
                )}
              </div>
              <p className="text-slate-200 text-sm line-clamp-3 mb-2">{f.content}</p>
              <p className="text-slate-500 text-xs">
                {f.fromUser.fullName ?? f.fromUser.name}{f.fromUser.company && ` (${f.fromUser.company})`}
                {' → '}
                {f.toUser.id === myId ? '自分' : (f.toUser.fullName ?? f.toUser.name)}
                {f.toUser.id !== myId && f.toUser.company && ` (${f.toUser.company})`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {openFb && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpenFb(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[openFb.type] ?? FB_COLORS.other}`}>
                  {FB_LABELS[openFb.type] ?? 'その他'}
                </span>
                <button onClick={() => setOpenFb(null)} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{openFb.content}</p>
              </div>
              <div className="space-y-1 text-xs text-slate-400 pt-3 border-t border-slate-700 mb-4">
                <div>送信者: {openFb.fromUser.fullName ?? openFb.fromUser.name} {openFb.fromUser.company ? `· ${openFb.fromUser.company}` : ''}</div>
                <div>受信者: {openFb.toUser.id === myId ? '自分' : `${openFb.toUser.fullName ?? openFb.toUser.name}${openFb.toUser.company ? ` · ${openFb.toUser.company}` : ''}`}</div>
                {openFb.event && <div>関連交流会: {openFb.event.title}</div>}
                <div>日時: {new Date(openFb.createdAt).toLocaleString('ja-JP')}</div>
              </div>
              {isAdmin && (
                <div className="pt-3 border-t border-slate-700">
                  <button
                    onClick={() => handleDelete(openFb.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    削除する
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
