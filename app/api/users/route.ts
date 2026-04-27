import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, email: true, name: true, fullName: true, company: true,
      jobTitle: true, bio: true, industry: true, employeeCount: true,
      image: true, role: true, snsLinks: true,
      referralTemplate: true, isActive: true, createdAt: true,
      _count: { select: { createdEvents: true, sentFeedbacks: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { fullName, company, jobTitle, bio, industry, employeeCount, snsLinks, referralTemplate } = await req.json()
  const updated = await prisma.user.update({
    where: { id: session.dbUserId },
    data: {
      fullName,
      company,
      jobTitle,
      bio,
      snsLinks: snsLinks ?? {},
      ...(industry !== undefined ? { industry } : {}),
      ...(employeeCount !== undefined ? { employeeCount: employeeCount === null || employeeCount === '' ? null : Number(employeeCount) } : {}),
      ...(referralTemplate !== undefined ? { referralTemplate } : {}),
    },
  })
  return NextResponse.json(updated)
}
