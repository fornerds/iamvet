"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FindUsernamePage() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [error, setError] = useState("");
  const [foundData, setFoundData] = useState<{
    email?: string;
    loginId?: string;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = searchParams.get("userType") || "";

  const handleFindUsername = async () => {
    if (!phone) {
      setError("연락처를 입력해주세요.");
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^[0-9-]+$/;
    const cleanPhone = phone.replace(/-/g, "");
    
    if (!phoneRegex.test(phone) || cleanPhone.length < 10) {
      setError("올바른 연락처 형식을 입력해주세요.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/find-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          phone: cleanPhone,
          userType: userType || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        setFoundData(result.data || {});
        setIsFound(true);
      } else {
        setError(result.message || "아이디 찾기에 실패했습니다.");
      }
    } catch (error) {
      console.error("Find username error:", error);
      setError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 전화번호 포맷팅 (자동으로 하이픈 추가)
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
  };

  if (isFound) {
    return (
      <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
        <div className="flex-1 max-w-md mx-auto w-full">
          {/* 헤더 */}
          <div className="flex flex-col mb-8 gap-[10px]">
            <Link href="/member-select" className="mr-4">
              <ArrowLeftIcon currentColor="#000" />
            </Link>
            <h1 className="font-title text-[36px] title-light text-primary">
              아이디 찾기
            </h1>
          </div>

          {/* 아이디 찾기 완료 메시지 */}
          <div className="text-center space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-6 rounded-md">
              <div className="text-[18px] font-medium mb-4">
                아이디를 찾았습니다!
              </div>
              <div className="text-[14px] space-y-2 text-left">
                {foundData?.email && (
                  <div>
                    <span className="font-medium">이메일: </span>
                    <span>{foundData.email}</span>
                  </div>
                )}
                {foundData?.loginId && (
                  <div>
                    <span className="font-medium">아이디: </span>
                    <span>{foundData.loginId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[14px] text-[#9098A4] space-y-2">
              <p>아이디가 기억나지 않으신가요?</p>
              <ul className="text-left space-y-1">
                <li>• 비밀번호 찾기를 이용해주세요</li>
                <li>• 고객센터로 문의해주세요</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="line"
                onClick={() => {
                  setIsFound(false);
                  setPhone("");
                  setFoundData(null);
                }}
                fullWidth={true}
              >
                다시 찾기
              </Button>
              <Button
                variant="keycolor"
                onClick={() => {
                  const loginPath = userType 
                    ? `/login/${userType.toLowerCase()}` 
                    : "/member-select";
                  router.push(loginPath);
                }}
                fullWidth={true}
              >
                로그인으로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-[50px] pb-[224px] px-[16px] bg-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full">
        {/* 헤더 */}
        <div className="flex flex-col mb-8 gap-[10px]">
          <Link href="/member-select" className="mr-4">
            <ArrowLeftIcon currentColor="#000" />
          </Link>
          <h1 className="font-title text-[36px] title-light text-primary">
            아이디 찾기
          </h1>
        </div>

        {/* 설명 텍스트 */}
        <div className="mb-8">
          <p className="text-[16px] text-[#4F5866] leading-6">
            회원가입 시 등록하신 연락처를 입력해주세요.
            <br />
            등록된 아이디를 마스킹 처리하여 보여드립니다.
          </p>
        </div>

        {/* 아이디 찾기 폼 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFindUsername();
          }}
          className="space-y-6"
        >
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 연락처 입력 */}
          <div>
            <label className="block text-[20px] text-medium text-[#3B394D] mb-3">
              연락처
            </label>
            <InputBox
              value={phone}
              onChange={handlePhoneChange}
              placeholder="연락처를 입력해주세요 (예: 010-1234-5678)"
              type="tel"
              clearable={false}
            />
          </div>

          {/* 찾기 버튼 */}
          <Button
            variant="keycolor"
            type="submit"
            fullWidth={true}
            className="mt-8"
            disabled={isLoading}
          >
            {isLoading ? "찾는 중..." : "아이디 찾기"}
          </Button>

          {/* 링크들 */}
          <div className="flex justify-center items-center text-[14px] mt-6">
            <Link href="/member-select" className="text-[#9098A4] underline">
              로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

