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

const STEPS = ['イベント・形式', 'プロフィール', '入力・AI解析', '確認・提出']

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

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    if (session.role === 'guest') { router.push('/feedbacks'); return }

    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([ev, users]) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = (Array.isArray(ev) ? ev : [])
        .filter((e: EventLite) => new Date(e.heldAt) >= today)
        .sort((a: EventLite, b: EventLite) => new Date(a.heldAt).getTime() - new Date(b.heldAt).getTime())
      setEvents(upcoming)
      const me = Array.isArray(users) ? users.find((u: { id: string }) => u.id === session.dbUserId) : null
      if (me) setForm(profileToForm(me))
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
    const data = await res.json()
    const got: EditableIssue[] = (data.issues ?? []).map((i: EditableIssue) => ({
      category: i.category ?? 'その他',
      requestType: i.requestType ?? 'ヒアリング',
      summary: i.summary ?? '',
      detail: i.detail ?? '',
    }))
    setIssues(got.length ? got : [{ category: 'その他', requestType: 'ヒアリング', summary: '', detail: '' }])
    setStep(3)
  }

  const submit = async () => {
    setError('')
    if (issues.some(i => !i.summary.trim())) { setError('各課題の「課題概要」を入力してください'); return }
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
                  <p className="text-slate-400 text-xs">9つの質問に答えると、AIが課題を導き出します。</p>
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

            {mode === 'text' ? (
              <div>
                <label className="text-white font-medium mb-2 block">現在の事業の状況・お悩み</label>
                <textarea value={sourceText} onChange={e => setSourceText(e.target.value)}
                  rows={10} placeholder="事業の現状、伸び悩んでいること、課題に感じていることなどを自由にご記入ください。詳しく書くほどAIの精度が上がります。"
                  className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky resize-none" />
              </div>
            ) : (
              <div className="space-y-4">
                {QA_QUESTIONS.map((q, i) => (
                  <div key={i}>
                    <label className="text-slate-200 text-sm mb-1 block">
                      <span className="text-brand-sky-400 font-bold mr-1">Q{i + 1}.</span>{q}
                    </label>
                    <textarea value={qaAnswers[i]}
                      onChange={e => setQaAnswers(prev => prev.map((a, idx) => idx === i ? e.target.value : a))}
                      rows={2}
                      className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-sky resize-none" />
                  </div>
                ))}
                <p className="text-slate-500 text-xs text-right">{answeredCount} / {QA_QUESTIONS.length} 問 回答済み</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button onClick={() => setStep(1)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">戻る</button>
              <button onClick={runAnalyze} disabled={analyzing || (mode === 'text' ? !sourceText.trim() : answeredCount === 0)}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {analyzing && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {analyzing ? 'AIが解析中...' : 'AIで課題を抽出する'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 確認・提出 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3 text-xs text-slate-300 space-y-2">
              <p>AIが抽出した課題です。内容を確認・修正してから提出してください。提出後も編集できます。</p>
              <p>課題の解像度を上げるためにマイページの非公開情報も参考にしています。公開させたくない情報については適宜削除や言い換えていただければ幸いです。</p>
            </div>
            <IssueCardsEditor issues={issues} setIssues={setIssues} />
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-slate-300 hover:text-white px-4 py-2 text-sm">入力に戻る</button>
              <button onClick={submit} disabled={submitting}
                className="bg-brand-sky hover:bg-brand-sky-400 text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                {submitting ? '提出中...' : '提出する'}
              </button>
            </div>
          </div>
        )}
      </div>
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
