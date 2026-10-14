'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* ヒーロー */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-sky p-7 mb-6">
        <p className="text-white/70 text-[11px] font-bold tracking-[3px] mb-2">HOW TO USE</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">おせっかいの使い方</h1>
        <p className="text-white/85 mt-2 text-sm leading-relaxed">
          経営課題を言語化し、決裁者同士で「おせっかい」を贈り合うコミュニティアプリです。<br />
          各項目をタップすると詳しい説明が開きます。
        </p>
      </div>

      <div className="space-y-3">
        {/* 1. おせっ会とは？ */}
        <Card n={1} title="おせっ会とは？" summary="自社だけでは解けない経営課題を前に進める経営コミュニティ">
          <p className="text-slate-300 text-sm leading-relaxed">
            <strong className="text-white">完全招待制・事前審査制</strong>の経営コミュニティです。
            人脈を増やす交流会でも、紹介を出し合う営業組織でも、成功事例を学ぶ勉強会でもなく、
            <strong className="text-brand-sky-400">自社だけでは解けない経営課題を言語化</strong>し、
            決裁者から<strong className="text-slate-100">経営資源（知見・経験・人脈・協業）</strong>を集め、
            次の一手まで明確にする「経営課題解決プラットフォーム」です。
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <Feature title="経営版 知恵袋">贈られた「おせっかい」がデータベース化され、経営課題解決のヒントになります。</Feature>
            <Feature title="ギバーが集まる設計">事前のコンセプト説明とギバー度診断で、ギブ精神の高い決裁者が集まります。</Feature>
            <Feature title="営業されない空間">自社サービスの紹介を制限し、経営課題を起点に安心して対話できます。</Feature>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat value="91.75点" label="会全体の満足度" />
            <Stat value="94.2%" label="継続参加率" />
            <Stat value="84%" label="参加経営者率" />
          </div>
        </Card>

        {/* 2. おせっかいの提出方法 */}
        <Card n={2} title="おせっかいの提出方法（下書き → 送信）" summary="当日はまず下書き。後からまとめて清書して送信します">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            「おせっかい」とは、紹介・知見・サービスなどお相手の経営課題に役立つ情報を贈る行為です。
            おせっかいタイム中は<strong className="text-slate-100">下書き</strong>にためておき、後からまとめて送信します。
          </p>
          <Step n={1} title="イベントを開いて作成を始める">
            イベント一覧からイベントを開き、<span className="text-brand-sky-400">「新規おせっかい（下書き）を作成する」</span>を押します。
          </Step>
          <Step n={2} title="送り先・種類・内容を入力して「下書きにする」">
            送り先を検索して選び、種類（知人の紹介／サービスの紹介／ナレッジの共有／その他）を選択。
            冒頭の「お相手の課題」から内容を書き、<span className="text-brand-sky-400">「下書きにする」</span>で保存します（続けて何件でも作成可）。
          </Step>
          <Step n={3} title="「下書き」から仕上げて送信">
            上部の「下書き」を開き、各下書きを<span className="text-brand-sky-400">「編集」</span>で清書。
            <span className="text-brand-sky-400">「送信」</span>でお相手に届きます（送信前に確認が出ます）。
          </Step>
          <div className="mt-3 bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
            イベントに関係なく送りたいときは、<strong className="text-slate-100">「おせっかい一覧」</strong>の画面右下
            <span className="text-brand-sky-400">「＋ おせっかい」</span>ボタンから、会員へその場で（リアルタイムに）送ることもできます。
          </div>
        </Card>

        {/* 3. 経営課題の提出方法 */}
        <Card n={3} title="経営課題の提出方法" summary="AIと一緒に経営課題を整理して、当日発表できる形に">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            「経営課題提出フォーム」から、当日発表する経営課題を提出します。入力方法は3つから選べます。
          </p>
          <ul className="text-slate-300 text-sm space-y-1.5 mb-3">
            <li>・<strong>テキスト形式</strong>：現状を自由に書くと <span className="text-brand-sky-400">AIが課題を提案</span></li>
            <li>・<strong>質疑応答形式</strong>：質問に答えると <span className="text-brand-sky-400">AIが課題を提案</span></li>
            <li>・<strong>自分で作成する</strong>：AIを使わず直接入力</li>
          </ul>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            課題は最大3件、当日の発表時間は9分です。提出後も編集でき、
            <strong className="text-slate-300">最終提出期限は開催日の3日前</strong>までにお願いします。
          </p>
          <Link href="/help/issues"
            className="inline-block bg-brand-sky hover:bg-brand-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl">
            詳しい使い方を見る →
          </Link>
        </Card>

        {/* 4. プロフィールの入力方法と必要性 */}
        <Card n={4} title="プロフィールの入力方法と必要性" summary="AIの提案精度と、紹介されやすさを左右する大切な情報">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            画面右上のアイコン →「マイページ」から、氏名・会社名・役職・業界・従業員数・売上規模・自己紹介・SNSなどを入力できます。
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-slate-300 leading-relaxed mb-3">
            <p className="text-amber-200 font-semibold mb-1">なぜ必要？</p>
            プロフィールは<strong className="text-slate-100">AIが経営課題を提案する際の重要な情報源</strong>です。
            入力が不十分だとAIの提案精度がかなり落ちます。また、情報が充実しているほど、
            他の会員から<strong className="text-slate-100">紹介・おせっかいを受けやすく</strong>なります。
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            「非公開」マークのついた項目は他の会員には表示されず、課題解析の精度向上にのみ使われますのでご安心ください。
          </p>
        </Card>

        {/* 5. 公式LINEの使い方 */}
        <Card n={5} title="公式LINEの使い方" summary="申込み・紹介・開催予定など、リッチメニューから操作できます">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            おせっ会の公式LINEでは、画面下部の<strong className="text-slate-100">リッチメニュー</strong>から主要な操作がすぐに行えます。
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <MenuItem title="次回・次々回のおせっ会申込み">今後のおせっ会への参加申込みができます。</MenuItem>
            <MenuItem title="他イベントの案内">おせっ会以外の関連イベントのご案内です。</MenuItem>
            <MenuItem title="経営者仲間を紹介する">おせっ会に合いそうな経営者仲間をご紹介いただけます。</MenuItem>
            <MenuItem title="今後の開催予定をカレンダー登録">開催予定をご自身のカレンダーに登録できます。</MenuItem>
            <MenuItem title="経営課題の提出">このアプリの経営課題提出フォームへ移動します。</MenuItem>
            <MenuItem title="おせっかい一覧を見る">このアプリのおせっかい一覧へ移動します。</MenuItem>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-brand-sky-400 hover:text-brand-sky text-sm">← ホームに戻る</Link>
      </div>
    </div>
  )
}

function Card({ n, title, summary, children }: { n: number; title: string; summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl overflow-hidden transition-colors hover:border-brand-sky/40">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center gap-4 p-5 text-left">
        <span className="w-9 h-9 rounded-xl bg-brand-sky/15 border border-brand-sky/30 text-brand-sky-400 font-bold text-sm flex items-center justify-center shrink-0 tabular-nums">
          {String(n).padStart(2, '0')}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-white font-semibold">{title}</span>
          {!open && <span className="block text-slate-400 text-sm mt-0.5 truncate">{summary}</span>}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-brand-navy-700">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl p-3">
      <p className="text-brand-sky-400 text-xs font-bold mb-1">{title}</p>
      <p className="text-slate-400 text-xs leading-relaxed">{children}</p>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl py-3">
      <p className="text-white font-bold text-lg leading-none">{value}</p>
      <p className="text-slate-500 text-[10px] mt-1">{label}</p>
    </div>
  )
}

function MenuItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-brand-navy-700 rounded-xl p-3">
      <p className="text-white text-sm font-medium mb-0.5">{title}</p>
      <p className="text-slate-400 text-xs leading-relaxed">{children}</p>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-brand-sky text-white text-sm font-bold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-1 text-sm">{title}</h3>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
