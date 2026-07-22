import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/apiAuth'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth
  const links = await prisma.referralLink.findMany({
    where: { fromUserId: user.id },
    include: { fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ roles: ['member', 'admin'] })
  if ('error' in auth) return auth.error
  const { user } = auth
  const { toUserId, message, validDays } = await req.json()
  if (!toUserId) return NextResponse.json({ error: 'toUserId required' }, { status: 400 })
  const expiresAt = validDays ? new Date(Date.now() + validDays * 86400000) : null
  const link = await prisma.referralLink.create({
    data: { fromUserId: user.id, toUserId, message: message ?? null, expiresAt },
    include: { fromUser: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
  })
  return NextResponse.json(link, { status: 201 })
}
