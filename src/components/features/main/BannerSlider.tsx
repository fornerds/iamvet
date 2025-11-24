"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StaticImageData } from "next/image";
import Image from "next/image";
import { ChevronRightIcon } from "public/icons";

export interface BannerItem {
  id: string;
  imageUrl: string | StaticImageData;
  alt: string;
  buttonText?: string;
  buttonLink?: string;
  onButtonClick?: () => void;
}

interface BannerSliderProps {
  banners: BannerItem[];
  autoSlideInterval?: number; // 자동 슬라이드 간격 (ms)
  showButton?: boolean; // 버튼 표시 여부
  className?: string;
}

const BannerSlider: React.FC<BannerSliderProps> = ({
  banners,
  autoSlideInterval = 5000,
  showButton = true,
  className = "",
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);

  // 다음 슬라이드로 이동
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // 이전 슬라이드로 이동
  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // 특정 슬라이드로 이동
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // 자동 슬라이드 효과
  useEffect(() => {
    if (!isAutoSliding || banners.length <= 1) return;

    const interval = setInterval(nextSlide, autoSlideInterval);
    return () => clearInterval(interval);
  }, [isAutoSliding, nextSlide, autoSlideInterval, banners.length]);

  // 마우스 호버 시 자동 슬라이드 일시정지
  const handleMouseEnter = () => setIsAutoSliding(false);
  const handleMouseLeave = () => setIsAutoSliding(true);

  // 버튼 클릭 핸들러
  const handleButtonClick = () => {
    const currentBanner = banners[currentSlide];
    if (currentBanner.onButtonClick) {
      currentBanner.onButtonClick();
    } else if (currentBanner.buttonLink) {
      window.open(currentBanner.buttonLink, "_blank");
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className={`relative w-full ${className}`}>
      {/* 메인 슬라이더 컨테이너 */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "982 / 485",
          maxWidth: "982px",
          maxHeight: "485px",
          borderRadius: "clamp(8px, 3.1vw, 30px)",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 슬라이드 컨테이너 */}
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="w-full h-full flex-shrink-0 relative"
            >
              <Image
                src={banner.imageUrl}
                alt={banner.alt}
                fill
                className="object-cover"
                style={{ borderRadius: "clamp(8px, 3.1vw, 30px)" }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={100}
                unoptimized={true}
                priority={index === 0}
              />

              {/* 확인하러가기 버튼 - 반응형 */}
              {showButton && (
                <button
                  onClick={handleButtonClick}
                  className="absolute bg-white flex sm:justify-between items-center text-subtext2 font-title title-light rounded-[60px] transition-all duration-200
                    sm:w-[200px] sm:h-[44px] sm:pt-[10px] pb-[8px] sm:px-[24px] sm:text-[20px]
                    w-[120px] pt-[8px] pb-[6px] sm:px-[16px] px-[8px] justify-center"
                  style={{
                    left: "clamp(14px, 3.8vw, 37px)",
                    bottom: "clamp(26px, 6.7vw, 66px)",
                    width: "clamp(125px, 26.3vw, 200px)",
                    height: "clamp(31px, 5.5vw, 44px)",
                    fontSize: "clamp(14px, 2.5vw, 20px)",
                  }}
                >
                  <span className="truncate pr-1">{banner.buttonText}</span>
                  <div className="sm:w-6 sm:h-6 w-5 h-5 flex items-center justify-center">
                    <ChevronRightIcon size="24" />
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 좌우 네비게이션 버튼 (선택사항) */}
        {/* {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition-all duration-200"
              aria-label="이전 슬라이드"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-20 hover:bg-opacity-40 text-white p-2 rounded-full transition-all duration-200"
              aria-label="다음 슬라이드"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )} */}

        {/* 페이지네이션 인디케이터 - 배너 내부 하단 고정 위치 (반응형) */}
        {banners.length > 1 && (
          <div
            className="absolute flex justify-center items-center left-1/2 transform -translate-x-1/2 z-10
              sm:space-x-2 space-x-1"
            style={{
              bottom: "clamp(8px, 2.3vw, 23px)",
            }}
          >
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="transition-all duration-200 border"
                style={{
                  width:
                    index === currentSlide
                      ? "clamp(40px, 6.1vw, 60px)"
                      : "clamp(8px, 1.2vw, 12px)",
                  height: "clamp(8px, 1.2vw, 12px)",
                  borderRadius: "clamp(4px, 0.6vw, 7.5px)",
                  opacity: index === currentSlide ? 0.8 : 0.5,
                  borderColor: "#FF8796",
                  backgroundColor: index === currentSlide ? "#FFF" : "#E1E1E1",
                }}
                aria-label={`${index + 1}번째 슬라이드로 이동`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerSlider;
