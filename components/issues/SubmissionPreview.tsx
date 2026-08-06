'use client'
import { REQUEST_TYPE_SHORT } from '@/lib/issueOptions'

interface PreviewIssue {
  category: string
  requestType?: string | null
  summary: string
  detail?: string | null
}

interface Props {
  company?: string | null
  fullName?: string | null
  industry?: string | null
  employeeCount?: string | number | null
  foundingYear?: string | number | null
  eventTitle?: string | null
  eventDate?: string | null
  issues: PreviewIssue[]
}

export function SubmissionPreview(p: Props) {
  const facts: [string, string][] = [
    ['業界', p.industry || '—'],
    ['従業員数', p.employeeCount !== '' && p.employeeCount != null ? `${p.employeeCount}名` : '—'],
    ['設立年', p.foundingYear !== '' && p.foundingYear != null ? `${p.foundingYear}年` : '—'],
  ]

  const eventLine = p.eventTitle
    ? `${p.eventTitle}${p.eventDate ? `（${new Date(p.eventDate).toLocaleDateString('ja-JP')}）` : ''}`
    : ''

  return (
    <div className="bg-white rounded-xl shadow-lg text-[#1c2733] overflow-hidden">
      <div className="px-7 py-7">
        {/* ヘッダー */}
        <div className="flex justify-between items-end gap-6 border-b-2 border-[#0A2540] pb-3.5 mb-6">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span className="text-[10px] tracking-[2.5px] text-[#1E9CE6] font-bold whitespace-nowrap">経営課題 提出シート</span>
              <span className="text-[#556270] text-[11px]">
                {p.fullName || '—'}{eventLine ? `　／　${eventLine}` : ''}
              </span>
            </div>
            <h1 className="text-[22px] font-bold text-[#0A2540] leading-tight truncate">{p.company || p.fullName || '—'}</h1>
          </div>
          <div className="shrink-0 text-right text-[11px] leading-[1.9]">
            {facts.map(([l, v], i) => (
              <div key={i} className="whitespace-nowrap">
                <span className="text-[#6b7885] mr-2.5 tracking-wide">{l}</span>
                <span className="text-[#0A2540] font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 経営課題 */}
        <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-[#0A2540] font-bold mb-3">
          <span className="w-4 h-0.5 bg-[#1E9CE6] inline-block" />
          経営課題 <span className="text-[#6b7885] font-normal tracking-normal">（{p.issues.length}件）</span>
        </div>
        <div>
          {p.issues.map((it, i) => (
            <div key={i} className={`flex gap-4 py-4 ${i < p.issues.length - 1 ? 'border-b border-[#d4dae1]' : ''}`}>
              <div className="text-[18px] font-bold text-[#0A2540] min-w-[26px] leading-snug">{String(i + 1).padStart(2, '0')}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] mb-1.5">
                  <span className="text-[#1E9CE6] font-bold">{it.category}</span>
                  {it.requestType && (
                    <>
                      <span className="mx-2 text-[#9fb8cf]">·</span>
                      <span className="text-[#1E9CE6] font-bold">{it.requestType}</span>
                      {REQUEST_TYPE_SHORT[it.requestType] && (
                        <span className="text-[#5a93bf]">（{REQUEST_TYPE_SHORT[it.requestType]}）</span>
                      )}
                    </>
                  )}
                </div>
                <p className="font-bold text-[14px] text-[#12213a] leading-snug mb-1.5">{it.summary || '（タイトル未入力）'}</p>
                {it.detail && <p className="text-[#33414f] text-[12px] whitespace-pre-wrap leading-relaxed">{it.detail}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* メモ */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-[11px] tracking-[2px] text-[#0A2540] font-bold mb-2">
            <span className="w-4 h-0.5 bg-[#1E9CE6] inline-block" />
            メモ <span className="text-[#6b7885] font-normal tracking-normal text-[10px]">経営課題の発表時のメモを記載するのに使用ください</span>
          </div>
          <div className="border border-[#c2ccd6] rounded h-[54px]" />
        </div>
      </div>
    </div>
  )
}
