'use client'
import { SessionProvider, useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'

// セッションが失効（ユーザー削除/無効化）したら自動でログアウトさせる
function SessionGuard() {
  const { data: session } = useSession()
  useEffect(() => {
    if (session?.error === 'UserDeleted') {
      signOut({ callbackUrl: '/login' })
    }
  }, [session?.error])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <SessionGuard />
      {children}
    </SessionProvider>
  )
}
