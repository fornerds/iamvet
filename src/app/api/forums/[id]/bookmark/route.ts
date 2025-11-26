import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  createForumBookmark,
  removeForumBookmark,
  checkForumBookmarkExists,
  getForumById,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const POST = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const forumId = params.id;

      // 임상포럼 존재 확인
      const forum = await getForumById(forumId);
      if (!forum) {
        return NextResponse.json(
          createErrorResponse("임상포럼을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 이미 북마크한 경우 확인
      const exists = await checkForumBookmarkExists(user.userId, forumId);
      if (exists) {
        return NextResponse.json(
          createErrorResponse("이미 북마크한 임상포럼입니다"),
          { status: 409 }
        );
      }


      // 북마크 생성
      await createForumBookmark(user.userId, forumId);

      return NextResponse.json(
        createApiResponse("success", "북마크가 추가되었습니다")
      );
    } catch (error) {
      console.error("Forum bookmark create error:", error);
      return NextResponse.json(
        createErrorResponse("북마크 추가 중 오류가 발생했습니다"),
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

      // 북마크 존재 확인
      const exists = await checkForumBookmarkExists(user.userId, forumId);
      if (!exists) {
        return NextResponse.json(
          createErrorResponse("북마크가 존재하지 않습니다"),
          { status: 404 }
        );
      }

      // 북마크 삭제
      await removeForumBookmark(user.userId, forumId);

      return NextResponse.json(
        createApiResponse("success", "북마크가 제거되었습니다")
      );
    } catch (error) {
      console.error("Forum bookmark delete error:", error);
      return NextResponse.json(
        createErrorResponse("북마크 제거 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);