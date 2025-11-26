import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import {
  createApiResponse,
  createErrorResponse,
  generateUserIdentifier,
} from "@/lib/utils";
import {
  getJobById,
  incrementJobViewCount,
  getRelatedJobs,
  updateJobPosting,
  deleteJobPosting,
  query,
} from "@/lib/database";
import { verifyToken } from "@/lib/auth";
import { sql } from "@/lib/db";

// src/app/api/jobs/[id]/route.ts - 채용공고 상세
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // 채용공고 조회
    const job = await getJobById(jobId);
    if (!job) {
      return NextResponse.json(
        createErrorResponse("존재하지 않는 채용공고입니다"),
        { status: 404 }
      );
    }

    // 사용자 정보 확인 (선택적)
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // 조회수 증가 (회원/비회원 모두 처리, 24시간 중복 방지)
    const userIdentifier = generateUserIdentifier(request, userId);
    await incrementJobViewCount(jobId, userIdentifier, userId);

    // 관련 채용공고
    const relatedJobs = await getRelatedJobs(jobId, job.medicalField, 5);

    // 사용자가 이미 지원했는지 확인 (수의사인 경우에만)
    let hasApplied = false;
    let isLiked = false;
    if (userId) {
      const applicationCheck = await query(
        `SELECT id FROM applications WHERE "jobId" = $1 AND "veterinarianId" = $2`,
        [jobId, userId]
      );
      hasApplied = applicationCheck.length > 0;

      // 좋아요 여부 확인
      const likeResult = await sql`
        SELECT id FROM job_likes 
        WHERE "userId" = ${userId} 
        AND "jobId" = ${jobId}
      `;
      isLiked = likeResult.length > 0;
    }

    // 병원의 userId를 포함하여 응답
    const hospitalUserId = job.hospital?.userId || job.userid || job.hospitalId;
    const jobDetail = {
      ...job,
      relatedJobs,
      hospitalUserId: hospitalUserId,
      isOwner: userId && hospitalUserId === userId,
      hasApplied: hasApplied,
      isLiked: isLiked,
    };

    return NextResponse.json(
      createApiResponse("success", "채용공고 조회 성공", jobDetail)
    );
  } catch (error) {
    console.error("Job detail error:", error);
    return NextResponse.json(
      createErrorResponse("채용공고 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const PUT = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    console.log('=== PUT /api/jobs/[id] 요청 받음 ===');
    try {
      const user = (request as any).user;
      const resolvedParams = await params;
      const jobId = resolvedParams.id;
      const jobData = await request.json();
      
      console.log('PUT /api/jobs/[id] - 요청 시작:', {
        jobId,
        userId: user.userId,
        userType: user.userType
      });

      console.log('userType 체크:', { userType: user.userType, isHospital: user.userType.toLowerCase() === "hospital" });
      
      if (user.userType.toLowerCase() !== "hospital") {
        return NextResponse.json(
          createErrorResponse("병원만 채용공고를 수정할 수 있습니다"),
          { status: 403 }
        );
      }

      // 채용공고 존재 및 권한 확인
      const job = await getJobById(jobId);
      if (!job) {
        return NextResponse.json(
          createErrorResponse("채용공고를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 권한 체크: hospitalId가 사용자 ID와 직접 매치되어야 함
      const isAuthorized = job.hospitalId === user.userId;
      
      console.log('권한 체크:', {
        userId: user.userId,
        jobHospitalId: job.hospitalId,
        isAuthorized: isAuthorized
      });
      
      if (!isAuthorized) {
        return NextResponse.json(
          createErrorResponse("이 채용공고를 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 채용공고 수정
      console.log('updateJobPosting 호출 시작:', { jobId, hasJobData: !!jobData });
      const updatedJob = await updateJobPosting(jobId, jobData);
      console.log('updateJobPosting 완료:', { updatedJob: !!updatedJob });

      return NextResponse.json(
        createApiResponse("success", "채용공고가 수정되었습니다", updatedJob)
      );
    } catch (error) {
      console.error("Job update error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        createErrorResponse("채용공고 수정 중 오류가 발생했습니다"),
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
      const user = (request as any).user;
      const resolvedParams = await params;
      const jobId = resolvedParams.id;

      if (user.userType?.toLowerCase() !== "hospital") {
        return NextResponse.json(
          createErrorResponse("병원만 채용공고를 삭제할 수 있습니다"),
          { status: 403 }
        );
      }

      // 채용공고 존재 및 권한 확인
      const job = await getJobById(jobId);
      if (!job) {
        return NextResponse.json(
          createErrorResponse("채용공고를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // 권한 체크: hospitalId가 사용자 ID와 직접 매치되어야 함
      const isAuthorized = job.hospitalId === user.userId;
      
      console.log("Delete authorization check:", {
        jobHospitalId: job.hospitalId,
        userId: user.userId,
        isAuthorized,
      });
      
      if (!isAuthorized) {
        return NextResponse.json(
          createErrorResponse("이 채용공고를 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 채용공고 삭제
      console.log("Attempting to delete job:", jobId);
      const deleteResult = await deleteJobPosting(jobId);
      console.log("Delete result:", deleteResult);

      if (!deleteResult) {
        console.error("Failed to delete job - no rows affected");
        return NextResponse.json(
          createErrorResponse("채용공고 삭제에 실패했습니다"),
          { status: 500 }
        );
      }

      return NextResponse.json(
        createApiResponse("success", "채용공고가 삭제되었습니다")
      );
    } catch (error) {
      console.error("Job delete error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        createErrorResponse(
          error instanceof Error 
            ? `채용공고 삭제 중 오류가 발생했습니다: ${error.message}`
            : "채용공고 삭제 중 오류가 발생했습니다"
        ),
        { status: 500 }
      );
    }
  }
);
