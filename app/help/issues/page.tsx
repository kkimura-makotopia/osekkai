'use client'
import Link from 'next/link'

export default function IssuesHelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/help" className="text-slate-400 hover:text-white text-sm">← 使い方トップへ戻る</Link>

      <div className="mb-8 mt-3">
        <h1 className="text-3xl font-bold text-white">経営課題提出フォームの使い方</h1>
        <p className="text-slate-400 mt-2 leading-relaxed">
          自社の経営課題を整理して提出するフォームです。提出した課題はおせっ会（4名テーブル）で発表し、
          他の経営者から<strong className="text-slate-200">アドバイス・成功事例・人脈やサービスの紹介</strong>を獲得することが目的です。
        </p>
      </div>

      {/* 全体の流れ */}
      <Section title="提出までの流れ" icon="🗺️">
        <Step n={1} title="イベントと入力形式を選ぶ">
          提出先のイベントを選び、3つの入力形式から1つを選びます（下記参照）。
        </Step>
        <Step n={2} title="会社情報を入力する">
          マイページと同じ項目です。すでに入力済みの内容は自動で補完され、ここで修正するとマイページにも反映されます。<br />
          <span className="text-slate-400 text-xs">※「非公開」マークの項目は他の会員には表示されません。解析の精度向上に使われます。</span>
        </Step>
        <Step n={3} title="課題を入力・AIで抽出する">
          選んだ形式に沿って入力します。テキスト／質疑応答ではAIが課題を2〜3件にまとめてくれます。
        </Step>
        <Step n={4} title="内容を確認・編集する">
          AIの提案はあくまで下書きです。<strong className="text-slate-200">言い回しや内容は自由に編集</strong>してください。課題は最大3件まで登録できます。
        </Step>
        <Step n={5} title="最新版を確認して提出する">
          A4一枚のプレビューで最終確認し、「運営に提出する」を押します。<br />
          <span className="text-slate-400 text-xs">※ 提出後も一覧から再編集できます（編集後も同じ確認画面を経て再提出します）。</span>
        </Step>
      </Section>

      {/* 3つの入力形式 */}
      <Section title="3つの入力形式" icon="🧭">
        <div className="space-y-4 text-sm">
          <FormatRow label="① テキスト形式"
            desc="事業進捗や伸び悩んでいることなど、現在視点で経営課題を洗い出したい方におすすめ。現状を自由に記述すると、AIが課題を抽出します。" />
          <FormatRow label="② 質疑応答形式"
            desc="3年後のあるべき姿から逆算する未来視点で経営課題を洗い出したい方におすすめ。質問に1問ずつ答えると、AIが課題を導き出します（スキップ不可）。" />
          <FormatRow label="③ 自分で作成する"
            desc="既に経営課題が明瞭で、淡々と入力したい方におすすめ。AIを使わず、空のフォームに直接入力します。" />
        </div>
      </Section>

      {/* ヒント */}
      <Section title="おせっかいを多く獲得するヒント" icon="💡">
        <ul className="space-y-2 text-sm text-slate-300">
          <Hint>AIレコメンドは参考程度にしていただき、言い回しなどは是非変更してください！</Hint>
          <Hint>発表時間は8分なので、課題は2〜3件を推奨しています！</Hint>
          <Hint>ターゲットを年商規模などで絞りすぎると、おせっかいが出にくくなる可能性が高いので、どんな会員でも理解しておせっかいができる文章を工夫してみてください！</Hint>
          <Hint>抽象的すぎると深掘りで時間が終了してしまいます。「代理店の管理工数が肥大化しているので代理店や店舗管理のTipsを知りたい」等の具体的な課題も織り交ぜると、おせっかいをもらいやすいです！</Hint>
          <Hint>直接的なクライアントの紹介依頼はNGですが、Tipsがある方や共催セミナーができる方などの紹介依頼は有効です！</Hint>
        </ul>
      </Section>

      <Section title="提出後について" icon="🔄">
        <p className="text-slate-300 text-sm leading-relaxed">
          提出した課題はヘッダの「経営課題提出フォーム」から一覧で確認・再編集できます。<br />
          1つのイベントにつき提出は1セットで、新しく作り直すと以前の内容は上書きされます。
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/issues/new" className="text-brand-sky-400 hover:text-brand-sky text-sm font-medium">経営課題を提出する →</Link>
          <Link href="/help" className="text-slate-400 hover:text-white text-sm">← 使い方トップ</Link>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
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

function FormatRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3">
      <p className="text-white font-medium mb-1">{label}</p>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-brand-sky-400 shrink-0">・</span>
      <span>{children}</span>
    </li>
  )
}
