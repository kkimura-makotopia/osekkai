import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, shouldHideUser } from '@/lib/apiAuth'

const ALLOWED_ROLES = ['admin', 'member', 'guest'] as const
type AllowedRole = (typeof ALLOWED_ROLES)[number]

// 1会員の公開プロフィール取得（氏名クリック時のポップアップ用）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user: viewer } = auth

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, fullName: true, company: true, jobTitle: true,
      industry: true, employeeCount: true, foundingYear: true, serviceUnitPrice: true,
      bio: true, businessSummary: true, image: true, role: true, email: true, snsLinks: true,
    },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 匿名対象（ゲスト閲覧 or 対象がゲスト、かつ自分以外）はプロフィールを開かせない
  if (shouldHideUser(viewer.role, viewer.id, target)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(target)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const { user } = auth
  const isAdmin = user.role === 'admin'
  if (!isAdmin && user.id !== params.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.role !== undefined && isAdmin && !ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(body.role !== undefined && isAdmin ? { role: body.role as AllowedRole } : {}),
      ...(body.isActive !== undefined && isAdmin ? { isActive: body.isActive } : {}),
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
      ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth({ roles: ['admin'] })
  if ('error' in auth) return auth.error
  const { user } = auth
  if (user.id === params.id) {
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
    console.error('user DELETE failed:', err)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
