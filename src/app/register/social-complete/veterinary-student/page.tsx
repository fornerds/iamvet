"use client";

import { SocialRegistrationForm } from "@/components/features/auth/SocialRegistrationForm";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { completeSocialVeterinaryStudentRegistration } from "@/actions/auth";
import { useState, useEffect } from "react";

export default function VeterinaryStudentSocialCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL에서 소셜 데이터 추출
  const socialData = {
    email: searchParams.get("email") || "",
    name: searchParams.get("name") || "",
    profileImage: searchParams.get("profileImage") || undefined,
    provider: searchParams.get("provider") || "",
    providerId: searchParams.get("providerId") || "",
  };

  // 소셜 데이터 유효성 검사
  const isDataValid =
    socialData.email &&
    socialData.name &&
    socialData.provider &&
    socialData.providerId;

  useEffect(() => {
    if (!isDataValid) {
      router.replace("/");
    }
  }, [isDataValid, router]);

  if (!isDataValid) {
    return null;
  }

  const handleSubmit = async (formData: any) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 수의학과 학생 소셜 회원가입 완료 데이터 구성
      const registrationData = {
        email: socialData.email,
        name: formData.realName,
        profileImage: socialData.profileImage,
        provider: socialData.provider,
        providerId: socialData.providerId,
        nickname: formData.nickname,
        phone: formData.phone,
        universityEmail: formData.email,
        birthDate: formData.birthDate,
        termsAgreed: formData.agreements.terms,
        privacyAgreed: formData.agreements.privacy,
        marketingAgreed: formData.agreements.marketing,
      };

      console.log("수의학과 학생 소셜 회원가입 데이터:", registrationData);

      const result = await completeSocialVeterinaryStudentRegistration(
        registrationData
      );

      if (result.success) {
        alert("회원가입이 완료되었습니다!");
        router.push("/login/veterinary-student");
      } else {
        // 구체적인 에러 메시지 처리
        let userMessage = result.error || "회원가입에 실패했습니다.";

        if (result.details) {
          const { type, message } = result.details;

          switch (type) {
            case "DUPLICATE_EMAIL":
              userMessage = `이미 사용 중인 이메일입니다.\n다른 대학교 이메일을 사용하거나 기존 계정으로 로그인해주세요.`;
              break;
            case "DUPLICATE_LOGIN_ID":
              userMessage = `이미 사용 중인 로그인 ID입니다.\n다른 로그인 ID를 사용해주세요.`;
              break;
            case "DATABASE_SCHEMA_ERROR":
            case "DATABASE_TABLE_ERROR":
              userMessage = `시스템에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.`;
              console.error("Database error:", result.details);
              break;
            case "DATABASE_CONNECTION_ERROR":
              userMessage = `서버 연결에 문제가 발생했습니다.\n네트워크 연결을 확인하고 다시 시도해주세요.`;
              break;
            default:
              userMessage = message || userMessage;
          }
        }

        alert(userMessage);
      }
    } catch (error) {
      console.error("회원가입 오류:", error);

      // 에러의 구체적인 정보를 파악하여 사용자에게 전달
      let errorMessage = "회원가입 중 오류가 발생했습니다.";
      let errorDetails = "";

      if (error instanceof Error) {
        // 네트워크 에러
        if (
          error.message.includes("fetch") ||
          error.message.includes("network")
        ) {
          errorMessage = "서버 연결에 실패했습니다.";
          errorDetails = "네트워크 연결을 확인하고 다시 시도해주세요.";
        }
        // 서버 응답 에러
        else if (error.message.includes("500")) {
          errorMessage = "서버 내부 오류가 발생했습니다.";
          errorDetails = "잠시 후 다시 시도해주세요.";
        }
        // 권한 에러
        else if (
          error.message.includes("401") ||
          error.message.includes("403")
        ) {
          errorMessage = "인증에 실패했습니다.";
          errorDetails = "다시 로그인 후 시도해주세요.";
        }
        // 기타 에러
        else {
          errorDetails = `오류 내용: ${error.message}`;
        }
      }

      // 에러 리포팅을 위한 정보 수집
      const errorReport = {
        timestamp: new Date().toISOString(),
        page: "VeterinaryStudentSocialCompletePage",
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : "Unknown",
        url: typeof window !== "undefined" ? window.location.href : "Unknown",
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : "No stack trace",
          name: error instanceof Error ? error.name : "Unknown",
        },
        formData: {
          // 민감한 정보 제외하고 디버깅에 필요한 정보만
          provider: socialData.provider,
          hasEmail: !!socialData.email,
          hasUniversityEmail: !!formData.email,
          hasNickname: !!formData.nickname,
          hasPhone: !!formData.phone,
          hasBirthDate: !!formData.birthDate,
          termsAgreed: formData.agreements?.terms,
          privacyAgreed: formData.agreements?.privacy,
        },
      };

      // 개발 환경에서는 더 상세한 에러 정보 표시
      if (process.env.NODE_ENV === "development") {
        console.log("=== 개발환경 에러 디버깅 ===");
        console.log("에러 리포트:", errorReport);

        const copyErrorInfo = () => {
          navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
        };

        if (
          confirm(
            `${errorMessage}\n\n개발자 정보:\n${errorDetails}\n\n에러 정보를 클립보드에 복사하시겠습니까?`
          )
        ) {
          try {
            copyErrorInfo();
            alert("에러 정보가 클립보드에 복사되었습니다.");
          } catch (e) {
            console.log("클립보드 복사 실패:", e);
          }
        }
      } else {
        // 운영 환경에서는 간단한 에러 ID와 함께 표시
        const errorId = `ERR_${Date.now()}`;
        console.error(`Error ID: ${errorId}`, errorReport);

        alert(
          `${errorMessage}\n${errorDetails}\n\n문제가 지속되면 고객센터에 다음 에러 ID를 알려주세요:\n${errorId}`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/login/veterinary-student");
  };

  return (
    <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full">
        {/* 헤더 */}
        <div className="flex flex-col mb-8 gap-[10px]">
          <Link href="/login/veterinary-student" className="mr-4">
            <ArrowLeftIcon currentColor="#000" />
          </Link>
          <h1 className="font-title text-[36px] title-light text-primary">
            수의학과 학생 회원가입
          </h1>
          <p className="text-[16px] text-gray-600 mt-2">
            SNS 로그인 후 추가 정보를 입력해 주세요.
          </p>
        </div>

        {/* 회원가입 폼 */}
        <SocialRegistrationForm
          userType="veterinary-student"
          socialData={socialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {isSubmitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <p className="text-center">회원가입 중...</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
