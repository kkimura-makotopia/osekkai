// 経営課題のカテゴリ（コミュニティ発表で使う区分）
export const ISSUE_CATEGORIES = [
  '事業課題',
  'マーケティング課題',
  '営業課題',
  '経営課題',
  '組織課題',
  '採用課題',
  '財務課題',
  'その他',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export const isIssueCategory = (v: string): v is IssueCategory =>
  (ISSUE_CATEGORIES as readonly string[]).includes(v)

// 相談の種別（スライドの【ヒアリング】【依頼】タグに対応）
export const REQUEST_TYPES = ['ヒアリング', '依頼'] as const
export type RequestType = (typeof REQUEST_TYPES)[number]

export const REQUEST_TYPE_DESC: Record<RequestType, string> = {
  ヒアリング: '他の経営者の知見・成功事例・Tips・やり方を聞きたい相談',
  依頼: '特定の人・企業・サービスを紹介してほしい／繋がりたいお願い',
}

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
