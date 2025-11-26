"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface AdminVerificationModalProps {
  isOpen: boolean;
  userType: "veterinarian" | "hospital" | "veterinary-student";
  onClose?: () => void;
}

export default function AdminVerificationModal({
  isOpen,
  userType,
  onClose,
}: AdminVerificationModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const userTypeLabel =
    userType === "hospital"
      ? "병원"
      : userType === "veterinary-student"
      ? "수의학과 학생"
      : "수의사";

  const handleGoHome = () => {
    router.push("/");
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            관리자 인증 대기 중
          </h2>
          <p className="text-gray-600 mb-6">
            {userTypeLabel} 계정으로 회원가입이 완료되었습니다.
            <br />
            관리자의 인증을 받아야만 서비스를 이용할 수 있습니다.
            <br />
            <br />
            관리자 인증이 완료될 때까지 기다려주세요.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full bg-[#FF8796] text-white py-3 px-6 rounded-md font-medium hover:bg-[#FF6B7A] transition-colors"
            >
              홈으로 이동
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-md font-medium hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

