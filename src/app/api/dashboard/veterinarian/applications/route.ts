import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getVeterinarianApplications } from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    console.log("User from middleware:", user);
    
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "latest";

    console.log("Fetching applications for user:", user.userId, "sort:", sort);
    
    let applications: any[] = [];
    
    try {
      const rawApplications = await getVeterinarianApplications(user.userId, sort);
      console.log("Raw applications from DB:", rawApplications);

      // 데이터베이스 결과를 프론트엔드 형식으로 변환
      applications = rawApplications.map((app: any, index: number) => {
        console.log(`Application ${index}:`, {
          id: app.id,
          jobId: app.jobId,
          appliedAt: app.appliedAt,
          allKeys: Object.keys(app)
        });
        
        return {
          id: app.id,
          jobId: app.jobId,
          applicationDate: new Date(app.appliedAt).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\. /g, '.').replace(/\.$/, ''),
          hospitalName: app.hospital_name,
          jobPosition: app.position || app.job_title,
          hospitalContact: app.contact_phone && app.contact_email 
            ? `${app.contact_phone} / ${app.contact_email}`
            : app.contact_phone || app.contact_email || '',
          status: app.status,
          hospitalLogo: app.hospital_logo,
        };
      });
      
      console.log("Successfully mapped applications, count:", applications.length);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      console.error("DB Error details:", dbError instanceof Error ? dbError.message : dbError);
      // 데이터베이스 에러 시 빈 배열 반환 (테이블이 없거나 데이터가 없는 경우)
      applications = [];
    }

    console.log("Final processed applications:", applications);

    return NextResponse.json(
      createApiResponse("success", "지원내역 조회 성공", { applications })
    );
  } catch (error) {
    console.error("Applications error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : error);
    return NextResponse.json(
      createErrorResponse("지원내역 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});


