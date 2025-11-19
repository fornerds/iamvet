"use client";

import React from "react";

interface ServiceNotReadyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceNotReadyModal: React.FC<ServiceNotReadyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 모달 콘텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 내용 */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            서비스 준비중입니다
          </h2>
          <p className="text-gray-600 leading-relaxed">
            강의 영상 서비스는 현재 준비 중입니다.<br />
            빠른 시일 내에 만나보실 수 있도록 준비하겠습니다.
          </p>
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={onClose}
          className="w-full bg-[#FF8796] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#ff7084] transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
};

