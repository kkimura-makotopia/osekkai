'use client'
import { Dispatch, SetStateAction } from 'react'
import { ISSUE_CATEGORIES, REQUEST_TYPES } from '@/lib/issueOptions'

export interface EditableIssue {
  category: string
  requestType: string
  summary: string
  detail: string
}

export const emptyIssue: EditableIssue = { category: 'その他', requestType: 'ヒアリング', summary: '', detail: '' }

interface Props {
  issues: EditableIssue[]
  setIssues: Dispatch<SetStateAction<EditableIssue[]>>
  max?: number
}

export function IssueCardsEditor({ issues, setIssues, max = 3 }: Props) {
  const update = (i: number, patch: Partial<EditableIssue>) =>
    setIssues(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const remove = (i: number) => setIssues(prev => prev.filter((_, idx) => idx !== i))
  const add = () => setIssues(prev => [...prev, { ...emptyIssue }])

  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <div key={i} className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-brand-sky-400 text-sm font-bold">相談 {i + 1}</span>
            {issues.length > 1 && (
              <button type="button" onClick={() => remove(i)}
                className="text-red-400 hover:text-red-300 text-xs">この相談を削除</button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">課題カテゴリ</label>
              <select value={issue.category} onChange={e => update(i, { category: e.target.value })}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-sky">
                {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">種別</label>
              <select value={issue.requestType} onChange={e => update(i, { requestType: e.target.value })}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-sky">
                {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">見出し（コミュニティで発表する一文・質問/依頼の形）</label>
            <textarea value={issue.summary} onChange={e => update(i, { summary: e.target.value })}
              rows={2} placeholder="例: 歩留まり分析などデータドリブンに施策決定する成功事例を知りたい"
              className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky resize-none" />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">背景・具体的に聞きたいこと / 紹介してほしいこと</label>
            <textarea value={issue.detail} onChange={e => update(i, { detail: e.target.value })}
              rows={9} placeholder="現状の数字や取り組み、これまで試したことを書き、具体的に何を聞きたいか・どんな相手を紹介してほしいかを明確に書いてください。"
              className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-sky resize-none" />
          </div>
        </div>
      ))}

      {issues.length < max && (
        <button type="button" onClick={add}
          className="w-full bg-brand-navy-700 hover:bg-brand-navy-900 text-white py-2 rounded-xl text-sm">
          + 相談を追加
        </button>
      )}
    </div>
  )
}
