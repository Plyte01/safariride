import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all message threads where the user is a participant
    const threads = await prisma.messageThread.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        car: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            imageUrls: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get only the last message
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get last read timestamps for each thread
    const threadsWithLastRead = await Promise.all(
      threads.map(async (thread) => {
        const participant = await prisma.messageParticipant.findUnique({
          where: {
            threadId_userId: {
              threadId: thread.id,
              userId: session.user.id,
            },
          },
          select: {
            lastReadAt: true,
          },
        });

        return {
          ...thread,
          lastReadAt: participant?.lastReadAt || thread.createdAt,
        };
      })
    );

    return NextResponse.json(threadsWithLastRead);
  } catch (error) {
    console.error('Error fetching owner messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 