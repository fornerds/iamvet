import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getLectureCommentReplies,
  createLectureComment,
  getLectureCommentById,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { commentId } = params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "oldest"; // "oldest" | "latest" for replies

    // 부모 댓글 존재 확인
    const parentComment = await getLectureCommentById(commentId);
    if (!parentComment) {
      return NextResponse.json(createErrorResponse("댓글을 찾을 수 없습니다"), {
        status: 404,
      });
    }

    const replies = await getLectureCommentReplies(commentId);

    return NextResponse.json(
      createApiResponse("success", "대댓글 목록 조회 성공", replies)
    );
  } catch (error) {
    console.error("Lecture comment replies error:", error);
    return NextResponse.json(
      createErrorResponse("대댓글 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const POST = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { id: lectureId, commentId } = params;
      const { content } = await request.json();

      // 입력 검증
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          createErrorResponse("대댓글 내용을 입력해주세요"),
          { status: 400 }
        );
      }

      if (content.length > 1000) {
        return NextResponse.json(
          createErrorResponse("대댓글은 1000자 이내로 작성해주세요"),
          { status: 400 }
        );
      }

      // 부모 댓글 존재 확인
      const parentComment = await getLectureCommentById(commentId);
      if (!parentComment) {
        return NextResponse.json(
          createErrorResponse("댓글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 대댓글의 대댓글은 불가 (최대 1단계 깊이)
      if (parentComment.parentId) {
        return NextResponse.json(
          createErrorResponse("대댓글에는 답글을 달 수 없습니다"),
          { status: 400 }
        );
      }

      // 대댓글 생성
      const reply = await createLectureComment({
        lectureId,
        userId: user.userId,
        content: content.trim(),
        parentId: commentId,
      });

      return NextResponse.json(
        createApiResponse("success", "대댓글이 등록되었습니다", reply)
      );
    } catch (error) {
      console.error("Lecture reply create error:", error);
      return NextResponse.json(
        createErrorResponse("대댓글 등록 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
