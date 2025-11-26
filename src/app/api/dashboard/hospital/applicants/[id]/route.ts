import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getApplicationById, getHospitalByUserId } from "@/lib/database";

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
      const applicationId = params.id;

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

      // 지원서 조회
      const application = await getApplicationById(applicationId);
      if (!application) {
        return NextResponse.json(
          createErrorResponse("지원서를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 권한 확인 (해당 병원의 채용공고에 대한 지원서인지)
      if (application.job.hospitalId !== hospital.id) {
        return NextResponse.json(
          createErrorResponse("이 지원서를 볼 권한이 없습니다"),
          { status: 403 }
        );
      }

      return NextResponse.json(
        createApiResponse("success", "지원서 상세 조회 성공", application)
      );
    } catch (error) {
      console.error("Application details error:", error);
      return NextResponse.json(
        createErrorResponse("지원서 상세 조회 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
