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
      recentRevenue: true, fiscalMonth: true, targetRevenueScale: true, marketingChannels: true,
      foundingYear: true, fullTimeEmployees: true, branchCount: true, operatingMargin: true,
      serviceUnitPrice: true, serviceBreakdown: true, customerCount: true, revenueGrowth: true,
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
  const body = await req.json()

  const normInt = (v: unknown) => v === null || v === '' || v === undefined ? null : Number(v)
  const normStr = (v: unknown) => v === null || v === undefined ? null : (v === '' ? null : String(v))
  const normArr = (v: unknown) => Array.isArray(v) ? v : []

  // 売上構成比のサニタイズ
  const normBreakdown = (v: unknown) => {
    if (!Array.isArray(v)) return []
    return v
      .filter(it => it && typeof it === 'object')
      .map((it: { name?: unknown; percentage?: unknown }) => ({
        name: String(it.name ?? '').trim(),
        percentage: typeof it.percentage === 'number' ? it.percentage : Number(it.percentage) || 0,
      }))
      .filter(it => it.name)
  }

  const updated = await prisma.user.update({
    where: { id: session.dbUserId },
    data: {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
      ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.snsLinks !== undefined ? { snsLinks: body.snsLinks ?? {} } : {}),
      ...(body.industry !== undefined ? { industry: body.industry } : {}),
      ...(body.employeeCount !== undefined ? { employeeCount: normInt(body.employeeCount) } : {}),
      ...(body.referralTemplate !== undefined ? { referralTemplate: body.referralTemplate } : {}),
      ...(body.recentRevenue !== undefined ? { recentRevenue: normStr(body.recentRevenue) } : {}),
      ...(body.fiscalMonth !== undefined ? { fiscalMonth: normInt(body.fiscalMonth) } : {}),
      ...(body.targetRevenueScale !== undefined ? { targetRevenueScale: normStr(body.targetRevenueScale) } : {}),
      ...(body.marketingChannels !== undefined ? { marketingChannels: normArr(body.marketingChannels) } : {}),
      ...(body.foundingYear !== undefined ? { foundingYear: normInt(body.foundingYear) } : {}),
      ...(body.fullTimeEmployees !== undefined ? { fullTimeEmployees: normStr(body.fullTimeEmployees) } : {}),
      ...(body.branchCount !== undefined ? { branchCount: normStr(body.branchCount) } : {}),
      ...(body.operatingMargin !== undefined ? { operatingMargin: normStr(body.operatingMargin) } : {}),
      ...(body.serviceUnitPrice !== undefined ? { serviceUnitPrice: normStr(body.serviceUnitPrice) } : {}),
      ...(body.serviceBreakdown !== undefined ? { serviceBreakdown: normBreakdown(body.serviceBreakdown) } : {}),
      ...(body.customerCount !== undefined ? { customerCount: normStr(body.customerCount) } : {}),
      ...(body.revenueGrowth !== undefined ? { revenueGrowth: normStr(body.revenueGrowth) } : {}),
    },
  })
  return NextResponse.json(updated)
}
