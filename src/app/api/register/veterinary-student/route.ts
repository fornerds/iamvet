// src/app/api/register/veterinary-student/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { VeterinaryStudentRegisterData } from "@/actions/auth";
import { uploadFile } from "@/lib/s3"; // S3 업로드 함수
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const loginId = formData.get("loginId") as string;
    const username = formData.get("username") as string; // 기존 호환성
    const password = formData.get("password") as string;
    const nickname = formData.get("nickname") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const universityEmail = formData.get("universityEmail") as string;
    const realName = formData.get("realName") as string;

    // loginId 우선, 없으면 username 사용 (기존 호환성)
    const actualLoginId = loginId || username;
    const birthDate = formData.get("birthDate") as string;
    const termsAgreed = formData.get("termsAgreed") === "true";
    const privacyAgreed = formData.get("privacyAgreed") === "true";
    const marketingAgreed = formData.get("marketingAgreed") === "true";
    const profileImage = formData.get("profileImage") as File | null;

    console.log("API: 수의학과 학생 회원가입 요청 받음:", {
      username,
      email,
      universityEmail,
      nickname,
      phone,
      realName,
      birthDate,
      termsAgreed,
      privacyAgreed,
      marketingAgreed,
      profileImageExists: !!profileImage,
    });

    // 필수 필드 검증
    if (
      !actualLoginId ||
      !password ||
      !email ||
      !universityEmail ||
      !nickname ||
      !phone ||
      !birthDate
    ) {
      return NextResponse.json(
        createErrorResponse("필수 정보가 누락되었습니다"),
        { status: 400 }
      );
    }

    // 약관 동의 검증
    if (!termsAgreed || !privacyAgreed) {
      return NextResponse.json(
        createErrorResponse("필수 약관에 동의해주세요"),
        { status: 400 }
      );
    }

    // 대학교 이메일 도메인 검증
    const { VETERINARY_UNIVERSITY_DOMAIN_VALUES } = await import("@/constants/universityDomains");

    const domain = universityEmail.split("@")[1]?.toLowerCase();
    const isValidUniversityEmail = VETERINARY_UNIVERSITY_DOMAIN_VALUES.some((uniDomain) =>
      domain?.endsWith(uniDomain)
    );

    if (!isValidUniversityEmail) {
      return NextResponse.json(
        createErrorResponse("인증된 대학교 이메일을 사용해주세요"),
        { status: 400 }
      );
    }

    // 사용자 중복 검사
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${actualLoginId} OR "loginId" = ${actualLoginId} OR email = ${email} OR phone = ${phone}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        createErrorResponse("이미 가입된 아이디, 이메일 또는 전화번호입니다"),
        { status: 409 }
      );
    }

    // 대학교 이메일 중복 검사
    const existingUniversityEmail = await sql`
      SELECT id FROM veterinary_students WHERE "universityEmail" = ${universityEmail}
    `;

    if (existingUniversityEmail.length > 0) {
      return NextResponse.json(
        createErrorResponse("이미 가입된 대학교 이메일입니다"),
        { status: 409 }
      );
    }

    // 프로필 이미지 업로드 (있는 경우)
    let profileImageUrl: string | undefined;
    if (profileImage && profileImage.size > 0) {
      try {
        profileImageUrl = await uploadFile(profileImage, "profiles");
        console.log("API: 프로필 이미지 업로드 성공:", profileImageUrl);
      } catch (uploadError) {
        console.error("API: 프로필 이미지 업로드 실패:", uploadError);
        return NextResponse.json(
          createErrorResponse("프로필 이미지 업로드에 실패했습니다"),
          { status: 500 }
        );
      }
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const userId = createId();
    const user = await sql`
      INSERT INTO users (
        id, username, "loginId", nickname, email, phone, "realName", "passwordHash", "userType", "profileImage",
        provider, "isActive", "termsAgreedAt", "privacyAgreedAt", "marketingAgreedAt"
      ) VALUES (
        ${userId}, ${actualLoginId}, ${actualLoginId}, ${nickname}, ${email}, ${phone}, ${realName}, ${hashedPassword}, 
        'VETERINARY_STUDENT', ${profileImageUrl}, 'NORMAL', false,
        ${termsAgreed ? new Date() : null},
        ${privacyAgreed ? new Date() : null}, 
        ${marketingAgreed ? new Date() : null}
      )
      RETURNING id, username, email, "userType"
    `;

    // 수의학과 학생 프로필 생성
    const profileId = createId();
    await sql`
      INSERT INTO veterinary_students (
        id, "userId", "realName", nickname, "birthDate", "universityEmail", "createdAt", "updatedAt"
      ) VALUES (
        ${profileId}, ${userId}, ${realName}, ${nickname}, ${
      birthDate ? new Date(birthDate) : null
    }, ${universityEmail}, NOW(), NOW()
      )
    `;

    // 마지막 로그인 시간 업데이트
    await sql`
      UPDATE users SET "lastLoginAt" = CURRENT_TIMESTAMP WHERE id = ${userId}
    `;

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId,
        email,
        userType: "VETERINARY_STUDENT",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      createApiResponse("success", "수의학과 학생 회원가입이 완료되었습니다", {
        userId,
        username,
        email,
        userType: "VETERINARY_STUDENT",
      })
    );

    // 쿠키 설정
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7일
    });

    return response;
  } catch (error) {
    console.error("수의학과 학생 회원가입 API 오류:", error);
    return NextResponse.json(
      createErrorResponse("회원가입 처리 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}
