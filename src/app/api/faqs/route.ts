import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const faqs = await prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { question: 'asc' }],
    });
    return NextResponse.json(faqs, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch public FAQs:', error);
    return NextResponse.json({ message: 'Failed to load FAQs' }, { status: 500 });
  }
}