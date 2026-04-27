import { notFound } from 'next/navigation'

interface InviteData {
  link: {
    id: string
    token: string
    message: string | null
    expiresAt: string | null
    fromUser: {
      id: string
      fullName: string | null
      name: string | null
      company: string | null
      jobTitle: string | null
      bio: string | null
      image: string | null
      snsLinks: Record<string, string>
    }
  }
  targetUser: {
    id: string
    fullName: string | null
    name: string | null
    company: string | null
    jobTitle: string | null
    bio: string | null
    image: string | null
    snsLinks: Record<string, string>
  }
}

async function getInviteData(token: string): Promise<InviteData | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/referral/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const SNS_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  website: 'Webサイト',
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const data = await getInviteData(params.token)
  if (!data) notFound()

  const { link, targetUser } = data
  const from = link.fromUser

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* From User Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-4">
          <p className="text-blue-200 text-sm mb-4">紹介者</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
              {from.image ? <img src={from.image} alt="" className="w-full h-full object-cover" /> : (from.fullName ?? from.name ?? '?')[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{from.fullName ?? from.name}</h2>
              <p className="text-blue-200 text-sm">{from.company ?? ''} {from.jobTitle ? `· ${from.jobTitle}` : ''}</p>
            </div>
          </div>
          {link.message && (
            <div className="mt-4 bg-white/10 rounded-xl p-4 border-l-2 border-blue-400">
              <p className="text-white italic">"{link.message}"</p>
            </div>
          )}
        </div>

        {/* Target User Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <p className="text-blue-200 text-sm mb-4">ご紹介するメンバー</p>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {targetUser.image ? <img src={targetUser.image} alt="" className="w-full h-full object-cover" /> : (targetUser.fullName ?? targetUser.name ?? '?')[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">{targetUser.fullName ?? targetUser.name}</h2>
              <p className="text-blue-200">{targetUser.company ?? ''} {targetUser.jobTitle ? `· ${targetUser.jobTitle}` : ''}</p>
            </div>
          </div>

          {targetUser.bio && (
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{targetUser.bio}</p>
          )}

          {/* SNS Links */}
          {Object.entries(targetUser.snsLinks ?? {}).filter(([, v]) => v).length > 0 && (
            <div className="flex gap-3 flex-wrap mb-4">
              {Object.entries(targetUser.snsLinks ?? {}).map(([key, url]) => {
                if (!url) return null
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 text-sm underline">
                    {SNS_LABELS[key] ?? key}
                  </a>
                )
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
