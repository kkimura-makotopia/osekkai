'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  bio: string | null
  image: string | null
  role: string
  snsLinks: Record<string, string>
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
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  website: 'Webサイト',
}

type Tab = 'received' | 'others'
type FbFilter = 'all' | 'intro' | 'feedback' | 'advice' | 'other'

const isGuestUser = (u: { role?: string } | null | undefined) => u?.role === 'guest'
const displayName = (u: UserLite) =>
  isGuestUser(u) ? '匿名' : (u.fullName ?? u.name ?? '-')

export default function FeedbacksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [allUsers, setAllUsers] = useState<UserFull[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('received')
  const [filter, setFilter] = useState<FbFilter>('all')
  const [openFb, setOpenFb] = useState<Feedback | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const [fbRes, usRes] = await Promise.all([
          fetch('/api/feedbacks'),
          fetch('/api/users'),
        ])
        if (fbRes.ok) {
          const t = await fbRes.text()
          const d = t ? JSON.parse(t) : []
          if (Array.isArray(d)) setFeedbacks(d)
        }
        if (usRes.ok) {
          const t = await usRes.text()
          const d = t ? JSON.parse(t) : []
          if (Array.isArray(d)) setAllUsers(d)
        }
      } catch (e) {
        console.warn('feedbacks fetch failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router])

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const myId = session?.dbUserId
  const isAdmin = session?.role === 'admin'
  const viewerIsGuest = session?.role === 'guest'
  // 「表示対象がゲスト」または「閲覧者がゲスト」のいずれかで匿名化
  const shouldHide = (u: { id?: string; role?: string } | null | undefined) => {
    if (!u) return false
    if (u.id === myId) return false   // 自分自身は匿名化しない
    return viewerIsGuest || u.role === 'guest'
  }
  const received = feedbacks.filter(f => f.toUser.id === myId)
  const others = feedbacks.filter(f => f.fromUser.id !== myId && f.toUser.id !== myId)

  const handleDelete = async (id: string) => {
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
  const visible = filter === 'all' ? visibleAll : visibleAll.filter(f => f.type === filter)

  const filterChips: { key: FbFilter; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'intro', label: '知人の紹介' },
    { key: 'feedback', label: 'サービスの紹介' },
    { key: 'advice', label: 'ナレッジの共有' },
    { key: 'other', label: 'その他' },
  ]

  // 氏名クリック → ユーザー詳細ポップアップ（ゲスト対象 or 閲覧者がゲストなら開かない）
  const handleNameClick = (u: UserLite) => {
    if (shouldHide(u)) return
    setOpenUserId(u.id)
  }

  // フィードバックモーダル内で氏名がクリックされた時はFBモーダルを閉じない（ユーザーモーダルを重ねる）
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
            {t.label}({t.count})
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
            <div key={f.id}
              className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[f.type] ?? FB_COLORS.other}`}>{FB_LABELS[f.type] ?? 'その他'}</span>
                {f.event && <span className="text-slate-500 text-xs truncate">交流会: {f.event.title}</span>}
                <span className="text-slate-500 text-xs ml-auto">{new Date(f.createdAt).toLocaleDateString('ja-JP')}</span>
              </div>
              <p className="text-slate-200 text-sm line-clamp-3 mb-3">{f.content}</p>
              <p className="text-slate-500 text-xs mb-3">
                {shouldHide(f.fromUser) ? (
                  <span className="text-slate-400">匿名</span>
                ) : (
                  <button onClick={() => handleNameClick(f.fromUser)} className="text-blue-400 hover:underline">
                    {displayName(f.fromUser)}{f.fromUser.company && ` (${f.fromUser.company})`}
                  </button>
                )}
                {' → '}
                {f.toUser.id === myId ? '自分' : shouldHide(f.toUser) ? (
                  <span className="text-slate-400">匿名</span>
                ) : (
                  <button onClick={() => handleNameClick(f.toUser)} className="text-blue-400 hover:underline">
                    {displayName(f.toUser)}{f.toUser.company && ` (${f.toUser.company})`}
                  </button>
                )}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    削除
                  </button>
                )}
                <button
                  onClick={() => setOpenFb(f)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  詳細
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* おせっかい詳細モーダル */}
      {openFb && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setOpenFb(null)}>
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
              <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-slate-700 mb-4">
                <div>
                  送信者:{' '}
                  {shouldHide(openFb.fromUser) ? (
                    <span className="text-slate-300">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(openFb.fromUser)} className="text-blue-400 hover:underline">
                      {displayName(openFb.fromUser)} {openFb.fromUser.company ? `· ${openFb.fromUser.company}` : ''}
                    </button>
                  )}
                </div>
                <div>
                  受信者:{' '}
                  {openFb.toUser.id === myId ? '自分' : shouldHide(openFb.toUser) ? (
                    <span className="text-slate-300">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(openFb.toUser)} className="text-blue-400 hover:underline">
                      {displayName(openFb.toUser)} {openFb.toUser.company ? `· ${openFb.toUser.company}` : ''}
                    </button>
                  )}
                </div>
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

      {/* 会員詳細ポップアップ */}
      {openUserId && (() => {
        const u = allUsers.find(x => x.id === openUserId)
        if (!u || u.role === 'guest' || viewerIsGuest) {
          // データが取れない / 表示対象がゲスト / 閲覧者がゲスト の場合は開かない
          return null
        }
        const sns = Object.entries(u.snsLinks ?? {}).filter(([, v]) => v) as [string, string][]
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setOpenUserId(null)}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
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
                  {u.email && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">メール:</span><a href={`mailto:${u.email}`} className="text-blue-400 hover:text-blue-300 truncate">{u.email}</a></div>
                  )}
                  {u.industry && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">業界:</span><span className="text-slate-200">{u.industry}</span></div>
                  )}
                  {u.employeeCount != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">従業員数:</span><span className="text-slate-200">{u.employeeCount}名</span></div>
                  )}
                </div>
                {u.bio && (
                  <div className="pt-3 border-t border-slate-700 mb-3">
                    <p className="text-slate-400 text-xs mb-1">自己紹介</p>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{u.bio}</p>
                  </div>
                )}
                {sns.length > 0 && (
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-slate-400 text-xs mb-2">SNS</p>
                    <div className="flex gap-3 flex-wrap">
                      {sns.map(([key, url]) => (
                        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
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
