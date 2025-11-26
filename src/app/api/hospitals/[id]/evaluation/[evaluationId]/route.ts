import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getHospitalEvaluationById,
  updateHospitalEvaluation,
  deleteHospitalEvaluation,
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
      const evaluation = await getHospitalEvaluationById(evaluationId);
      if (!evaluation) {
        return NextResponse.json(
          createErrorResponse("평가를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // Check userId field from database (evaluators are stored in userId field)
      const canUpdate = evaluation.userId === user.userId;
      
      if (!canUpdate) {
        return NextResponse.json(
          createErrorResponse("이 평가를 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // Recalculate overall rating if ratings provided
      const { ratings, comments } = updateData;
      if (ratings) {
        const ratingValues = Object.values(ratings) as number[];
        const overallRating = ratingValues.reduce((sum: number, rating: number) => sum + rating, 0) / ratingValues.length;
        updateData.rating = Math.round(overallRating * 2) / 2; // Round to nearest 0.5
      }

      // 평가 수정
      const updatedEvaluation = await updateHospitalEvaluation(
        evaluationId,
        {
          rating: updateData.rating,
          ratings: ratings || {},
          comments: comments || {},
          comment: updateData.comment || ''
        }
      );

      return NextResponse.json(
        createApiResponse(
          "success",
          "병원 평가가 수정되었습니다",
          updatedEvaluation
        )
      );
    } catch (error) {
      console.error("Hospital evaluation update error:", error);
      return NextResponse.json(
        createErrorResponse("병원 평가 수정 중 오류가 발생했습니다"),
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
      const evaluation = await getHospitalEvaluationById(evaluationId);
      console.log('=== DELETE: Evaluation data ===');
      console.log('Evaluation:', evaluation);
      console.log('User ID:', user.userId);
      console.log('Evaluation userId:', evaluation?.userId);
      console.log('Evaluation evaluatorId:', evaluation?.evaluatorId);
      
      if (!evaluation) {
        return NextResponse.json(
          createErrorResponse("평가를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // Check both userId field from database (evaluators are stored in userId field)
      const canDelete = evaluation.userId === user.userId;
      
      if (!canDelete) {
        console.log('=== DELETE: Permission denied ===');
        console.log('User cannot delete - userId:', user.userId);
        console.log('Evaluation userId:', evaluation.userId);
        console.log('Evaluation evaluatorId:', evaluation.evaluatorId);
        
        return NextResponse.json(
          createErrorResponse("이 평가를 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 평가 삭제
      await deleteHospitalEvaluation(evaluationId);

      return NextResponse.json(
        createApiResponse("success", "병원 평가가 삭제되었습니다")
      );
    } catch (error) {
      console.error("Hospital evaluation delete error:", error);
      return NextResponse.json(
        createErrorResponse("병원 평가 삭제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
