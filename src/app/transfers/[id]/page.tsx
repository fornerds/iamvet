"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/api/useAuth";
import { useRouter } from "next/navigation";
import { useLikeStore } from "@/stores/likeStore";
import { useViewCountStore } from "@/stores/viewCountStore";
import {
  ArrowLeftIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  LocationIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  PlusIcon,
  ExcelIcon,
  WordIcon,
  PdfIcon,
} from "public/icons";
import { Tag } from "@/components/ui/Tag";
import transfer1Img from "@/assets/images/transfer/transfer1.jpg";
import profileImg from "@/assets/images/profile.png";
import NaverMap from "@/components/NaverMap";
import TransferCard from "@/components/ui/TransferCard/TransferCard";
import { Button } from "@/components/ui/Button";

// 이미지 슬라이더 컴포넌트
const ImageSlider = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // 터치 중
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // 터치 끝
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && images.length > 1) {
      goToNext();
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious();
    }
  };

  // 이미지가 없는 경우 회색 빈 이미지 표시
  if (!images || images.length === 0) {
    return (
      <div className="w-full">
        <div className="relative w-full h-full max-w-[970px] lg:h-[646px] min-h-[310px] rounded-[8px] bg-gray-200 overflow-hidden mb-4 flex items-center justify-center">
          <div className="text-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto mb-4 text-gray-400"
            >
              <path
                d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 15L16 10L5 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-500 text-sm">이미지가 없습니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 메인 이미지 */}
      <div
        className="relative w-full h-full max-w-[970px] lg:h-[646px] min-h-[310px] rounded-[8px] bg-gray-100 overflow-hidden mb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={images[currentIndex]}
          alt={`슬라이드 ${currentIndex + 1}`}
          fill
          className="object-contain h-full"
        />

        {/* 모바일용 페이지 인디케이터 (우측 하단) */}
        <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm lg:hidden">
          {currentIndex + 1}/{images.length}
        </div>

        {/* 모바일용 좌우 터치 영역 */}
        <div className="lg:hidden absolute inset-0 flex">
          <button
            onClick={goToPrevious}
            className="flex-1 h-full opacity-0"
            disabled={images.length <= 1}
          />
          <button
            onClick={goToNext}
            className="flex-1 h-full opacity-0"
            disabled={images.length <= 1}
          />
        </div>
      </div>

      {/* 데스크톱용 썸네일 목록과 네비게이션 */}
      <div className="hidden lg:flex items-center gap-3 justify-center">
        {/* 이전 버튼 */}
        <button
          onClick={goToPrevious}
          className="hover:bg-gray-100 rounded-full transition-colors"
          disabled={images.length <= 1}
        >
          <ChevronLeftIcon size="32" currentColor="#CACAD2" />
        </button>

        {/* 썸네일 목록 */}
        <div className="flex gap-2 overflow-x-auto justify-center">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 lg:w-[133px] lg:h-[133px] w-[80px] h-[80px] rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? "border-[#ff8796]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image
                src={image}
                alt={`썸네일 ${index + 1}`}
                width={64}
                height={64}
                className="object-contain w-full h-full"
              />
            </button>
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={goToNext}
          className="hover:bg-gray-100 rounded-full transition-colors"
          disabled={images.length <= 1}
        >
          <ChevronRightIcon size="32" currentColor="#CACAD2" />
        </button>
      </div>
    </div>
  );
};

// 가격 포맷팅 함수
const formatPrice = (priceString: string | number | undefined): string => {
  if (!priceString) return "가격 협의";

  // 타입 체크 및 문자열 변환
  const priceStr = String(priceString);

  // 이미 "만원" 또는 "원"이 포함된 경우 그대로 반환
  if (priceStr.includes("만원") || priceStr.includes("원")) {
    return priceStr;
  }

  // 숫자만 추출
  const numbers = priceStr.match(/\d+/g);
  if (!numbers) return priceStr;

  const number = parseInt(numbers.join(""));

  // 만원 단위 이상인 경우
  if (number >= 10000) {
    const man = number / 10000;
    // 정수로 떨어지는 경우
    if (number % 10000 === 0) {
      return `${man.toLocaleString()}만원`;
    }
    // 소수점이 있는 경우
    return `${man.toLocaleString()}만원`;
  }

  // 만원 미만인 경우 원 단위로 표시
  return `${number.toLocaleString()}원`;
};

interface TransferData {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  price?: string;
  area?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  hospitalType?: string;
  businessPeriod?: string;
  monthlyRevenue?: string;
  monthlyPatients?: string;
  operatingHours?: string;
  equipment?: string[];
  images?: string[];
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    userType?: string;
    name?: string;
    nickname?: string;
    hospitalName?: string;
    profileImage?: string;
  };
  relatedTransfers?: any[];
  isBookmarked?: boolean;
}

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMoreRecommendations, setShowMoreRecommendations] = useState(false);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { id } = use(params);

  // Zustand 스토어에서 좋아요 상태 관리
  const {
    setTransferLike,
    toggleTransferLike,
    initializeTransferLikes,
    isTransferLiked,
  } = useLikeStore();

  // Zustand 스토어에서 조회수 상태 관리
  const { setTransferViewCount, getTransferViewCount } = useViewCountStore();

  useEffect(() => {
    const fetchTransferDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/transfers/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (!response.ok) {
          throw new Error("게시글을 불러오는데 실패했습니다.");
        }

        const data = await response.json();
        if (data.status === "success" && data.data) {
          console.log("Transfer data:", data.data);
          console.log("Current user:", user);
          setTransferData(data.data);
          console.log("DEBUG: Full transferData object:", data.data);
          console.log("DEBUG: relatedTransfers before filter:", data.data.relatedTransfers);

          // 좋아요 상태를 Zustand 스토어에 동기화
          if (data.data.isLiked) {
            console.log("[Transfer Like] 서버에서 받은 좋아요 양도양수:", [id]);
            initializeTransferLikes([id]);
          }

          // 조회수 초기화
          if (data.data.views !== undefined) {
            console.log(
              "[TransferDetail] 서버에서 받은 조회수:",
              data.data.views
            );
            // 서버에서 받은 조회수로 초기화
            setTransferViewCount(id, data.data.views);
          }

          // 추천 양도양수 카드의 좋아요 상태도 초기화
          if (
            data.data.relatedTransfers &&
            data.data.relatedTransfers.length > 0
          ) {
            const likedRelatedTransferIds = data.data.relatedTransfers
              .filter(
                (transfer: any) => transfer.isLiked || transfer.isBookmarked
              )
              .map((transfer: any) => transfer.id);

            if (likedRelatedTransferIds.length > 0) {
              console.log(
                "[Transfer Like] 추천 양도양수 좋아요 초기화:",
                likedRelatedTransferIds
              );
              initializeTransferLikes(likedRelatedTransferIds);
            }
          }
        } else {
          throw new Error(data.message || "게시글을 불러오는데 실패했습니다.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransferDetail();
  }, [id]);

  // 조회수 증가 함수
  const incrementViewCount = async () => {
    try {
      console.log(
        `[TransferDetail] 조회수 증가 API 호출 시작 - Transfer ID: ${id}`
      );

      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("[TransferDetail] 인증 토큰 포함하여 요청");
      } else {
        console.log("[TransferDetail] 익명 사용자로 요청");
      }

      const apiUrl = `/api/transfers/${id}/view`;
      console.log(`[TransferDetail] API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
      });

      console.log(`[TransferDetail] API 응답 상태: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("[TransferDetail] API 응답 데이터:", data);

        if (data.status === "success" && data.data?.viewCount) {
          console.log(
            "[TransferDetail] 조회수 증가 성공:",
            data.data.viewCount
          );
          setTransferViewCount(id, data.data.viewCount);
        } else {
          console.warn(
            "[TransferDetail] 조회수 증가 실패 - 응답 데이터 이상:",
            data
          );
        }
      } else {
        const errorData = await response.text();
        console.error(
          "[TransferDetail] 조회수 증가 실패:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("[TransferDetail] 조회수 증가 중 오류:", error);
    }
  };

  // 조회수 증가를 위한 별도 useEffect
  useEffect(() => {
    if (transferData) {
      console.log(
        "[TransferDetail] 양도양수 데이터 로드 완료, 조회수 증가 API 호출"
      );

      // 낙관적 업데이트: API 호출 전에 먼저 클라이언트에서 조회수 증가
      const currentViewCount = getTransferViewCount(id);
      setTransferViewCount(id, currentViewCount + 1);

      // 그 다음 API 호출
      incrementViewCount();
    }
  }, [transferData?.id]); // transferData가 설정될 때마다 실행

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/member-select");
      return;
    }

    const isCurrentlyLiked = isTransferLiked(id);

    console.log(
      `[Transfer Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleTransferLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[Transfer Like] API 요청: ${method} /api/transfers/${id}/like`
      );

      const response = await fetch(`/api/transfers/${id}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setTransferLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[Transfer Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("양도양수를 찾을 수 없습니다:", id);
          alert("양도양수를 찾을 수 없습니다.");
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[Transfer Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setTransferLike(id, true);
            return;
          }
          console.warn(`${actionText} 실패:`, result.message);
          alert(result.message || `${actionText}에 실패했습니다.`);
          return;
        } else if (response.status === 401) {
          console.warn("로그인이 필요합니다.");
          alert("로그인이 필요한 서비스입니다.");
          router.push("/member-select");
          return;
        }
        throw new Error(result.message || `${actionText} 요청에 실패했습니다.`);
      }

      console.log(`[Transfer Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[Transfer Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setTransferLike(id, isCurrentlyLiked);
      alert("북마크 처리 중 오류가 발생했습니다.");
    }
  };

  // 추천 양도양수 좋아요/취소 토글 핸들러
  const handleRecommendedTransferLike = async (transferId: string | number) => {
    const transferIdStr = transferId.toString();
    const isCurrentlyLiked = isTransferLiked(transferIdStr);

    console.log(
      `[Transfer Like] ${transferIdStr} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleTransferLike(transferIdStr);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[Transfer Like] API 요청: ${method} /api/transfers/${transferId}/like`
      );

      const response = await fetch(`/api/transfers/${transferId}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`[Transfer Like] ${actionText} 실패:`, result);

        // 오류 발생 시 상태 롤백
        setTransferLike(transferIdStr, isCurrentlyLiked);

        if (response.status === 404) {
          console.warn("양도양수를 찾을 수 없습니다:", transferId);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[Transfer Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setTransferLike(transferIdStr, true);
            return;
          }
          console.warn(`${actionText} 실패:`, result.message);
          return;
        } else if (response.status === 401) {
          console.warn("로그인이 필요합니다.");
          return;
        }
        throw new Error(result.message || `${actionText} 요청에 실패했습니다.`);
      }

      console.log(`[Transfer Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[Transfer Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setTransferLike(transferIdStr, isCurrentlyLiked);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 게시글을 삭제하시겠습니까?")) return;

    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/member-select");
      return;
    }

    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("게시글이 삭제되었습니다.");
        router.push("/transfers");
      } else {
        const data = await response.json();
        alert(data.message || "게시글 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("게시글 삭제 중 오류가 발생했습니다.");
    }
  };

  // 로딩 중이거나 에러가 있을 때의 렌더링
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff8796] mx-auto"></div>
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !transferData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error || "게시글을 찾을 수 없습니다."}
          </p>
          <Link href="/transfers" className="text-[#ff8796] hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 이미지 배열 (없으면 빈 배열로 처리)
  const sliderImages =
    transferData.images && transferData.images.length > 0
      ? transferData.images
      : [];

  // 작성자 정보
  const author = {
    name: transferData.user?.name || transferData.user?.hospitalName || "익명",
    profileImage: transferData.user?.profileImage || null,
  };

  // 프로필 이미지 URL 처리
  const profileImageSrc = author.profileImage
    ? typeof author.profileImage === "string"
      ? author.profileImage
      : profileImg
    : profileImg;

  // 추천 카드 데이터
  const recommendedTransfers = transferData.relatedTransfers?.filter(
    (transfer: any) => !transfer.isDraft
  ) || [];

  // 카드 슬라이드 관련 계산
  const cardsPerView = 3; // 한 번에 보이는 카드 개수
  const cardWidth = 320; // 카드 너비 (350px에서 여백 고려)
  const cardGap = 20; // 카드 간 간격
  const slideWidth = cardWidth + cardGap; // 슬라이드 당 이동 거리
  const maxSlides = Math.max(
    0,
    Math.ceil(recommendedTransfers.length / cardsPerView) - 1
  );

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => Math.min(maxSlides, prev + 1));
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        <div className="max-w-[1095px] mx-auto pt-[20px] pb-[140px] px-4 lg:px-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/transfers"
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeftIcon currentColor="currentColor" />
            </Link>

            {/* 작성자만 수정/삭제 메뉴 표시 */}
            {(() => {
              console.log("Menu visibility check:");
              console.log("user:", user);
              console.log("transferData:", transferData);
              console.log("transferData.user:", transferData?.user);
              console.log("transferData.userId:", transferData?.userId);
              console.log("user.id:", user?.id);
              console.log(
                "Match:",
                user &&
                  transferData &&
                  (transferData.user?.id === user.id ||
                    transferData.userId === user.id)
              );
              return (
                user &&
                transferData &&
                (transferData.user?.id === user.id ||
                  transferData.userId === user.id)
              );
            })() && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <MoreVerticalIcon size="28" currentColor="currentColor" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-[130px] bg-white border rounded-lg shadow-lg z-10">
                    <Link
                      href={`/transfers/${id}/edit`}
                      className="flex justify-center items-center px-[20px] py-[10px] text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <EditIcon size="24" currentColor="currentColor" />
                      <span className="ml-2">수정하기</span>
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="flex justify-center items-center w-full px-[20px] py-[10px] text-sm text-[#ff8796] hover:bg-gray-50"
                    >
                      <TrashIcon currentColor="currentColor" />
                      <span className="ml-2">삭제하기</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="p-4 lg:p-[60px] border-[1px] border-[#EFEFF0] rounded-[20px]">
            {/* 데스크톱: 헤더 정보가 이미지 위에 */}
            <div className="hidden lg:block">
              {/* 카테고리 태그 */}
              <div className="flex justify-between">
                <Tag variant={1}>양도양수</Tag>

                <div
                  className="flex items-center justify-end cursor-pointer w-[59px]"
                  onClick={handleBookmarkClick}
                >
                  <div className="flex items-center justify-center cursor-pointer">
                    {isTransferLiked(id) ? (
                      <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                    ) : (
                      <BookmarkIcon currentColor="var(--Subtext2)" />
                    )}
                  </div>
                </div>
              </div>

              {/* 제목 */}
              <h1 className="font-text text-[32px] text-bold text-primary mt-[10px]">
                {transferData.title || "제목 없음"}
              </h1>

              {/* 위치 */}
              <div className="flex items-center gap-4 mt-[10px] text-gray-600">
                <div className="flex items-center gap-1">
                  <LocationIcon currentColor="currentColor" />
                  <span className="text-[16px] font-text text-sub">
                    {transferData.location || "위치 정보 없음"}
                  </span>
                </div>
              </div>

              {/* 작성자 정보 */}
              <div className="flex items-center justify-between mt-[38px] mb-[66px]">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[36px] h-[36px] rounded-full overflow-hidden">
                    <Image
                      src={profileImageSrc}
                      alt="프로필 이미지"
                      width={36}
                      height={36}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span className="font-medium text-gray-900">
                    {author.name}
                  </span>
                </div>
                <div className="flex items-center gap-[33px]">
                  <div className="flex items-center gap-1">
                    <EyeIcon currentColor="currentColor" />
                    <span className="text-sm">
                      {getTransferViewCount(id) || 0}
                    </span>
                  </div>
                  <span className="text-sm">
                    {transferData.createdAt
                      ? new Date(transferData.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* 이미지 슬라이더 */}
            <div className="mb-8">
              <ImageSlider images={sliderImages} />
            </div>

            {/* 모바일: 헤더 정보가 이미지 아래에 */}
            <div className="lg:hidden">
              {/* 카테고리 태그 */}
              <div className="flex justify-between mb-3">
                <Tag variant={1}>양도양수</Tag>

                <div
                  className="flex items-center justify-end cursor-pointer w-[59px]"
                  onClick={handleBookmarkClick}
                >
                  <div className="flex items-center justify-center cursor-pointer">
                    {isTransferLiked(id) ? (
                      <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                    ) : (
                      <BookmarkIcon currentColor="var(--Subtext2)" />
                    )}
                  </div>
                </div>
              </div>

              {/* 제목 */}
              <h1 className="font-text text-[24px] text-bold text-primary mb-2">
                {transferData.title || "제목 없음"}
              </h1>

              {/* 위치 */}
              <div className="flex items-center gap-2 mb-4">
                <LocationIcon currentColor="currentColor" />
                <span className="text-[14px] font-text text-sub">
                  {transferData.location || "위치 정보 없음"}
                </span>
              </div>

              {/* 작성자 정보 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-[32px] h-[32px] rounded-full overflow-hidden">
                    <Image
                      src={profileImageSrc}
                      alt="프로필 이미지"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span className="font-medium text-gray-900 text-[14px]">
                    {author.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <EyeIcon currentColor="currentColor" />
                    <span className="text-[12px]">
                      {getTransferViewCount(id) || 0}
                    </span>
                  </div>
                  <span className="text-[12px]">
                    {transferData.createdAt
                      ? new Date(transferData.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="mt-[30px] lg:mt-[50px] border-t-[1px] border-t-[#EFEFF0] pt-[30px] lg:pt-[50px]">
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-4">
                <div>
                  <span className="font-title text-[16px] lg:text-[20px] title-light text-primary">
                    가격
                  </span>
                  <p className="font-text text-[24px] lg:text-[32px] text-bold text-key1">
                    {formatPrice(transferData.price)}
                  </p>
                </div>
                <div>
                  <span className="font-title text-[16px] lg:text-[20px] title-light text-primary">
                    평수
                  </span>
                  <p className="font-text text-[24px] lg:text-[32px] text-nomal text-sub">
                    {transferData.area
                      ? `${transferData.area}m²`
                      : "평수 정보 없음"}
                  </p>
                </div>
              </div>
            </div>

            {/* 상세 설명 */}
            <div className="mt-[30px] lg:mt-[50px] flex flex-col gap-[15px] lg:gap-[20px]">
              <h2 className="font-title text-[16px] lg:text-[20px] title-light text-primary">
                상세 설명
              </h2>
              <div className="prose max-w-none">
                <p className="font-text text-[14px] lg:text-[16px] text-light text-sub whitespace-pre-line">
                  {transferData.description || "상세 설명이 없습니다."}
                </p>
              </div>
            </div>

            {/* 위치 정보 */}
            <div className="mt-[30px] lg:mt-[50px] border-t-[1px] border-t-[#EFEFF0] pt-[30px] lg:pt-[50px]">
              <h2 className="font-title text-[16px] lg:text-[20px] title-light text-primary mb-[15px] lg:mb-[20px]">
                위치 정보
              </h2>
              <NaverMap
                location={transferData.location || ""}
                latitude={transferData.latitude}
                longitude={transferData.longitude}
                height="265px"
              />
              <p className="font-text text-[14px] lg:text-[16px] text-light mt-[15px] lg:mt-[20px] text-sub">
                {transferData.address ||
                  transferData.location ||
                  "주소 정보 없음"}
              </p>
            </div>

            {/* 첨부 파일 */}
            {(transferData as any).documents &&
              (transferData as any).documents.length > 0 && (
                <div className="mt-[30px] lg:mt-[50px] border-t-[1px] border-t-[#EFEFF0] pt-[30px] lg:pt-[50px]">
                  <h2 className="font-title text-[16px] lg:text-[20px] title-light text-primary mb-[15px] lg:mb-[20px]">
                    첨부 파일
                  </h2>
                  <div className="space-y-3">
                    {(transferData as any).documents.map(
                      (document: string, index: number) => {
                        const fileName =
                          document.split("/").pop() || `파일${index + 1}`;
                        const fileExtension =
                          fileName.split(".").pop()?.toLowerCase() || "";

                        // 파일 타입별 아이콘 (DocumentUpload의 getFileIcon 함수 참고)
                        const getFileIcon = () => {
                          // PDF 파일
                          if (fileExtension === "pdf") {
                            return <PdfIcon currentColor="#EF4444" />;
                          }
                          // Excel 파일
                          if (["xlsx", "xls", "xlsm"].includes(fileExtension)) {
                            return <ExcelIcon currentColor="#22C55E" />;
                          }
                          // Word 파일
                          if (["doc", "docx"].includes(fileExtension)) {
                            return <WordIcon currentColor="#3B82F6" />;
                          }
                          // 이미지 파일
                          if (
                            [
                              "jpg",
                              "jpeg",
                              "png",
                              "gif",
                              "bmp",
                              "svg",
                            ].includes(fileExtension)
                          ) {
                            return (
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="3"
                                  fill="#10B981"
                                />
                                <circle cx="9" cy="9" r="1.5" fill="white" />
                                <path
                                  d="M21 15l-3-3a1.5 1.5 0 00-2.121 0L6 21"
                                  stroke="white"
                                  strokeWidth="2.25"
                                />
                              </svg>
                            );
                          }
                          // 기본 파일 아이콘
                          return (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <rect
                                x="3"
                                y="1.5"
                                width="15"
                                height="21"
                                rx="1.5"
                                fill="#6B7280"
                              />
                              <path
                                d="M7.5 7.5h6M7.5 12h4.5M7.5 16.5h3"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          );
                        };

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => window.open(document, "_blank")}
                          >
                            {getFileIcon()}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {fileName}
                              </p>
                              <p className="text-xs text-gray-500 uppercase">
                                {fileExtension} 파일
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const downloadUrl = `/api/download?url=${encodeURIComponent(
                                    document
                                  )}`;
                                  const link =
                                    globalThis.document.createElement("a");
                                  link.href = downloadUrl;
                                  link.click();
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                title="다운로드"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <polyline
                                    points="7,10 12,15 17,10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <line
                                    x1="12"
                                    y1="15"
                                    x2="12"
                                    y2="3"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </button>
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="text-gray-400"
                              >
                                <path
                                  d="m9 18 6-6-6-6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </section>

          {/* 추천 양도양수 섹션 */}
          <section className="mt-[60px] lg:mt-[100px]">
            {/* 데스크톱 버전 */}
            <div className="hidden lg:block">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  alignSelf: "stretch",
                }}
              >
                {/* 왼쪽 화살표 버튼 */}
                <button
                  onClick={handlePrevSlide}
                  disabled={currentSlide === 0}
                  className={`transition-colors ${
                    currentSlide === 0
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  <ChevronLeftIcon size="48" currentColor="#9098A4" />
                </button>

                {/* 콘텐츠 영역 */}
                <div
                  style={{
                    display: "flex",
                    width: "1000px",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "20px",
                  }}
                >
                  {/* 제목 */}
                  <h2 className="text-[24px] font-title text-sub mb-4">
                    다른 매물 둘러보기
                  </h2>

                  {/* 추천 카드 리스트 */}
                  <div className="w-full overflow-hidden">
                    <div
                      id="recommended-transfers"
                      className="flex gap-[20px] transition-transform duration-300 ease-in-out"
                      style={{
                        transform: `translateX(-${
                          currentSlide * cardsPerView * slideWidth
                        }px)`,
                        width: `${recommendedTransfers.length * slideWidth}px`,
                      }}
                    >
                      {recommendedTransfers.map((transfer: any) => (
                        <div
                          key={transfer.id}
                          className="flex-shrink-0 w-[320px]"
                        >
                          <TransferCard
                            id={transfer.id}
                            title={transfer.title || "제목 없음"}
                            location={transfer.location || "위치 정보 없음"}
                            hospitalType={transfer.hospitalType || transfer.category || ""}
                            area={transfer.area || 0}
                            price={formatPrice(transfer.price)}
                            date={
                              transfer.createdAt
                                ? new Date(transfer.createdAt)
                                    .toLocaleDateString("ko-KR")
                                    .replace(/\.$/, "")
                                : ""
                            }
                            views={transfer.viewCount || transfer.views || 0}
                            imageUrl={transfer.images?.[0] || transfer1Img.src}
                            categories={Array.isArray(transfer.categories) ? transfer.categories : (transfer.categories ? [transfer.categories] : [transfer.category || ""].filter(Boolean))}
                            isAd={false}
                            isLiked={isTransferLiked(transfer.id)}
                            onLike={() =>
                              handleRecommendedTransferLike(transfer.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 오른쪽 화살표 버튼 */}
                <button
                  onClick={handleNextSlide}
                  disabled={currentSlide >= maxSlides}
                  className={`transition-colors ${
                    currentSlide >= maxSlides
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  <ChevronRightIcon size="48" currentColor="#9098A4" />
                </button>
              </div>
            </div>

            {/* 모바일 버전 */}
            <div className="lg:hidden">
              <h2 className="text-[24px] font-title text-sub mb-4">
                다른 매물 둘러보기
              </h2>

              {/* 추천 카드 리스트 (세로 배열) */}
              <div className="flex flex-col gap-4">
                {recommendedTransfers
                  .slice(
                    0,
                    showMoreRecommendations ? recommendedTransfers.length : 3
                  )
                  .map((transfer: any) => (
                    <TransferCard
                      key={transfer.id}
                      id={transfer.id}
                      title={transfer.title || "제목 없음"}
                      location={transfer.location || "위치 정보 없음"}
                      hospitalType={transfer.hospitalType || transfer.category || ""}
                      area={transfer.area || 0}
                      price={formatPrice(transfer.price)}
                      date={
                        transfer.createdAt
                          ? new Date(transfer.createdAt)
                              .toLocaleDateString("ko-KR")
                              .replace(/\.$/, "")
                          : ""
                      }
                      views={transfer.viewCount || transfer.views || 0}
                      imageUrl={transfer.images?.[0] || transfer1Img.src}
                      categories={Array.isArray(transfer.categories) ? transfer.categories : (transfer.categories ? [transfer.categories] : [transfer.category || ""].filter(Boolean))}
                      isAd={false}
                      isLiked={isTransferLiked(transfer.id)}
                      onLike={() => handleRecommendedTransferLike(transfer.id)}
                    />
                  ))}
              </div>

              {/* 더보기 버튼 */}
              {recommendedTransfers.length > 3 && !showMoreRecommendations && (
                <div className="mt-4 flex justify-center">
                  <Button
                    buttonType="more"
                    variant="line"
                    size="medium"
                    onClick={() => setShowMoreRecommendations(true)}
                    icon={<PlusIcon size="21" currentColor="#9098A4" />}
                    fullWidth
                  >
                    더보기
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
