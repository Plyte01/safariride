import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'

type SessionUser = {
  id: string
  role?: string
  [key: string]: unknown
}

/* -------------------------------------------------------------------------- */
/* GET /api/users/[userId]/cars                                               */
/* -------------------------------------------------------------------------- */
export async function GET (
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },   // ← params is a promise
) {
  const { userId: targetUserId } = await params          // ← await it!

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Unauthorized: No active session.' },
      { status: 401 },
    )
  }

  const user = session.user as SessionUser
  if (user.id !== targetUserId && user.role !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Forbidden: You can only view your own cars.' },
      { status: 403 },
    )
  }

  try {
    const cars = await prisma.car.findMany({
      where: { ownerId: targetUserId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(cars) // 200
  } catch (err) {
    console.error(`Failed to fetch cars for user ${targetUserId}:`, err)
    return NextResponse.json(
      { message: `Failed to fetch cars for user ${targetUserId}` },
      { status: 500 },
    )
  }
}
