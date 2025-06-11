import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmNewPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return NextResponse.json({ message: 'All password fields are required.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters long.' }, { status: 400 });
    }
    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ message: 'New passwords do not match.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });

    if (!user || !user.password) {
      // User might have signed up with OAuth and doesn't have a local password
      return NextResponse.json({ message: 'Password change not applicable for this account type or user not found.' }, { status: 400 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ message: 'Incorrect current password.' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
        return NextResponse.json({ message: 'New password cannot be the same as the current password.' }, { status: 400 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });
    
    // TODO: Optionally, invalidate other active sessions for this user.
    // This is an advanced step, often involves managing session tokens in DB.
    // For NextAuth.js, if using DB adapter, you might delete other sessions.

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Failed to change password.', details: String(error) }, { status: 500 });
  }
}