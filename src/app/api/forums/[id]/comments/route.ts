import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { 
  getForumComments, 
  createForumComment, 
  getForumById,
  createNotification,
  getForumCommentById
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 댓글 목록 조회 (로그인 불필요)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const forumId = params.id;

    // 포럼 존재 확인
    const forum = await getForumById(forumId);
    if (!forum) {
      return NextResponse.json(
        createErrorResponse("포럼을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    // 댓글 조회
    const comments = await getForumComments(forumId);

    return NextResponse.json(
      createApiResponse("success", "댓글 목록 조회 성공", comments)
    );
  } catch (error) {
    console.error("Comments list error:", error);
    return NextResponse.json(
      createErrorResponse("댓글 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

// 댓글 생성 (관리자 인증 필요)
export const POST = withAdminVerification(async (request: NextRequest, context: RouteContext) => {
  try {
    const user = (request as any).user;
    const params = await context.params;
    const forumId = params.id;
    const { content, parentId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        createErrorResponse("댓글 내용을 입력해주세요"),
        { status: 400 }
      );
    }

    // 포럼 존재 확인
    const forum = await getForumById(forumId);
    if (!forum) {
      return NextResponse.json(
        createErrorResponse("포럼을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    // 댓글 생성
    const comment = await createForumComment({
      forumId,
      userId: user.userId,
      content: content.trim(),
      parentId
    });

    // 알림 전송 로직
    try {
      if (parentId) {
        // 답글인 경우: 부모 댓글 작성자에게 알림
        const parentComment = await getForumCommentById(parentId);
        if (parentComment && parentComment.user_id !== user.userId) {
          await createNotification({
            userId: parentComment.user_id,
            type: "SYSTEM",
            title: "새로운 답글이 달렸습니다",
            content: `'${forum.title}' 포럼에서 내 댓글에 답글이 달렸습니다.`,
            url: `/forums/${forumId}`,
            senderId: user.userId,
          });
        }
      } else {
        // 댓글인 경우: 포럼 작성자에게 알림 (자신에게는 알림 안함)
        if (forum.userId !== user.userId) {
          await createNotification({
            userId: forum.userId,
            type: "SYSTEM",
            title: "새로운 댓글이 달렸습니다",
            content: `'${forum.title}' 포럼에 새로운 댓글이 달렸습니다.`,
            url: `/forums/${forumId}`,
            senderId: user.userId,
          });
        }
      }
    } catch (notificationError) {
      console.error("Failed to send forum comment notification:", notificationError);
      // 알림 전송 실패는 댓글 생성에 영향을 주지 않음
    }

    return NextResponse.json(
      createApiResponse("success", "댓글이 등록되었습니다", comment)
    );
  } catch (error) {
    console.error("Comment create error:", error);
    return NextResponse.json(
      createErrorResponse("댓글 등록 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});