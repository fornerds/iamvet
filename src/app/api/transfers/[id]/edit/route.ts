import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getTransferByIdForEdit } from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const GET = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const transferId = params.id;

      // 양도양수 게시글 조회 (disabled 포함)
      const transfer = await getTransferByIdForEdit(transferId);
      if (!transfer) {
        return NextResponse.json(
          createErrorResponse("양도양수 게시글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 소유자 확인
      if (transfer.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 게시글을 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      return NextResponse.json(
        createApiResponse("success", "양도양수 게시글 조회 성공", transfer)
      );
    } catch (error) {
      console.error("Transfer edit detail error:", error);
      return NextResponse.json(
        createErrorResponse("양도양수 게시글 조회 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);