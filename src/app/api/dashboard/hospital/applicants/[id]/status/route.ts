import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getApplicationWithJobAndHospital,
  updateApplicationStatus,
  createNotification,
} from "@/lib/database";

import { ApplicationStatus, APPLICATION_STATUS_LABELS } from '@/constants/applicationStatus';

function getStatusNotificationTitle(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] || "지원 결과";
}

export const PUT = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = (request as any).user;
      const resolvedParams = await params;
      const applicationId = resolvedParams.id;
      const { status } = await request.json();

      // 지원서 및 권한 확인
      const application = await getApplicationWithJobAndHospital(applicationId);
      
      console.log("[Status Update] Permission check:", {
        applicationExists: !!application,
        hospitalUserId: application?.job?.hospital?.userId,
        currentUserId: user.userId,
        isMatch: application?.job?.hospital?.userId === user.userId
      });
      
      if (!application || application.job.hospital.userId !== user.userId) {
        return NextResponse.json(createErrorResponse("권한이 없습니다"), {
          status: 403,
        });
      }

      // 상태 업데이트
      await updateApplicationStatus(applicationId, status);

      // 지원자에게 알림 발송
      await createNotification({
        userId: application.veterinarian.userId,
        type: "SYSTEM",
        title: getStatusNotificationTitle(status),
        content: `${application.job.title} 공고의 지원 결과가 업데이트되었습니다`,
        applicationId,
        applicationStatus: status,
        url: `/dashboard/veterinarian/applications`,
      });

      return NextResponse.json(
        createApiResponse("success", "지원 상태가 업데이트되었습니다", null)
      );
    } catch (error) {
      console.error("Application status update error:", error);
      return NextResponse.json(
        createErrorResponse("지원 상태 업데이트 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
