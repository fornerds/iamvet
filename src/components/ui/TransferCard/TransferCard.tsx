import { BookmarkFilledIcon, BookmarkIcon } from "public/icons";
import React, { useState, useEffect } from "react";
import { Tag } from "../Tag";
import Image from "next/image";
import Link from "next/link";
import { formatNumberWithCommas } from "@/utils/validation";

interface TransferCardProps {
  id?: number | string; // transfer ID for navigation
  title: string;
  location: string;
  hospitalType: string;
  area: number; // 평수
  price: string;
  date: string;
  views: number;
  imageUrl?: string;
  categories?: string; // 병원양도, 기계장치, 의료장비, 인테리어 등
  isAd?: boolean; // 광고 여부
  isLiked?: boolean;
  onLike?: () => void;
  onClick?: () => void; // 기존 호환성을 위해 유지
  isDraft?: boolean; // 임시저장 여부
}

// 가격 포맷팅 함수
const formatPrice = (priceString: string | number | undefined | null): string => {
  if (!priceString && priceString !== 0) return "가격 협의";

  // 타입 체크 및 문자열 변환
  const priceStr = String(priceString).trim();

  // 이미 "만원" 또는 "원"이 포함된 경우 숫자 부분을 추출해서 콤마 포맷팅
  if (priceStr.includes("만원") || priceStr.includes("원")) {
    // "1234만원" -> "1,234만원" 또는 "50000원" -> "50,000원"
    const match = priceStr.match(/(\d+)(만원|원)/);
    if (match) {
      const [, number, unit] = match;
      return `${formatNumberWithCommas(number)}${unit}`;
    }
    return priceStr; // 매치되지 않으면 원본 반환
  }

  // 숫자만 추출 (콤마 제거)
  const cleanPrice = priceStr.replace(/[^\d]/g, "");
  if (!cleanPrice) return "가격 협의";

  // 숫자로 변환
  const number = Number(cleanPrice);
  if (isNaN(number) || number === 0) return "가격 협의";

  // 만원 단위 이상인 경우
  if (number >= 10000) {
    const man = number / 10000;
    // 정수로 떨어지는 경우
    if (number % 10000 === 0) {
      return `${formatNumberWithCommas(Math.floor(man).toString())}만원`;
    }
    // 소수점이 있는 경우 (예: 1.5억 -> 15,000만원)
    return `${formatNumberWithCommas(Math.floor(man).toString())}만원`;
  }

  // 만원 미만인 경우 원 단위로 표시
  return `${formatNumberWithCommas(number.toString())}원`;
};

const TransferCard: React.FC<TransferCardProps> = ({
  id,
  title = "[양도] 강남 소재 내과 병원 양도합니다",
  location = "서울 강남구",
  hospitalType = "내과",
  area = 100,
  price = "3억 양도",
  date = "2025-04-09",
  views = 127,
  imageUrl,
  categories = "병원양도",
  isAd = false,
  isLiked = false,
  onLike,
  onClick,
  isDraft = false,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  // LectureCard처럼 props를 직접 사용하되, 낙관적 업데이트를 위한 로컬 상태는 유지
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);

  const handleLike = () => {
    setIsOptimisticUpdate(true);
    setLocalIsLiked(!localIsLiked);
    onLike?.();

    // 짧은 시간 후 낙관적 업데이트 플래그 리셋 (API 응답을 기다림)
    setTimeout(() => {
      setIsOptimisticUpdate(false);
    }, 1000);
  };

  // props의 isLiked 변경을 즉시 로컬 상태에 반영 (낙관적 업데이트 중이 아닐 때만)
  useEffect(() => {
    if (!isOptimisticUpdate) {
      setLocalIsLiked(isLiked);
    }
  }, [isLiked, isOptimisticUpdate]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const defaultImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' viewBox='0 0 400 240'%3E%3Crect width='400' height='240' fill='%23f3f4f6'/%3E%3Ctext x='200' y='120' font-family='Arial' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3E병원 이미지%3C/text%3E%3C/svg%3E";

  // 카드 내용을 렌더링하는 함수
  const renderCardContent = (isMobileLayout = false) => {
    const cardClassName = isMobileLayout
      ? "w-full bg-transparent shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer rounded-[8px] flex flex-row"
      : "w-full bg-transparent shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer rounded-[16px]";

    const cardStyle = isMobileLayout
      ? {
          display: "flex",
          width: "100%",
          height: "min(130px, 40vw)",
          minHeight: "80px",
          alignItems: "flex-start",
        }
      : {};

    const content = (
      <div className={`relative ${cardClassName}`} style={cardStyle} onClick={onClick}>
        {isMobileLayout ? renderMobileContent() : renderDesktopContent()}
        
        {/* 임시저장 오버레이 */}
        {isDraft && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-[16px] z-10">
            <div className="text-center text-white">
              <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                임시저장
              </span>
            </div>
          </div>
        )}
      </div>
    );

    // id가 있으면 Link로 감싸고, 없으면 그대로 반환
    if (id && !isDraft) {
      return (
        <Link href={`/transfers/${id}`} className="block">
          {content}
        </Link>
      );
    }

    return content;
  };

  const renderDesktopContent = () => (
    <>
      {/* 이미지 영역 */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={imageUrl || defaultImage}
          alt={title}
          width={400}
          height={240}
          className="w-full h-full object-cover"
        />

        {/* 카테고리 태그들 */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {isAd && <Tag variant={4}>AD</Tag>}
          <Tag
            variant={
              categories === "병원양도"
                ? 2
                : categories === "기계장치"
                ? 1
                : categories === "의료장비"
                ? 4
                : 3
            }
          >
            {categories}
          </Tag>
        </div>

        {/* 북마크 버튼 */}
        <button
          className={`absolute top-[12px] right-[12px] w-[32px] h-[32px] rounded-full backdrop-blur-sm transition-all duration-200 ${
            localIsLiked
              ? "bg-[#FF8796] hover:bg-[#FF6B7D]"
              : "bg-[rgba(121,116,126,0.34)] bg-opacity-90 hover:bg-opacity-100"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLike();
          }}
        >
          {localIsLiked ? (
            <BookmarkFilledIcon currentColor="white" />
          ) : (
            <BookmarkIcon currentColor="white" />
          )}
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="p-[12px]">
        <h3 className="text-[18px] text-semibold text-gray-900 mb-2 truncate leading-relaxed">
          {title}
        </h3>

        {/* 병원 정보 */}
        <div className="mb-3">
          <div className="flex items-center text-[14px] text-medium text-subtext2 mb-1">
            <span>{location}</span>
            {categories === "병원양도" && area > 0 && (
              <>
                <span className="mx-1">·</span>
                <span>{formatNumberWithCommas(area.toString())}평</span>
              </>
            )}
          </div>
        </div>

        {/* 가격 */}
        <div className="mb-2 text-end">
          <span className="font-text text-[20px] text-extrabold leading-[150%] text-key1">
            {formatPrice(price)}
          </span>
        </div>

        {/* 등록일과 조회수 */}
        <div className="flex items-center justify-between">
          <span className="font-text text-[14px] text-medium text-subtext2">
            {date}
          </span>
          <span className="font-text text-[14px] text-medium text-subtext2">
            조회 {views.toLocaleString()}
          </span>
        </div>
      </div>
    </>
  );

  const renderMobileContent = () => (
    <>
      {/* 이미지 영역 - 작은 화면에서는 이미지 크기 조정 */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          width: "min(130px, 40vw)",
          height: "min(130px, 40vw)",
          minWidth: "80px",
          maxWidth: "130px",
        }}
      >
        <Image
          src={imageUrl || defaultImage}
          alt={title}
          width={130}
          height={130}
          className="w-full h-full object-cover rounded-[8px]"
        />

        {/* 북마크 버튼 - 작은 화면에서는 더 작게 */}
        <button
          className={`absolute left-[6px] top-[6px] w-[28px] h-[28px] min-[400px]:left-[8px] min-[400px]:top-[7px] rounded-full backdrop-blur-sm transition-all duration-200 ${
            localIsLiked
              ? "bg-[#FF8796] hover:bg-[#FF6B7D]"
              : "bg-[rgba(121,116,126,0.34)] bg-opacity-90 hover:bg-opacity-100"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLike();
          }}
        >
          {localIsLiked ? (
            <BookmarkFilledIcon currentColor="white" size={28} />
          ) : (
            <BookmarkIcon currentColor="white" size={28} />
          )}
        </button>
      </div>

      {/* 콘텐츠 영역 - 유연한 너비 조정 */}
      <div
        className="flex-1 flex flex-col justify-between self-stretch min-w-0"
        style={{
          display: "flex",
          padding: "8px 16px",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flex: "1 1 auto",
          alignSelf: "stretch",
        }}
      >
        {/* 상단 그룹: 카테고리 + 제목 + 병원정보 + 가격 */}
        <div className="flex flex-col gap-1 w-full min-w-0">
          {/* 카테고리 태그들 - 작은 화면에서는 숨김 */}
          <div className="flex flex-wrap gap-1 mb-1">
            {isAd && <Tag variant={4}>AD</Tag>}
            <Tag
              variant={
                categories === "병원양도"
                  ? 1
                  : categories === "기계장치"
                  ? 2
                  : categories === "의료장비"
                  ? 4
                  : 3
              }
            >
              {categories}
            </Tag>
          </div>

          <h3 className="text-[14px] text-normal text-gray-900 leading-tight line-clamp-1 mb-1">
            {title}
          </h3>

          <div className="flex items-center text-[12px] text-medium text-subtext2 mb-1">
            <span className="truncate">{location}</span>
            <span className="mx-1 flex-shrink-0">·</span>
            <span className="truncate">{hospitalType}</span>
            {categories === "병원양도" && area > 0 && (
              <>
                <span className="mx-1 flex-shrink-0">·</span>
                <span className="flex-shrink-0">
                  {formatNumberWithCommas(area.toString())}평
                </span>
              </>
            )}
          </div>
        </div>

        {/* 하단 그룹: 등록일과 조회수 */}
        <div className="flex flex-col w-full">
          <div className="text-right">
            <span className="font-text text-[14px] text-extrabold leading-[150%] text-key1">
              {formatPrice(price)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  // 모바일이 아닌 경우 기존 데스크톱 레이아웃 반환
  if (!isMobile) {
    return renderCardContent(false);
  }

  // 모바일 레이아웃
  return renderCardContent(true);
};

export default TransferCard;
