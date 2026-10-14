'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FB_TYPE_OPTIONS, FB_LABELS, FB_FIELDS, buildFeedbackContent, allFeedbackFieldsFilled, FbType } from '@/lib/feedbackOptions'

interface MemberUser { id: string; fullName: string | null; name: string | null; company: string | null }

export function AddFeedbackModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: session } = useSession()
  const myId = session?.dbUserId

  const [members, setMembers] = useState<MemberUser[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [toUserId, setToUserId] = useState('')
  const [search, setSearch] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const [type, setType] = useState<FbType>('intro')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users?scope=members')
      .then(r => (r.ok ? r.json() : []))
      .then((d: unknown) => {
        if (Array.isArray(d)) setMembers((d as MemberUser[]).filter(u => u.id !== myId))
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false))
  }, [myId])

  const label = (u: MemberUser) => `${u.fullName ?? u.name ?? '-'}${u.company ? ` (${u.company})` : ''}`
  const q = search.trim().toLowerCase()
  const filtered = (editing && q)
    ? members.filter(u => label(u).toLowerCase().includes(q))
    : members

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!toUserId) { setError('送り先を選択してください'); return }
    if (!allFeedbackFieldsFilled(type, fields)) { setError('すべての項目を入力してください（URLは任意）'); return }
    const content = buildFeedbackContent(type, fields)
    if (!content) { setError('内容を入力してください'); return }
    if (!confirm('送信していいですか？\n送信するとお相手に届きます。')) return
    setPosting(true)
    // イベントに紐づかない「リアルタイム登録」のおせっかい
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, type, content, eventId: null }),
    })
    setPosting(false)
    if (res.ok) { onCreated(); onClose() }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? '送信に失敗しました') }
  }

  const inputCls = 'w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">おせっかいを追加</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          </div>
          <p className="text-slate-500 text-xs">イベントに関わらず、会員の方へその場で送れる「リアルタイム登録」のおせっかいです。</p>

          {/* 送り先 */}
          <div className="relative">
            <label className="text-slate-400 text-xs block mb-1">送り先（正会員から選択）</label>
            <input type="text" value={search} disabled={loadingMembers}
              onChange={e => { setSearch(e.target.value); setEditing(true); setListOpen(true); setToUserId('') }}
              onFocus={e => { setListOpen(true); setEditing(false); e.target.select() }}
              onClick={e => { setListOpen(true); setEditing(false); (e.target as HTMLInputElement).select() }}
              onBlur={() => setTimeout(() => setListOpen(false), 150)}
              autoComplete="off"
              placeholder={loadingMembers ? '読み込み中...' : 'クリックで一覧、入力で検索...'}
              className={`${inputCls} disabled:opacity-60`} />
            {listOpen && !loadingMembers && (
              <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-auto bg-brand-navy-800 border border-brand-navy-600 rounded-lg shadow-xl">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-slate-500 text-sm">該当する会員が見つかりません</li>
                ) : filtered.map(u => (
                  <li key={u.id}>
                    <button type="button" onMouseDown={e => e.preventDefault()}
                      onClick={() => { setToUserId(u.id); setSearch(label(u)); setEditing(false); setListOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-brand-navy-700 ${toUserId === u.id ? 'bg-brand-sky/20 text-white' : 'text-slate-200'}`}>
                      {label(u)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 種類 */}
          <div>
            <label className="text-slate-400 text-xs block mb-1">種類</label>
            <div className="flex gap-2 flex-wrap">
              {FB_TYPE_OPTIONS.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? 'bg-brand-sky text-white' : 'bg-brand-navy-700 text-slate-400'}`}>
                  {FB_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 入力項目 */}
          <div className="space-y-3">
            {(FB_FIELDS[type] ?? []).map(f => (
              <div key={f.key}>
                <label className="text-slate-400 text-xs block mb-1">
                  {f.label}{f.key !== 'url' && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {f.textarea ? (
                  <textarea required={f.key !== 'url'} value={fields[f.key] ?? ''}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    rows={3} placeholder={f.placeholder}
                    className={`${inputCls} resize-y`} />
                ) : (
                  <input required={f.key !== 'url'} value={fields[f.key] ?? ''}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className={inputCls} />
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={posting}
              className="bg-brand-sky hover:bg-brand-sky-400 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
              {posting ? '送信中...' : '送信する'}
            </button>
            <button type="button" onClick={onClose} className="bg-brand-navy-700 text-slate-300 px-5 py-2 rounded-lg text-sm">キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  )
}
