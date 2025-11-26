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
    const jobId = resolvedParams.id;

    const job = await (prisma as any).jobs.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(createErrorResponse('채용공고를 찾을 수 없습니다.'), { status: 404 });
    }

    const existingLike = await (prisma as any).job_likes.findUnique({
      where: {
        userId_jobId: {
          userId: user.userId,
          jobId: jobId
        }
      }
    });

    if (existingLike) {
      return NextResponse.json(createErrorResponse('이미 좋아요한 채용공고입니다.'), { status: 400 });
    }

    await (prisma as any).job_likes.create({
      data: {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.userId,
        jobId: jobId
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 추가되었습니다.'), { status: 201 });
  } catch (error) {
    console.error('Job like error:', error);
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
    const jobId = resolvedParams.id;

    const existingLike = await (prisma as any).job_likes.findUnique({
      where: {
        userId_jobId: {
          userId: user.userId,
          jobId: jobId
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json(createErrorResponse('좋아요하지 않은 채용공고입니다.'), { status: 400 });
    }

    await (prisma as any).job_likes.delete({
      where: {
        userId_jobId: {
          userId: user.userId,
          jobId: jobId
        }
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 취소되었습니다.'));
  } catch (error) {
    console.error('Job unlike error:', error);
    return NextResponse.json(createErrorResponse('좋아요 취소 중 오류가 발생했습니다.'), { status: 500 });
  }
});