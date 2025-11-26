import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getLectureComments,
  createLectureComment,
  getLectureById,
  getUserById,
  createNotification,
  getLectureCommentById,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const lectureId = params.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "latest"; // "latest" | "oldest" | "likes"

    // 강의 존재 확인
    const lecture = await getLectureById(lectureId);
    if (!lecture) {
      return NextResponse.json(createErrorResponse("강의를 찾을 수 없습니다"), {
        status: 404,
      });
    }

    const comments = await getLectureComments(lectureId);

    return NextResponse.json(
      createApiResponse("success", "강의 댓글 목록 조회 성공", comments)
    );
  } catch (error) {
    console.error("Lecture comments error:", error);
    return NextResponse.json(
      createErrorResponse("강의 댓글 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const POST = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const lectureId = params.id;
      const { content, parentId } = await request.json();

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

      // 강의 존재 확인
      const lecture = await getLectureById(lectureId);
      if (!lecture) {
        return NextResponse.json(
          createErrorResponse("강의를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 사용자 존재 확인은 미들웨어에서 이미 처리됨 (중복 제거)

      // 댓글 생성
      const comment = await createLectureComment({
        lectureId,
        userId: user.userId,
        content: content.trim(),
        parentId: parentId || null,
      });

      // 답글인 경우 부모 댓글 작성자에게 알림 전송
      if (parentId) {
        try {
          const parentComment = await getLectureCommentById(parentId);
          if (parentComment && parentComment.userId !== user.userId) {
            // 자신에게는 알림을 보내지 않음
            await createNotification({
              userId: parentComment.userId,
              type: "SYSTEM",
              title: "새로운 답글이 달렸습니다",
              content: `'${lecture.title}' 강의에서 내 댓글에 답글이 달렸습니다.`,
              url: `/lectures/${lectureId}`,
              senderId: user.userId,
            });
          }
        } catch (notificationError) {
          console.error("Failed to send reply notification:", notificationError);
          // 알림 전송 실패는 댓글 생성에 영향을 주지 않음
        }
      }

      return NextResponse.json(
        createApiResponse("success", "댓글이 등록되었습니다", comment)
      );
    } catch (error) {
      console.error("Lecture comment create error:", error);
      return NextResponse.json(
        createErrorResponse("댓글 등록 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
