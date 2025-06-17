import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { UserRole, Prisma } from '@prisma/client'

type ParamsPromise = Promise<{ userId: string }>
type SessionUser = { role?: UserRole }

/* -------------------------------------------------------------------------- */
/* Helper: ensure current session belongs to an ADMIN                         */
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
/* GET /api/admin/users/[userId]                                              */
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
    console.error('GET admin user failed:', err)
    return NextResponse.json(
      { message: 'Error fetching user', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/users/[userId]                                            */
/* -------------------------------------------------------------------------- */
export async function PATCH (
  req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    const session = await assertAdmin()
    const { userId: targetUserId } = await params
    const performingAdminId = session!.user.id

    const body = (await req.json()) as Record<string, unknown>
    const {
      role: newRole,
      isTrustedOwner: newTrust,
      emailVerified: newEmailVerified,
      // isBlocked: newIsBlocked, // if you add this field
    } = body

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const data: Prisma.UserUpdateInput = {}

    /* ---------- Role change with safeguards ---------- */
    if (newRole !== undefined) {
      if (!Object.values(UserRole).includes(newRole as UserRole)) {
        return NextResponse.json({ message: 'Invalid role.' }, { status: 400 })
      }

      // Admin cannot demote themselves
      if (
        performingAdminId === targetUserId &&
        targetUser.role === UserRole.ADMIN &&
        newRole !== UserRole.ADMIN
      ) {
        return NextResponse.json(
          { message: 'Admins cannot change their own role from ADMIN.' },
          { status: 403 },
        )
      }

      // Prevent demoting other admins here
      if (targetUser.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
        return NextResponse.json(
          { message: 'Cannot change another admin’s role to non-admin here.' },
          { status: 403 },
        )
      }

      if (newRole !== targetUser.role) data.role = newRole as UserRole
    }

    /* ---------- Trust status logic ---------- */
    const effectiveRole = (data.role as UserRole) || targetUser.role

    if (newTrust !== undefined && typeof newTrust === 'boolean') {
      if (effectiveRole === UserRole.ADMIN) {
        if (!newTrust) {
          return NextResponse.json(
            { message: 'Admins are inherently trusted; cannot set to false.' },
            { status: 400 },
          )
        }
        data.isTrustedOwner = true
      } else if (effectiveRole === UserRole.OWNER) {
        data.isTrustedOwner = newTrust
      } else {
        // RENTERS cannot be trusted owners
        data.isTrustedOwner = false
      }
    } else if (data.role) {
      // Role changed but trust flag omitted—adjust automatically
      if (data.role === UserRole.ADMIN) data.isTrustedOwner = true
      if (data.role === UserRole.RENTER) data.isTrustedOwner = false
    }

    /* ---------- Email-verification toggle ---------- */
    if (newEmailVerified !== undefined) {
      const currentlyVerified = !!targetUser.emailVerified
      if (newEmailVerified !== currentlyVerified) {
        data.emailVerified = newEmailVerified ? new Date() : null
      }
    }

    // If no actual changes, exit early
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'No changes detected.' },
        { status: 200 },
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
        _count: { select: { cars: true, bookings: true } },
      },
    })

    return NextResponse.json(updated) // 200
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err instanceof NextResponse) return err
    if (err?.code === 'P2025') {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 },
      )
    }
    console.error('PATCH admin user failed:', err)
    return NextResponse.json(
      { message: 'Failed to update user', details: String(err) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({
      message: 'Failed to delete user',
      details: String(error)
    }, { status: 500 });
  }
}

