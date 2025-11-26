import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getHospitalById,
  updateHospitalProfile,
  getHospitalJobPostings,
} from "@/lib/database";
import { mapSpecialtiesToKorean, mapBusinessTypesToKorean } from "@/utils/koreanMappings";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const hospitalId = params.id;
    
    console.log("[API] Getting hospital with ID:", hospitalId);

    // 병원 정보 조회
    const hospital = await getHospitalById(hospitalId);
    console.log("[API] Hospital data:", hospital);
    
    if (!hospital) {
      console.log("[API] Hospital not found");
      return NextResponse.json(createErrorResponse("병원을 찾을 수 없습니다"), {
        status: 404,
      });
    }

    // 병원의 채용공고 조회
    const jobPostings = await getHospitalJobPostings(hospitalId);
    console.log("[API] Job postings:", jobPostings.length);

    // Transform database fields to match frontend expectations
    const hospitalDetail = {
      id: hospital.id,
      name: hospital.hospitalName || hospital.realName,
      summary: hospital.description || "병원 소개를 준비중입니다.",
      contact: hospital.phone,
      email: hospital.email,
      website: hospital.website || hospital.hospitalWebsite,
      establishedYear: hospital.establishedDate || hospital.establishedDate,
      address: hospital.address || hospital.hospitalAddress,
      detailAddress: hospital.detailAddress || hospital.hospitalAddressDetail,
      logo: hospital.hospitalLogo,
      introduction: hospital.description || "병원 소개를 준비중입니다.",
      businessType: hospital.treatmentAnimals ? mapBusinessTypesToKorean(hospital.treatmentAnimals).join(", ") : "반려동물",
      specialties: hospital.treatmentFields ? mapSpecialtiesToKorean(hospital.treatmentFields) : [],
      facilityImages: hospital.images?.map((img: any) => img.imageUrl) || [],
      jobPostings: jobPostings.slice(0, 10), // 최대 10개로 제한
      jobCount: jobPostings.length,
    };

    console.log("[API] Successfully returning hospital detail for:", hospitalDetail.name);
    return NextResponse.json(
      createApiResponse("success", "병원 정보 조회 성공", hospitalDetail)
    );
  } catch (error) {
    console.error("Hospital detail error:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      createErrorResponse(`병원 정보 조회 중 오류가 발생했습니다: ${errorMessage}`),
      { status: 500 }
    );
  }
}

export const PUT = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const hospitalId = params.id;
      const updateData = await request.json();

      if (user.userType !== "hospital") {
        return NextResponse.json(
          createErrorResponse("병원만 병원 정보를 수정할 수 있습니다"),
          { status: 403 }
        );
      }

      // 병원 존재 및 권한 확인
      const hospital = await getHospitalById(hospitalId);
      if (!hospital) {
        return NextResponse.json(
          createErrorResponse("병원을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (hospital.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 병원 정보를 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 병원 정보 수정
      const updatedHospital = await updateHospitalProfile(
        hospitalId,
        updateData
      );

      return NextResponse.json(
        createApiResponse(
          "success",
          "병원 정보가 수정되었습니다",
          updatedHospital
        )
      );
    } catch (error) {
      console.error("Hospital update error:", error);
      return NextResponse.json(
        createErrorResponse("병원 정보 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
