import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const link = await prisma.referralLink.findUnique({
    where: { token: params.token },
    include: { fromUser: { select: { id: true, fullName: true, name: true, company: true, jobTitle: true, bio: true, image: true, snsLinks: true } } },
  })
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!link.isActive) return NextResponse.json({ error: 'Inactive' }, { status: 410 })
  if (link.expiresAt && link.expiresAt < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })

  await prisma.referralLink.update({ where: { token: params.token }, data: { clickCount: { increment: 1 } } })

  const targetUser = await prisma.user.findUnique({
    where: { id: link.toUserId },
    select: {
      id: true, fullName: true, name: true, company: true, jobTitle: true, bio: true, image: true, snsLinks: true,
    },
  })
  return NextResponse.json({ link, targetUser })
}
