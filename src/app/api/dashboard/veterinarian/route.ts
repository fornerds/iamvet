import {
  generateHashtags,
  getAdvertisements,
  getApplicationStatus,
  getBookmarkedJobs,
  getNotifications,
  getRecentApplications,
  getVeterinarianProfile,
} from "@/lib/database";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;

    if (user.userType !== "veterinarian") {
      return NextResponse.json(
        createErrorResponse("수의사만 접근 가능합니다"),
        { status: 403 }
      );
    }

    // 내 이력서 정보
    const myResume = await getVeterinarianProfile(user.userId);

    // 지원 현황
    const applicationStatus = await getApplicationStatus(user.userId);

    // 북마크한 채용공고
    const bookmarkedJobs = await getBookmarkedJobs(user.userId, 5);

    // 알림
    const notifications = await getNotifications(user.userId, 10);

    // 광고
    const advertisements = await getAdvertisements("veterinarian_dashboard");

    // 최근 지원내역
    const recentApplications = await getRecentApplications(user.userId, 5);

    const dashboardData = {
      myResume: {
        profileImage: myResume.profileImage,
        name: myResume.nickname || myResume.name,
        introduction: myResume.introduction,
        hashtags: generateHashtags(myResume),
      },
      applicationStatus,
      bookmarkedJobs,
      notifications: {
        unreadCount: notifications.filter((n) => !n.isRead).length,
        notifications: notifications.slice(0, 5),
      },
      advertisements,
      recentApplications,
    };

    return NextResponse.json(
      createApiResponse("success", "대시보드 데이터 조회 성공", dashboardData)
    );
  } catch (error) {
    console.error("Veterinarian dashboard error:", error);
    return NextResponse.json(
      createErrorResponse("대시보드 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
