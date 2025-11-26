import { NextRequest, NextResponse } from 'next/server';
import { createApiResponse, createErrorResponse } from '@/lib/utils';
import { withAdminVerification } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export const POST = withAdminVerification(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = (request as any).user;
    const resolvedParams = await params;
    const lectureId = resolvedParams.id;

    console.log('Lecture like POST - User:', user.userId, 'Lecture:', lectureId);

    const lecture = await (prisma as any).lectures.findUnique({
      where: { id: lectureId }
    });

    if (!lecture) {
      return NextResponse.json(createErrorResponse('강의를 찾을 수 없습니다.'), { status: 404 });
    }

    const existingLike = await (prisma as any).lecture_likes.findUnique({
      where: {
        userId_lectureId: {
          userId: user.userId,
          lectureId: lectureId
        }
      }
    });

    console.log('Existing like:', existingLike);

    if (existingLike) {
      return NextResponse.json(createErrorResponse('이미 좋아요한 강의입니다.'), { status: 400 });
    }

    console.log('Creating new like...');

    await (prisma as any).lecture_likes.create({
      data: {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.userId,
        lectureId: lectureId
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 추가되었습니다.'), { status: 201 });
  } catch (error) {
    console.error('Lecture like error:', error);
    return NextResponse.json(createErrorResponse('좋아요 처리 중 오류가 발생했습니다.'), { status: 500 });
  }
});

export const DELETE = withAdminVerification(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = (request as any).user;
    const resolvedParams = await params;
    const lectureId = resolvedParams.id;

    const existingLike = await (prisma as any).lecture_likes.findUnique({
      where: {
        userId_lectureId: {
          userId: user.userId,
          lectureId: lectureId
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json(createErrorResponse('좋아요하지 않은 강의입니다.'), { status: 400 });
    }

    await (prisma as any).lecture_likes.delete({
      where: {
        userId_lectureId: {
          userId: user.userId,
          lectureId: lectureId
        }
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 취소되었습니다.'));
  } catch (error) {
    console.error('Lecture unlike error:', error);
    return NextResponse.json(createErrorResponse('좋아요 취소 중 오류가 발생했습니다.'), { status: 500 });
  }
});