import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { unlinkSocialAccount, getUserById } from "@/lib/database";

interface RouteContext {
  params: Promise<{
    provider: string;
  }>;
}

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const { provider } = params;

      // Validate provider
      if (!["google", "naver", "kakao"].includes(provider)) {
        return NextResponse.json(
          createErrorResponse("유효하지 않은 소셜 로그인 제공자입니다"),
          { status: 400 }
        );
      }

      // Get current user with social accounts
      const currentUser = await getUserById(user.userId);

      if (!currentUser) {
        return NextResponse.json(
          createErrorResponse("사용자를 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      // Check if user has this social account linked
      const socialAccount = currentUser.socialAccounts?.find(
        (acc: any) => acc.provider === provider
      );

      if (!socialAccount) {
        return NextResponse.json(
          createErrorResponse("연결된 소셜 계정이 없습니다"),
          { status: 404 }
        );
      }

      // Prevent unlinking if it's the only login method and user has no password
      const remainingSocialAccounts = currentUser.socialAccounts.filter(
        (acc: any) => acc.provider !== provider
      );
      const hasPassword = currentUser.passwordHash;

      if (remainingSocialAccounts.length === 0 && !hasPassword) {
        return NextResponse.json(
          createErrorResponse(
            "최소 하나의 로그인 방법이 필요합니다. 비밀번호를 설정하거나 다른 소셜 계정을 연결해주세요"
          ),
          { status: 400 }
        );
      }

      // Unlink social account
      await unlinkSocialAccount(user.userId, provider);

      // Get updated user
      const updatedUser = await getUserById(user.userId);

      return NextResponse.json(
        createApiResponse("success", "소셜 계정 연결이 해제되었습니다", {
          unlinkedProvider: provider,
          remainingProviders:
            updatedUser.socialAccounts?.map((acc: any) => acc.provider) || [],
        })
      );
    } catch (error) {
      console.error("Social unlink error:", error);
      return NextResponse.json(
        createErrorResponse("소셜 계정 연결 해제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
