import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { createResumeEvaluation, getResumeEvaluations, getHospitalByUserId, pool } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { nanoid } from "nanoid";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const resumeId = params.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const evaluations = await getResumeEvaluations(resumeId);

    return NextResponse.json(
      createApiResponse("success", "인재 평가 목록 조회 성공", evaluations)
    );
  } catch (error) {
    console.error("Resume evaluations error:", error);
    return NextResponse.json(
      createErrorResponse("인재 평가 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const POST = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const resumeId = params.id;
      const evaluationData = await request.json();

      console.log("[Evaluation API] User check:", {
        userId: user.userId,
        userType: user.userType,
        isHospital: user.userType === "HOSPITAL",
      });

      // Only hospitals can evaluate veterinarians
      if (user.userType !== "HOSPITAL") {
        return NextResponse.json(
          createErrorResponse("병원만 수의사를 평가할 수 있습니다"),
          { status: 403 }
        );
      }

      // Validate evaluation data
      const { ratings, comments } = evaluationData;

      if (!ratings || !comments) {
        return NextResponse.json(
          createErrorResponse("평가 항목과 코멘트가 필요합니다"),
          { status: 400 }
        );
      }

      // Calculate overall rating as average of all ratings
      const ratingValues = Object.values(ratings) as number[];
      const overallRating =
        ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length;

      // Check if this is a new evaluation (not an update)
      const checkQuery = `
        SELECT id FROM resume_evaluations 
        WHERE "resumeId" = $1 AND "userId" = $2
      `;
      const existingEvaluation = await pool.query(checkQuery, [
        resumeId,
        user.userId,
      ]);
      const isNewEvaluation = existingEvaluation.rows.length === 0;

      // Create resume evaluation
      const evaluation = await createResumeEvaluation({
        resumeId,
        evaluatorId: user.userId,
        ratings,
        comments,
        overallRating: Math.round(overallRating * 2) / 2, // Round to nearest 0.5
      });

      // 알림 생성 (새로운 평가일 때만)
      if (isNewEvaluation) {
        try {
          // Resume의 userId 조회 (알림을 받을 수의사)
          const resumeQuery = `SELECT "userId" FROM resumes WHERE id = $1`;
          const resumeResult = await pool.query(resumeQuery, [resumeId]);
          
          if (resumeResult.rows.length > 0) {
            const veterinarianId = resumeResult.rows[0].userId;
            
            // 병원 이름 조회
            const hospital = await getHospitalByUserId(user.userId);
            const hospitalName = hospital?.hospitalName || "병원";
            
            // 알림 생성
            const notificationId = nanoid();
            await prisma.notifications.create({
              data: {
                id: notificationId,
                type: NotificationType.EVALUATION,
                recipientId: veterinarianId,
                recipientType: "VETERINARIAN",
                senderId: user.userId,
                title: "인재평가 알림",
                content: `${hospitalName}에서 인재평가를 등록했습니다.`,
                isRead: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
            
            console.log("[Evaluation API] Notification created:", {
              notificationId,
              recipientId: veterinarianId,
              hospitalName,
            });
          }
        } catch (notificationError) {
          console.error("[Evaluation API] Failed to create notification:", notificationError);
          // 알림 생성 실패는 평가 생성 자체를 막지 않음
        }
      }

      return NextResponse.json(
        createApiResponse("success", "인재 평가가 등록되었습니다", evaluation)
      );
    } catch (error) {
      console.error("Resume evaluation create error:", error);
      return NextResponse.json(
        createErrorResponse("인재 평가 등록 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
