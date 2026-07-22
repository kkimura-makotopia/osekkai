import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/apiAuth'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  // 一覧では重い issuePdfData を返さない
  const events = await prisma.communityEvent.findMany({
    select: {
      id: true, title: true, heldAt: true, location: true, description: true,
      issuePdfName: true, createdBy: true, createdAt: true, updatedAt: true,
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: {
        include: { user: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
      },
      _count: { select: { feedbacks: true } },
    },
    orderBy: { heldAt: 'desc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ roles: ['admin'] })
  if ('error' in auth) return auth.error
  const { user } = auth

  const { title, heldAt, location, description, inviteeIds, issuePdfData, issuePdfName } = await req.json()
  if (!title || !heldAt) return NextResponse.json({ error: 'title and heldAt required' }, { status: 400 })

  const event = await prisma.communityEvent.create({
    data: {
      title,
      heldAt: new Date(heldAt),
      location,
      description,
      createdBy: user.id,
      ...(issuePdfData !== undefined ? { issuePdfData } : {}),
      ...(issuePdfName !== undefined ? { issuePdfName } : {}),
      ...(Array.isArray(inviteeIds) && inviteeIds.length > 0
        ? { invitees: { create: inviteeIds.map((userId: string) => ({ userId })) } }
        : {}),
    },
    select: {
      id: true, title: true, heldAt: true, location: true, description: true, issuePdfName: true,
      creator: { select: { id: true, fullName: true, name: true, company: true, image: true } },
      invitees: {
        include: { user: { select: { id: true, fullName: true, name: true, company: true, image: true } } },
      },
    },
  })
  return NextResponse.json(event, { status: 201 })
}
