"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { sql } from "@/lib/db";
import { generateTokens } from "@/lib/database";
import { validateUserForTokenGeneration } from "@/lib/user-validation";

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Simple ID generator (similar to cuid2)
function createId() {
  return randomBytes(12).toString("base64url");
}

// Types
export interface User {
  id: string; // users.id - Primary Key
  loginId?: string;
  email: string;
  phone: string;
  realName?: string;
  nickname?: string;
  birthDate?: Date;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
  profileImage?: string;
  provider: "NORMAL" | "GOOGLE" | "KAKAO" | "NAVER";
  isActive: boolean;
  termsAgreedAt?: Date;
  privacyAgreedAt?: Date;
  marketingAgreedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profileName?: string;
  hospitalName?: string;
  hospitalLogo?: string;
  licenseImage?: string;
  universityEmail?: string;
  socialAccounts?: Array<{
    provider: string;
    providerId: string;
    createdAt: Date;
  }>;
}

// 토큰 생성 전용 타입 - generateTokens 함수의 입력 검증 강화
export interface UserForTokenGeneration {
  readonly id: string; // 반드시 users.id여야 함
  readonly email: string;
  readonly userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
}

// Social Account 타입 정의
export interface SocialAccount {
  id: string; // social_accounts.id - Primary Key
  userId: string; // users.id 참조
  provider: "GOOGLE" | "KAKAO" | "NAVER";
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DB 조회 결과 타입 (JOIN 결과)
export interface UserWithSocialAccount {
  user_id: string; // users.id
  loginId?: string;
  email: string;
  phone: string;
  nickname?: string;
  realName?: string;
  birthDate?: Date;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
  profileImage?: string;
  provider: "NORMAL" | "GOOGLE" | "KAKAO" | "NAVER";
  universityEmail?: string;
  termsAgreedAt?: Date;
  privacyAgreedAt?: Date;
  marketingAgreedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  social_account_id: string; // social_accounts.id
  sa_provider: "GOOGLE" | "KAKAO" | "NAVER";
  providerId: string;
}

// JWT 페이로드 타입
export interface JWTPayload {
  userId: string; // 반드시 users.id여야 함
  userType: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  userType?: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
}

export interface RegisterData {
  loginId: string;
  email: string;
  phone: string;
  realName?: string; // 실명 추가
  password: string;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
  profileImage?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
}

export interface VeterinarianProfileData {
  nickname: string;
  birthDate?: Date;
  licenseImage?: string;
  experience?: string;
  specialty?: string;
  introduction?: string;
}

export interface HospitalProfileData {
  hospitalName: string;
  businessNumber: string;
  address: string;
  phone: string;
  website?: string;
  description?: string;
  businessLicense: string;
}

// Auth actions
export async function login(credentials: LoginCredentials) {
  const { email, password, userType } = credentials;
  try {
    // Get user by loginId (not email) and userType (if specified)
    let result;

    if (userType === "VETERINARY_STUDENT") {
      // For veterinary students, check both VETERINARY_STUDENT and VETERINARIAN userTypes
      // since they might be stored as either depending on registration method
      result = await sql`
        SELECT * FROM users 
        WHERE "loginId" = ${email} 
        AND ("userType" = 'VETERINARY_STUDENT' OR "userType" = 'VETERINARIAN') 
        AND "isActive" = true
      `;
    } else if (userType) {
      result =
        await sql`SELECT * FROM users WHERE "loginId" = ${email} AND "userType" = ${userType} AND "isActive" = true`;
    } else {
      result =
        await sql`SELECT * FROM users WHERE "loginId" = ${email} AND "isActive" = true`;
    }

    if (result.length === 0) {
      return { success: false, error: "아이디 또는 비밀번호를 확인해주세요." };
    }

    const user = result[0];

    // Verify password
    if (!user.passwordHash) {
      return {
        success: false,
        error: "소셜 로그인 계정입니다. 소셜 로그인을 이용해주세요.",
      };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: "비밀번호가 올바르지 않습니다." };
    }

    // Update lastLoginAt
    await sql`
      UPDATE users 
      SET "lastLoginAt" = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.userType,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // 병원 정보가 있는 경우 추가로 가져오기
    let hospitalName = null;
    let hospitalLogo = null;

    if (user.userType === "HOSPITAL") {
      hospitalName = user.hospitalName;
      hospitalLogo = user.hospitalLogo;
    }

    const loginResult = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone, // phone 필드 추가
        realName: user.realName,
        nickname: user.nickname,
        userType: user.userType,
        profileImage: user.profileImage,
        hospitalName: hospitalName,
        hospitalLogo: hospitalLogo,
      },
      tokens: {
        accessToken: token,
        refreshToken: token, // 현재는 동일한 토큰 사용
      },
    };

    console.log(
      "[login] Final login result:",
      JSON.stringify(loginResult, null, 2)
    );
    return loginResult;
  } catch (error) {
    console.error("Login error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      email,
      userType,
    });
    return {
      success: false,
      error: `로그인 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

export async function register(
  data: RegisterData,
  profileData?: VeterinarianProfileData | HospitalProfileData
) {
  try {
    const {
      loginId,
      email,
      phone,
      realName,
      password,
      userType,
      profileImage,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email} OR phone = ${phone}
    `;

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "이미 가입된 이메일 또는 전화번호입니다.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await sql`
      INSERT INTO users (
        "loginId", email, phone, "realName", "passwordHash", "userType", "profileImage",
        "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt"
      )
      VALUES (
        ${loginId}, ${email}, ${phone}, ${realName}, ${passwordHash}, ${userType}, ${profileImage},
        ${termsAgreed ? new Date() : null}, ${
      privacyAgreed ? new Date() : null
    }, ${marketingAgreed ? new Date() : null}
      )
      RETURNING *
    `;

    const user = userResult[0];

    // Create profile based on user type
    if (userType === "VETERINARIAN" && profileData) {
      const vetData = profileData as VeterinarianProfileData;
      await sql`
        INSERT INTO veterinarian_profiles (
          "userId", nickname, "birthDate", "licenseImage", experience, specialty, introduction
        )
        VALUES (
          ${user.id}, ${vetData.nickname}, ${vetData.birthDate}, ${vetData.licenseImage}, 
          ${vetData.experience}, ${vetData.specialty}, ${vetData.introduction}
        )
      `;
    } else if (userType === "HOSPITAL" && profileData) {
      const hospitalData = profileData as HospitalProfileData;
      await sql`
        INSERT INTO hospital_profiles (
          "userId", "hospitalName", "businessNumber", address, phone, website, description, "businessLicense"
        )
        VALUES (
          ${user.id}, ${hospitalData.hospitalName}, ${hospitalData.businessNumber}, 
          ${hospitalData.address}, ${hospitalData.phone}, ${hospitalData.website}, 
          ${hospitalData.description}, ${hospitalData.businessLicense}
        )
      `;
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "회원가입 중 오류가 발생했습니다." };
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("auth-token");
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: "로그아웃 중 오류가 발생했습니다." };
  }
}

export async function getCurrentUser(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return { success: false, error: "인증 토큰이 없습니다." };
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: "토큰이 만료되었습니다." };
      }
      throw error;
    }

    // Get current user data
    const result = await sql`
      SELECT * FROM users WHERE id = ${decoded.userId} AND "isActive" = true
    `;

    if (result.length === 0) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    const user = result[0];

    // Get profile-specific information based on user type
    let profileName = user.nickname || user.realName || user.email; // fallback chain
    let actualUserType = user.userType; // will be modified for veterinary students
    let hospitalLogo = null; // for hospital users

    console.log(
      "[getCurrentUser] Getting profile for userType:",
      user.userType,
      "userId:",
      user.id
    );

    if (
      user.userType === "VETERINARIAN" ||
      user.userType === "VETERINARY_STUDENT"
    ) {
      // 먼저 veterinarians 테이블에서 nickname을 시도
      const vetResult = await sql`
        SELECT nickname FROM veterinarians WHERE "userId" = ${user.id}
      `;

      if (vetResult.length > 0 && vetResult[0].nickname) {
        profileName = vetResult[0].nickname;
        console.log(
          "[getCurrentUser] Using nickname from veterinarians table:",
          profileName
        );
      } else {
        // veterinarians 테이블에 없으면 veterinary_students 테이블 확인
        const studentResult = await sql`
          SELECT nickname FROM veterinary_students WHERE "userId" = ${user.id}
        `;

        if (studentResult.length > 0 && studentResult[0].nickname) {
          profileName = studentResult[0].nickname;
          actualUserType = "VETERINARY_STUDENT";
          console.log(
            "[getCurrentUser] Using nickname from veterinary_students table:",
            profileName
          );
        } else {
          // 둘 다 없으면 veterinarian_profiles에서 시도 (기존 로직)
          const vetProfile = await sql`
            SELECT nickname, experience, specialty FROM veterinarian_profiles WHERE "userId" = ${user.id} AND "deletedAt" IS NULL
          `;
          console.log(
            "[getCurrentUser] Veterinarian profile query result:",
            vetProfile
          );

          if (vetProfile.length > 0 && vetProfile[0].nickname) {
            profileName = vetProfile[0].nickname;

            // Check if this is actually a veterinary student based on experience field
            if (
              vetProfile[0].experience &&
              vetProfile[0].experience.includes("Student at")
            ) {
              actualUserType = "VETERINARY_STUDENT";
              console.log(
                "[getCurrentUser] Detected as VETERINARY_STUDENT based on experience field"
              );
            }
          } else {
            console.log(
              "[getCurrentUser] No nickname found in any table for user:",
              user.id
            );
            profileName = user.nickname || user.realName || user.email; // fallback chain
          }
        }
      }
    } else if (user.userType === "HOSPITAL") {
      // 병원 사용자의 경우 hospitals 테이블에서 정보를 가져옴 (정규화된 구조)
      const hospitalProfile = await sql`
        SELECT "hospitalName", "hospitalLogo" FROM hospitals WHERE "userId" = ${user.id}
      `;

      if (hospitalProfile.length > 0) {
        profileName = hospitalProfile[0].hospitalName;
        hospitalLogo = hospitalProfile[0].hospitalLogo;
      } else {
        profileName = "병원"; // fallback if no hospital profile found
      }

      console.log("[getCurrentUser] Hospital profile data:", {
        userId: user.id,
        profileName,
        hospitalLogo,
        userHospitalName:
          hospitalProfile.length > 0 ? hospitalProfile[0].hospitalName : null,
        userHospitalLogo:
          hospitalProfile.length > 0 ? hospitalProfile[0].hospitalLogo : null,
        userPhone: user.phone,
        userEmail: user.email,
      });
    }

    // Get user's social accounts
    let socialAccounts: Array<{
      provider: string;
      providerId: string;
      createdAt: Date;
    }> = [];
    try {
      const socialResult = await sql`
        SELECT provider, "providerId", "createdAt" 
        FROM social_accounts 
        WHERE "userId" = ${user.id}
        ORDER BY "createdAt" DESC
      `;
      socialAccounts = socialResult as Array<{
        provider: string;
        providerId: string;
        createdAt: Date;
      }>;
      console.log("[getCurrentUser] User social accounts:", socialAccounts);
    } catch (error) {
      console.error("[getCurrentUser] Failed to get social accounts:", error);
    }

    const userResult = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        realName: user.realName,
        nickname: user.nickname,
        birthDate: user.birthDate,
        userType: actualUserType, // Use detected userType
        profileImage: user.profileImage,
        provider: user.provider,
        isActive: user.isActive,
        termsAgreedAt: user.termsAgreedAt,
        privacyAgreedAt: user.privacyAgreedAt,
        marketingAgreedAt: user.marketingAgreedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profileName: profileName, // Add profile-specific name
        hospitalName: user.userType === "HOSPITAL" ? profileName : undefined, // Add hospital name for hospital users
        hospitalLogo: hospitalLogo, // Add hospital logo for hospital users
        socialAccounts: socialAccounts, // Add social accounts
      },
    };

    console.log(
      "[getCurrentUser] Final user result:",
      JSON.stringify(userResult, null, 2)
    );
    return userResult;
  } catch (error) {
    console.error("Get current user error:", error);
    return {
      success: false,
      error: "사용자 정보를 가져오는 중 오류가 발생했습니다.",
    };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
) {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    const userId = userResult.user.id;

    // Get current password hash
    const result = await sql`
      SELECT "passwordHash" FROM users WHERE id = ${userId}
    `;

    if (result.length === 0) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    const user = result[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      return { success: false, error: "현재 비밀번호가 올바르지 않습니다." };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await sql`
      UPDATE users SET "passwordHash" = ${newPasswordHash}, "updatedAt" = NOW() WHERE id = ${userId}
    `;

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." };
  }
}

export async function deleteAccount(password: string) {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    const userId = userResult.user.id;

    // Get current password hash
    const result = await sql`
      SELECT "passwordHash" FROM users WHERE id = ${userId}
    `;

    if (result.length === 0) {
      return { success: false, error: "사용자를 찾을 수 없습니다." };
    }

    const user = result[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: "비밀번호가 올바르지 않습니다." };
    }

    // Soft delete user
    await sql`
      UPDATE users SET "isActive" = false, "deletedAt" = NOW() WHERE id = ${userId}
    `;

    // Clear auth cookie
    const cookieStore = await cookies();
    cookieStore.delete("auth-token");

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "계정 삭제 중 오류가 발생했습니다." };
  }
}

export async function getUserByEmail(
  email: string,
  userType?: "VETERINARIAN" | "HOSPITAL"
) {
  try {
    const result = userType
      ? await sql`SELECT * FROM users WHERE email = ${email} AND "userType" = ${userType} AND "isActive" = true`
      : await sql`SELECT * FROM users WHERE email = ${email} AND "isActive" = true`;

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      email: user.email,
      userType: user.userType,
      profileImage: user.profileImage,
      provider: user.provider,
    };
  } catch (error) {
    console.error("Get user by email error:", error);
    return null;
  }
}

export async function createSocialUser(userData: {
  email: string;
  name: string;
  profileImage?: string;
  provider: "GOOGLE" | "KAKAO" | "NAVER";
  providerId: string;
  userType: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
}) {
  try {
    // Create user
    const userResult = await sql`
      INSERT INTO users (
        id, email, nickname, "userType", "profileImage", provider,
        "termsAgreedAt", "privacyAgreedAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${createId()}, ${userData.email}, ${userData.name}, ${userData.userType}, 
        ${userData.profileImage}, ${
      userData.provider
    }, NOW(), NOW(), NOW(), NOW()
      )
      RETURNING *
    `;

    const user = userResult[0];

    // Create social account
    await sql`
      INSERT INTO social_accounts (
        id, "userId", provider, "providerId", "createdAt", "updatedAt"
      )
      VALUES (${createId()}, ${user.id}, ${userData.provider}, ${
      userData.providerId
    }, NOW(), NOW())
    `;

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        profileImage: user.profileImage,
      },
    };
  } catch (error) {
    console.error("Create social user error:", error);
    return { success: false, error: "소셜 계정 생성 중 오류가 발생했습니다." };
  }
}

export async function checkUserIdDuplicate(loginId: string) {
  try {
    console.log("Checking loginId duplicate for:", loginId);

    // 특정 loginId 검색
    const result = await sql`
      SELECT id, "loginId", "isActive" FROM users WHERE "loginId" = ${loginId}
    `;
    console.log("LoginId duplicate check result:", result);
    console.log("Result length:", result.length);

    // isActive가 true인 사용자만 확인
    const activeResult = await sql`
      SELECT id, "loginId", "isActive" FROM users WHERE "loginId" = ${loginId} AND "isActive" = true
    `;
    console.log("Active loginId check result:", activeResult);

    const isDuplicate = activeResult.length > 0;
    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? "이미 사용 중인 아이디입니다."
        : "사용 가능한 아이디입니다.",
    };
  } catch (error) {
    console.error("Check loginId duplicate error:", error);
    return {
      success: false,
      error: "아이디 중복 확인 중 오류가 발생했습니다.",
    };
  }
}

// 아이디 중복확인
export async function checkLoginIdDuplicate(loginId: string): Promise<{
  success: boolean;
  isDuplicate?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log("[SERVER] checkLoginIdDuplicate called with:", loginId);

    if (!loginId || loginId.trim() === "") {
      return { success: false, error: "아이디를 입력해주세요." };
    }

    const existingUser = await sql`
      SELECT id FROM users WHERE "loginId" = ${loginId} AND "isActive" = true
    `;

    const isDuplicate = existingUser.length > 0;

    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? "이미 사용 중인 아이디입니다."
        : "사용 가능한 아이디입니다.",
    };
  } catch (error) {
    console.error("[SERVER] checkLoginIdDuplicate error:", error);
    return {
      success: false,
      error: "아이디 중복확인 중 오류가 발생했습니다.",
    };
  }
}

// 이메일 중복확인
export async function checkEmailDuplicate(email: string) {
  try {
    console.log("Checking email duplicate for:", email);

    // 먼저 모든 이메일 확인
    const allEmails = await sql`SELECT email FROM users LIMIT 10`;
    console.log(
      "All emails in DB:",
      allEmails.map((u) => u.email)
    );

    // 특정 email 검색
    const result = await sql`
      SELECT id, email, "isActive" FROM users WHERE email = ${email}
    `;
    console.log("Email duplicate check result:", result);
    console.log("Result length:", result.length);

    // isActive가 true인 사용자만 확인
    const activeResult = await sql`
      SELECT id, email, "isActive" FROM users WHERE email = ${email} AND "isActive" = true
    `;
    console.log("Active email check result:", activeResult);

    const isDuplicate = activeResult.length > 0;
    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? "이미 사용 중인 이메일입니다."
        : "사용 가능한 아이디입니다.",
    };
  } catch (error) {
    console.error("Check email duplicate error:", error);
    return {
      success: false,
      error: "이메일 중복 확인 중 오류가 발생했습니다.",
    };
  }
}

// 연락처 중복확인
export async function checkPhoneDuplicate(phone: string): Promise<{
  success: boolean;
  isDuplicate?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log("[SERVER] checkPhoneDuplicate called with:", phone);

    if (!phone || phone.trim() === "") {
      return { success: false, error: "연락처를 입력해주세요." };
    }

    // 연락처 형식 정규화 (하이픈 제거)
    const normalizedPhone = phone.replace(/-/g, "");

    // Prisma를 사용하여 중복 확인 (raw query 사용)
    const { prisma } = await import("@/lib/prisma");
    
    const existingUsers = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users 
      WHERE REPLACE(phone, '-', '') = ${normalizedPhone} 
      AND "isActive" = true
    `;

    const isDuplicate = existingUsers.length > 0;

    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? "이미 사용 중인 연락처입니다."
        : "사용 가능한 연락처입니다.",
    };
  } catch (error) {
    console.error("[SERVER] checkPhoneDuplicate error:", error);
    return {
      success: false,
      error: "연락처 중복확인 중 오류가 발생했습니다.",
    };
  }
}

// 사업자등록번호 중복확인
export async function checkBusinessNumberDuplicate(
  businessNumber: string
): Promise<{
  success: boolean;
  isDuplicate?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(
      "[SERVER] checkBusinessNumberDuplicate called with:",
      businessNumber
    );

    if (!businessNumber || businessNumber.trim() === "") {
      return { success: false, error: "사업자등록번호를 입력해주세요." };
    }

    // 사업자등록번호 형식 정규화 (하이픈 제거)
    const normalizedBusinessNumber = businessNumber.replace(/-/g, "");

    const existingHospital = await sql`
      SELECT h.id FROM hospitals h
      JOIN users u ON h."userId" = u.id
      WHERE REPLACE(h."businessNumber", '-', '') = ${normalizedBusinessNumber} AND u."isActive" = true
    `;

    const isDuplicate = existingHospital.length > 0;

    return {
      success: true,
      isDuplicate,
      message: isDuplicate
        ? "이미 등록된 사업자등록번호입니다."
        : "사용 가능한 사업자등록번호입니다.",
    };
  } catch (error) {
    console.error("[SERVER] checkBusinessNumberDuplicate error:", error);
    return {
      success: false,
      error: "사업자등록번호 중복확인 중 오류가 발생했습니다.",
    };
  }
}

export interface VeterinarianRegisterData {
  loginId: string;
  password: string;
  nickname: string;
  phone: string;
  email: string;
  realName?: string; // 실명 추가
  birthDate: string;
  profileImage?: string;
  licenseImage?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
}

export interface VeterinaryStudentRegisterData {
  loginId: string;
  password: string;
  nickname: string;
  phone: string;
  email: string; // 이메일 필드명 통일
  realName?: string;
  birthDate: string;
  profileImage?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
}

export interface HospitalRegisterData {
  loginId: string;
  password: string;
  realName: string; // 대표자명
  hospitalName: string;
  establishedDate?: string; // 병원 설립일
  businessNumber: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  detailAddress?: string; // 상세주소
  postalCode?: string; // 우편번호
  latitude?: number; // 위도
  longitude?: number; // 경도
  profileImage?: string;
  description?: string; // 병원 소개 추가
  hospitalImages?: string[]; // 병원 시설 이미지 추가
  treatmentAnimals?: string[]; // 진료 가능 동물
  treatmentSpecialties?: string[]; // 진료 분야
  businessLicense?: string;
  businessLicenseFileName?: string;
  businessLicenseFileType?: string;
  businessLicenseFileSize?: number;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
}

// 새로운 통합 수의사 회원가입 업데이트
export async function registerVeterinarian(data: VeterinarianRegisterData) {
  try {
    console.log("SERVER: registerVeterinarian called with data:", data);

    const {
      loginId,
      password,
      nickname,
      phone,
      email,
      realName,
      birthDate,
      profileImage,
      licenseImage,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // 새로운 반정규화 스키마에 맞게 업데이트
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE ("loginId" = ${loginId} OR email = ${email} OR phone = ${phone}) 
      AND "isActive" = true
    `;

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "이미 가입된 아이디, 이메일 또는 전화번호입니다.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const generatedId = createId();
    const currentDate = new Date();

    // users 테이블에 기본 정보만 저장 (정규화된 스키마)
    const userResult = await sql`
      INSERT INTO users (
        id, "loginId", email, phone, "passwordHash", "userType", 
        "profileImage", provider, "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", 
        "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${generatedId}, ${loginId}, ${email}, ${phone}, ${passwordHash}, 'VETERINARIAN',
        ${profileImage}, 'NORMAL', ${termsAgreed ? currentDate : null}, ${
      privacyAgreed ? currentDate : null
    }, ${marketingAgreed ? currentDate : null},
        true, ${currentDate}, ${currentDate}
      )
      RETURNING *
    `;

    const user = userResult[0];
    console.log("SERVER: User created successfully:", user.id);

    // veterinarians 테이블에 수의사 전용 정보 저장 (정규화된 스키마)
    const veterinarianId = createId();
    await sql`
      INSERT INTO veterinarians (
        id, "userId", "realName", "birthDate", nickname, "licenseImage", "createdAt", "updatedAt"
      )
      VALUES (
        ${veterinarianId}, ${user.id}, ${realName}, ${
      birthDate ? new Date(birthDate) : null
    }, ${nickname}, ${licenseImage}, ${currentDate}, ${currentDate}
      )
    `;

    console.log("SERVER: Veterinarian profile created successfully");

    return {
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        userType: user.userType,
        nickname: user.nickname,
      },
    };
  } catch (error) {
    console.error("SERVER: Register veterinarian error:", error);
    return {
      success: false,
      error: `수의사 회원가입 실패: ${
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      }`,
    };
  }
}

// 새로운 통합 수의학과 학생 회원가입 업데이트
export async function registerVeterinaryStudent(
  data: VeterinaryStudentRegisterData
) {
  try {
    console.log("SERVER: registerVeterinaryStudent called with data:", data);

    const {
      loginId,
      password,
      nickname,
      phone,
      email,
      realName,
      birthDate,
      profileImage,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // 새로운 반정규화 스키마에 맞게 업데이트
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE ("loginId" = ${loginId} OR email = ${email} OR phone = ${phone}) 
      AND "isActive" = true
    `;

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "이미 가입된 아이디, 이메일 또는 전화번호입니다.",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId_generated = createId();
    const currentDate = new Date();

    // users 테이블에 기본 정보만 저장 (정규화된 스키마)
    const userResult = await sql`
      INSERT INTO users (
        id, "loginId", email, phone, "passwordHash", "userType", 
        "profileImage", provider, "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", 
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ${userId_generated}, ${loginId}, ${email}, ${phone}, ${hashedPassword}, 'VETERINARY_STUDENT',
        ${profileImage}, 'NORMAL', ${termsAgreed ? currentDate : null}, ${
      privacyAgreed ? currentDate : null
    }, ${marketingAgreed ? currentDate : null},
        true, ${currentDate}, ${currentDate}
      )
      RETURNING *
    `;

    const user = userResult[0];
    console.log("SERVER: User created successfully:", user.id);

    // veterinary_students 테이블에 수의학생 전용 정보 저장 (정규화된 스키마)
    const studentId = createId();
    await sql`
      INSERT INTO veterinary_students (
        id, "userId", "realName", "birthDate", nickname, "universityEmail", "createdAt", "updatedAt"
      )
      VALUES (
        ${studentId}, ${user.id}, ${realName}, ${
      birthDate ? new Date(birthDate) : null
    }, ${nickname}, ${email}, ${currentDate}, ${currentDate}
      )
    `;

    console.log("SERVER: Veterinary student profile created successfully");

    return {
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        userType: user.userType,
        nickname: nickname,
      },
      message: "수의학과 학생 회원가입이 완료되었습니다.",
    };
  } catch (error) {
    console.error("SERVER: Veterinary student registration error:", error);
    return {
      success: false,
      error: `수의학과 학생 회원가입 중 오류가 발생했습니다: ${
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      }`,
    };
  }
}

// 새로운 통합 병원 회원가입 업데이트
export async function registerHospital(data: HospitalRegisterData) {
  try {
    console.log("SERVER: registerHospital called with data:", data);

    const {
      loginId,
      password,
      realName,
      hospitalName,
      establishedDate,
      businessNumber,
      phone,
      email,
      website,
      address,
      detailAddress,
      postalCode,
      latitude,
      longitude,
      profileImage,
      description,
      hospitalImages,
      treatmentAnimals,
      treatmentSpecialties,
      businessLicense,
      businessLicenseFileName,
      businessLicenseFileType,
      businessLicenseFileSize,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // 새로운 반정규화 스키마에 맞게 업데이트
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE ("loginId" = ${loginId} OR email = ${email} OR phone = ${phone}) 
      AND "isActive" = true
    `;

    const existingHospital = await sql`
      SELECT h.id FROM hospitals h
      JOIN users u ON h."userId" = u.id
      WHERE h."businessNumber" = ${businessNumber} AND u."isActive" = true
    `;

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "이미 가입된 아이디, 이메일 또는 전화번호입니다.",
      };
    }

    if (existingHospital.length > 0) {
      return {
        success: false,
        error: "이미 등록된 사업자등록번호입니다.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    const generatedId = createId();
    const currentDate = new Date();

    // users 테이블에 기본 사용자 정보만 저장 (정규화된 스키마 - realName 제외)
    const userResult = await sql`
      INSERT INTO users (
        id, "loginId", email, phone, "passwordHash", "userType", 
        "profileImage", provider, "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", 
        "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${generatedId}, ${loginId}, ${email}, ${phone}, ${passwordHash}, 'HOSPITAL',
        ${profileImage}, 'NORMAL', ${termsAgreed ? currentDate : null}, ${
      privacyAgreed ? currentDate : null
    }, ${marketingAgreed ? currentDate : null},
        true, ${currentDate}, ${currentDate}
      )
      RETURNING *
    `;

    const user = userResult[0];
    console.log("SERVER: Hospital user created successfully:", user.id);

    // hospitals 테이블에 병원 상세 정보 저장 (정규화된 스키마)
    const hospitalId = createId();
    await sql`
      INSERT INTO hospitals (
        id, "userId", "hospitalName", "representativeName", "businessNumber", 
        "businessLicenseFile", "establishedDate", "hospitalAddress", "hospitalAddressDetail",
        "postalCode", latitude, longitude, "hospitalLogo", "hospitalWebsite", 
        "hospitalDescription", "createdAt", "updatedAt"
      )
      VALUES (
        ${hospitalId}, ${
      user.id
    }, ${hospitalName}, ${realName}, ${businessNumber},
        ${businessLicense}, ${
      establishedDate ? new Date(establishedDate) : null
    }, ${address}, ${detailAddress},
        ${postalCode}, ${latitude}, ${longitude}, ${profileImage}, ${website}, 
        ${description}, ${currentDate}, ${currentDate}
      )
    `;

    console.log("SERVER: Hospital details saved to hospitals table");

    // 병원 시설 이미지 저장 (정규화된 스키마의 hospital_images 테이블)
    if (hospitalImages && hospitalImages.length > 0) {
      for (let i = 0; i < hospitalImages.length; i++) {
        const imageUrl = hospitalImages[i];
        if (imageUrl) {
          await sql`
            INSERT INTO hospital_images (
              id, "hospitalId", "userId", "imageUrl", "displayOrder", "createdAt", "updatedAt"
            ) VALUES (
              ${createId()}, ${hospitalId}, ${user.id}, ${imageUrl}, ${
            i + 1
          }, ${currentDate}, ${currentDate}
            )
          `;
        }
      }
      console.log(
        "SERVER: Hospital facility images saved:",
        hospitalImages.length
      );
    }

    // 진료 가능 동물 저장 (정규화된 스키마)
    if (treatmentAnimals && treatmentAnimals.length > 0) {
      for (const animalType of treatmentAnimals) {
        await sql`
          INSERT INTO hospital_animals (
            id, "userId", "animalType", "createdAt"
          ) VALUES (
            ${createId()}, ${user.id}, ${animalType}, ${currentDate}
          )
        `;
      }
      console.log(
        "SERVER: Hospital treatment animals saved:",
        treatmentAnimals.length
      );
    }

    // 진료 분야 저장 (정규화된 스키마)
    if (treatmentSpecialties && treatmentSpecialties.length > 0) {
      for (const specialty of treatmentSpecialties) {
        await sql`
          INSERT INTO hospital_specialties (
            id, "userId", "specialty", "createdAt"
          ) VALUES (
            ${createId()}, ${user.id}, ${specialty}, ${currentDate}
          )
        `;
      }
      console.log(
        "SERVER: Hospital specialties saved:",
        treatmentSpecialties.length
      );
    }

    // 사업자등록증 파일 저장
    if (businessLicense) {
      const actualFileName = businessLicenseFileName || "business_license";
      const actualFileType = businessLicenseFileType || "document";
      const actualFileSize = businessLicenseFileSize || null;

      await sql`
        INSERT INTO hospital_business_licenses (
          id, "userId", "fileName", "fileUrl", "fileType", "fileSize", "uploadedAt"
        ) VALUES (
          ${createId()}, ${
        user.id
      }, ${actualFileName}, ${businessLicense}, ${actualFileType}, ${actualFileSize}, ${currentDate}
        )
      `;
      console.log(
        "SERVER: Hospital business license saved with type:",
        actualFileType,
        "size:",
        actualFileSize
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        userType: user.userType,
        hospitalName: user.hospitalName,
      },
    };
  } catch (error) {
    console.error("SERVER: Register hospital error:", error);
    return {
      success: false,
      error: `병원 회원가입 실패: ${
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      }`,
    };
  }
}

export interface HospitalProfile {
  id: string;
  userId: string;
  hospitalName: string;
  businessNumber: string;
  address: string;
  detailAddress?: string;
  phone: string;
  website?: string;
  description?: string;
  businessLicense?: string;
  treatmentAnimals?: string[];
  treatmentSpecialties?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getHospitalProfile(): Promise<{
  success: boolean;
  profile?: HospitalProfile;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정이 아닙니다." };
    }

    // 병원 동물 및 진료분야 데이터 조회
    const [animalResults, specialtyResults] = await Promise.all([
      sql`SELECT "animalType" FROM hospital_animals WHERE "userId" = ${userResult.user.id}`,
      sql`SELECT "specialty" FROM hospital_specialties WHERE "userId" = ${userResult.user.id}`,
    ]);

    const treatmentAnimals = animalResults.map((row) => row.animalType);
    const treatmentSpecialties = specialtyResults.map((row) => row.specialty);

    console.log("[getHospitalProfile] Retrieved basic profile data:", {
      treatmentAnimals,
      treatmentSpecialties,
    });

    // hospitals 테이블에서 병원 정보를 조회 (integrated schema)
    const userDataResult = await sql`
      SELECT 
        u.id as userId,
        h."hospitalName",
        h."businessNumber", 
        h."hospitalAddress" as address,
        h."hospitalAddressDetail" as detailAddress,
        u.phone,
        u.email,
        h."hospitalWebsite" as website,
        h."hospitalLogo",
        h."establishedDate",
        h."createdAt",
        h."updatedAt"
      FROM users u
      JOIN hospitals h ON u.id = h."userId"
      WHERE u.id = ${userResult.user.id} 
      AND u."userType" = 'HOSPITAL'
      AND u."isActive" = true
    `;

    if (userDataResult.length > 0) {
      const userData = userDataResult[0];

      console.log("[getHospitalProfile] Using users table data:", userData);

      return {
        success: true,
        profile: {
          id: userData.userId, // users 테이블의 id를 프로필 id로 사용
          userId: userData.userId,
          hospitalName: userData.hospitalName || "",
          businessNumber: userData.businessNumber || "",
          address: userData.address || "",
          detailAddress: userData.detailAddress || "",
          phone: userData.phone || "",
          website: userData.website || "",
          description: "", // users 테이블에는 description이 없음
          businessLicense: "", // users 테이블에는 businessLicense가 없음
          treatmentAnimals: treatmentAnimals,
          treatmentSpecialties: treatmentSpecialties,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
      };
    }

    // users 테이블에 정보가 없으면 hospital_profiles 테이블에서 조회 (fallback)
    const profileResult = await sql`
      SELECT * FROM hospital_profiles 
      WHERE "userId" = ${userResult.user.id} 
      AND "deletedAt" IS NULL
    `;

    if (profileResult.length === 0) {
      return { success: false, error: "병원 정보를 찾을 수 없습니다." };
    }

    const profile = profileResult[0];

    return {
      success: true,
      profile: {
        id: profile.id,
        userId: profile.userId,
        hospitalName: profile.hospitalName,
        businessNumber: profile.businessNumber,
        address: profile.address,
        detailAddress: profile.detailAddress || "",
        phone: profile.phone,
        website: profile.website,
        description: profile.description,
        businessLicense: profile.businessLicense,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  } catch (error) {
    console.error("Get hospital profile error:", error);
    return {
      success: false,
      error: "병원 프로필 조회 중 오류가 발생했습니다.",
    };
  }
}

export interface VeterinarianProfile {
  id: string;
  email: string;
  phone: string;
  profileImage?: string;
  loginId?: string;
  nickname?: string;
  realName: string;
  birthDate?: Date;
  licenseImage?: string;
  userType: string;
  provider: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getVeterinarianProfile(): Promise<{
  success: boolean;
  profile?: VeterinarianProfile;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (
      userResult.user.userType !== "VETERINARIAN" &&
      userResult.user.userType !== "VETERINARY_STUDENT"
    ) {
      return {
        success: false,
        error: "수의사 또는 수의학과 학생 계정이 아닙니다.",
      };
    }

    // Use the updated database function
    const { getVeterinarianProfile: getVetProfile } = await import(
      "@/lib/database"
    );
    const profile = await getVetProfile(userResult.user.id);

    if (!profile) {
      return { success: false, error: "수의사 프로필을 찾을 수 없습니다." };
    }

    return {
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        phone: profile.phone,
        profileImage: profile.profileImage,
        loginId: profile.loginId,
        nickname: profile.nickname,
        realName: profile.realName,
        birthDate: profile.birthDate,
        licenseImage: profile.licenseImage,
        userType: profile.userType,
        provider: profile.provider,
        isActive: profile.isActive,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    };
  } catch (error) {
    console.error("Get veterinarian profile error:", error);
    return {
      success: false,
      error: "수의사 프로필 조회 중 오류가 발생했습니다.",
    };
  }
}

// 상세 이력서 타입 정의
export interface ResumeData {
  // 기본 정보
  photo?: string;
  name: string;
  birthDate?: string;
  introduction?: string;
  phone?: string;
  email?: string;
  phonePublic: boolean;
  emailPublic: boolean;

  // 희망 근무 조건
  position?: string;
  specialties: string[];
  preferredRegions: string[];
  expectedSalary?: string;
  workTypes: string[];
  startDate?: string;
  preferredWeekdays: string[];
  weekdaysNegotiable: boolean;
  workStartTime?: string;
  workEndTime?: string;
  workTimeNegotiable: boolean;

  // 자기소개
  selfIntroduction?: string;

  // 복잡한 객체들
  experiences: Array<{
    hospitalName: string;
    mainTasks: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  licenses: Array<{
    name: string;
    issuer: string;
    grade?: string;
    acquiredDate?: Date;
  }>;
  educations: Array<{
    degree: string;
    graduationStatus: string;
    schoolName: string;
    major: string;
    gpa?: string;
    totalGpa?: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  medicalCapabilities: Array<{
    field: string;
    proficiency: string;
    description?: string;
    others?: string;
  }>;
}

export interface Resume {
  id: string;
  userId: string;
  photo?: string;
  name: string;
  birthDate?: string;
  introduction?: string;
  phone?: string;
  email?: string;
  phonePublic: boolean;
  emailPublic: boolean;
  position?: string;
  specialties: string[];
  preferredRegions: string[];
  expectedSalary?: string;
  workTypes: string[];
  startDate?: string;
  preferredWeekdays: string[];
  weekdaysNegotiable: boolean;
  workStartTime?: string;
  workEndTime?: string;
  workTimeNegotiable: boolean;
  selfIntroduction?: string;
  createdAt: Date;
  updatedAt: Date;
  experiences: Array<{
    id: string;
    hospitalName: string;
    mainTasks: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  licenses: Array<{
    id: string;
    name: string;
    issuer: string;
    grade?: string;
    acquiredDate?: Date;
  }>;
  educations: Array<{
    id: string;
    degree: string;
    graduationStatus: string;
    schoolName: string;
    major: string;
    gpa?: string;
    totalGpa?: string;
    startDate?: Date;
    endDate?: Date;
  }>;
  medicalCapabilities: Array<{
    id: string;
    field: string;
    proficiency: string;
    description?: string;
    others?: string;
  }>;
}

// 상세 이력서 조회
export async function getResume(): Promise<{
  success: boolean;
  resume?: Resume;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (
      userResult.user.userType !== "VETERINARIAN" &&
      userResult.user.userType !== "VETERINARY_STUDENT"
    ) {
      return {
        success: false,
        error: "수의사 또는 수의학과 학생 계정이 아닙니다.",
      };
    }

    // 메인 이력서 정보 조회
    const resumeResult = await sql`
      SELECT * FROM resumes 
      WHERE "userId" = ${userResult.user.id} 
      AND "deletedAt" IS NULL
    `;

    if (resumeResult.length === 0) {
      return { success: false, error: "이력서를 찾을 수 없습니다." };
    }

    const resume = resumeResult[0];

    // 관련 데이터들 조회
    const [experiences, licenses, educations, medicalCapabilities] =
      await Promise.all([
        sql`SELECT * FROM resume_experiences WHERE "resumeId" = ${resume.id} ORDER BY "sortOrder", "createdAt"`,
        sql`SELECT * FROM resume_licenses WHERE "resumeId" = ${resume.id} ORDER BY "sortOrder", "createdAt"`,
        sql`SELECT * FROM resume_educations WHERE "resumeId" = ${resume.id} ORDER BY "sortOrder", "createdAt"`,
        sql`SELECT * FROM resume_medical_capabilities WHERE "resumeId" = ${resume.id} ORDER BY "sortOrder", "createdAt"`,
      ]);

    return {
      success: true,
      resume: {
        id: resume.id,
        userId: resume.userId,
        photo: resume.photo,
        name: resume.name,
        birthDate: resume.birthDate,
        introduction: resume.introduction,
        phone: resume.phone,
        email: resume.email,
        phonePublic: resume.phonePublic,
        emailPublic: resume.emailPublic,
        position: resume.position,
        specialties: resume.specialties,
        preferredRegions: resume.preferredRegions,
        expectedSalary: resume.expectedSalary,
        workTypes: resume.workTypes,
        startDate: resume.startDate,
        preferredWeekdays: resume.preferredWeekdays,
        weekdaysNegotiable: resume.weekdaysNegotiable,
        workStartTime: resume.workStartTime,
        workEndTime: resume.workEndTime,
        workTimeNegotiable: resume.workTimeNegotiable,
        selfIntroduction: resume.selfIntroduction,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
        experiences: experiences.map((exp) => ({
          id: exp.id,
          hospitalName: exp.hospitalName,
          mainTasks: exp.mainTasks,
          startDate: exp.startDate,
          endDate: exp.endDate,
        })),
        licenses: licenses.map((lic) => ({
          id: lic.id,
          name: lic.name,
          issuer: lic.issuer,
          grade: lic.grade,
          acquiredDate: lic.acquiredDate,
        })),
        educations: educations.map((edu) => ({
          id: edu.id,
          degree: edu.degree,
          graduationStatus: edu.graduationStatus,
          schoolName: edu.schoolName,
          major: edu.major,
          gpa: edu.gpa,
          totalGpa: edu.totalGpa,
          startDate: edu.startDate,
          endDate: edu.endDate,
        })),
        medicalCapabilities: medicalCapabilities.map((cap) => ({
          id: cap.id,
          field: cap.field,
          proficiency: cap.proficiency,
          description: cap.description,
          others: cap.others,
        })),
      },
    };
  } catch (error) {
    console.error("Get detailed resume error:", error);
    return {
      success: false,
      error: "이력서 조회 중 오류가 발생했습니다.",
    };
  }
}

// 상세 이력서 저장/업데이트
export async function saveResume(data: ResumeData): Promise<{
  success: boolean;
  resumeId?: string;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (
      userResult.user.userType !== "VETERINARIAN" &&
      userResult.user.userType !== "VETERINARY_STUDENT"
    ) {
      return {
        success: false,
        error: "수의사 또는 수의학과 학생 계정이 아닙니다.",
      };
    }

    const userId = userResult.user.id;

    // 기존 이력서가 있는지 확인
    const existingResume = await sql`
      SELECT id FROM resumes 
      WHERE "userId" = ${userId} 
      AND "deletedAt" IS NULL
    `;

    let resumeId: string;

    if (existingResume.length > 0) {
      // 업데이트
      resumeId = existingResume[0].id;

      await sql`
        UPDATE resumes SET
          photo = ${data.photo || null},
          name = ${data.name},
          "birthDate" = ${data.birthDate || null},
          introduction = ${data.introduction || null},
          phone = ${data.phone || null},
          email = ${data.email || null},
          "phonePublic" = ${data.phonePublic},
          "emailPublic" = ${data.emailPublic},
          position = ${data.position || null},
          specialties = ${data.specialties},
          "preferredRegions" = ${data.preferredRegions},
          "expectedSalary" = ${data.expectedSalary || null},
          "workTypes" = ${data.workTypes},
          "startDate" = ${data.startDate || null},
          "preferredWeekdays" = ${data.preferredWeekdays},
          "weekdaysNegotiable" = ${data.weekdaysNegotiable},
          "workStartTime" = ${data.workStartTime || null},
          "workEndTime" = ${data.workEndTime || null},
          "workTimeNegotiable" = ${data.workTimeNegotiable},
          "selfIntroduction" = ${data.selfIntroduction || null},
          "updatedAt" = NOW()
        WHERE id = ${resumeId}
      `;

      // 기존 관련 데이터 삭제
      await Promise.all([
        sql`DELETE FROM resume_experiences WHERE "resumeId" = ${resumeId}`,
        sql`DELETE FROM resume_licenses WHERE "resumeId" = ${resumeId}`,
        sql`DELETE FROM resume_educations WHERE "resumeId" = ${resumeId}`,
        sql`DELETE FROM resume_medical_capabilities WHERE "resumeId" = ${resumeId}`,
      ]);
    } else {
      // 생성
      resumeId = createId();

      await sql`
        INSERT INTO resumes (
          id, "userId", photo, name, "birthDate", introduction, phone, email,
          "phonePublic", "emailPublic", position, specialties, "preferredRegions",
          "expectedSalary", "workTypes", "startDate", "preferredWeekdays",
          "weekdaysNegotiable", "workStartTime", "workEndTime", "workTimeNegotiable",
          "selfIntroduction", "createdAt", "updatedAt"
        ) VALUES (
          ${resumeId}, ${userId}, ${data.photo || null}, ${data.name},
          ${data.birthDate || null}, ${data.introduction || null},
          ${data.phone || null}, ${data.email || null}, ${data.phonePublic},
          ${data.emailPublic}, ${data.position || null}, ${data.specialties},
          ${data.preferredRegions}, ${data.expectedSalary || null}, ${
        data.workTypes
      },
          ${data.startDate || null}, ${data.preferredWeekdays}, ${
        data.weekdaysNegotiable
      },
          ${data.workStartTime || null}, ${data.workEndTime || null}, ${
        data.workTimeNegotiable
      },
          ${data.selfIntroduction || null}, NOW(), NOW()
        )
      `;
    }

    // 경력사항 저장
    if (data.experiences && data.experiences.length > 0) {
      for (let i = 0; i < data.experiences.length; i++) {
        const exp = data.experiences[i];
        await sql`
          INSERT INTO resume_experiences (
            id, "resumeId", "hospitalName", "mainTasks", "startDate", "endDate", "sortOrder", "createdAt", "updatedAt"
          ) VALUES (
            ${createId()}, ${resumeId}, ${exp.hospitalName}, ${exp.mainTasks},
            ${exp.startDate || null}, ${exp.endDate || null}, ${i}, NOW(), NOW()
          )
        `;
      }
    }

    // 자격증 저장
    if (data.licenses && data.licenses.length > 0) {
      for (let i = 0; i < data.licenses.length; i++) {
        const lic = data.licenses[i];
        await sql`
          INSERT INTO resume_licenses (
            id, "resumeId", name, issuer, grade, "acquiredDate", "sortOrder", "createdAt", "updatedAt"
          ) VALUES (
            ${createId()}, ${resumeId}, ${lic.name}, ${lic.issuer},
            ${lic.grade || null}, ${
          lic.acquiredDate || null
        }, ${i}, NOW(), NOW()
          )
        `;
      }
    }

    // 학력 저장
    if (data.educations && data.educations.length > 0) {
      for (let i = 0; i < data.educations.length; i++) {
        const edu = data.educations[i];
        await sql`
          INSERT INTO resume_educations (
            id, "resumeId", degree, "graduationStatus", "schoolName", major,
            gpa, "totalGpa", "startDate", "endDate", "sortOrder", "createdAt", "updatedAt"
          ) VALUES (
            ${createId()}, ${resumeId}, ${edu.degree}, ${edu.graduationStatus},
            ${edu.schoolName}, ${edu.major}, ${edu.gpa || null}, ${
          edu.totalGpa || null
        },
            ${edu.startDate || null}, ${edu.endDate || null}, ${i}, NOW(), NOW()
          )
        `;
      }
    }

    // 진료상세역량 저장
    if (data.medicalCapabilities && data.medicalCapabilities.length > 0) {
      for (let i = 0; i < data.medicalCapabilities.length; i++) {
        const cap = data.medicalCapabilities[i];
        await sql`
          INSERT INTO resume_medical_capabilities (
            id, "resumeId", field, proficiency, description, others, "sortOrder", "createdAt", "updatedAt"
          ) VALUES (
            ${createId()}, ${resumeId}, ${cap.field}, ${cap.proficiency},
            ${cap.description || null}, ${
          cap.others || null
        }, ${i}, NOW(), NOW()
          )
        `;
      }
    }

    return {
      success: true,
      resumeId: resumeId,
    };
  } catch (error) {
    console.error("Save detailed resume error:", error);
    return {
      success: false,
      error: "이력서 저장 중 오류가 발생했습니다.",
    };
  }
}

// 상세 병원 프로필 타입 정의
export interface DetailedHospitalProfileData {
  // 기본 정보
  hospitalLogo?: string;
  hospitalName: string;
  realName?: string;
  businessNumber: string;
  address: string;
  phone: string;
  website?: string;
  description?: string;
  businessLicense?: string;

  // 추가 상세 정보
  establishedDate?: string;
  detailAddress?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  treatmentAnimals: string[];
  treatmentFields: string[];
  facilityImages?: string[];

  // 운영 정보
  operatingHours?: any; // JSON 데이터
  emergencyService: boolean;
  parkingAvailable: boolean;
  publicTransportInfo?: string;

  // 시설 정보
  totalBeds?: number;
  surgeryRooms?: number;
  xrayRoom: boolean;
  ctScan: boolean;
  ultrasound: boolean;

  // 추가 서비스
  grooming: boolean;
  boarding: boolean;
  petTaxi: boolean;

  // 인증 정보
  certifications: string[];
  awards: string[];

  // 관계 데이터
  staff?: Array<{
    name: string;
    position: string;
    specialization?: string;
    experience?: string;
    education?: string;
    profileImage?: string;
    introduction?: string;
  }>;
  equipments?: Array<{
    name: string;
    category: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: Date;
    description?: string;
    image?: string;
  }>;
}

export interface DetailedHospitalProfile {
  id: string;
  userId: string;
  hospitalLogo?: string;
  hospitalName: string;
  realName?: string;
  businessNumber: string;
  address: string;
  phone: string;
  website?: string;
  description?: string;
  businessLicense?: string;
  establishedDate?: string;
  detailAddress?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  treatmentAnimals: string[];
  treatmentFields: string[];
  facilityImages?: string[];
  operatingHours?: any;
  emergencyService: boolean;
  parkingAvailable: boolean;
  publicTransportInfo?: string;
  totalBeds?: number;
  surgeryRooms?: number;
  xrayRoom: boolean;
  ctScan: boolean;
  ultrasound: boolean;
  grooming: boolean;
  boarding: boolean;
  petTaxi: boolean;
  certifications: string[];
  awards: string[];
  createdAt: Date;
  updatedAt: Date;
  staff: Array<{
    id: string;
    name: string;
    position: string;
    specialization?: string;
    experience?: string;
    education?: string;
    profileImage?: string;
    introduction?: string;
  }>;
  equipments: Array<{
    id: string;
    name: string;
    category: string;
    manufacturer?: string;
    model?: string;
    purchaseDate?: Date;
    description?: string;
    image?: string;
  }>;
}

// 상세 병원 프로필 조회
export async function getDetailedHospitalProfile(): Promise<{
  success: boolean;
  profile?: DetailedHospitalProfile;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정이 아닙니다." };
    }

    // 병원 동물 및 진료분야 데이터 조회
    const [animalResults, specialtyResults] = await Promise.all([
      sql`SELECT "animalType" FROM hospital_animals WHERE "userId" = ${userResult.user.id}`,
      sql`SELECT "specialty" FROM hospital_specialties WHERE "userId" = ${userResult.user.id}`,
    ]);

    const treatmentAnimals = animalResults.map((row) => row.animalType);
    const treatmentSpecialties = specialtyResults.map((row) => row.specialty);

    console.log("[getDetailedHospitalProfile] Retrieved data:", {
      treatmentAnimals,
      treatmentSpecialties,
    });

    // hospitals 테이블에서 병원 정보 조회 (hospital_images 포함)
    const [hospitalResult, facilityImagesResult] = await Promise.all([
      sql`
        SELECT h.*, u.email, u.phone
        FROM hospitals h
        JOIN users u ON h."userId" = u.id
        WHERE h."userId" = ${userResult.user.id}
      `,
      sql`
        SELECT "imageUrl", "displayOrder"
        FROM hospital_images
        WHERE "userId" = ${userResult.user.id}
        ORDER BY "displayOrder"
      `,
    ]);

    if (hospitalResult.length === 0) {
      return { success: false, error: "병원 정보를 찾을 수 없습니다." };
    }

    const hospital = hospitalResult[0];
    const facilityImages = facilityImagesResult.map((img) => img.imageUrl);

    console.log("[getDetailedHospitalProfile] Retrieved hospital data:", {
      hospitalId: hospital.id,
      treatmentAnimals,
      treatmentSpecialties,
      facilityImages: facilityImages.length,
    });

    return {
      success: true,
      profile: {
        id: hospital.id,
        userId: hospital.userId,
        hospitalLogo: hospital.hospitalLogo,
        hospitalName: hospital.hospitalName || "",
        realName: hospital.representativeName || "",
        businessNumber: hospital.businessNumber || "",
        address: hospital.hospitalAddress || "",
        phone: hospital.phone || "",
        website: hospital.hospitalWebsite || "",
        description: hospital.hospitalDescription || "",
        businessLicense: hospital.businessLicenseFile || "",
        establishedDate: hospital.establishedDate
          ? hospital.establishedDate.toISOString().split("T")[0]
          : "",
        detailAddress: hospital.hospitalAddressDetail || "",
        postalCode: hospital.postalCode || "",
        latitude: hospital.latitude ? Number(hospital.latitude) : undefined,
        longitude: hospital.longitude ? Number(hospital.longitude) : undefined,
        email: hospital.email || "",
        treatmentAnimals: treatmentAnimals,
        treatmentFields: treatmentSpecialties,
        facilityImages: facilityImages,
        operatingHours: undefined,
        emergencyService: false,
        parkingAvailable: false,
        publicTransportInfo: undefined,
        totalBeds: undefined,
        surgeryRooms: undefined,
        xrayRoom: false,
        ctScan: false,
        ultrasound: false,
        grooming: false,
        boarding: false,
        petTaxi: false,
        certifications: [],
        awards: [],
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt,
        staff: [],
        equipments: [],
      },
    };
  } catch (error) {
    console.error("Get detailed hospital profile error:", error);
    return {
      success: false,
      error: "병원 프로필 조회 중 오류가 발생했습니다.",
    };
  }
}

// 상세 병원 프로필 저장/업데이트
export async function saveDetailedHospitalProfile(
  data: DetailedHospitalProfileData
): Promise<{
  success: boolean;
  profileId?: string;
  error?: string;
}> {
  try {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.user) {
      return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    if (userResult.user.userType !== "HOSPITAL") {
      return { success: false, error: "병원 계정이 아닙니다." };
    }

    const userId = userResult.user.id;

    console.log(
      "[saveDetailedHospitalProfile] Starting save for userId:",
      userId
    );
    console.log(
      "[saveDetailedHospitalProfile] Data to save:",
      JSON.stringify(data, null, 2)
    );

    // 기존 hospitals 테이블 레코드 확인
    const existingHospital = await sql`
      SELECT id FROM hospitals WHERE "userId" = ${userId}
    `;

    let hospitalId: string;

    if (existingHospital.length > 0) {
      // 업데이트
      hospitalId = existingHospital[0].id;
      console.log(
        "[saveDetailedHospitalProfile] Updating existing hospital:",
        hospitalId
      );

      await sql`
        UPDATE hospitals SET
          "hospitalLogo" = ${data.hospitalLogo || null},
          "hospitalName" = ${data.hospitalName},
          "representativeName" = ${data.realName || null},
          "businessNumber" = ${data.businessNumber},
          "hospitalAddress" = ${data.address},
          "hospitalAddressDetail" = ${data.detailAddress || null},
          "postalCode" = ${data.postalCode || null},
          "latitude" = ${data.latitude || null},
          "longitude" = ${data.longitude || null},
          "hospitalWebsite" = ${data.website || null},
          "hospitalDescription" = ${data.description || null},
          "businessLicenseFile" = ${data.businessLicense || null},
          "establishedDate" = ${
            data.establishedDate ? new Date(data.establishedDate) : null
          },
          "updatedAt" = NOW()
        WHERE id = ${hospitalId}
      `;

      // users 테이블도 동기화 (정규화된 스키마에서는 기본 정보만)
      await sql`
        UPDATE users SET
          phone = ${data.phone},
          email = ${data.email || null},
          "profileImage" = ${data.hospitalLogo || null},
          "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    } else {
      // 생성
      hospitalId = createId();
      console.log(
        "[saveDetailedHospitalProfile] Creating new hospital:",
        hospitalId
      );

      await sql`
        INSERT INTO hospitals (
          id, "userId", "hospitalName", "representativeName", "businessNumber", 
          "businessLicenseFile", "establishedDate", "hospitalAddress", "hospitalAddressDetail",
          "postalCode", "latitude", "longitude", "hospitalLogo", "hospitalWebsite", 
          "hospitalDescription", "createdAt", "updatedAt"
        )
        VALUES (
          ${hospitalId}, ${userId}, ${data.hospitalName}, ${
        data.realName || null
      }, ${data.businessNumber},
          ${data.businessLicense || null}, ${
        data.establishedDate ? new Date(data.establishedDate) : null
      }, 
          ${data.address}, ${data.detailAddress || null}, ${
        data.postalCode || null
      },
          ${data.latitude || null}, ${data.longitude || null}, ${
        data.hospitalLogo || null
      }, 
          ${data.website || null}, ${data.description || null}, NOW(), NOW()
        )
      `;

      // users 테이블도 동기화 (정규화된 스키마에서는 기본 정보만)
      await sql`
        UPDATE users SET
          phone = ${data.phone},
          email = ${data.email || null},
          "profileImage" = ${data.hospitalLogo || null},
          "updatedAt" = NOW()
        WHERE id = ${userId}
      `;
    }

    // 병원 시설 이미지 처리 (facilityImages가 있는 경우)
    if (data.facilityImages !== undefined) {
      // 기존 이미지 삭제
      await sql`DELETE FROM hospital_images WHERE "userId" = ${userId}`;

      // 새로운 이미지 저장
      if (data.facilityImages && data.facilityImages.length > 0) {
        for (let i = 0; i < data.facilityImages.length; i++) {
          const imageUrl = data.facilityImages[i];
          if (imageUrl) {
            await sql`
              INSERT INTO hospital_images (
                id, "hospitalId", "userId", "imageUrl", "displayOrder", "createdAt", "updatedAt"
              ) VALUES (
                ${createId()}, ${hospitalId}, ${userId}, ${imageUrl}, ${
              i + 1
            }, NOW(), NOW()
              )
            `;
          }
        }
        console.log(
          "[saveDetailedHospitalProfile] Saved facility images:",
          data.facilityImages.length
        );
      }
    }

    // 기존 진료 동물 및 분야 데이터 삭제 후 새로 저장
    await Promise.all([
      sql`DELETE FROM hospital_animals WHERE "userId" = ${userId}`,
      sql`DELETE FROM hospital_specialties WHERE "userId" = ${userId}`,
    ]);

    console.log(
      "[saveDetailedHospitalProfile] Deleted existing animals and specialties"
    );

    // 새로운 진료 동물 저장
    if (data.treatmentAnimals && data.treatmentAnimals.length > 0) {
      for (const animalType of data.treatmentAnimals) {
        await sql`
          INSERT INTO hospital_animals (
            id, "userId", "animalType", "createdAt"
          ) VALUES (
            ${createId()}, ${userId}, ${animalType}, NOW()
          )
        `;
      }
      console.log(
        "[saveDetailedHospitalProfile] Saved treatment animals:",
        data.treatmentAnimals.length
      );
    }

    // 새로운 진료 분야 저장
    if (data.treatmentFields && data.treatmentFields.length > 0) {
      for (const specialty of data.treatmentFields) {
        await sql`
          INSERT INTO hospital_specialties (
            id, "userId", "specialty", "createdAt"
          ) VALUES (
            ${createId()}, ${userId}, ${specialty}, NOW()
          )
        `;
      }
      console.log(
        "[saveDetailedHospitalProfile] Saved treatment specialties:",
        data.treatmentFields.length
      );
    }

    console.log("[saveDetailedHospitalProfile] Profile saved successfully");

    return {
      success: true,
      profileId: hospitalId,
    };
  } catch (error) {
    console.error(
      "[saveDetailedHospitalProfile] Error saving hospital profile:",
      error
    );
    return {
      success: false,
      error: `병원 프로필 저장 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`,
    };
  }
}

// Social Registration Completion Functions
interface SocialVeterinarianRegistrationData {
  email: string;
  name: string;
  realName?: string;
  profileImage?: string;
  provider: string;
  providerId: string;
  nickname: string;
  phone: string;
  birthDate?: string;
  licenseImage?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}

interface SocialVeterinaryStudentRegistrationData {
  email: string;
  name: string;
  realName?: string;
  profileImage?: string;
  provider: string;
  providerId: string;
  nickname: string;
  phone: string;
  universityEmail: string;
  birthDate?: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}

export async function completeSocialVeterinarianRegistration(
  data: SocialVeterinarianRegistrationData
) {
  try {
    console.log(
      "SERVER: completeSocialVeterinarianRegistration called with data:",
      data
    );

    const {
      email,
      name,
      realName,
      profileImage,
      provider,
      providerId,
      nickname,
      phone,
      birthDate,
      licenseImage,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // Check if social user already exists
    const existingSocialUser = await sql`
      SELECT 
        u.id as user_id,
        u."loginId",
        u.email,
        u.phone,
        u.nickname,
        u."realName",
        u."birthDate",
        u."userType",
        u."profileImage",
        u.provider,
        u."universityEmail",
        u."termsAgreedAt",
        u."privacyAgreedAt",
        u."marketingAgreedAt",
        u."isActive",
        u."createdAt",
        u."updatedAt",
        sa.id as social_account_id,
        sa.provider as sa_provider,
        sa."providerId"
      FROM users u 
      JOIN social_accounts sa ON u.id = sa."userId" 
      WHERE sa.provider = ${provider} AND sa."providerId" = ${providerId}
    `;

    let user;

    if (existingSocialUser.length > 0) {
      // User already exists, update their profile completion data
      const existingUserData = existingSocialUser[0];
      
      // Create clean user object with proper id mapping
      user = {
        id: existingUserData.user_id, // 올바른 users.id 사용
        loginId: existingUserData.loginId,
        email: existingUserData.email,
        phone: existingUserData.phone,
        nickname: existingUserData.nickname,
        realName: existingUserData.realName,
        birthDate: existingUserData.birthDate,
        userType: existingUserData.userType,
        profileImage: existingUserData.profileImage,
        provider: existingUserData.provider,
        universityEmail: existingUserData.universityEmail,
        termsAgreedAt: existingUserData.termsAgreedAt,
        privacyAgreedAt: existingUserData.privacyAgreedAt,
        marketingAgreedAt: existingUserData.marketingAgreedAt,
        isActive: existingUserData.isActive,
        createdAt: existingUserData.createdAt,
        updatedAt: existingUserData.updatedAt
      } as User; // 타입 명시
      
      console.log(`SERVER: [${new Date().toISOString()}] Updating existing SNS veterinarian user profile. UserId: ${user.id}, SocialAccountId: ${existingUserData.social_account_id}`);
      
      // Update user with additional profile data
      const currentDate = new Date();
      await sql`
        UPDATE users 
        SET 
          phone = ${phone}, 
          "realName" = ${realName || name},
          nickname = ${nickname},
          "termsAgreedAt" = ${termsAgreed ? currentDate : user.termsAgreedAt},
          "privacyAgreedAt" = ${privacyAgreed ? currentDate : user.privacyAgreedAt},
          "marketingAgreedAt" = ${marketingAgreed ? currentDate : user.marketingAgreedAt},
          "updatedAt" = ${currentDate}
        WHERE id = ${user.id}
      `;
    } else {
      // Check if email already exists (non-social user)
      const existingEmailUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingEmailUser.length > 0) {
        return {
          success: false,
          error: "이미 가입된 이메일입니다.",
        };
      }

      // Create new user (this shouldn't happen with the new flow, but keeping as fallback)
      const userId = createId();
      const currentDate = new Date();

      const userResult = await sql`
        INSERT INTO users (
          id, email, phone, "passwordHash", "userType", "profileImage", provider,
          "realName", nickname,
          "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          ${userId}, ${email}, ${phone}, null, 'VETERINARIAN', ${profileImage}, ${provider.toUpperCase()},
          ${realName || name}, ${nickname},
          ${termsAgreed ? currentDate : null}, ${privacyAgreed ? currentDate : null}, ${marketingAgreed ? currentDate : null},
          true, ${currentDate}, ${currentDate}
        )
        RETURNING *
      `;

      user = userResult[0];
      
      // Create social account link for new user
      const socialAccountId = createId();
      await sql`
        INSERT INTO social_accounts (id, "userId", provider, "providerId", "accessToken", "refreshToken", "createdAt", "updatedAt")
        VALUES (${socialAccountId}, ${user.id}, ${provider.toUpperCase()}, ${providerId}, null, null, ${currentDate}, ${currentDate})
      `;
    }

    // Create veterinarian profile (only if it doesn't exist)
    const currentDate = new Date();
    
    const existingProfile = await sql`
      SELECT id FROM veterinarians WHERE "userId" = ${user.id}
    `;
    
    if (existingProfile.length === 0) {
      const profileId = createId();
      await sql`
        INSERT INTO veterinarians (
          id, "userId", "realName", nickname, "birthDate", "licenseImage", "createdAt", "updatedAt"
        )
        VALUES (
          ${profileId}, ${user.id}, ${realName || name}, ${nickname}, ${
        birthDate ? new Date(birthDate) : null
      }, ${licenseImage || null},
          ${currentDate}, ${currentDate}
        )
      `;
    } else {
      // Update existing profile
      await sql`
        UPDATE veterinarians 
        SET 
          "realName" = ${realName || name},
          nickname = ${nickname},
          "birthDate" = ${birthDate ? new Date(birthDate) : null},
          "licenseImage" = ${licenseImage || null},
          "updatedAt" = ${currentDate}
        WHERE "userId" = ${user.id}
      `;
    }

    // Generate tokens for the user
    const timestamp = new Date().toISOString();
    console.log(`SERVER: [${timestamp}] Generating tokens for user. UserId: ${user.id}, UserType: ${user.userType}`);
    
    // 토큰 생성 전 user 객체 검증 - 타입 가드 사용
    const userForToken = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };
    
    if (!validateUserForTokenGeneration(userForToken)) {
      console.error(`SERVER: [${timestamp}] Invalid user object for token generation:`, {
        hasId: !!user.id,
        hasEmail: !!user.email,
        hasUserType: !!user.userType,
        userId: user.id,
        validationDetails: {
          idType: typeof user.id,
          emailType: typeof user.email,
          userTypeType: typeof user.userType,
          emailHasAt: user.email?.includes('@')
        }
      });
      throw new Error('토큰 생성을 위한 사용자 정보가 불완전합니다.');
    }
    
    const tokens = await generateTokens(userForToken);
    console.log(`SERVER: [${timestamp}] Tokens generated successfully. TokenUserId from payload: ${user.id}`);

    // Set auth cookie
    const cookieStore = await cookies();
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    cookieStore.set("auth-token", tokens.accessToken, {
      expires: expireDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
      tokens,
    };
  } catch (error) {
    console.error(
      "SERVER: Complete social veterinarian registration error:",
      error
    );
    return {
      success: false,
      error: `소셜 수의사 회원가입 완료 실패: ${
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      }`,
    };
  }
}

export async function completeSocialVeterinaryStudentRegistration(
  data: SocialVeterinaryStudentRegistrationData
) {
  try {
    const timestamp = new Date().toISOString();
    console.log(
      `SERVER: [${timestamp}] completeSocialVeterinaryStudentRegistration called with data:`,
      {
        ...data,
        // 민감한 정보는 로그에서 제외하고 존재 여부만 표시
        email: data.email ? `[EMAIL_PROVIDED: ${data.email.length} chars]` : '[NO_EMAIL]',
        universityEmail: data.universityEmail ? `[UNIVERSITY_EMAIL_PROVIDED: ${data.universityEmail.length} chars]` : '[NO_UNIVERSITY_EMAIL]',
        phone: data.phone ? '[PHONE_PROVIDED]' : '[NO_PHONE]',
        providerId: data.providerId ? '[PROVIDER_ID_PROVIDED]' : '[NO_PROVIDER_ID]'
      }
    );

    const {
      email: socialEmail, // SNS에서 가져온 원래 이메일
      name,
      realName,
      profileImage,
      provider,
      providerId,
      nickname,
      phone,
      universityEmail,
      birthDate,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
    } = data;

    // Check if social user already exists
    const existingSocialUser = await sql`
      SELECT 
        u.id as user_id,
        u."loginId",
        u.email,
        u.phone,
        u.nickname,
        u."realName",
        u."birthDate",
        u."userType",
        u."profileImage",
        u.provider,
        u."universityEmail",
        u."termsAgreedAt",
        u."privacyAgreedAt",
        u."marketingAgreedAt",
        u."isActive",
        u."createdAt",
        u."updatedAt",
        sa.id as social_account_id,
        sa.provider as sa_provider,
        sa."providerId"
      FROM users u 
      JOIN social_accounts sa ON u.id = sa."userId" 
      WHERE sa.provider = ${provider} AND sa."providerId" = ${providerId}
    `;

    let user;

    if (existingSocialUser.length > 0) {
      // User already exists, update their profile completion data
      const existingUserData = existingSocialUser[0];
      
      // Create clean user object with proper id mapping
      user = {
        id: existingUserData.user_id, // 올바른 users.id 사용
        loginId: existingUserData.loginId,
        email: existingUserData.email,
        phone: existingUserData.phone,
        nickname: existingUserData.nickname,
        realName: existingUserData.realName,
        birthDate: existingUserData.birthDate,
        userType: existingUserData.userType,
        profileImage: existingUserData.profileImage,
        provider: existingUserData.provider,
        universityEmail: existingUserData.universityEmail,
        termsAgreedAt: existingUserData.termsAgreedAt,
        privacyAgreedAt: existingUserData.privacyAgreedAt,
        marketingAgreedAt: existingUserData.marketingAgreedAt,
        isActive: existingUserData.isActive,
        createdAt: existingUserData.createdAt,
        updatedAt: existingUserData.updatedAt
      } as User; // 타입 명시
      
      console.log(`SERVER: [${timestamp}] Updating existing SNS veterinary student user profile. UserId: ${user.id}, SocialAccountId: ${existingUserData.social_account_id}`);
      
      // Update user with additional profile data
      const currentDate = new Date();
      await sql`
        UPDATE users 
        SET 
          phone = ${phone}, 
          "realName" = ${realName || name},
          nickname = ${nickname},
          "universityEmail" = ${universityEmail},
          "termsAgreedAt" = ${termsAgreed ? currentDate : user.termsAgreedAt},
          "privacyAgreedAt" = ${privacyAgreed ? currentDate : user.privacyAgreedAt},
          "marketingAgreedAt" = ${marketingAgreed ? currentDate : user.marketingAgreedAt},
          "updatedAt" = ${currentDate}
        WHERE id = ${user.id}
      `;
    } else {
      // Check if university email already exists (as email or loginId)
      console.log(`SERVER: [${timestamp}] Checking for existing university email...`);
      const existingEmailUser = await sql`
        SELECT id FROM users WHERE email = ${universityEmail} OR "loginId" = ${universityEmail}
      `;
      console.log(`SERVER: [${timestamp}] Existing email check result: ${existingEmailUser.length} matches found`);

      if (existingEmailUser.length > 0) {
        return {
          success: false,
          error: "이미 가입된 대학교 이메일입니다.",
          details: {
            type: "DUPLICATE_EMAIL",
            field: "universityEmail",
            value: universityEmail,
            message: `${universityEmail}은 이미 사용 중인 이메일입니다. 다른 대학교 이메일을 사용하거나 기존 계정으로 로그인해주세요.`
          }
        };
      }

      // Create new user (fallback case - shouldn't happen with new flow)
      const userId = createId();
      const currentDate = new Date();

      console.log(`SERVER: [${timestamp}] Creating new user with ID: ${userId}`);
      console.log(`SERVER: [${timestamp}] User data - loginId: ${universityEmail}, email: ${socialEmail}, userType: VETERINARY_STUDENT`);
      
      const userResult = await sql`
        INSERT INTO users (
          id, "loginId", email, phone, nickname, "realName", "birthDate", "passwordHash", "userType", "profileImage", provider,
          "universityEmail", 
          "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt", "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          ${userId}, ${universityEmail}, ${socialEmail}, ${phone}, ${nickname}, ${realName || name}, ${birthDate ? new Date(birthDate) : null}, null, 'VETERINARY_STUDENT', ${profileImage}, ${provider.toUpperCase()},
          ${universityEmail},
          ${termsAgreed ? currentDate : null}, ${privacyAgreed ? currentDate : null}, ${marketingAgreed ? currentDate : null},
          true, ${currentDate}, ${currentDate}
        )
        RETURNING *
      `;
      
      console.log(`SERVER: [${timestamp}] User created successfully with ID: ${userId}`);
      user = userResult[0];

      // Create social account link for new user
      const socialAccountId = createId();
      console.log(`SERVER: [${timestamp}] Creating social account link with ID: ${socialAccountId}`);
      await sql`
        INSERT INTO social_accounts (id, "userId", provider, "providerId", "accessToken", "refreshToken", "createdAt", "updatedAt")
        VALUES (${socialAccountId}, ${user.id}, ${provider.toUpperCase()}, ${providerId}, null, null, ${currentDate}, ${currentDate})
      `;
      console.log(`SERVER: [${timestamp}] Social account link created successfully`);
    }

    // Create or update veterinary student profile
    const currentDate = new Date();
    
    const existingProfile = await sql`
      SELECT id FROM veterinary_students WHERE "userId" = ${user.id}
    `;
    
    if (existingProfile.length === 0) {
      const profileId = createId();
      console.log(`SERVER: [${timestamp}] Creating veterinary student profile with ID: ${profileId}`);
      await sql`
        INSERT INTO veterinary_students (
          id, "userId", "realName", nickname, "birthDate", "universityEmail",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${profileId}, ${user.id}, ${realName || name}, ${nickname}, ${birthDate ? new Date(birthDate) : null}, ${universityEmail}, ${currentDate}, ${currentDate}
        )
      `;
      console.log(`SERVER: [${timestamp}] Veterinary student profile created successfully`);
    } else {
      console.log(`SERVER: [${timestamp}] Updating existing veterinary student profile`);
      await sql`
        UPDATE veterinary_students 
        SET 
          "realName" = ${realName || name},
          nickname = ${nickname},
          "birthDate" = ${birthDate ? new Date(birthDate) : null},
          "universityEmail" = ${universityEmail},
          "updatedAt" = ${currentDate}
        WHERE "userId" = ${user.id}
      `;
      console.log(`SERVER: [${timestamp}] Veterinary student profile updated successfully`);
    }

    // Generate tokens for the user
    console.log(`SERVER: [${timestamp}] Generating tokens for user. UserId: ${user.id}, UserType: ${user.userType}`);
    
    // 토큰 생성 전 user 객체 검증 - 타입 가드 사용
    const userForToken = {
      id: user.id,
      email: user.email,
      userType: user.userType
    };
    
    if (!validateUserForTokenGeneration(userForToken)) {
      console.error(`SERVER: [${timestamp}] Invalid user object for token generation:`, {
        hasId: !!user.id,
        hasEmail: !!user.email,
        hasUserType: !!user.userType,
        userId: user.id,
        validationDetails: {
          idType: typeof user.id,
          emailType: typeof user.email,
          userTypeType: typeof user.userType,
          emailHasAt: user.email?.includes('@')
        }
      });
      throw new Error('토큰 생성을 위한 사용자 정보가 불완전합니다.');
    }
    
    const tokens = await generateTokens(userForToken);
    console.log(`SERVER: [${timestamp}] Tokens generated successfully. TokenUserId from payload: ${user.id}`);

    // Set auth cookie
    const cookieStore = await cookies();
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    cookieStore.set("auth-token", tokens.accessToken, {
      expires: expireDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
      tokens,
    };
  } catch (error) {
    console.error(
      "SERVER: Complete social veterinary student registration error:",
      error
    );
    
    // 데이터베이스 관련 에러를 더 구체적으로 분류
    let errorMessage = "알 수 없는 오류가 발생했습니다.";
    let errorType = "UNKNOWN_ERROR";
    let errorDetails = {};
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('duplicate key') || errorMsg.includes('unique constraint')) {
        if (errorMsg.includes('email')) {
          errorMessage = "이미 사용 중인 이메일입니다.";
          errorType = "DUPLICATE_EMAIL";
          errorDetails = { field: "email" };
        } else if (errorMsg.includes('loginid')) {
          errorMessage = "이미 사용 중인 로그인 ID입니다.";
          errorType = "DUPLICATE_LOGIN_ID";
          errorDetails = { field: "loginId" };
        } else {
          errorMessage = "중복된 정보가 있습니다.";
          errorType = "DUPLICATE_DATA";
        }
      } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        errorMessage = "데이터베이스 구조 오류가 발생했습니다.";
        errorType = "DATABASE_SCHEMA_ERROR";
        errorDetails = { technical: error.message };
      } else if (errorMsg.includes('relation') && errorMsg.includes('does not exist')) {
        errorMessage = "데이터베이스 테이블 오류가 발생했습니다.";
        errorType = "DATABASE_TABLE_ERROR";
        errorDetails = { technical: error.message };
      } else if (errorMsg.includes('connection') || errorMsg.includes('timeout')) {
        errorMessage = "데이터베이스 연결에 실패했습니다.";
        errorType = "DATABASE_CONNECTION_ERROR";
      } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        errorMessage = "데이터베이스 접근 권한 오류가 발생했습니다.";
        errorType = "DATABASE_PERMISSION_ERROR";
      } else {
        errorMessage = error.message;
        errorType = "DATABASE_ERROR";
      }
    }
    
    return {
      success: false,
      error: `소셜 수의학과 학생 회원가입 완료 실패: ${errorMessage}`,
      details: {
        type: errorType,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        ...errorDetails
      }
    };
  }
}

// 프로필 업데이트 Server Action
export async function updateVeterinarianProfile(formData: FormData) {
  console.log("=== Server Action: updateVeterinarianProfile 호출됨 ===");

  try {
    // 현재 사용자 인증 확인
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return { success: false, error: "인증 토큰이 없습니다." };
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    console.log("[Server Action] 사용자 ID:", userId);

    // FormData에서 데이터 추출
    const profileData: any = {
      realName: formData.get("realName") as string,
      nickname: formData.get("nickname") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      birthDate: formData.get("birthDate") as string,
    };

    // 프로필 이미지 처리
    const profileImageUrl = formData.get("profileImage") as string;
    if (
      profileImageUrl &&
      profileImageUrl !== "undefined" &&
      profileImageUrl !== "null"
    ) {
      console.log("[Server Action] 프로필 이미지 URL:", profileImageUrl);
      profileData.profileImage = profileImageUrl;
    }

    // 면허증 이미지 처리
    const licenseImageUrl = formData.get("licenseImage") as string;
    if (
      licenseImageUrl &&
      licenseImageUrl !== "undefined" &&
      licenseImageUrl !== "null"
    ) {
      console.log("[Server Action] 라이센스 이미지 URL:", licenseImageUrl);
      profileData.licenseImage = licenseImageUrl;
    }

    // 비밀번호 변경 처리
    const password = formData.get("password") as string;
    if (password && password.trim() !== "") {
      console.log("[Server Action] 비밀번호 변경 요청");
      const passwordHash = await bcrypt.hash(password, 12);
      profileData.passwordHash = passwordHash;
    }

    console.log("[Server Action] 업데이트할 데이터:", profileData);

    // SQL 쿼리 동적 생성
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(profileData)) {
      if (value !== undefined && value !== null && value !== "") {
        // Snake case로 변환 (camelCase -> snake_case)
        const dbKey =
          key === "realName"
            ? "realName"
            : key === "profileImage"
            ? "profileImage"
            : key === "licenseImage"
            ? "licenseImage"
            : key === "passwordHash"
            ? "passwordHash"
            : key === "birthDate"
            ? "birthDate"
            : key;

        updateFields.push(`"${dbKey}" = $${paramIndex++}`);
        updateValues.push(
          key === "birthDate" ? new Date(value as string) : value
        );
        console.log(`[Server Action] Will update ${dbKey} to:`, value);
      }
    }

    if (updateFields.length === 0) {
      return { success: false, error: "업데이트할 데이터가 없습니다." };
    }

    // updatedAt 필드 추가
    updateFields.push(`"updatedAt" = $${paramIndex++}`);
    updateValues.push(new Date());

    // 사용자 ID 추가 (WHERE 조건용)
    updateValues.push(userId);

    // SQL 쿼리 실행
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
    `;

    console.log("[Server Action] SQL 쿼리:", updateQuery);
    console.log("[Server Action] SQL 값들:", updateValues);

    const result = await sql.query(updateQuery, updateValues);

    console.log("[Server Action] 업데이트 결과:", result);

    return {
      success: true,
      message: "프로필이 성공적으로 수정되었습니다.",
    };
  } catch (error) {
    console.error("[Server Action] 프로필 업데이트 오류:", error);
    return {
      success: false,
      error: `프로필 수정 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`,
    };
  }
}
