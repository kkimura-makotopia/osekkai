// 経営者コミュニティ参加対象の役職
export const JOB_TITLES = [
  '会長',
  '代表取締役',
  '取締役',
  '執行役員',
  'CXO',
] as const

export type JobTitle = (typeof JOB_TITLES)[number]
