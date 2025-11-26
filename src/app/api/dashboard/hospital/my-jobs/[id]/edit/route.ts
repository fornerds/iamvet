import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getJobByIdWithHospital, updateJobPosting } from "@/lib/database";

export const PUT = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = (request as any).user;
      const resolvedParams = await params;
      const jobId = resolvedParams.id;
      const jobData = await request.json();

      // 권한 확인
      const job = await getJobByIdWithHospital(jobId);
      if (!job || job.hospital.userId !== user.userId) {
        return NextResponse.json(createErrorResponse("수정 권한이 없습니다"), {
          status: 403,
        });
      }

      // 채용공고 수정
      const updatedJob = await updateJobPosting(jobId, jobData);

      return NextResponse.json(
        createApiResponse("success", "채용공고가 수정되었습니다", updatedJob)
      );
    } catch (error) {
      console.error("Job update error:", error);
      return NextResponse.json(
        createErrorResponse("채용공고 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
