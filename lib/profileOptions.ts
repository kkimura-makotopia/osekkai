// 売上レンジ（直近確定期売上 / ターゲット売上規模 共通）
export const REVENUE_RANGES = [
  '〜1,000万円',
  '1,000万円〜3,000万円',
  '3,000万円〜5,000万円',
  '5,000万円〜1億円',
  '1億円〜3億円',
  '3億円〜10億円',
  '10億円〜30億円',
  '30億円〜100億円',
  '100億円〜500億円',
  '500億円〜1,000億円',
  '1,000億円以上',
] as const

// 決算月
export const FISCAL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// マーケティングチャネル
export const MARKETING_CHANNELS = [
  '自社サイト・SEO',
  'リスティング広告',
  'SNS広告（Meta / Instagram）',
  'X (Twitter)',
  'LinkedIn',
  'YouTube',
  'TikTok',
  '展示会・カンファレンス',
  'セミナー・ウェビナー',
  'メールマーケティング',
  'テレマーケティング・インサイドセールス',
  'ダイレクトメール',
  'パートナー・代理店',
  'リファラル・紹介',
  'プレスリリース・PR',
  'ホワイトペーパー・eBook',
  'ポッドキャスト',
  'インフルエンサー',
  'オフライン広告（TV/雑誌/交通）',
  'その他',
] as const

export type RevenueRange = (typeof REVENUE_RANGES)[number]
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number]

// 営業利益率
export const OPERATING_MARGINS = [
  '赤字（マイナス）',
  '0〜5%',
  '5〜10%',
  '10〜15%',
  '15〜20%',
  '20〜30%',
  '30〜50%',
  '50%以上',
] as const

// 3年前からの売上成長率
export const REVENUE_GROWTH_RATES = [
  '減少（マイナス成長）',
  '0〜10%',
  '10〜30%',
  '30〜50%',
  '50〜100%',
  '100〜300%',
  '300〜500%',
  '500%以上',
] as const

// サービス平均単価
export const SERVICE_UNIT_PRICES = [
  '〜1万円',
  '1万円〜5万円',
  '5万円〜10万円',
  '10万円〜30万円',
  '30万円〜50万円',
  '50万円〜100万円',
  '100万円〜300万円',
  '300万円〜500万円',
  '500万円〜1,000万円',
  '1,000万円以上',
] as const

// 顧客数
export const CUSTOMER_COUNTS = [
  '〜10',
  '10〜50',
  '50〜100',
  '100〜500',
  '500〜1,000',
  '1,000〜5,000',
  '5,000〜1万',
  '1万〜10万',
  '10万以上',
] as const
