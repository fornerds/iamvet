import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  linkSocialAccount,
  getUserBySocialProvider,
  getSocialUserInfo,
  getUserById,
} from "@/lib/database";

export const POST = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const { provider, authCode } = await request.json();

    // Validate provider
    if (!["google", "naver", "kakao"].includes(provider)) {
      return NextResponse.json(
        createErrorResponse("유효하지 않은 소셜 로그인 제공자입니다"),
        { status: 400 }
      );
    }

    if (!authCode) {
      return NextResponse.json(createErrorResponse("인증 코드가 필요합니다"), {
        status: 400,
      });
    }

    // Get social user info using auth code
    const socialUserInfo = await getSocialUserInfo(provider, authCode);

    if (!socialUserInfo) {
      return NextResponse.json(
        createErrorResponse("소셜 계정 정보를 가져올 수 없습니다"),
        { status: 400 }
      );
    }

    // Check if this social account is already linked to another user
    const existingUser = await getUserBySocialProvider(
      provider,
      socialUserInfo.id
    );

    if (existingUser && existingUser.id !== user.userId) {
      return NextResponse.json(
        createErrorResponse("이미 다른 계정에 연결된 소셜 계정입니다"),
        { status: 409 }
      );
    }

    // Link social account to current user
    await linkSocialAccount(user.userId, {
      provider,
      providerId: socialUserInfo.id,
      email: socialUserInfo.email,
      name: "",
      profileImage: "",
    });

    // Get updated user with social accounts
    const updatedUser = await getUserById(user.userId);

    return NextResponse.json(
      createApiResponse("success", "소셜 계정이 연결되었습니다", {
        linkedProviders: updatedUser.socialAccounts.map(
          (acc: any) => acc.provider
        ),
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          socialAccounts: updatedUser.socialAccounts,
        },
      })
    );
  } catch (error) {
    console.error("Social link error:", error);
    return NextResponse.json(
      createErrorResponse("소셜 계정 연결 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
