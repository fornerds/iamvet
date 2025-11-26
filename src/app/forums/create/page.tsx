"use client";

import React, { useState, useRef, useEffect } from "react";
import { InputBox } from "@/components/ui/Input/InputBox";
import { FilterBox } from "@/components/ui/FilterBox";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "public/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/api/useAuth";

// Quill을 동적으로 import (SSR 방지)
const QuillEditor = dynamic(() => import("../../../components/QuillEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-50 rounded-lg animate-pulse" />
  ),
});

export default function ForumCreatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState<string>("");
  const [selectedField, setSelectedField] = useState<string>("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnimalChange = (value: string[]) => {
    setSelectedAnimal(value[0] || "");
  };

  const handleFieldChange = (value: string[]) => {
    setSelectedField(value[0] || "");
  };

  const handleSubmit = async () => {
    // 사용자 로그인 상태 확인
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/member-select");
      return;
    }

    if (!title.trim() || !content.trim() || !selectedAnimal || !selectedField) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const forumData = {
        title: title.trim(),
        content,
        animalType: selectedAnimal,
        medicalField: selectedField,
      };

      // localStorage에서 토큰 가져오기
      const accessToken = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/forums", {
        method: "POST",
        headers,
        body: JSON.stringify(forumData),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        alert("게시글이 성공적으로 등록되었습니다.");
        router.push("/forums");
      } else {
        // 관리자 인증 필요 안내 (403 에러)
        if (response.status === 403 && result.requiresAdminVerification) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }
        throw new Error(result.message || "게시글 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("게시글 작성 실패:", error);
      alert(
        error instanceof Error ? error.message : "게시글 작성에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      if (confirm("작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?")) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  return (
    <>
      <main className="pt-[50px] pb-[100px] px-[16px] bg-white">
        <div className="max-w-[800px] mx-auto">
          {/* 헤더 */}
          <div className="flex flex-col mb-8 gap-[10px]">
            <Link href="/forums" className="mr-4 w-fit">
              <ArrowLeftIcon currentColor="#000" />
            </Link>
            <h1 className="font-title text-[28px] title-light text-[#3B394D]">
              임상 포럼 게시글 작성
            </h1>
          </div>

          <div className="flex flex-col border border-[#EFEFF0] rounded-[16px] px-[16px] py-[20px] md:px-[30px] md:py-[40px] gap-[40px]">
            {/* 제목 */}
            <div className="flex md:gap-[45px] flex-col md:flex-row md:items-center">
              <label className="block text-[18px] font-medium text-[#3B394D] md:m-[0px] mb-4 w-[36px]">
                제목
              </label>
              <InputBox
                value={title}
                onChange={setTitle}
                placeholder="제목을 입력해 주세요"
                clearable={false}
                className="w-full"
              />
            </div>

            {/* 진료 동물과 진료 분야 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 진료 동물 */}
              <div>
                <label className="block text-[18px] font-medium text-[#3B394D] mb-4">
                  진료 동물
                </label>
                <FilterBox.Group
                  value={selectedAnimal ? [selectedAnimal] : []}
                  onChange={handleAnimalChange}
                >
                  <div className="flex flex-wrap gap-2">
                    <FilterBox value="개">개</FilterBox>
                    <FilterBox value="고양이">고양이</FilterBox>
                    <FilterBox value="대동물">대동물</FilterBox>
                    <FilterBox value="특수동물">특수동물</FilterBox>
                  </div>
                </FilterBox.Group>
              </div>

              {/* 진료 분야 */}
              <div>
                <label className="block text-[18px] font-medium text-[#3B394D] mb-4">
                  진료 분야
                </label>
                <FilterBox.Group
                  value={selectedField ? [selectedField] : []}
                  onChange={handleFieldChange}
                >
                  <div className="flex flex-wrap gap-2">
                    <FilterBox value="내과">내과</FilterBox>
                    <FilterBox value="외과">외과</FilterBox>
                    <FilterBox value="피부과">피부과</FilterBox>
                    <FilterBox value="응급의학">응급의학</FilterBox>
                    <FilterBox value="예방의학">예방의학</FilterBox>
                  </div>
                </FilterBox.Group>
              </div>
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-[18px] font-medium text-[#3B394D] mb-4">
                내용
              </label>
              <QuillEditor
                key="forum-create-editor"
                value={content}
                onChange={setContent}
                placeholder="치료 경험, 지견 등을 자유롭게 작성해 주세요"
                height={400}
              />
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-center gap-4 pt-8">
            <Button
              variant="line"
              size="medium"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="w-[120px]"
            >
              취소
            </Button>
            <Button
              variant="keycolor"
              size="medium"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-[120px]"
            >
              {isSubmitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
