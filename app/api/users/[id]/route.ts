import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = ['admin', 'member', 'guest'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.dbUserId !== params.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.role !== undefined && session.role === 'admin' && !ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(body.role !== undefined && session.role === 'admin' ? { role: body.role as AllowedRole } : {}),
      ...(body.isActive !== undefined && session.role === 'admin' ? { isActive: body.isActive } : {}),
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
      ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.dbUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.dbUserId === params.id) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 })
  }

  try {
    // ReferralLink.toUserId は FK 関係が無いため、関連レコードを手動削除しておく
    await prisma.$transaction(async tx => {
      await tx.referralLink.deleteMany({ where: { toUserId: params.id } })
      await tx.user.delete({ where: { id: params.id } })
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('user DELETE failed:', err)
    return NextResponse.json({ error: `削除に失敗: ${msg}` }, { status: 500 })
  }
}
