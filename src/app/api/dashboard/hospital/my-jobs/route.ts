import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getHospitalJobPostings, getHospitalByUserId } from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;

    if (user.userType !== "hospital" && user.userType !== "HOSPITAL") {
      return NextResponse.json(
        createErrorResponse("병원만 접근할 수 있습니다"),
        { status: 403 }
      );
    }

    // 병원 ID 조회
    const hospital = await getHospitalByUserId(user.userId);
    if (!hospital) {
      return NextResponse.json(
        createErrorResponse("병원 정보를 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all"; // "active" | "inactive" | "expired" | "all"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const jobs = await getHospitalJobPostings(hospital.id);

    return NextResponse.json(
      createApiResponse("success", "내 채용공고 목록 조회 성공", jobs)
    );
  } catch (error) {
    console.error("Hospital my-jobs error:", error);
    return NextResponse.json(
      createErrorResponse("내 채용공고 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
