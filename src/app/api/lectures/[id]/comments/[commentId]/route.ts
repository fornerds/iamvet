import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getLectureCommentById,
  updateLectureComment,
  deleteLectureComment,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

export const GET = async (request: NextRequest, context: RouteContext) => {
  try {
    const params = await context.params;
    const { commentId } = params;

    const comment = await getLectureCommentById(commentId);
    if (!comment) {
      return NextResponse.json(createErrorResponse("댓글을 찾을 수 없습니다"), {
        status: 404,
      });
    }

    return NextResponse.json(
      createApiResponse("success", "댓글 조회 성공", comment)
    );
  } catch (error) {
    console.error("Lecture comment detail error:", error);
    return NextResponse.json(
      createErrorResponse("댓글 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
};

export const PUT = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { commentId } = params;
      const { content } = await request.json();

      // 입력 검증
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          createErrorResponse("댓글 내용을 입력해주세요"),
          { status: 400 }
        );
      }

      if (content.length > 1000) {
        return NextResponse.json(
          createErrorResponse("댓글은 1000자 이내로 작성해주세요"),
          { status: 400 }
        );
      }

      // 댓글 존재 및 권한 확인
      const comment = await getLectureCommentById(commentId);
      if (!comment) {
        return NextResponse.json(
          createErrorResponse("댓글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (comment.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 댓글을 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 댓글 수정
      const updatedComment = await updateLectureComment(commentId, content.trim());

      return NextResponse.json(
        createApiResponse("success", "댓글이 수정되었습니다", updatedComment)
      );
    } catch (error) {
      console.error("Lecture comment update error:", error);
      return NextResponse.json(
        createErrorResponse("댓글 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    console.log("=== DELETE Comment API Start ===");
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { commentId } = params;

      console.log("DELETE Comment API:", { 
        user: user ? { userId: user.userId, userType: user.userType } : 'null', 
        commentId 
      });

      // 댓글 존재 및 권한 확인
      const comment = await getLectureCommentById(commentId);
      console.log("Comment found:", comment ? { 
        id: comment.id, 
        userId: comment.userId || comment.user_id,
        content: comment.content?.substring(0, 50) + '...' 
      } : 'null');

      if (!comment) {
        console.log("Comment not found");
        return NextResponse.json(
          createErrorResponse("댓글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 댓글의 userId 필드명 확인 (userId vs user_id)
      const commentUserId = comment.userId || comment.user_id;
      console.log("Permission check:", { 
        commentUserId, 
        requestUserId: user.userId,
        match: commentUserId === user.userId 
      });

      if (commentUserId !== user.userId) {
        console.log("Permission denied");
        return NextResponse.json(
          createErrorResponse("이 댓글을 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 댓글 삭제
      console.log("Attempting to delete comment:", commentId);
      const deleteResult = await deleteLectureComment(commentId);
      console.log("Delete result:", deleteResult);

      return NextResponse.json(
        createApiResponse("success", "댓글이 삭제되었습니다")
      );
    } catch (error) {
      console.error("Lecture comment delete error:", error);
      return NextResponse.json(
        createErrorResponse("댓글 삭제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
