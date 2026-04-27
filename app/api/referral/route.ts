import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const links = await prisma.referralLink.findMany({
    where: { fromUserId: session.dbUserId },
    include: { fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { toUserId, message, validDays } = await req.json()
  if (!toUserId) return NextResponse.json({ error: 'toUserId required' }, { status: 400 })
  const expiresAt = validDays ? new Date(Date.now() + validDays * 86400000) : null
  const link = await prisma.referralLink.create({
    data: { fromUserId: session.dbUserId, toUserId, message: message ?? null, expiresAt },
    include: { fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
  })
  return NextResponse.json(link, { status: 201 })
}
