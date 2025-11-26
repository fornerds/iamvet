import {
  getUserByEmail,
  getUserBySocialProvider,
  linkSocialAccount,
  generateTokens,
  updateLastLogin,
  isUserProfileComplete,
} from "@/lib/database";
import { sql } from "@/lib/db";
import {
  AuthResponse,
  SocialLoginResponse,
  ProfileCompleteness,
} from "@/types/auth";
// NOTE: 이전에 Prisma를 직접 사용하려다가 타입 오류 발생
// import { prisma } from "@/lib/prisma";

/**
 * Auth Service Layer - Central business logic for authentication
 *
 * Shared between Server Actions and API Routes according to PROJECT_ARCHITECTURE.md
 * Handles both traditional and social authentication flows
 */
export class AuthService {
  /**
   * Handle social authentication flow
   * Used by all OAuth callback routes (Google, Kakao, Naver)
   */
  static async handleSocialAuth(socialUserData: {
    email: string;
    name: string;
    realName?: string;
    phone?: string;
    birthDate?: string;
    profileImage?: string;
    userType: string;
    provider: "GOOGLE" | "KAKAO" | "NAVER";
    providerId: string;
    socialData: any;
  }): Promise<AuthResponse<SocialLoginResponse>> {
    try {
      const {
        email,
        name,
        realName,
        phone,
        birthDate,
        profileImage,
        userType,
        provider,
        providerId,
      } = socialUserData;

      // Check if user exists by social provider
      console.log("Checking user by social provider:", provider, providerId);
      let user;
      try {
        user = await getUserBySocialProvider(provider, providerId);
        console.log("User found by social provider:", !!user);
      } catch (dbError) {
        console.error("Database error in getUserBySocialProvider:", dbError);
        throw new Error(`Failed to query user by social provider: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }

      if (!user) {
        // Check if user exists with same email
        console.log("Checking user by email:", email);
        let existingUser;
        try {
          existingUser = await getUserByEmail(email);
          console.log("Existing user found by email:", !!existingUser);
        } catch (dbError) {
          console.error("Database error in getUserByEmail:", dbError);
          throw new Error(`Failed to query user by email: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        }

        if (existingUser) {
          // User already exists with this email
          // Check how they signed up
          let existingSocialAccounts = [];
          try {
            existingSocialAccounts = await this.getUserSocialAccounts(existingUser.id) || [];
          } catch (error) {
            console.error("Failed to get user social accounts:", error);
            existingSocialAccounts = [];
          }
          
          return {
            success: false,
            error: "EXISTING_ACCOUNT",
            data: {
              user: null,
              tokens: null,
              isNewUser: false,
              isProfileComplete: false,
              email: existingUser.email,
              hasPassword: !!existingUser.passwordHash, // Check if user has password
              existingProviders: existingSocialAccounts.map((account: any) => account.provider), // Social providers
              attemptedProvider: provider, // The provider they tried to use
              socialData: {
                email: existingUser.email,
                name: existingUser.realName || existingUser.nickname || '',
                provider,
                providerId,
                userType,
              }
            },
            message: "이미 가입된 계정이 있습니다",
          };
        } else {
          // For new users, redirect to registration completion (no immediate user creation)
          // This maintains the existing flow and data integrity
          return {
            success: true,
            data: {
              user: null,
              tokens: null,
              isNewUser: true,
              isProfileComplete: false,
              // Pass social data for registration completion
              socialData: {
                email,
                name,
                realName,
                phone,
                birthDate,
                profileImage,
                provider,
                providerId,
                userType,
              },
            },
            message: `${provider} 로그인 성공 - 회원가입 완료 필요`,
          };
        }
      }

      // At this point, we have an existing user
      // Update lastLoginAt for the user
      await updateLastLogin(user.id);

      // Check profile completeness - use original userType for logic
      const isProfileComplete = await this.checkProfileComplete(
        user.id,
        userType
      );

      // Get user's social accounts
      let socialAccounts = [];
      try {
        socialAccounts = await this.getUserSocialAccounts(user.id) || [];
        console.log("User social accounts:", socialAccounts);
      } catch (error) {
        console.error("Failed to get user social accounts:", error);
        socialAccounts = [];
      }

      // Generate tokens for existing user
      const tokens = await generateTokens({
        id: user.id,
        email: user.email,
        userType: user.userType
      });

      // Get user's profile information from database for phone and birthDate
      let userPhone = user.phone || phone; // Use DB phone first, fallback to social phone
      let userBirthDate = birthDate; // Start with social birthDate
      let userRealName = user.realName || realName || name; // Use DB realName first

      // Get additional profile info from veterinarian_profiles if needed
      if (userType === "veterinarian" || userType === "veterinary-student") {
        try {
          // SQL 쿼리로 veterinarian_profiles 조회 (Prisma 타입 오류 회피)
          const profileResult = await sql`
            SELECT "birthDate" FROM veterinarian_profiles 
            WHERE "userId" = ${user.id}
          `;
          if (profileResult.length > 0 && profileResult[0].birthDate) {
            userBirthDate = profileResult[0].birthDate
              .toISOString()
              .split("T")[0];
          }

          // 이전 Prisma 방식 (타입 오류로 주석처리)
          // const profile = await prisma.veterinarian_profiles.findUnique({
          //   where: { userId: user.id },
          // });
          // if (profile) {
          //   userBirthDate = profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : userBirthDate;
          // }
        } catch (error) {
          console.error("Failed to fetch veterinarian profile:", error);
        }
      }

      // Prepare response for existing user
      const responseData: SocialLoginResponse = {
        user: {
          id: user.id,
          email: user.email,
          name,
          realName: userRealName,
          phone: userPhone,
          birthDate: userBirthDate,
          profileImage,
          provider,
          providerId,
          userType: userType, // Return original userType for frontend
          socialAccounts: socialAccounts, // Use the fetched socialAccounts
        },
        tokens,
        isNewUser: false, // This is an existing user
        isProfileComplete,
      };

      return {
        success: true,
        data: responseData,
        message: `${provider} 로그인 성공`,
      };
    } catch (error) {
      console.error("Social auth error:", error);
      console.error("Social auth error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        socialData: {
          email: socialUserData.email,
          provider: socialUserData.provider,
          providerId: socialUserData.providerId,
          userType: socialUserData.userType,
        }
      });
      
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "소셜 로그인 처리 중 오류가 발생했습니다",
        message: error instanceof Error ? error.message : "소셜 로그인 처리 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * Get user's social accounts
   */
  static async getUserSocialAccounts(userId: string) {
    try {
      const { getUserSocialAccounts } = await import("@/lib/database");
      return await getUserSocialAccounts(userId);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      return [];
    }
  }

  /**
   * Check if user profile is complete using database function
   * NOTE: 이전에 Prisma를 직접 사용하려다가 hospitals 테이블 타입 오류 발생
   * 해결책: database.ts의 기존 함수 사용
   */
  static async checkProfileComplete(
    userId: string,
    userType: string
  ): Promise<boolean> {
    try {
      // database.ts의 기존 함수 사용 - SQL 쿼리로 구현되어 있음
      return await isUserProfileComplete(userId, userType);

      // 이전 Prisma 방식 (타입 오류로 주석처리)
      // if (userType === 'VETERINARIAN' || userType === 'veterinary-student') {
      //   // Check veterinarian_profiles table for profile completion
      //   const profile = await prisma.veterinarian_profiles.findUnique({
      //     where: { userId },
      //   });
      //   return !!profile;
      // } else if (userType === 'HOSPITAL' || userType === 'hospital') {
      //   const profile = await (prisma as any).hospitals.findUnique({
      //     where: { userId },
      //   });
      //   return !!profile;
      // }
      // return false;
    } catch (error) {
      console.error("Profile completeness check error:", error);
      return false;
    }
  }

  /**
   * Check if user profile is complete
   */
  static async checkProfileCompleteness(
    userId: string,
    userType: string
  ): Promise<AuthResponse<ProfileCompleteness>> {
    try {
      const isComplete = await this.checkProfileComplete(userId, userType);

      return {
        success: true,
        data: {
          isComplete,
          userType,
        },
      };
    } catch (error) {
      console.error("Profile completeness check error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "프로필 완성도 확인 중 오류가 발생했습니다",
      };
    }
  }

  /**
   * Generate redirect URL based on profile completeness and user type
   */
  static generateRedirectUrl(
    isProfileComplete: boolean,
    userType: string,
    socialData?: {
      email: string;
      name: string;
      realName?: string;
      phone?: string;
      birthDate?: string;
      profileImage?: string;
    }
  ): string {
    if (isProfileComplete) {
      // Redirect to dashboard
      const dashboardMap = {
        hospital: "/dashboard/hospital",
        "veterinary-student": "/dashboard/veterinarian",
        veterinarian: "/dashboard/veterinarian",
      };
      return (
        dashboardMap[userType as keyof typeof dashboardMap] ||
        "/dashboard/veterinarian"
      );
    } else {
      // Redirect to social registration completion form
      const socialRegisterMap = {
        hospital: "/register/social-complete/hospital",
        "veterinary-student": "/register/social-complete/veterinary-student",
        veterinarian: "/register/social-complete/veterinarian",
      };

      const baseUrl =
        socialRegisterMap[userType as keyof typeof socialRegisterMap] ||
        "/register/social-complete/veterinarian";

      if (socialData) {
        const params = new URLSearchParams({
          email: socialData.email,
          name: socialData.name,
          ...(socialData.realName && {
            realName: socialData.realName,
          }),
          ...(socialData.phone && {
            phone: socialData.phone,
          }),
          ...(socialData.birthDate && {
            birthDate: socialData.birthDate,
          }),
          ...(socialData.profileImage && {
            profileImage: socialData.profileImage,
          }),
        });
        return `${baseUrl}?${params.toString()}`;
      }

      return baseUrl;
    }
  }

  /**
   * Traditional login (for Server Actions)
   */
  async login(
    _email: string,
    _password: string,
    _userType: string
  ): Promise<AuthResponse> {
    try {
      // This would implement traditional email/password login
      // For now, returning a placeholder
      return {
        success: true,
        message: "로그인 성공",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "로그인 실패",
      };
    }
  }

  /**
   * Traditional registration (for Server Actions)
   */
  async register(data: any): Promise<AuthResponse> {
    try {
      // This would implement traditional registration
      // For now, returning a placeholder
      return {
        success: true,
        data: { user: data },
        message: "회원가입 성공",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "회원가입 실패",
      };
    }
  }
}
