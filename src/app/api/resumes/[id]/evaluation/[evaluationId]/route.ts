import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getResumeEvaluationById,
  updateResumeEvaluation,
  deleteResumeEvaluation,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
    evaluationId: string;
  }>;
}

export const PUT = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { evaluationId } = params;
      const updateData = await request.json();

      // 평가 존재 및 권한 확인
      const evaluation = await getResumeEvaluationById(evaluationId);
      if (!evaluation) {
        return NextResponse.json(
          createErrorResponse("평가를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      console.log('[Resume Evaluation Update] Permission check:', {
        evaluationUserId: evaluation.userId,
        evaluationEvaluatorId: evaluation.evaluatorId,
        currentUserId: user.userId,
        userType: user.userType,
        evaluation: evaluation
      });

      // evaluatorId가 없으면 userId를 사용
      const evaluatorId = evaluation.evaluatorId || evaluation.userId;
      if (evaluatorId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 평가를 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // Calculate overall rating as average of all ratings if ratings provided
      if (updateData.ratings) {
        const ratingValues = Object.values(updateData.ratings) as number[];
        updateData.overallRating = Math.round((ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length) * 2) / 2;
      }

      // 평가 수정
      const updatedEvaluation = await updateResumeEvaluation(
        evaluationId,
        updateData
      );

      return NextResponse.json(
        createApiResponse(
          "success",
          "인재 평가가 수정되었습니다",
          updatedEvaluation
        )
      );
    } catch (error) {
      console.error("Resume evaluation update error:", error);
      return NextResponse.json(
        createErrorResponse("인재 평가 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { evaluationId } = params;

      // 평가 존재 및 권한 확인
      const evaluation = await getResumeEvaluationById(evaluationId);
      if (!evaluation) {
        return NextResponse.json(
          createErrorResponse("평가를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      console.log('[Resume Evaluation Delete] Permission check:', {
        evaluationUserId: evaluation.userId,
        evaluationEvaluatorId: evaluation.evaluatorId,
        currentUserId: user.userId,
        userType: user.userType
      });

      // evaluatorId가 없으면 userId를 사용
      const evaluatorId = evaluation.evaluatorId || evaluation.userId;
      if (evaluatorId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 평가를 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 평가 삭제
      await deleteResumeEvaluation(evaluationId);

      return NextResponse.json(
        createApiResponse("success", "인재 평가가 삭제되었습니다")
      );
    } catch (error) {
      console.error("Resume evaluation delete error:", error);
      return NextResponse.json(
        createErrorResponse("인재 평가 삭제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
