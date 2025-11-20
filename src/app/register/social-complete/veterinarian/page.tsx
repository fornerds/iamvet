"use client";

import { SocialRegistrationForm } from "@/components/features/auth/SocialRegistrationForm";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { completeSocialVeterinarianRegistration } from "@/actions/auth";
import { useState, useEffect } from "react";

export default function VeterinarianSocialCompletePage() {
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
    kakaoTalkUuid: searchParams.get("kakaoTalkUuid") || undefined,
  };

  // 소셜 데이터 유효성 검사
  const isDataValid = socialData.email && socialData.name && socialData.provider && socialData.providerId;

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
      // 수의사 소셜 회원가입 완료 데이터 구성
      const registrationData = {
        email: socialData.email,
        name: formData.realName,
        profileImage: socialData.profileImage,
        provider: socialData.provider,
        providerId: socialData.providerId,
        nickname: formData.nickname,
        phone: formData.phone,
        birthDate: formData.birthDate,
        licenseImage: formData.licenseImage || "",
        termsAgreed: formData.agreements.terms,
        privacyAgreed: formData.agreements.privacy,
        marketingAgreed: formData.agreements.marketing,
        kakaoTalkUuid: socialData.kakaoTalkUuid, // 카카오톡 UUID 추가
      };

      console.log("수의사 소셜 회원가입 데이터:", registrationData);

      const result = await completeSocialVeterinarianRegistration(registrationData);

      if (result.success) {
        alert("회원가입이 완료되었습니다!");
        router.push("/login/veterinarian");
      } else {
        alert(result.error || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      console.error("회원가입 오류:", error);
      alert("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/login/veterinarian");
  };

  return (
    <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full">
        {/* 헤더 */}
        <div className="flex flex-col mb-8 gap-[10px]">
          <Link href="/login/veterinarian" className="mr-4">
            <ArrowLeftIcon currentColor="#000" />
          </Link>
          <h1 className="font-title text-[36px] title-light text-primary">
            수의사 회원가입
          </h1>
          <p className="text-[16px] text-gray-600 mt-2">
            SNS 로그인 후 추가 정보를 입력해 주세요.
          </p>
        </div>

        {/* 회원가입 폼 */}
        <SocialRegistrationForm
          userType="veterinarian"
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
