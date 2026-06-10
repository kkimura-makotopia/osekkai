// 経営課題のカテゴリ
export const ISSUE_CATEGORIES = [
  'マーケティング課題',
  '営業課題',
  '組織・人材課題',
  '財務・資金課題',
  '商品・サービス課題',
  '経営戦略課題',
  'オペレーション・業務課題',
  'IT・DX課題',
  'その他',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export const isIssueCategory = (v: string): v is IssueCategory =>
  (ISSUE_CATEGORIES as readonly string[]).includes(v)

// ②質疑応答形式の設問
export const QA_QUESTIONS = [
  '今、一番伸ばしたい指標は何ですか？',
  'その指標が伸びれば会社はどう変わりますか？',
  'その目標達成を阻害している要因を3つ挙げるなら？',
  'その中で最も大きいものは？',
  'それはいつから起きていますか？',
  'それを解決できた会社を知っていますか？',
  'これが解決したら売上や利益はどれくらい変わりますか？',
  '逆に放置したらどうなりますか？',
  '今まで何を試しましたか？',
] as const

export const MODE_LABELS: Record<'text' | 'qa', string> = {
  text: 'テキスト形式',
  qa: '質疑応答形式',
}
