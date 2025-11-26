import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { getUserBookmarks } from "@/lib/database";

export const GET = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;

    if (user.userType !== "veterinarian" && user.userType !== "VETERINARIAN") {
      return NextResponse.json(
        createErrorResponse("수의사만 접근할 수 있습니다"),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // "jobs" | "lectures" | "transfers" | "all"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const bookmarks = await getUserBookmarks(user.userId);
    
    // jobs만 필터링하고 limit 적용
    const jobs = bookmarks.filter(item => item.type === 'job').slice(0, limit);

    return NextResponse.json(
      createApiResponse("success", "북마크 목록 조회 성공", jobs)
    );
  } catch (error) {
    console.error("Veterinarian bookmarks error:", error);
    return NextResponse.json(
      createErrorResponse("북마크 목록 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
