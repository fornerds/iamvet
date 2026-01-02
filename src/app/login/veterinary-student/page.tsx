"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Button } from "@/components/ui/Button";
import { SocialLoginButton } from "@/components/ui/SocialLoginButton";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "@/hooks/api/useAuth";
import { useRouter } from "next/navigation";

export default function VeterinaryStudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setError("");

    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
        userType: "VETERINARY_STUDENT",
      });

      if (result.success) {
        // 로그인 성공 시 대시보드로 이동
        router.push("/dashboard/veterinarian");
      } else {
        // 로그인 실패 시 alert 표시
        alert("아이디 또는 비밀번호를 다시 확인해주세요.");
        setError((result as { success: false; error: string }).error || "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("로그인 중 오류가 발생했습니다.");
    }
  };

  const handleSocialLogin = (provider: "google" | "kakao" | "naver") => {
    // Direct redirect instead of using popup-based hooks
    const baseUrl = window.location.origin;
    const socialLoginUrl = `${baseUrl}/api/auth/${provider}/login?userType=veterinary-student`;

    // Force redirect in current window
    window.location.href = socialLoginUrl;
  };

  return (
    <>
      <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full">
          {/* 헤더 */}
          <div className="flex flex-col mb-8 gap-[10px]">
            <Link href="/member-select" className="mr-4">
              <ArrowLeftIcon currentColor="#000" />
            </Link>
            <h1 className="font-title text-[36px] titie-light text-primary">
              수의학과 학생 로그인
            </h1>
          </div>

          {/* 로그인 폼 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-6"
          >
            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* 아이디 입력 */}
            <div>
              <label className="block text-[20px] text-medium text-[#3B394D] mb-3">
                아이디
              </label>
              <InputBox
                value={email}
                onChange={setEmail}
                placeholder="아이디를 입력해주세요"
                type="text"
                clearable={false}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-[20px] text-medium text-[#3B394D] mb-3">
                비밀번호
              </label>
              <InputBox
                value={password}
                onChange={setPassword}
                placeholder="비밀번호를 입력해주세요"
                type="password"
                clearable={false}
              />
            </div>

            {/* 로그인 버튼 */}
            <Button
              variant="keycolor"
              type="submit"
              fullWidth={true}
              className="mt-8"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인"}
            </Button>

            {/* 링크들 */}
            <div className="flex justify-between items-center text-[14px] mt-4">
              <div className="flex gap-3">
                <Link href="/find-username?userType=veterinary-student" className="text-[#9098A4] underline">
                  아이디 찾기
                </Link>
                <Link href="/find-password" className="text-[#9098A4] underline">
                  비밀번호 찾기
                </Link>
              </div>
              <Link
                href="/register/veterinary-student"
                className="text-[#FF8796] underline"
              >
                회원가입
              </Link>
            </div>

            {/* 구분선 */}
            <div className="flex items-center mt-[50px]">
              <div className="flex-1 h-px bg-[#E5E5E5]"></div>
              <span className="px-4 text-[14px] text-[#9098A4]">
                소셜 계정으로 간편 로그인
              </span>
              <div className="flex-1 h-px bg-[#E5E5E5]"></div>
            </div>

            {/* SNS 로그인 버튼들 */}
            <div className="flex flex-col md:grid md:grid-cols-3 gap-3">
              <SocialLoginButton
                type="naver"
                onClick={() => handleSocialLogin("naver")}
              />
              <SocialLoginButton
                type="kakao"
                onClick={() => handleSocialLogin("kakao")}
              />
              <SocialLoginButton
                type="google"
                onClick={() => handleSocialLogin("google")}
              />
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
