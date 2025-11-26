import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getHospitalProfile,
  getActiveJobs,
  getNotifications,
  getRecentApplicants,
  getRecruitmentStatus,
  getAdvertisements,
  generateHospitalHashtags,
} from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;

    if (user.userType !== "hospital" && user.userType !== "HOSPITAL") {
      return NextResponse.json(createErrorResponse("병원만 접근 가능합니다"), {
        status: 403,
      });
    }

    // 병원 프로필
    const hospitalProfile = await getHospitalProfile(user.userId);

    // 채용 현황
    const recruitmentStatus = await getRecruitmentStatus(user.userId);

    // 활성 채용공고
    const activeJobs = await getActiveJobs(user.userId, 5);

    // 알림
    const notifications = await getNotifications(user.userId, 10);

    // 광고
    const advertisements = await getAdvertisements("hospital_dashboard");

    // 최근 지원자
    const recentApplicants = await getRecentApplicants(user.userId, 5);

    const dashboardData = {
      hospitalProfile: {
        logo: hospitalProfile.logoImage,
        name: hospitalProfile.hospitalName,
        introduction: hospitalProfile.introduction,
        hashtags: generateHospitalHashtags(hospitalProfile),
      },
      recruitmentStatus,
      activeJobs,
      notifications: {
        unreadCount: notifications.filter((n) => !n.isRead).length,
        notifications: notifications.slice(0, 5),
      },
      advertisements,
      recentApplicants,
    };

    return NextResponse.json(
      createApiResponse("success", "대시보드 데이터 조회 성공", dashboardData)
    );
  } catch (error) {
    console.error("Hospital dashboard error:", error);
    return NextResponse.json(
      createErrorResponse("대시보드 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
