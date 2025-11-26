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
    const forumPostId = resolvedParams.id;

    const forumPost = await (prisma as any).forum_posts.findUnique({
      where: { id: forumPostId }
    });

    if (!forumPost) {
      return NextResponse.json(createErrorResponse('임상포럼 게시글을 찾을 수 없습니다.'), { status: 404 });
    }

    const existingLike = await (prisma as any).forum_post_likes.findUnique({
      where: {
        userId_forumPostId: {
          userId: user.userId,
          forumPostId: forumPostId
        }
      }
    });

    if (existingLike) {
      return NextResponse.json(createErrorResponse('이미 좋아요한 임상포럼 게시글입니다.'), { status: 400 });
    }

    await (prisma as any).forum_post_likes.create({
      data: {
        id: `like_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.userId,
        forumPostId: forumPostId
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 추가되었습니다.'), { status: 201 });
  } catch (error) {
    console.error('Forum post like error:', error);
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
    const forumPostId = resolvedParams.id;

    const existingLike = await (prisma as any).forum_post_likes.findUnique({
      where: {
        userId_forumPostId: {
          userId: user.userId,
          forumPostId: forumPostId
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json(createErrorResponse('좋아요하지 않은 임상포럼 게시글입니다.'), { status: 400 });
    }

    await (prisma as any).forum_post_likes.delete({
      where: {
        userId_forumPostId: {
          userId: user.userId,
          forumPostId: forumPostId
        }
      }
    });

    return NextResponse.json(createApiResponse('success', '좋아요가 취소되었습니다.'));
  } catch (error) {
    console.error('Forum post unlike error:', error);
    return NextResponse.json(createErrorResponse('좋아요 취소 중 오류가 발생했습니다.'), { status: 500 });
  }
});