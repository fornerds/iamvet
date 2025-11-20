import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get("userType") || "veterinarian";

    // Validate userType
    if (
      !["veterinarian", "hospital", "veterinary-student"].includes(userType)
    ) {
      return NextResponse.json(
        createErrorResponse("유효하지 않은 사용자 타입입니다"),
        { status: 400 }
      );
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userType,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(7),
      })
    ).toString("base64");

    // Kakao OAuth URLs
    const kakaoClientId = process.env.KAKAO_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/kakao/callback`;

    if (!kakaoClientId) {
      return NextResponse.json(
        createErrorResponse("Kakao OAuth 설정이 누락되었습니다"),
        { status: 500 }
      );
    }

    // Build Kakao OAuth URL
    const kakaoAuthUrl = new URL("https://kauth.kakao.com/oauth/authorize");
    kakaoAuthUrl.searchParams.set("client_id", kakaoClientId);
    kakaoAuthUrl.searchParams.set("redirect_uri", redirectUri);
    kakaoAuthUrl.searchParams.set("response_type", "code");
    // talk_message 권한 추가 (플러스친구 메시지 발송을 위해)
    kakaoAuthUrl.searchParams.set("scope", "profile_nickname account_email talk_message");
    kakaoAuthUrl.searchParams.set("state", state);

    // Redirect to Kakao OAuth
    return NextResponse.redirect(kakaoAuthUrl.toString());
  } catch (error) {
    console.error("Kakao login redirect error:", error);
    return NextResponse.json(
      createErrorResponse("Kakao 로그인 페이지로 이동 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}
