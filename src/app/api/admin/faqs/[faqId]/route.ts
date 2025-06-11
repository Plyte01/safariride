import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { UserRole } from '@prisma/client'

type SessionUser = { role?: UserRole | null }

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function assertAdmin () {
  const session = await getServerSession(authOptions)
  const isAdmin =
    session && session.user && (session.user as SessionUser).role === UserRole.ADMIN

  if (!isAdmin) {
    throw new NextResponse(
      JSON.stringify({ message: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

type ParamsPromise = Promise<{ faqId: string }>

/* -------------------------------------------------------------------------- */
/* GET /api/admin/faqs/[faqId]                                                */
/* -------------------------------------------------------------------------- */

export async function GET (
  _req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { faqId } = await params

    const faq = await prisma.fAQ.findUnique({ where: { id: faqId } })
    if (!faq) {
      return NextResponse.json({ message: 'FAQ not found' }, { status: 404 })
    }
    return NextResponse.json(faq) // 200
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('GET admin FAQ failed:', err)
    return NextResponse.json(
      { message: 'Internal server error', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* PUT /api/admin/faqs/[faqId]                                                */
/* -------------------------------------------------------------------------- */

export async function PUT (
  req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { faqId } = await params
    const { question, answer, category, isActive, sortOrder } =
      (await req.json()) as Record<string, unknown>

    if (
      question === undefined &&
      answer === undefined &&
      category === undefined &&
      isActive === undefined &&
      sortOrder === undefined
    ) {
      return NextResponse.json(
        { message: 'No fields provided for update' },
        { status: 400 },
      )
    }

    const data: {
      question?: string
      answer?: string
      category?: string | null
      isActive?: boolean
      sortOrder?: number | null
    } = {}

    if (typeof question === 'string') data.question = question
    if (typeof answer === 'string') data.answer = answer
    if (category !== undefined) data.category = category ? String(category) : null
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (sortOrder !== undefined)
      data.sortOrder =
        sortOrder === null || sortOrder === ''
          ? null
          : Number.parseInt(String(sortOrder), 10)

    const updated = await prisma.fAQ.update({
      where: { id: faqId },
      data,
    })

    return NextResponse.json(updated) // 200
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('PUT admin FAQ failed:', err)
    return NextResponse.json(
      { message: 'Internal server error', details: String(err) },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE /api/admin/faqs/[faqId]                                             */
/* -------------------------------------------------------------------------- */

export async function DELETE (
  _req: NextRequest,
  { params }: { params: ParamsPromise },
) {
  try {
    await assertAdmin()
    const { faqId } = await params

    await prisma.fAQ.delete({ where: { id: faqId } })
    return NextResponse.json({ message: 'FAQ deleted successfully' }) // 200
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('DELETE admin FAQ failed:', err)
    return NextResponse.json(
      { message: 'Internal server error', details: String(err) },
      { status: 500 },
    )
  }
}
