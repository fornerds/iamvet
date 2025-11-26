import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getHospitalApplicants, getHospitalByUserId } from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;

    console.log("[API] Hospital applicants - User info:", {
      userId: user?.userId,
      userType: user?.userType,
      email: user?.email
    });

    // userType 정규화 - 대소문자 구분 없이 병원인지 확인
    const normalizedUserType = user.userType?.toLowerCase();
    if (normalizedUserType !== "hospital") {
      console.log("[API] Access denied - userType is:", user.userType, "normalized:", normalizedUserType);
      return NextResponse.json(
        createErrorResponse(`병원만 접근할 수 있습니다. 현재 userType: ${user.userType}`),
        { status: 403 }
      );
    }

    // 병원 ID 조회
    console.log("[API] Looking up hospital for userId:", user.userId);
    const hospital = await getHospitalByUserId(user.userId);
    console.log("[API] Hospital found:", !!hospital, hospital?.id);
    
    if (!hospital) {
      return NextResponse.json(
        createErrorResponse("병원 정보를 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all"; // "PENDING" | "REVIEWING" | "ACCEPTED" | "REJECTED" | "all"
    const jobId = searchParams.get("jobId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log("[API] Fetching applicants with filters:", { status, jobId, page, limit });
    const result = await getHospitalApplicants(hospital.id, {
      status,
      jobId,
      page,
      limit
    });
    console.log("[API] Applicants found:", result.applicants?.length || 0, "Total:", result.pagination.total);

    return NextResponse.json(
      createApiResponse("success", "지원자 목록 조회 성공", {
        applicants: result.applicants,
        pagination: result.pagination
      })
    );
  } catch (error) {
    console.error("Hospital applicants error:", error);
    return NextResponse.json(
      createErrorResponse("지원자 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
