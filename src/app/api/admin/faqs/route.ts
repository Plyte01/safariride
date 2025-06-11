import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role?: UserRole | null;
};

// GET /api/admin/faqs - List all FAQs (for admin management)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user as SessionUser).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const faqs = await prisma.fAQ.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(faqs, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/faqs - Create a new FAQ
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as SessionUser).role !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  try {
    const { question, answer, category, isActive, sortOrder } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ message: 'Question and Answer are required' }, { status: 400 });
    }
    const newFAQ = await prisma.fAQ.create({
      data: { 
        question, 
        answer, 
        category: category || null, 
        isActive: typeof isActive === 'boolean' ? isActive : true,
        sortOrder: sortOrder ? parseInt(sortOrder) : null 
      },
    });
    return NextResponse.json(newFAQ, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}