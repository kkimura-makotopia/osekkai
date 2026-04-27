import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const dbUserId = (session as { dbUserId?: string }).dbUserId
  if (dbUserId) {
    const me = await prisma.user.findUnique({
      where: { id: dbUserId },
      select: { fullName: true, company: true, jobTitle: true, industry: true, employeeCount: true },
    })
    const incomplete = !me?.fullName?.trim() || !me?.company?.trim() || !me?.jobTitle?.trim() || !me?.industry?.trim() || me?.employeeCount == null
    if (incomplete) redirect('/onboarding')
  }

  const role = (session as { role?: string }).role
  redirect(role === 'admin' ? '/admin' : '/mypage')
}
