// 他会員に対して公開する項目（おせっかい一覧の氏名クリックで表示）
export const PUBLIC_FIELDS = [
  'fullName',
  'company',
  'jobTitle',
  'industry',
  'employeeCount',
  'foundingYear',
  'serviceUnitPrice',
  'bio',
  'businessSummary',
  'snsLinks',
  'email',
] as const

export type PublicField = (typeof PUBLIC_FIELDS)[number]

export const isPublicField = (key: string): key is PublicField =>
  (PUBLIC_FIELDS as readonly string[]).includes(key)
