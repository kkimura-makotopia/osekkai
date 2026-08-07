'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function HelpPage() {
  const { data: session } = useSession()
  const role = session?.role ?? 'guest'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">おせっ会の使い方</h1>
        <p className="text-slate-400 mt-2">
          経営課題を持ち寄り、解決アクションが生まれる招待制コミュニティです。<br />
          <span className="text-slate-500 text-sm">各項目をタップすると詳しい説明が開きます。</span>
        </p>
      </div>

      <div className="space-y-3">
        {/* ロールについて */}
        <Card title="権限について" icon="👤" summary="運営管理者・正会員・ゲストの3つの権限があります">
          <div className="space-y-3 text-sm">
            <RoleRow label="運営管理者" color="bg-amber-500/20 text-amber-400 border-amber-500/30"
              desc="交流会の作成・編集・削除、会員管理、おせっかいの管理ができます。" />
            <RoleRow label="正会員" color="bg-blue-500/20 text-blue-400 border-blue-500/30"
              desc="交流会の閲覧と参加、おせっかいの送受信ができます。他のメンバーの実名が見えます。" />
            <RoleRow label="ゲスト" color="bg-slate-500/20 text-slate-300 border-slate-500/30"
              desc="運営の承認待ち状態です。閲覧はできますが、メンバーの実名は匿名表示になります。" />
          </div>
        </Card>

        {/* おせっかいフロー */}
        <Card title="おせっかいを送る流れ" icon="💬" summary="交流会で出会った相手に、紹介・知見・サービスを共有しましょう">
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            「おせっかい」とは、参加者同士で価値を持ち寄り、つながりや学びを生み出す行為のこと。
            交流会で出会った相手に、紹介・知見・サービスなどを共有しましょう。
          </p>

          <Step n={1} title="交流会の詳細ページを開く">
            ヘッダの「交流会」から参加した交流会を選択します。<br />
            {role === 'guest' && <span className="text-amber-300">※ ゲストは詳細ページにアクセスできません。運営から承認されると閲覧可能になります。</span>}
          </Step>

          <Step n={2} title="「おせっかいを送る」ボタンを押す">
            画面右側の「おせっかい」セクション上部にあるボタンをクリックします。
          </Step>

          <Step n={3} title="送り先を選ぶ">
            招待されているメンバーを <strong>名前・会社名で検索</strong>して、候補から1名を選びます。
          </Step>

          <Step n={4} title="種類を選ぶ">
            <ul className="mt-2 space-y-1.5 text-slate-300">
              <li><span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full mr-2">知人の紹介</span>有用な人をご紹介する</li>
              <li><span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full mr-2">サービスの紹介</span>関連するサービスやプロダクトを共有する</li>
              <li><span className="inline-block bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full mr-2">ナレッジの共有</span>経験や知見を伝える</li>
              <li><span className="inline-block bg-slate-500/20 text-slate-300 text-xs px-2 py-0.5 rounded-full mr-2">その他</span>協業提案やコミュニティ・交流会のお誘いなど</li>
            </ul>
            <p className="text-slate-400 text-xs mt-2">※ 種類ごとに入力項目が変わります。いずれも冒頭で「お相手の課題」を記入します。</p>
          </Step>

          <Step n={5} title="内容を書いて「送信」">
            相手にとって価値ある具体的な情報を記入し、送信します。<br />
            <span className="text-slate-400 text-xs">※ 送信後も送り先は保持され、続けて送れます。自分の投稿は後から編集・削除できます。</span>
          </Step>

          <div className="mt-5 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-100">
            💡 受け取ったおせっかいは <strong>ヘッダ「おせっかい一覧」</strong> から閲覧できます。<br />
            他のメンバー同士のおせっかいも参考にできます（タブ切替）。
          </div>
        </Card>

        {/* 経営課題提出フォーム */}
        <Card title="経営課題提出フォームの使い方" icon="📝" summary="AIが経営課題を提案。整理して交流会で発表できます">
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            交流会で発表する経営課題を提出できます。入力方法は3つから選べます。
          </p>
          <ul className="text-slate-300 text-sm space-y-1.5 mb-3">
            <li>・<strong>テキスト形式</strong>：現状を自由に書くと <span className="text-brand-sky-400">AIが課題を提案</span></li>
            <li>・<strong>質疑応答形式</strong>：質問に答えると <span className="text-brand-sky-400">AIが課題を提案</span></li>
            <li>・<strong>自分で作成する</strong>：AIを使わず直接入力</li>
          </ul>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            提出した課題は一覧からいつでも編集できます。<strong className="text-slate-300">最終提出期限は交流会当日の3日前</strong>のため、変更・差し替えはそれまでにお願いします。
          </p>
          <Link href="/help/issues"
            className="inline-block bg-brand-sky hover:bg-brand-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl">
            詳しい使い方を見る →
          </Link>
        </Card>

        {/* プロフィール */}
        <Card title="プロフィールの編集" icon="✏️" summary="マイページから氏名・会社名・自己紹介などを編集できます">
          <p className="text-slate-300 text-sm leading-relaxed">
            画面右上のアイコンをクリック → 「マイページ」から、氏名・会社名・役職・業界・従業員数・自己紹介・SNSリンクなどを編集できます。<br />
            プロフィールが充実していると、他のメンバーから紹介されやすくなります。
          </p>
        </Card>

        {/* 補足 */}
        <Card title="その他" icon="❓" summary="不明点や不具合のご報告について">
          <p className="text-slate-300 text-sm leading-relaxed">
            不明点や不具合のご報告は運営までご連絡ください。<br />
            完全招待制のため、新メンバーが会員になり本サイトを利用するためには運営の許可が必要です。
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← ホームに戻る</Link>
      </div>
    </div>
  )
}

function Card({ title, icon, summary, children }: { title: string; icon: string; summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl overflow-hidden transition-colors hover:border-brand-navy-600">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <span className="text-2xl shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-white font-semibold">{title}</span>
          {!open && <span className="block text-slate-400 text-sm mt-0.5 truncate">{summary}</span>}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-brand-navy-700">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

function RoleRow({ label, color, desc }: { label: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-xs px-2 py-1 rounded-full font-medium border shrink-0 ${color}`}>{label}</span>
      <p className="text-slate-300 leading-relaxed">{desc}</p>
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
        <h3 className="text-white font-semibold mb-1">{title}</h3>
        <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
