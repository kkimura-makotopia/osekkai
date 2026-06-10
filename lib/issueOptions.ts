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
  '3年後にどのような会社にしたいですか？',
  'そのために最も重要な指標は何ですか？',
  '現在の達成度は何％ですか？',
  '達成できれば何が変わりますか？',
  '達成できない場合どんなリスクがありますか？',
  '目標達成を阻害している最も大きな要因を1つ挙げると？',
  '１つ目の課題に対していつ頃から発生していますか？',
  '誰が最も困っていますか？',
  'なぜその課題が起きていますか？',
  'なぜそうなっていますか？',
  'さらにその原因は何ですか？',
  '最終的な根本原因は何だと思いますか？',
  'これまでどんな対策をしましたか？',
  'うまくいった施策はありますか？',
  'うまくいかなかった施策はありますか？',
  'なぜうまくいかなかったと思いますか？',
  '現在最も時間を使っている業務は？',
  '本来やりたい業務は？',
  '社長（CXO）しかできない業務は？',
  '今の組織の最大の弱みは？',
] as const

export const MODE_LABELS: Record<'text' | 'qa', string> = {
  text: 'テキスト形式',
  qa: '質疑応答形式',
}
