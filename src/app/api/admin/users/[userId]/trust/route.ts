import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { UserRole, Prisma } from '@prisma/client'

type ParamsPromise = Promise<{ userId: string }>
type SessionUser = { role?: UserRole }

/* -------------------------------------------------------------------------- */
/* Helper: allow only admins                                                  */
/* -------------------------------------------------------------------------- */
async function assertAdmin () {
  const session = await getServerSession(authOptions)
  const isAdmin =
    session && session.user && (session.user as SessionUser).role === UserRole.ADMIN

  if (!isAdmin) {
    throw new NextResponse(
      JSON.stringify({ message: 'Forbidden: Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return session
}

/* -------------------------------------------------------------------------- */
/* GET /api/admin/users/[userId]/trust                                        */
/* (Not strictly necessary, but provided for a detail view)                   */
/* -------------------------------------------------------------------------- */
export async function GET (
  _req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        isTrustedOwner: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { cars: true, bookings: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    return NextResponse.json(user) // 200
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('GET admin user/trust failed:', err)
    return NextResponse.json(
      { message: 'Error fetching user', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/users/[userId]/trust                                      */
/* Toggle role, isTrustedOwner, block, etc.                                   */
/* -------------------------------------------------------------------------- */
export async function PATCH (
  req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    const session = await assertAdmin()
    const { userId: targetUserId } = await params

    const body = (await req.json()) as Record<string, unknown>
    const {
      role,
      isTrustedOwner,
      isBlocked, // only if this field exists in your schema
      emailVerified,
    } = body

    const data: Prisma.UserUpdateInput = {}

    /* --------- Role updates with safeguards --------- */
    if (role !== undefined) {
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return NextResponse.json({ message: 'Invalid role.' }, { status: 400 })
      }
      // prevent self-demotion
      if (session!.user.id === targetUserId && role !== UserRole.ADMIN) {
        return NextResponse.json(
          { message: 'Admin cannot demote themselves.' },
          { status: 400 },
        )
      }
      data.role = role as UserRole
    }

    /* --------- Trust status --------- */
    if (isTrustedOwner !== undefined && typeof isTrustedOwner === 'boolean') {
      data.isTrustedOwner = isTrustedOwner
    }

    /* --------- Optional block field --------- */
    if (isBlocked !== undefined && typeof isBlocked === 'boolean') {
      // data.isBlocked = isBlocked
    }

    /* --------- Email verified toggle --------- */
    if (emailVerified !== undefined) {
      data.emailVerified = emailVerified ? new Date() : null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields supplied.' },
        { status: 400 },
      )
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTrustedOwner: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated) // 200
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err instanceof NextResponse) return err
    if (err?.code === 'P2025') {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    console.error('PATCH admin user/trust failed:', err)
    return NextResponse.json(
      { message: 'Failed to update user', details: String(err) },
      { status: 500 },
    )
  }
}
