import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserRole } from '@prisma/client';

// GET /api/admin/settings - Fetch all platform settings
export async function GET() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user as { role?: UserRole }).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch platform settings:', error);
    return NextResponse.json({ message: 'Failed to fetch platform settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Update multiple platform settings
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    (session.user as { role?: UserRole }).role !== UserRole.ADMIN
  ) {
    return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const settingsToUpdate: { key: string; value: string }[] = await req.json();

    if (!Array.isArray(settingsToUpdate) || settingsToUpdate.some(s => !s.key || typeof s.value === 'undefined')) {
        return NextResponse.json({ message: 'Invalid settings format. Expected an array of {key, value} objects.' }, { status: 400 });
    }
    
    const transactionPromises = settingsToUpdate.map(setting =>
      prisma.platformSetting.update({
        where: { key: setting.key },
        data: { value: String(setting.value) }, // Ensure value is string
      })
    );

    await prisma.$transaction(transactionPromises);

    // Fetch updated settings to return
    const updatedSettings = await prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    return NextResponse.json(updatedSettings, { status: 200 });
  } catch (error) {
    console.error('Failed to update platform settings:', error);
    // Handle specific Prisma errors if a key doesn't exist, etc.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) { // Record to update not found
        return NextResponse.json({ message: 'One or more settings keys not found.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to update platform settings' }, { status: 500 });
  }
}