import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  createHospitalEvaluation,
  getHospitalEvaluations,
} from "@/lib/database";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const hospitalId = params.id;
    const { searchParams } = new URL(request.url);

    const evaluations = await getHospitalEvaluations(hospitalId);

    return NextResponse.json(
      createApiResponse("success", "병원 평가 목록 조회 성공", evaluations)
    );
  } catch (error) {
    console.error("Hospital evaluations error:", error);
    return NextResponse.json(
      createErrorResponse("병원 평가 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const POST = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const hospitalId = params.id;
      const evaluationData = await request.json();

      // Only veterinarians and veterinary students can evaluate hospitals
      if (user.userType !== "VETERINARIAN" && user.userType !== "VETERINARY_STUDENT") {
        return NextResponse.json(
          createErrorResponse("수의사 또는 수의학과 학생만 병원을 평가할 수 있습니다"),
          { status: 403 }
        );
      }

      // Validate evaluation data
      const { ratings, comments } = evaluationData;
      
      // Calculate overall rating as average (0.5 point precision)
      if (ratings) {
        const ratingValues = Object.values(ratings) as number[];
        const overallRating = ratingValues.reduce((sum: number, rating: number) => sum + rating, 0) / ratingValues.length;
        evaluationData.rating = Math.round(overallRating * 2) / 2; // Round to nearest 0.5
      }

      // Create hospital evaluation
      const evaluation = await createHospitalEvaluation({
        hospitalId,
        evaluatorId: user.userId,
        rating: evaluationData.rating,
        ratings: ratings || {},
        comments: comments || {},
        comment: evaluationData.comment || ''
      });

      return NextResponse.json(
        createApiResponse("success", "병원 평가가 등록되었습니다", evaluation)
      );
    } catch (error) {
      console.error("Hospital evaluation create error:", error);
      return NextResponse.json(
        createErrorResponse("병원 평가 등록 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
