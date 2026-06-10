'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ProfileFieldsForm,
  ProfileFormState,
  emptyProfileForm,
  profileToForm,
  formToPayload,
} from '@/components/profile/ProfileFieldsForm'
import { IssueCardsEditor, EditableIssue } from '@/components/issues/IssueCardsEditor'
import { QA_QUESTIONS, MODE_LABELS } from '@/lib/issueOptions'

interface EventLite { id: string; title: string; heldAt: string }
type Mode = 'text' | 'qa'

const STEPS = ['イベント・形式', 'プロフィール', '入力・AI解析', '内容の確認・編集', '提出する最新版を確認']

const HINTS = [
  'AIレコメンドはあくまで参考程度にして、言い回しなどは是非変更してください。',
  '発表時間は8分なので、濃い課題を2件に絞るのがおすすめです。',
  '聞きたいペルソナを年商規模などで絞りすぎると、おせっかいが出にくくなる可能性が高いです。',
  '抽象的だと深掘りで時間が終わってしまいます。「代理店の管理工数が大きくなってきているので代理店管理のTipsを知りたい」くらいの具体的な課題も織り交ぜると、おせっかいをもらいやすいです。',
]

function NewIssueWizard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(0)
  const [events, setEvents] = useState<EventLite[]>([])
  const [eventId, setEventId] = useState('')
  const [mode, setMode] = useState<Mode>('text')

  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm)
  const [savingProfile, setSavingProfile] = useState(false)

  const [sourceText, setSourceText] = useState('')
  const [qaAnswers, setQaAnswers] = useState<string[]>(QA_QUESTIONS.map(() => ''))
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const [issues, setIssues] = useState<EditableIssue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submittedEventIds, setSubmittedEventIds] = useState<Set<string>>(new Set())
  const [qaIndex, setQaIndex] = useState(0)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [hintOpen, setHintOpen] = useState(true)

  // AI解析中の進捗バー（疑似進捗。応答受信で100%）
  useEffect(() => {
    if (!analyzing) return
    setAnalyzeProgress(8)
    const id = setInterval(() => {
      setAnalyzeProgress(p => {
        if (p >= 92) return p
        const inc = p < 50 ? 6 : p < 80 ? 2 : 1
        return Math.min(92, p + inc)
      })
    }, 400)
    return () => clearInterval(id)
  }, [analyzing])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    if (session.role === 'guest') { router.push('/feedbacks'); return }

    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/issues').then(r => r.json()),
    ]).then(([ev, users, subs]) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = (Array.isArray(ev) ? ev : [])
        .filter((e: EventLite) => new Date(e.heldAt) >= today)
        .sort((a: EventLite, b: EventLite) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime())
      setEvents(upcoming)
      const me = Array.isArray(users) ? users.find((u: { id: string }) => u.id === session.dbUserId) : null
      if (me) setForm(profileToForm(me))
      setSubmittedEventIds(new Set(
        Array.isArray(subs) ? subs.map((s: { event: { id: string } }) => s.event.id) : []
      ))
      const presetEvent = searchParams.get('eventId')
      if (presetEvent) setEventId(presetEvent)
      setLoading(false)
    })
  }, [status, session, router, searchParams])

  const goProfile = () => {
    if (!eventId) { setError('イベントを選択してください'); return }
    setError('')
    setStep(1)
  }

  const saveProfileAndNext = async () => {
    setSavingProfile(true)
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formToPayload(form)),
    })
    setSavingProfile(false)
    if (res.ok) { setError(''); setStep(2) }
    else setError('プロフィールの保存に失敗しました')
  }

  const runAnalyze = async () => {
    setError('')
    setAnalyzing(true)
    const body = mode === 'text'
      ? { mode, sourceText }
      : { mode, qaAnswers: QA_QUESTIONS.map((q, i) => ({ q, a: qaAnswers[i] })) }
    const res = await fetch('/api/issues/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setAnalyzing(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'AI解析に失敗しました')
      return
    }
    setAnalyzeProgress(100)
    const data = await res.json()
    const got: EditableIssue[] = (data.issues ?? []).map((i: EditableIssue) => ({
      category: i.category ?? 'その他',
      requestType: i.requestType ?? 'ヒアリング',
      summary: i.summary ?? '',
      detail: i.detail ?? '',
    }))
    setIssues(got.length ? got : [{ category: 'その他', requestType: 'ヒアリング', summary: '', detail: '' }])
    setHintOpen(true)
    setStep(3)
  }

  const goPreview = () => {
    setError('')
    if (issues.length === 0 || issues.some(i => !i.summary.trim())) {
      setError('各相談の「見出し」を入力してください')
      return
    }
    setStep(4)
  }

  const submit = async () => {
    setError('')
    if (issues.some(i => !i.summary.trim())) { setError('各相談の「見出し」を入力してください'); return }
    if (submittedEventIds.has(eventId) &&
        !confirm('このイベントには既に提出済みの経営課題があります。\n運営に提出すると、以前の内容は上書きされます。よろしいですか？')) {
      return
    }
    setSubmitting(true)
    const body = {
      eventId,
      mode,
      sourceText: mode === 'text' ? sourceText : null,
      qaAnswers: mode === 'qa' ? QA_QUESTIONS.map((q, i) => ({ q, a: qaAnswers[i] })) : null,
      issues,
    }
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    if (res.ok) router.push('/issues')
    else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '提出に失敗しました')
    }
  }

  if (status === 'loading' || loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>

  const answeredCount = qaAnswers.filter(a => a.trim()).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">経営課題の提出</h1>
      <p className="text-slate-400 text-sm mb-6">事業のボトルネックとなっている本質的な課題を、AIと一緒に発見しましょう。</p>

      {/* ステップ表示 */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-brand-sky-400' : 'text-slate-500'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i < step ? 'bg-brand-sky text-white' : i === step ? 'bg-brand-sky text-white' : 'bg-brand-navy-700 text-slate-400'
              }`}>{i + 1}</span>
              <span className="text-xs hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-brand-sky' : 'bg-brand-navy-700'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6">
        {/* STEP 0: イベント・形式 */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="text-white font-medium mb-2 block">提出先のイベント</label>
              {events.length === 0 ? (
                <p className="text-slate-400 text-sm">提出できるイベントがありません。</p>
              ) : (
                <select value={eventId} onChange={e => setEventId(e.target.value)}
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-sky">
                  <option value="">選択してください</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}（{new Date(ev.heldAt).toLocaleDateString('ja-JP')}）
                    </option>
                  ))}
                </select>
              )}
              {eventId && submittedEventIds.has(eventId) && (
                <div className="mt-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl px-3 py-2">
                  ⚠️ このイベントには既に提出済みの経営課題があります。このまま新規作成して提出すると、以前の内容は<strong>上書き</strong>されます。
                </div>
              )}
            </div>

            <div>
              <label className="text-white font-medium mb-2 block">入力形式</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setMode('text')}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    mode === 'text' ? 'border-brand-sky bg-brand-sky/10' : 'border-brand-navy-700 bg-brand-navy-900/40 hover:border-brand-navy-700'
                  }`}>
                  <p className="text-white font-medium mb-1">① テキスト形式</p>
                  <p className="text-slate-400 text-xs">現状を自由に記述すると、AIが課題を抽出します。</p>
                </button>
                <button type="button" onClick={() => setMode('qa')}
                  className={`text-left p-4 rounded-xl border transition-colors ${
                    mode === 'qa' ? 'border-brand-sky bg-brand-sky/10' : 'border-brand-navy-700 bg-brand-navy-900/40 hover:border-brand-navy-700'
                  }`}>
                  <p className="text-white font-medium mb-1">② 質疑応答形式</p>
                  <p className="text-slate-400 text-xs">質問に1問ずつ答えると、AIが課題を導き出します。</p>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={goProfile} disabled={!eventId}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                次へ
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: プロフィール */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300">
              マイページの情報を補完しています。新しく入力・修正した内容は<strong className="text-brand-sky-400"> マイページにも反映 </strong>されます。AI解析の精度向上に使われます。
            </div>
            <ProfileFieldsForm form={form} setForm={setForm} hideBioSns />
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">戻る</button>
              <button onClick={saveProfileAndNext} disabled={savingProfile}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {savingProfile ? '保存中...' : '保存して次へ'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 入力 */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">入力形式: <span className="text-brand-sky-400">{MODE_LABELS[mode]}</span></p>

            {analyzing ? (
              /* AI解析中の進捗バー */
              <div className="py-12 text-center space-y-4">
                <p className="text-white text-sm">AIが経営課題を抽出しています…</p>
                <div className="h-2 bg-brand-navy-700 rounded-full overflow-hidden max-w-md mx-auto">
                  <div className="h-full bg-brand-sky transition-all duration-300 ease-out" style={{ width: `${analyzeProgress}%` }} />
                </div>
                <p className="text-slate-500 text-xs">{analyzeProgress}%</p>
              </div>
            ) : mode === 'text' ? (
              <>
                <div>
                  <label className="text-white font-medium mb-2 block">現在の事業の状況・お悩み</label>
                  <textarea value={sourceText} onChange={e => setSourceText(e.target.value)}
                    rows={10} placeholder="事業の現状、伸び悩んでいること、課題に感じていることなどを自由にご記入ください。詳しく書くほどAIの精度が上がります。"
                    className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky resize-none" />
                </div>
                <div className="flex justify-between items-center">
                  <button onClick={() => setStep(1)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">戻る</button>
                  <button onClick={runAnalyze} disabled={!sourceText.trim()}
                    className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                    AIで課題を抽出する
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* 進捗 */}
                <div className="flex items-center justify-between">
                  <p className="text-brand-sky-400 text-sm font-bold">質問 {qaIndex + 1} / {QA_QUESTIONS.length}</p>
                  <p className="text-slate-500 text-xs">{answeredCount} / {QA_QUESTIONS.length} 問 回答済み</p>
                </div>
                <div className="h-1 bg-brand-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-sky transition-all" style={{ width: `${((qaIndex + 1) / QA_QUESTIONS.length) * 100}%` }} />
                </div>

                {/* 1問ずつ表示 */}
                <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-4">
                  <label className="text-white text-base mb-3 block leading-relaxed">
                    <span className="text-brand-sky-400 font-bold mr-1">Q{qaIndex + 1}.</span>{QA_QUESTIONS[qaIndex]}
                  </label>
                  <textarea
                    key={qaIndex}
                    value={qaAnswers[qaIndex]}
                    onChange={e => setQaAnswers(prev => prev.map((a, idx) => idx === qaIndex ? e.target.value : a))}
                    rows={4} autoFocus placeholder="回答を入力してください（すべての質問に回答が必要です）"
                    className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky resize-none" />
                </div>

                {/* ナビ */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => (qaIndex === 0 ? setStep(1) : setQaIndex(i => i - 1))}
                    className="text-slate-300 hover:text-white px-4 py-2 text-sm">
                    {qaIndex === 0 ? '戻る' : '← 前の質問'}
                  </button>
                  {qaIndex < QA_QUESTIONS.length - 1 ? (
                    <button onClick={() => setQaIndex(i => i + 1)} disabled={!qaAnswers[qaIndex]?.trim()}
                      className="bg-brand-navy-700 hover:bg-brand-navy-900 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                      次の質問 →
                    </button>
                  ) : (
                    <button onClick={runAnalyze} disabled={!qaAnswers[qaIndex]?.trim()}
                      className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                      AIで課題を抽出する
                    </button>
                  )}
                </div>
                {!qaAnswers[qaIndex]?.trim() && (
                  <p className="text-slate-500 text-xs text-right">この質問に回答すると次へ進めます（スキップ不可）</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: 内容の確認・編集 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300 space-y-2">
              <p>AIが抽出した課題です。内容を確認・修正してから提出してください。提出後も編集できます。</p>
              <p>課題の解像度を上げるためにマイページの非公開情報も参考にしています。公開させたくない情報については適宜削除や言い換えていただければ幸いです。</p>
            </div>
            <IssueCardsEditor issues={issues} setIssues={setIssues} />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">入力に戻る</button>
              <button onClick={goPreview}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium">
                次へ（最終確認）
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: 提出する最新版を確認（A4プレビュー） */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300">
              この内容で運営に提出します。最終的にA4一枚にまとめられます。問題がなければ「運営に提出する」を押してください。
            </div>

            {/* A4イメージのプレビュー */}
            <div className="bg-white text-brand-navy rounded-xl p-6 space-y-4 shadow-inner">
              <div>
                <p className="text-[11px] text-slate-500 mb-1 font-bold">会社情報</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-slate-500">会社名：</span>{form.company || '—'}</div>
                  <div><span className="text-slate-500">業界：</span>{form.industry || '—'}</div>
                  <div><span className="text-slate-500">従業員数：</span>{form.employeeCount !== '' ? `${form.employeeCount}名` : '—'}</div>
                  <div><span className="text-slate-500">設立年：</span>{form.foundingYear !== '' ? `${form.foundingYear}年` : '—'}</div>
                  <div className="col-span-2"><span className="text-slate-500">直近の確定している期の売上：</span>{form.recentRevenue || '—'}</div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-[11px] text-slate-500 mb-2 font-bold">経営課題（{issues.length}件）</p>
                <div className="space-y-3">
                  {issues.map((it, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-navy text-white">{it.category}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white">{it.requestType}</span>
                      </div>
                      <p className="text-sm font-bold">{it.summary}</p>
                      {it.detail && <p className="text-xs text-slate-600 whitespace-pre-wrap mt-0.5">{it.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">編集に戻る</button>
              <button onClick={submit} disabled={submitting}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {submitting ? '提出中...' : '運営に提出する'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* おせっかいを獲得するヒント（確認・編集ステップで表示） */}
      {step === 3 && (
        hintOpen ? (
          <div className="fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] bg-brand-navy-800 border border-brand-sky/40 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-brand-sky-400 font-bold text-sm">💡 おせっかいを獲得するヒント</p>
              <button onClick={() => setHintOpen(false)} aria-label="閉じる"
                className="text-slate-400 hover:text-white text-xl leading-none px-1">×</button>
            </div>
            <ul className="space-y-2">
              {HINTS.map((h, i) => (
                <li key={i} className="text-slate-300 text-xs leading-relaxed flex gap-2">
                  <span className="text-brand-sky-400 shrink-0">・</span><span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button onClick={() => setHintOpen(true)} title="おせっかいを獲得するヒント"
            className="fixed right-4 top-20 z-50 w-11 h-11 rounded-full bg-brand-sky hover:bg-brand-sky-400 text-white shadow-2xl flex items-center justify-center text-xl">
            💡
          </button>
        )
      )}
    </div>
  )
}

export default function NewIssuePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>}>
      <NewIssueWizard />
    </Suspense>
  )
}
