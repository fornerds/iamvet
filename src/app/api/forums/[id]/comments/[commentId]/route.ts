import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { 
  getForumCommentById,
  updateForumComment,
  deleteForumComment
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
}

// 댓글 수정 (관리자 인증 필요)
export const PUT = withAdminVerification(async (request: NextRequest, context: RouteContext) => {
  console.log("=== PUT Forum Comment API Start ===");
  try {
    const user = (request as any).user;
    const params = await context.params;
    const commentId = params.commentId;
    const { content } = await request.json();

    console.log("PUT Forum Comment API:", { 
      user: user ? { userId: user.userId, userType: user.userType } : 'null', 
      commentId,
      contentLength: content?.length 
    });

    if (!content || !content.trim()) {
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
    const comment = await getForumCommentById(commentId);
    console.log("Forum Comment found:", comment ? { 
      id: comment.id, 
      userId: comment.user_id,
      content: comment.content?.substring(0, 50) + '...' 
    } : 'null');

    if (!comment) {
      console.log("Forum Comment not found");
      return NextResponse.json(
        createErrorResponse("댓글을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    console.log("Forum Comment permission check:", { 
      commentUserId: comment.user_id, 
      requestUserId: user.userId,
      match: comment.user_id === user.userId 
    });

    if (comment.user_id !== user.userId) {
      console.log("Forum Comment permission denied");
      return NextResponse.json(
        createErrorResponse("이 댓글을 수정할 권한이 없습니다"),
        { status: 403 }
      );
    }

    // 댓글 수정
    console.log("Attempting to update forum comment:", commentId);
    const updatedComment = await updateForumComment(commentId, content.trim());
    console.log("Forum Comment update result:", updatedComment ? 'success' : 'failed');
    
    if (!updatedComment) {
      return NextResponse.json(
        createErrorResponse("댓글 수정에 실패했습니다"),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiResponse("success", "댓글이 수정되었습니다", updatedComment)
    );
  } catch (error) {
    console.error("Forum comment update error:", error);
    return NextResponse.json(
      createErrorResponse("댓글 수정 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});

// 댓글 삭제 (관리자 인증 필요)
export const DELETE = withAdminVerification(async (request: NextRequest, context: RouteContext) => {
  console.log("=== DELETE Forum Comment API Start ===");
  try {
    const user = (request as any).user;
    const params = await context.params;
    const commentId = params.commentId;

    console.log("DELETE Forum Comment API:", { 
      user: user ? { userId: user.userId, userType: user.userType } : 'null', 
      commentId 
    });

    // 댓글 존재 및 권한 확인
    const comment = await getForumCommentById(commentId);
    console.log("Forum Comment found:", comment ? { 
      id: comment.id, 
      userId: comment.user_id,
      content: comment.content?.substring(0, 50) + '...' 
    } : 'null');

    if (!comment) {
      console.log("Forum Comment not found");
      return NextResponse.json(
        createErrorResponse("댓글을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    console.log("Forum Comment permission check:", { 
      commentUserId: comment.user_id, 
      requestUserId: user.userId,
      match: comment.user_id === user.userId 
    });

    if (comment.user_id !== user.userId) {
      console.log("Forum Comment permission denied");
      return NextResponse.json(
        createErrorResponse("이 댓글을 삭제할 권한이 없습니다"),
        { status: 403 }
      );
    }

    // 댓글 삭제
    console.log("Attempting to delete forum comment:", commentId);
    const deleteResult = await deleteForumComment(commentId);
    console.log("Forum Comment delete result:", deleteResult);
    
    if (!deleteResult) {
      return NextResponse.json(
        createErrorResponse("댓글 삭제에 실패했습니다"),
        { status: 500 }
      );
    }

    return NextResponse.json(
      createApiResponse("success", "댓글이 삭제되었습니다")
    );
  } catch (error) {
    console.error("Forum comment delete error:", error);
    return NextResponse.json(
      createErrorResponse("댓글 삭제 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});