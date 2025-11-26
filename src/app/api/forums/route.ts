import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getForumsWithPagination, createForum } from "@/lib/database";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 사용자 정보 확인 (선택적)
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getForumsWithPagination(page, limit);

    // 좋아요 정보 조회 (로그인한 경우에만)
    let userLikes: string[] = [];
    if (userId && result && result.length > 0) {
      const forumIds = result.map((forum: any) => forum.id).filter(Boolean);
      if (forumIds.length > 0) {
        const likes = await (prisma as any).forumPostLike.findMany({
          where: {
            userId,
            forumPostId: { in: forumIds },
          },
          select: { forumPostId: true },
        });
        userLikes = likes.map((like: any) => like.forumPostId);
      }
    }

    // 좋아요 정보를 포함한 포럼 데이터 변환
    const forumsWithLikes = result
      ? result.map((forum: any) => ({
          ...forum,
          isLiked: userId ? userLikes.includes(forum.id) : false,
        }))
      : [];

    return NextResponse.json(
      createApiResponse("success", "임상포럼 목록 조회 성공", {
        forums: forumsWithLikes,
        totalCount: result.length,
      })
    );
  } catch (error) {
    console.error("Forums list error:", error);
    return NextResponse.json(
      createErrorResponse("임상포럼 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const POST = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const forumData = await request.json();

    console.log("Creating forum with user:", user);
    console.log("Forum data:", forumData);

    // JWT에서 받은 사용자 ID로 바로 포럼 게시글 생성
    // 나중에 조회할 때 users 테이블과 JOIN하여 사용자 정보를 가져옴
    console.log("Creating forum with userId:", user.userId);

    // 임상포럼 게시글 생성
    const forum = await createForum({
      ...forumData,
      userId: user.userId,
    });

    return NextResponse.json(
      createApiResponse("success", "임상포럼 게시글이 등록되었습니다", forum)
    );
  } catch (error) {
    console.error("Forum create error:", error);
    return NextResponse.json(
      createErrorResponse("임상포럼 게시글 등록 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
