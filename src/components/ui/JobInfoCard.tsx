import {
  BookmarkFilledIcon,
  BookmarkIcon,
  DocumentIcon,
  LocationIcon,
  WalletIcon,
} from "public/icons";
import React, { useState } from "react";
import { Tag } from "./Tag";
import { useAuth } from "@/hooks/api/useAuth";

interface JobInfoCardProps {
  hospital: string;
  dDay: number | null;
  position: string;
  location: string;
  jobType: string;
  tags: string[];
  isBookmarked?: boolean;
  onClick?: () => void;
  onBookmark?: (id: string | number) => void; // 북마크 핸들러 (좋아요 기능 통합)
  variant?: "default" | "wide"; // 기본 스타일과 넓은 스타일 선택
  showDeadline?: boolean; // 마감일 표시 여부
  isNew?: boolean; // 신규 공고 여부
  id?: number | string; // 채용공고 ID 추가
  className?: string;
  deadline?: string | null; // 마감일 정보 추가 (ISO 형식 또는 "상시")
  isAlwaysOpen?: boolean; // 상시 채용 여부
  showToggle?: boolean; // 활성화 토글 버튼 표시 여부 (my-jobs 페이지에서만)
  isActive?: boolean; // 채용공고 활성화 여부
  onToggleActive?: (id: string | number) => void; // 활성화 토글 핸들러
  viewCount?: number; // 조회수
}

const JobInfoCard: React.FC<JobInfoCardProps> = ({
  hospital = "건국대학교 동물병원",
  dDay = null,
  position = "간호조무사(정규직)",
  location = "서울 광진구",
  jobType = "신입",
  tags = ["내과", "외과", "정규직", "케어직", "파트타임"],
  isBookmarked = false,
  onClick,
  onBookmark,
  variant = "default",
  showDeadline = false,
  isNew = false,
  id,
  className,
  deadline = null,
  isAlwaysOpen = false,
  showToggle = false,
  isActive = true,
  onToggleActive,
  viewCount,
}) => {
  const { user, isAuthenticated } = useAuth();
  const isWide = variant === "wide";
  
  // 병원 계정인지 확인
  const isHospitalUser = isAuthenticated && user?.type === "hospital";

  // 마감일 포맷팅 함수 (~mm/dd(월) 형식)
  const formatDeadline = (
    deadline: string | null,
    isAlwaysOpen: boolean
  ): string => {
    if (isAlwaysOpen || deadline === "상시") {
      return "상시";
    }

    if (!deadline) {
      return "";
    }

    try {
      const date = new Date(deadline);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      const weekday = weekdays[date.getDay()];

      return `~${month}/${day}(${weekday})`;
    } catch (error) {
      return "";
    }
  };

  const deadlineText = formatDeadline(deadline, isAlwaysOpen);

  // Wide 버전일 때의 스타일
  const containerClass = isWide
    ? "bg-white rounded-lg border border-[#E5E5E5] p-6 w-full shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
    : "bg-white rounded-xl border border-gray-100 p-6 w-full max-w-sm h-[310px] shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer flex-shrink-0";

  const titleClass = "font-text text-extrabold text-primary text-[16px]";

  const positionClass =
    "font-text text-semibold text-primary text-[24px] my-[18px] line-clamp-2";

  return (
    <div className={`${containerClass} ${className || ""}`} onClick={onClick}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={titleClass}>{hospital}</h3>
        <div className="flex items-center space-x-2">
          {showDeadline && dDay !== null && (
            <Tag variant={1}>{dDay >= 0 ? `D-${dDay}` : "마감"}</Tag>
          )}

          {/* 활성화 토글 버튼 (my-jobs 페이지에서만 표시) */}
          {showToggle && onToggleActive && id && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span className="text-sm font-medium text-gray-700">
                {isActive ? "활성화" : "비활성화"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff8796] focus:ring-offset-2 ${
                  isActive ? "bg-[#ff8796]" : "bg-gray-300"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive(id);
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* 북마크 아이콘 */}
          {onBookmark && (
            <div
              className="w-6 h-6 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (onBookmark && id) {
                  onBookmark(id);
                }
              }}
            >
              {isBookmarked ? (
                <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
              ) : (
                <BookmarkIcon currentColor="var(--Subtext2)" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 직책 */}
      <h4 className={positionClass}>{position}</h4>

      {/* 위치 정보 */}
      <div className={`${isWide ? "space-y-1 mb-3" : "space-y-3 mb-6"}`}>
        {/* Wide 버전에서는 순서 반대: 경력 -> 위치 */}
        {isWide ? (
          <>
            <div className="flex items-center space-x-3 text-gray-600">
              <WalletIcon />
              <span className="text-[14px] text-sub1 font-bold">{jobType}</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <LocationIcon />
              <span className="text-[14px] text-sub1 font-bold">
                {location}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-3 text-gray-600">
              <LocationIcon />
              <span className="text-[14px] text-sub1 font-bold">
                {location}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600">
              <WalletIcon />
              <span className="text-[14px] text-sub1 font-bold">{jobType}</span>
            </div>
          </>
        )}
      </div>

      {/* 태그들과 마감일 */}
      <div className="space-y-3">
        {/* 태그들 */}
        <div className="flex flex-wrap gap-2">
          {tags.length <= 3 ? (
            tags.map((tag, index) => (
              <Tag key={index} variant={3}>
                {tag}
              </Tag>
            ))
          ) : (
            <>
              <Tag variant={3}>{tags[0]}</Tag>
              <Tag variant={3}>외 {tags.length - 1}개</Tag>
            </>
          )}
        </div>

        {/* 마감일 정보 - 별도 행에 오른쪽 정렬 */}
        {deadlineText && (
          <div className="flex justify-end">
            <span className="font-text text-[12px] text-medium text-subtext2">
              {deadlineText}
            </span>
          </div>
        )}
      </div>

      {/* 조회수 표시 */}
      {viewCount !== undefined && (
        <div className={`${isWide ? "mt-3" : "mt-4"}`}>
          <span className="font-text text-[14px] text-[#9098A4]">
            조회 {viewCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default JobInfoCard;
