import { createErrorResponse } from "@/lib/auth-helpers";
import {
  createResumeBookmark,
  deleteResumeBookmark,
  getResumeBookmark,
} from "@/lib/database";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export const POST = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const resolvedParams = await params;
      const veterinarianId = resolvedParams.id;
      const user = (request as any).user;

      // 병원만 북마크 가능
      if (user.userType !== "hospital") {
        return NextResponse.json(
          createErrorResponse("병원만 북마크할 수 있습니다"),
          { status: 403 }
        );
      }

      // 중복 북마크 확인
      const existingBookmark = await getResumeBookmark(
        user.userId,
        veterinarianId
      );
      if (existingBookmark) {
        return NextResponse.json(
          createErrorResponse("이미 북마크한 인재입니다"),
          { status: 409 }
        );
      }

      // 북마크 생성
      await createResumeBookmark(user.userId, veterinarianId);

      return NextResponse.json(
        createApiResponse("success", "북마크가 추가되었습니다", null)
      );
    } catch (error) {
      console.error("Resume bookmark error:", error);
      return NextResponse.json(
        createErrorResponse("북마크 처리 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const resolvedParams = await params;
      const veterinarianId = resolvedParams.id;
      const user = (request as any).user;

      await deleteResumeBookmark(user.userId, veterinarianId);

      return NextResponse.json(
        createApiResponse("success", "북마크가 제거되었습니다", null)
      );
    } catch (error) {
      console.error("Resume bookmark delete error:", error);
      return NextResponse.json(
        createErrorResponse("북마크 제거 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
