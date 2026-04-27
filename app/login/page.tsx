import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LoginClient } from '@/components/auth/LoginClient'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')
  return <LoginClient />
}
