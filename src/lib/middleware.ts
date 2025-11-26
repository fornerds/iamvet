// src/lib/middleware.ts - API 미들웨어
import { NextRequest, NextResponse } from "next/server";
import type { BaseResponse } from "./types";
import { createApiResponse, createErrorResponse, validateEmail } from "./types";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";

export const withAuth = (handler: Function) => {
  return async (request: NextRequest, ...args: any[]) => {
    console.log(`=== withAuth: ${request.method} ${request.url} ===`);
    try {
      let token: string | null = null;
      let payload: any = null;

      // 1. Authorization 헤더에서 토큰 확인 (기존 방식)
      const authorization = request.headers.get("authorization");
      if (authorization && authorization.startsWith("Bearer ")) {
        token = authorization.slice(7);
        payload = verifyToken(token);
      }

      // 2. 쿠키에서 토큰 확인 (새로운 방식)
      if (!payload) {
        const cookieToken = request.cookies.get("auth-token")?.value;
        if (cookieToken) {
          payload = verifyToken(cookieToken);
        }
      }

      if (!payload) {
        console.log('withAuth: 인증 실패 - 토큰이나 페이로드가 없음');
        return NextResponse.json(createErrorResponse("인증이 필요합니다"), {
          status: 401,
        });
      }

      // 사용자 존재 여부 확인 (외래키 제약조건 위반 방지)
      let user = await (prisma as any).users.findUnique({
        where: { 
          id: payload.userId,
        }
      });

      if (!user) {
        console.log('withAuth: 사용자 없음 - DB에서 userId를 찾을 수 없음:', payload.userId);
        
        // 특별 처리: social_accounts.id가 잘못 토큰에 들어간 경우 복구 시도
        try {
          // 혹시 payload.userId가 social_accounts.id인지 확인
          const socialAccount = await (prisma as any).social_accounts.findUnique({
            where: { id: payload.userId },
            include: {
              user: true
            }
          });
          
          if (socialAccount && socialAccount.user) {
            console.log('withAuth: social_accounts.id로 토큰이 생성된 케이스 발견 - 올바른 사용자로 매핑:', {
              socialAccountId: payload.userId,
              actualUserId: socialAccount.user.id,
              userEmail: socialAccount.user.email
            });
            
            // 올바른 사용자 정보로 교체
            user = socialAccount.user;
            
            // 요청 객체의 user 정보도 올바른 userId로 수정
            payload.userId = user.id;
          } else {
            // 일반 SNS 계정 복구 시도 (userId로 social_accounts 찾기)
            const socialAccountByUserId = await (prisma as any).social_accounts.findFirst({
              where: { userId: payload.userId }
            });
            
            if (socialAccountByUserId) {
              console.log('withAuth: SNS 계정 발견 - 사용자 복구 시도:', socialAccountByUserId);
              // SNS 계정이 있지만 users 테이블에 없는 경우 - 로그아웃 처리
              return NextResponse.json(createErrorResponse("계정 정보가 불완전합니다. 다시 로그인해주세요."), {
                status: 401,
                headers: {
                  'Set-Cookie': 'auth-token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict'
                }
              });
            }
          }
        } catch (error) {
          console.error('withAuth: SNS 계정 확인 중 오류:', error);
        }
        
        if (!user) {
          return NextResponse.json(createErrorResponse("유효하지 않은 사용자입니다"), {
            status: 401,
          });
        }
      }

      // 디버깅 로그
      console.log('withAuth: 인증 성공', {
        userId: payload.userId,
        userType: payload.userType,
        hasToken: !!token,
        userExists: !!user,
        isActive: user.isActive
      });

      // 요청 객체에 사용자 정보 추가
      (request as any).user = payload;
      (request as any).userData = user; // 실제 DB 사용자 데이터도 추가

      return handler(request, ...args);
    } catch (error) {
      console.error("withAuth middleware error:", error);
      return NextResponse.json(
        createErrorResponse("인증 처리 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  };
};

// 관리자 인증이 필요한 작업을 위한 미들웨어 (isActive 체크)
// withAuth를 먼저 실행한 후 isActive를 체크
export const withAdminVerification = (handler: Function) => {
  return withAuth(async (request: NextRequest, ...args: any[]) => {
    try {
      const userData = (request as any).userData;
      
      if (!userData) {
        return NextResponse.json(
          createErrorResponse("사용자 정보를 찾을 수 없습니다"),
          { status: 401 }
        );
      }

      // 관리자 인증 확인 (isActive가 false이면 관리자 인증 미완료)
      if (!userData.isActive) {
        return NextResponse.json(
          {
            status: "info",
            message: "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.",
            data: { requiresAdminVerification: true },
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      return handler(request, ...args);
    } catch (error) {
      console.error("withAdminVerification middleware error:", error);
      return NextResponse.json(
        createErrorResponse("인증 처리 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  });
};

export const withValidation = (schema: any) => {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      try {
        const body = await request.json();

        // 간단한 검증 (실제로는 Zod, Joi 등 사용 권장)
        const errors = validateSchema(body, schema);
        if (errors.length > 0) {
          return NextResponse.json(
            createErrorResponse("입력값이 올바르지 않습니다", { errors }),
            { status: 400 }
          );
        }

        return handler(request, ...args);
      } catch (error) {
        return NextResponse.json(
          createErrorResponse("요청 처리 중 오류가 발생했습니다"),
          { status: 400 }
        );
      }
    };
  };
};

const validateSchema = (data: any, schema: any): string[] => {
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];
    const ruleList = rules as any;

    if (
      ruleList.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${key}은(는) 필수 항목입니다`);
    }

    if (value && ruleList.type === "email" && !validateEmail(value)) {
      errors.push(`${key}은(는) 올바른 이메일 형식이어야 합니다`);
    }

    if (value && ruleList.minLength && value.length < ruleList.minLength) {
      errors.push(
        `${key}은(는) 최소 ${ruleList.minLength}자 이상이어야 합니다`
      );
    }
  }

  return errors;
};
