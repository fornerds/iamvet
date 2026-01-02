"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "@/hooks/api/useAuth";
import { useRouter } from "next/navigation";

export default function HospitalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const loginMutation = useLogin();

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
        userType: "HOSPITAL",
      });

      if (result.success) {
        // 로그인 성공 시 대시보드로 이동
        router.push("/dashboard/hospital");
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

  return (
    <>
      <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full">
          {/* 헤더 */}
          <div className="flex flex-col mb-8 gap-[10px]">
            <Link href="/member-select" className="mr-4">
              <ArrowLeftIcon currentColor="#000" />
            </Link>
            <h1 className="font-title text-[28px] titie-light text-[#3B394D]">
              병원 로그인
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
                <Link href="/find-username?userType=hospital" className="text-[#9098A4] underline">
                  아이디 찾기
                </Link>
                <Link href="/find-password" className="text-[#9098A4] underline">
                  비밀번호 찾기
                </Link>
              </div>
              <Link
                href="/register/hospital"
                className="text-[#FF8796] underline"
              >
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
