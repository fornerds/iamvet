"use client";

import React from "react";

interface JobClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JobClosedModal({ isOpen, onClose }: JobClosedModalProps) {
  if (!isOpen) return null;

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
            접수가 마감되었거나 삭제된 공고입니다
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            병원의 결과를 잠시 기다려주시길 바랍니다.
            <br />
            좋은 결과 있으시길 바랍니다.
          </p>
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-[#FF8796] text-white py-3 px-6 rounded-md font-medium hover:bg-[#FF6B7A] transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

