'use client'

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
  const info: [string, string][] = [
    ['業界', p.industry || '—'],
    ['従業員数', p.employeeCount !== '' && p.employeeCount != null ? `${p.employeeCount}名` : '—'],
    ['設立年', p.foundingYear !== '' && p.foundingYear != null ? `${p.foundingYear}年` : '—'],
  ]

  return (
    <div className="rounded-2xl border border-brand-navy-700 overflow-hidden">
      {/* シートヘッダー */}
      <div className="bg-gradient-to-r from-brand-navy-900 to-brand-navy-800 px-5 py-4 border-b border-brand-navy-700">
        <p className="text-[11px] text-brand-sky-400 font-bold tracking-wider mb-0.5">経営課題 提出シート</p>
        <p className="text-white font-bold">{p.company || p.fullName || '—'}</p>
        {p.eventTitle && (
          <p className="text-slate-400 text-xs mt-0.5">
            {p.eventTitle}{p.eventDate ? `（${new Date(p.eventDate).toLocaleDateString('ja-JP')}）` : ''}
          </p>
        )}
      </div>

      {/* 会社情報 */}
      <div className="bg-brand-navy-900/40 px-5 py-3">
        <p className="text-brand-sky-400 text-xs font-bold mb-2 flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-brand-sky rounded-full inline-block" />会社情報
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {info.map(([label, value], i) => (
            <div key={i} className="flex items-baseline gap-2">
              <p className="text-slate-500 text-[11px] shrink-0">{label}</p>
              <p className="text-white text-sm font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 経営課題 */}
      <div className="bg-brand-navy-800 px-5 py-4 border-t border-brand-navy-700">
        <p className="text-brand-sky-400 text-xs font-bold mb-3 flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-brand-sky rounded-full inline-block" />経営課題
          <span className="text-slate-500 font-normal">（{p.issues.length}件）</span>
        </p>
        <div className="space-y-3">
          {p.issues.map((it, i) => (
            <div key={i} className="relative bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl p-4 pl-5">
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-brand-sky rounded-full" />
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky-400 border border-brand-sky/30">{it.category}</span>
                {it.requestType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">{it.requestType}</span>
                )}
                <span className="ml-auto text-slate-500 text-[11px]">課題 {i + 1}</span>
              </div>
              <p className="text-white text-sm font-bold leading-relaxed">{it.summary}</p>
              {it.detail && <p className="text-slate-400 text-xs whitespace-pre-wrap mt-1.5 leading-relaxed">{it.detail}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
