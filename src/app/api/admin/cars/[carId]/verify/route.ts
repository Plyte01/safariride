import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { UserRole } from '@prisma/client'

type SessionUser = { role: UserRole }

// PATCH /api/admin/cars/[carId]/verify
export async function PATCH (
  req: NextRequest,
  { params }: { params: Promise<{ carId: string }> },
) {
  // ————————— permissions —————————
  const session = await getServerSession(authOptions)
  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json(
      { message: 'Forbidden: Admin access required' },
      { status: 403 },
    )
  }

  // ————————— extract path & body —————————
  const { carId } = await params
  const { isVerified } = (await req.json()) as { isVerified: unknown }

  if (typeof isVerified !== 'boolean') {
    return NextResponse.json(
      { message: 'Invalid "isVerified" value. Expect boolean.' },
      { status: 400 },
    )
  }

  try {
    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: { isVerified },
    })

    // TODO: notify owner about verification change

    return NextResponse.json(updatedCar) // 200
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json(
        { message: `Car with ID ${carId} not found.` },
        { status: 404 },
      )
    }
    console.error(`Failed to verify car ${carId}:`, err)
    return NextResponse.json(
      { message: `Failed to update verification`, details: String(err) },
      { status: 500 },
    )
  }
}
