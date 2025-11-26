import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getJobById } from "@/lib/database";
import { pool } from "@/lib/database";

export const PUT = withAdminVerification(
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
          createErrorResponse("병원만 채용공고를 관리할 수 있습니다"),
          { status: 403 }
        );
      }

      // 채용공고 존재 및 권한 확인
      const job = await getJobById(jobId);
      if (!job) {
        // 삭제된 채용공고도 확인 (deletedAt이 있는 경우)
        const deletedJobQuery = `SELECT * FROM jobs WHERE id = $1 AND "hospitalId" = $2`;
        const deletedJobResult = await pool.query(deletedJobQuery, [
          jobId,
          user.userId,
        ]);

        if (deletedJobResult.rows.length === 0) {
          return NextResponse.json(
            createErrorResponse("채용공고를 찾을 수 없습니다"),
            { status: 404 }
          );
        }

        const deletedJob = deletedJobResult.rows[0];
        if (deletedJob.hospitalId !== user.userId) {
          return NextResponse.json(
            createErrorResponse("이 채용공고를 관리할 권한이 없습니다"),
            { status: 403 }
          );
        }

        // 삭제된 채용공고 활성화
        const activateQuery = `UPDATE jobs SET "isActive" = true, "deletedAt" = NULL WHERE id = $1`;
        await pool.query(activateQuery, [jobId]);

        return NextResponse.json(
          createApiResponse("success", "채용공고가 활성화되었습니다")
        );
      }

      // 권한 체크: hospitalId가 사용자 ID와 직접 매치되어야 함
      if (job.hospitalId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 채용공고를 관리할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 현재 상태에 따라 토글
      const newIsActive = !job.isActive;
      const updateQuery = newIsActive
        ? `UPDATE jobs SET "isActive" = true, "deletedAt" = NULL WHERE id = $1`
        : `UPDATE jobs SET "isActive" = false, "deletedAt" = NOW() WHERE id = $1`;

      await pool.query(updateQuery, [jobId]);

      return NextResponse.json(
        createApiResponse(
          "success",
          newIsActive
            ? "채용공고가 활성화되었습니다"
            : "채용공고가 비활성화되었습니다"
        )
      );
    } catch (error) {
      console.error("Toggle job active error:", error);
      return NextResponse.json(
        createErrorResponse("채용공고 상태 변경 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

