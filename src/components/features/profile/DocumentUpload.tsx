"use client";

import React, { useState, useRef } from "react";
import { UploadIcon, ExcelIcon, WordIcon, PdfIcon } from "public/icons";

interface DocumentUploadProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  maxFiles?: number;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  className = "",
  maxFiles = 3,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);

    if (newFiles.length === 0) return;

    // 파일 타입 검증
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];

    const validFiles = newFiles.filter((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name}의 크기가 20MB를 초과합니다.`);
        return false;
      }

      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}은(는) 지원하지 않는 파일 형식입니다.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // 최대 개수 확인
    const totalFiles = value.length + validFiles.length;
    if (totalFiles > maxFiles) {
      alert(`최대 ${maxFiles}개까지만 업로드할 수 있습니다.`);
      return;
    }

    const updatedFiles = [...value, ...validFiles];
    onChange?.(updatedFiles);

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    if (!disabled && value.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (index: number) => {
    const updatedFiles = value.filter((_, i) => i !== index);
    onChange?.(updatedFiles);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) {
      return <PdfIcon currentColor="#EF4444" />;
    }
    if (fileType.includes("word") || fileType.includes("document")) {
      return <WordIcon currentColor="#3B82F6" />;
    }
    if (
      fileType.includes("xlsx") ||
      fileType.includes("xls") ||
      fileType.includes("xlsm") ||
      fileType.includes("spreadsheet")
    ) {
      return <ExcelIcon currentColor="#22C55E" />;
    }
    if (fileType.includes("image")) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" fill="#10B981" />
          <circle cx="6" cy="6" r="1" fill="white" />
          <path
            d="M14 10l-2-2a1 1 0 00-1.414 0L4 14"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="10" height="14" rx="1" fill="#6B7280" />
        <path
          d="M5 5h4M5 8h3M5 11h2"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const getFileName = (file: File) => {
    if (file.name.length > 25) {
      return file.name.substring(0, 22) + "...";
    }
    return file.name;
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* 파일 업로드 버튼 */}
      {value.length < maxFiles && (
        <div
          className={`w-full h-[200px] border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
            disabled ? "cursor-not-allowed opacity-50" : "hover:border-gray-400"
          }`}
          onClick={handleUploadClick}
          style={{
            backgroundColor: "#FAFAFA",
            borderColor: "#E5E5E5",
          }}
        >
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <UploadIcon currentColor="#9098A4" />
            <p
              className="mt-4"
              style={{
                color: "#9098A4",
                fontFamily: "SUIT, sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "135%",
              }}
            >
              클릭하여 파일 업로드
            </p>
            <p
              className="mt-2"
              style={{
                color: "#9098A4",
                fontFamily: "SUIT, sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: "135%",
              }}
            >
              PDF, Word, Excel, 이미지 파일 (20MB 이하)
              <br />({value.length}/{maxFiles}개 업로드됨)
            </p>
          </div>
        </div>
      )}

      {/* 업로드된 파일들 */}
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg bg-[#FAFAFA]"
            >
              <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    color: "#3B394D",
                    fontFamily: "SUIT, sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                    lineHeight: "135%",
                  }}
                >
                  {getFileName(file)}
                </p>
                <p
                  style={{
                    color: "#9098A4",
                    fontFamily: "SUIT, sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: "135%",
                  }}
                >
                  {(file.size / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="flex-shrink-0 w-6 h-6 bg-[#3B394D33] text-white rounded-full flex items-center justify-center text-sm hover:bg-[#3B394D] transition-colors"
                  aria-label="파일 제거"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path
                      d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5"
                      stroke="white"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};
