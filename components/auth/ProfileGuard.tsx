'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

// オンボード対象外（誘導ループ防止のため）
const SKIP_PATHS = ['/login', '/onboarding', '/invite']

interface MeCheck {
  id: string
  fullName: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  employeeCount: number | null
}

const isIncomplete = (me: MeCheck) =>
  !me.fullName?.trim() ||
  !me.company?.trim() ||
  !me.jobTitle?.trim() ||
  !me.industry?.trim() ||
  me.employeeCount == null

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') { setChecked(true); return }
    if (SKIP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) { setChecked(true); return }

    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/users')
        if (!r.ok) { if (alive) setChecked(true); return }
        const us = await r.json()
        const me: MeCheck | undefined = Array.isArray(us) ? us.find((u: MeCheck) => u.id === session?.dbUserId) : undefined
        if (alive && me && isIncomplete(me)) {
          router.replace('/onboarding')
          return
        }
      } catch {
        // 失敗時はとりあえず表示
      } finally {
        if (alive) setChecked(true)
      }
    })()

    return () => { alive = false }
  }, [status, pathname, session, router])

  if (!checked && status === 'authenticated' && !SKIP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }
  return <>{children}</>
}
