'use client'
import React from 'react'

// 本文中の URL をクリック可能なリンクに変換
function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-sky-400 underline break-all hover:text-brand-sky"
        >
          {part}
        </a>
      )
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  })
}

// 行頭のラベル（【xxx】 または xxx：）を検出して【】で強調表示
function parseLine(line: string): { label: string | null; rest: string } {
  const braced = line.match(/^【([^】]{1,16})】\s*(.*)$/)
  if (braced) return { label: braced[1], rest: braced[2] }
  const colon = line.match(/^([^：\s][^：]{0,15})：\s*(.*)$/)
  if (colon) return { label: colon[1], rest: colon[2] }
  return { label: null, rest: line }
}

export function FeedbackContent({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.split('\n')
  return (
    <div className={`space-y-0.5 ${className}`}>
      {lines.map((line, idx) => {
        if (line.trim() === '') return <div key={idx} className="h-2" />
        const { label, rest } = parseLine(line)
        return (
          <p key={idx} className="leading-relaxed">
            {label && <span className="text-slate-400 font-medium">【{label}】</span>}
            <span className="text-slate-200">{label ? ' ' : ''}{linkify(rest, String(idx))}</span>
          </p>
        )
      })}
    </div>
  )
}
