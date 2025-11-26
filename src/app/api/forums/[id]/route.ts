import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import {
  createApiResponse,
  createErrorResponse,
} from "@/lib/utils";
import {
  getForumById,
  updateForum,
  deleteForum,
  getForumComments,
} from "@/lib/database";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const forumId = params.id;

    // 임상포럼 게시글 조회
    let forum = await getForumById(forumId);
    if (!forum) {
      return NextResponse.json(
        createErrorResponse("임상포럼 게시글을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

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

    // 조회수 증가는 별도의 /view API에서 처리하므로 여기서는 제거
    console.log(`[Forum ${forumId}] Forum data retrieved, viewCount: ${forum.viewCount}`);

    // 좋아요 여부 확인 (로그인한 경우에만)
    let isLiked = false;
    if (userId) {
      const likeCheck = await (prisma as any).forumPostLike.findUnique({
        where: {
          userId_forumPostId: {
            userId: userId,
            forumPostId: forumId
          }
        }
      });
      isLiked = !!likeCheck;
    }

    // 댓글 조회
    let comments = [];
    try {
      comments = await getForumComments(forumId);
    } catch (error) {
      console.warn("Comments fetch failed (table may not exist):", error);
      comments = []; // 빈 배열로 설정
    }

    const forumDetail = {
      ...forum,
      comments,
      isLiked: isLiked,
    };

    return NextResponse.json(
      createApiResponse("success", "임상포럼 게시글 조회 성공", forumDetail)
    );
  } catch (error) {
    console.error("Forum detail error:", error);
    return NextResponse.json(
      createErrorResponse("임상포럼 게시글 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const PUT = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const forumId = params.id;
      const updateData = await request.json();

      // 임상포럼 게시글 존재 및 권한 확인
      const forum = await getForumById(forumId);
      if (!forum) {
        return NextResponse.json(
          createErrorResponse("임상포럼 게시글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (forum.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 게시글을 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 게시글 수정
      const updatedForum = await updateForum(forumId, updateData);

      return NextResponse.json(
        createApiResponse(
          "success",
          "임상포럼 게시글이 수정되었습니다",
          updatedForum
        )
      );
    } catch (error) {
      console.error("Forum update error:", error);
      return NextResponse.json(
        createErrorResponse("임상포럼 게시글 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const forumId = params.id;

      // 임상포럼 게시글 존재 및 권한 확인
      const forum = await getForumById(forumId);
      if (!forum) {
        return NextResponse.json(
          createErrorResponse("임상포럼 게시글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (forum.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 게시글을 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 게시글 삭제
      await deleteForum(forumId);

      return NextResponse.json(
        createApiResponse("success", "임상포럼 게시글이 삭제되었습니다")
      );
    } catch (error) {
      console.error("Forum delete error:", error);
      return NextResponse.json(
        createErrorResponse("임상포럼 게시글 삭제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
