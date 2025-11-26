import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getResumeById as getFullVeterinarianResume,
  updateVeterinarianProfile as updateVeterinarianResume,
} from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const resume = await getFullVeterinarianResume(user.userId);

    return NextResponse.json(
      createApiResponse("success", "이력서 조회 성공", resume)
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse("이력서 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});

export const PUT = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const resumeData = await request.json();

    // 이력서 업데이트
    await updateVeterinarianResume(user.userId, resumeData);

    return NextResponse.json(
      createApiResponse("success", "이력서가 수정되었습니다", null)
    );
  } catch (error) {
    console.error("Resume update error:", error);
    return NextResponse.json(
      createErrorResponse("이력서 수정 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
