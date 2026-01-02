import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApiResponse, createErrorResponse } from "@/lib/utils";

// 이메일/아이디 마스킹 함수
function maskEmail(email: string): string {
  if (!email) return "";
  const [localPart, domain] = email.split("@");
  if (!domain) return email; // @가 없는 경우 그대로 반환
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  const visibleChars = Math.min(2, Math.floor(localPart.length / 2));
  const maskedPart = localPart.substring(0, visibleChars) + "***" + localPart.substring(localPart.length - 1);
  return `${maskedPart}@${domain}`;
}

// 로그인 ID 마스킹 함수
function maskLoginId(loginId: string): string {
  if (!loginId) return "";
  if (loginId.length <= 2) {
    return `${loginId[0]}***`;
  }
  const visibleChars = Math.min(2, Math.floor(loginId.length / 2));
  const maskedPart = loginId.substring(0, visibleChars) + "***" + loginId.substring(loginId.length - 1);
  return maskedPart;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, userType } = body;

    // 전화번호 검증
    if (!phone) {
      return NextResponse.json(
        createErrorResponse("연락처를 입력해주세요."),
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 (하이픈 포함/미포함 모두 허용)
    const phoneRegex = /^[0-9-]+$/;
    const cleanPhone = phone.replace(/-/g, "");
    
    if (!phoneRegex.test(phone) || cleanPhone.length < 10) {
      return NextResponse.json(
        createErrorResponse("올바른 연락처 형식을 입력해주세요."),
        { status: 400 }
      );
    }

    // 사용자 타입 검증
    const validUserTypes = ["VETERINARIAN", "HOSPITAL", "VETERINARY_STUDENT"];
    const normalizedUserType = userType ? userType.toUpperCase() : undefined;
    
    if (normalizedUserType && !validUserTypes.includes(normalizedUserType)) {
      return NextResponse.json(
        createErrorResponse("유효하지 않은 사용자 타입입니다."),
        { status: 400 }
      );
    }

    // 데이터베이스에서 사용자 조회
    // phone 필드는 하이픈 포함/미포함 모두 검색 가능하도록 처리
    const users = await prisma.users.findMany({
      where: {
        deletedAt: null, // 삭제되지 않은 계정만
        ...(normalizedUserType && { userType: normalizedUserType }),
        OR: [
          { phone: cleanPhone },
          { phone: phone }, // 원본 형식도 검색
          // 하이픈이 포함된 경우도 검색
          ...(cleanPhone.length === 11 ? [
            { phone: `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}` },
            { phone: `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}` },
          ] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        loginId: true,
        userType: true,
        phone: true,
      },
    });

    // 정확히 일치하는 사용자 찾기 (phone 필드 정규화)
    const user = users.find(u => {
      const userPhone = u.phone?.replace(/-/g, "") || "";
      return userPhone === cleanPhone;
    });

    // 보안상 이유로 사용자가 존재하지 않아도 동일한 응답 형식 반환
    if (!user) {
      return NextResponse.json(
        createErrorResponse("해당 연락처로 등록된 계정을 찾을 수 없습니다."),
        { status: 404 }
      );
    }

    // 아이디 마스킹 처리
    const maskedEmail = user.email ? maskEmail(user.email) : null;
    const maskedLoginId = user.loginId ? maskLoginId(user.loginId) : null;

    // 응답 데이터 구성
    const result: {
      email?: string;
      loginId?: string;
    } = {};

    if (maskedEmail) {
      result.email = maskedEmail;
    }
    if (maskedLoginId) {
      result.loginId = maskedLoginId;
    }

    return NextResponse.json(
      createApiResponse("success", "아이디를 찾았습니다.", result)
    );

  } catch (error) {
    console.error("Find username error:", error);
    return NextResponse.json(
      createErrorResponse("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."),
      { status: 500 }
    );
  }
}

