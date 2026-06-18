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

// ②質疑応答形式の設問と回答例（exampleは入力欄にグレーで表示）
export const QA_ITEMS = [
  { q: '3年後にどのような会社にしたいですか？', example: '例）「業界トップクラスのシェアを取り、年商50億円規模にしたい」など、規模や状態を具体的に。' },
  { q: 'そのために最も重要な指標は何ですか？', example: '例）「月間の新規受注件数」「リピート率」「平均客単価」など、数値で追える指標を1つ。' },
  { q: '現在の達成度は何％ですか？', example: '例）「目標に対しておよそ60%」など、％や数値で。' },
  { q: '達成できれば何が変わりますか？', example: '例）「採用や投資の余力が生まれ、次の事業へ再投資できる」など、ヒト・カネ・組織の変化を。' },
  { q: '目標達成を阻害している最も大きな要因を1つ挙げると？', example: '例）「新規リード獲得の頭打ち」「商談化率の低さ」など、最も大きい要因を1つに絞って。' },
  { q: 'その課題はいつ頃から発生していますか？', example: '例）「約1年前から」「直近の半期で特に顕著に」など、時期を具体的に。' },
  { q: 'なぜその課題が起きていますか？', example: '例）「集客はできているが商談化の仕組みがないため」など、思い当たる理由を。' },
  { q: 'なぜそうなっていますか？', example: '例）さらに一段掘り下げて「営業プロセスが属人化しているため」など。' },
  { q: '最終的な根本原因は何だと思いますか？', example: '例）「経営者の時間が現場対応に取られ、仕組み化に手が回らない」など根本に近い要因を。' },
  { q: 'これまでどんな対策をしましたか？', example: '例）「広告出稿」「インサイドセールス導入」「代理店開拓」など、実施した施策を。' },
  { q: 'うまくいった施策はありますか？', example: '例）「セミナー経由のリードは質が高く受注に繋がった」など、効果のあった施策を。' },
  { q: 'うまくいかなかった施策はありますか？', example: '例）「リスティング広告はCPAが合わなかった」など、効果が薄かった施策を。' },
  { q: 'なぜうまくいかなかったと思いますか？', example: '例）「ターゲット設定が曖昧だった」「運用リソースが不足していた」など。' },
  { q: '現在最も時間を使っている業務は？', example: '例）「営業同行」「採用面接」「既存顧客対応」など、時間の使い道を。' },
  { q: '本来やりたい業務は？', example: '例）「事業戦略の立案」「新規事業開発」など、本来集中したい業務を。' },
] as const

export const QA_QUESTIONS = QA_ITEMS.map(i => i.q)
export const QA_EXAMPLES = QA_ITEMS.map(i => i.example)

export const MODE_LABELS: Record<'text' | 'qa' | 'manual', string> = {
  text: 'テキスト形式',
  qa: '質疑応答形式',
  manual: '自分で作成する',
}
