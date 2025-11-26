import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import {
  getVeterinarianProfile,
  updateVeterinarianProfile,
} from "@/lib/database";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const GET = withAdminVerification(async (request: NextRequest) => {
  console.log('=== GET API 호출됨 ===');
  try {
    const user = (request as any).user;
    console.log('[API] GET profile - user from middleware:', user);
    console.log('[API] userId:', user.userId);
    console.log('[API] userType:', user.userType);
    console.log('[API] CRITICAL: Checking for userId discrepancy');
    
    // JWT에서 추출한 userId가 실제 사용자 ID와 다를 수 있음
    const potentialUserIds = [user.userId, user.id].filter(Boolean);
    console.log('[API] Potential user IDs to try:', potentialUserIds);
    
    let profile = await getVeterinarianProfile(user.userId);
    console.log('[API] getVeterinarianProfile result with JWT userId:', profile);
    console.log('[API] profile is null:', profile === null);
    console.log('[API] profile is undefined:', profile === undefined);
    
    // profile이 null이고 다른 userId가 있으면 시도
    if (!profile && user.id && user.id !== user.userId) {
      console.log('[API] Trying alternative userId:', user.id);
      profile = await getVeterinarianProfile(user.id);
      console.log('[API] getVeterinarianProfile result with alternative userId:', profile);
    }
    console.log('[API] 라이센스 이미지 세부 정보:', {
      licenseImage: profile?.licenseImage,
      licenseImageType: typeof profile?.licenseImage,
      isNull: profile?.licenseImage === null,
      isUndefined: profile?.licenseImage === undefined,
      isEmpty: profile?.licenseImage === '',
      allProfileKeys: profile ? Object.keys(profile) : 'no profile'
    });

    // 사용자의 provider 정보를 데이터베이스에서 조회
    console.log('[API] User from middleware:', user);
    
    // 실제로 profile을 찾은 userId를 사용 (fallback 처리)
    const actualUserId = profile ? user.userId : (user.id || user.userId);
    console.log('[API] Using userId for provider query:', actualUserId);
    
    const userInfo = await sql`
      SELECT provider FROM users WHERE id = ${actualUserId}
    `;
    
    console.log('[API] Database user info:', userInfo[0]);
    
    // profile이 null인 경우 기본값 제공
    const responseData = {
      ...(profile || {}),
      provider: userInfo[0]?.provider || 'NORMAL',
      userType: user.userType
    };
    
    // profile이 null인 경우를 처리
    if (!profile) {
      console.log('[API] WARNING: getVeterinarianProfile returned null, using fallback data');
      // 기본 사용자 정보로 직접 조회
      const fallbackUser = await sql`
        SELECT id, email, phone, "profileImage", "loginId", nickname, "realName", "birthDate", 
               "licenseImage", "userType", provider, "isActive", "updatedAt", "createdAt"
        FROM users 
        WHERE id = ${actualUserId} AND "isActive" = true
      `;
      
      if (fallbackUser[0]) {
        console.log('[API] Fallback user data found:', fallbackUser[0]);
        Object.assign(responseData, fallbackUser[0]);
      }
    }

    console.log('[API] 최종 응답 데이터:', responseData);
    console.log('[API] 응답 데이터 라이센스 이미지 상세:', {
      licenseImage: responseData.licenseImage,
      licenseImageType: typeof responseData.licenseImage,
      hasLicenseImage: !!responseData.licenseImage,
      responseKeys: Object.keys(responseData)
    });

    return NextResponse.json(
      createApiResponse("success", "프로필 조회 성공", responseData)
    );
  } catch (error) {
    console.error('[API] GET profile error:', error);
    return NextResponse.json(
      createErrorResponse("프로필 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});

export const PUT = withAdminVerification(async (request: NextRequest) => {
  console.log('=================================');
  console.log('=== PUT API 호출됨 ===');
  console.log('=================================');
  try {
    const user = (request as any).user;
    console.log('[API] PUT /api/dashboard/veterinarian/profile - User:', user);
    console.log('[API] User ID:', user.userId);
    console.log('[API] User Type:', user.userType);
    
    if (!user || !user.userId) {
      console.error('[API] Invalid user object:', user);
      return NextResponse.json(
        createErrorResponse("사용자 정보가 올바르지 않습니다"),
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    console.log('[API] FormData keys:', Array.from(formData.keys()));
    
    // FormData 내용 상세 로깅
    const keys = Array.from(formData.keys());
    for (const key of keys) {
      console.log(`[API] FormData ${key}:`, formData.get(key));
    }

    const profileData: any = {
      nickname: formData.get("nickname") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      realName: formData.get("realName") as string, // 실명 추가
      birthDate: formData.get("birthDate") as string,
    };

    // 프로필 이미지 업로드
    const profileImageUrl = formData.get("profileImage") as string;
    if (profileImageUrl && profileImageUrl !== "undefined" && profileImageUrl !== "null") {
      console.log('[API] Profile image URL received:', profileImageUrl);
      // URL이 이미 S3 URL인 경우 그대로 사용
      profileData.profileImage = profileImageUrl;
    }

    // 면허증 이미지 업로드  
    const licenseImageUrl = formData.get("licenseImage") as string;
    if (licenseImageUrl && licenseImageUrl !== "undefined" && licenseImageUrl !== "null") {
      console.log('[API] License image URL received:', licenseImageUrl);
      profileData.licenseImage = licenseImageUrl;
    }

    // 비밀번호 변경 처리
    const password = formData.get("password") as string;
    if (password && password.trim() !== "") {
      console.log('[API] Password change requested');
      const passwordHash = await bcrypt.hash(password, 12);
      
      // users 테이블의 비밀번호 업데이트
      await sql`
        UPDATE users 
        SET "passwordHash" = ${passwordHash}, "updatedAt" = NOW()
        WHERE id = ${user.userId}
      `;
    }

    console.log('[API] Profile data to update:', profileData);
    console.log('[API] 라이센스 이미지 업데이트 확인:', profileData.licenseImage);
    
    // 프로필 업데이트
    await updateVeterinarianProfile(user.userId, profileData);

    console.log('[API] Profile update completed successfully');
    return NextResponse.json(
      createApiResponse("success", "프로필이 성공적으로 수정되었습니다", null)
    );
  } catch (error) {
    console.error('[API] Profile update error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      createErrorResponse(`프로필 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`),
      { status: 500 }
    );
  }
});
