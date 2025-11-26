import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { updateUserPassword, verifyPassword } from "@/lib/database";

export const PUT = withAdminVerification(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const { currentPassword, newPassword } = await request.json();

    if (user.userType !== "veterinarian") {
      return NextResponse.json(
        createErrorResponse("수의사만 접근할 수 있습니다"),
        { status: 403 }
      );
    }

    // Validate inputs
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        createErrorResponse("새 비밀번호는 최소 6자 이상이어야 합니다"),
        { status: 400 }
      );
    }

    // If user has a password set, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          createErrorResponse("현재 비밀번호가 필요합니다"),
          { status: 400 }
        );
      }

      const isValidPassword = await verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isValidPassword) {
        return NextResponse.json(
          createErrorResponse("현재 비밀번호가 올바르지 않습니다"),
          { status: 400 }
        );
      }
    }

    // Update password
    await updateUserPassword(user.userId, newPassword);

    return NextResponse.json(
      createApiResponse("success", "비밀번호가 변경되었습니다")
    );
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      createErrorResponse("비밀번호 변경 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
