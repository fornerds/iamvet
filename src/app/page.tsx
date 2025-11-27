"use client";

import { Tab } from "@/components/ui/Tab";
import { ArrowRightIcon, PlusIcon } from "public/icons";
import banner1Img from "@/assets/images/banner1.png";
import banner2Img from "@/assets/images/banner2.png";
import banner3Img from "@/assets/images/banner3.png";
import lightbombImg from "@/assets/images/lightbomb.png";
import hospitalImg from "@/assets/images/hospital.png";
import lecture1Img from "@/assets/images/lecture/lecture1.png";
import AdvertisementSlider from "@/components/ui/AdvertisementSlider";
import { useState } from "react";
import BannerSlider, {
  BannerItem,
} from "@/components/features/main/BannerSlider";
import AITalentButton from "@/components/features/main/AITalentButton";
import JobFamousList from "@/components/features/main/JobFamousList";
import JobInfoCard from "@/components/ui/JobInfoCard";
import TransferCard from "@/components/ui/TransferCard/TransferCard";
import LectureCard from "@/components/ui/LectureCard/LectureCard";
import Link from "next/link";
import { useResumes } from "@/hooks/useResumes";
import { useJobs } from "@/hooks/useJobs";
import {
  useLectures,
  usePopularLectureCategories,
} from "@/hooks/api/useLectures";
import { useTransfers } from "@/hooks/api/useTransfers";
import { useLikeStore } from "@/stores/likeStore";
import { useHeroBanners, useBannerAds } from "@/hooks/api/useAdvertisements";
import { useRouter } from "next/navigation";
import {
  createResumeNavigationHandler,
  useHospitalAuth,
} from "@/utils/hospitalAuthGuard";
import { useHospitalAuthModal } from "@/hooks/useHospitalAuthModal";
import { HospitalAuthModal } from "@/components/ui/HospitalAuthModal";
import React from "react";

export default function HomePage() {
  const router = useRouter();
  const { isHospitalUser, isAuthenticated, userType } = useHospitalAuth();
  const { showModal, isModalOpen, closeModal, modalReturnUrl } =
    useHospitalAuthModal();

  // 이력서 네비게이션 핸들러
  const handleResumeNavigation = createResumeNavigationHandler(
    router,
    isAuthenticated,
    userType,
    showModal
  );

  // 지역 이름 한국어 맵핑 함수
  const getKoreanRegionName = (englishName: string) => {
    if (!englishName) return "";

    const regionMap: { [key: string]: string } = {
      seoul: "서울",
      busan: "부산",
      daegu: "대구",
      incheon: "인천",
      gwangju: "광주",
      daejeon: "대전",
      ulsan: "울산",
      gyeonggi: "경기",
      gangwon: "강원",
      chungbuk: "충북",
      chungnam: "충남",
      jeonbuk: "전북",
      jeonnam: "전남",
      gyeongbuk: "경북",
      gyeongnam: "경남",
      jeju: "제주",
      sejong: "세종",
      // 영어 전체 이름도 추가
      "seoul-si": "서울",
      "seoul-city": "서울",
      "busan-si": "부산",
      "busan-city": "부산",
      "gyeonggi-do": "경기",
      "gyeonggi-province": "경기",
      // 이미 한국어인 경우도 처리
      서울: "서울",
      부산: "부산",
      대구: "대구",
      인천: "인천",
      광주: "광주",
      대전: "대전",
      울산: "울산",
      경기: "경기",
      강원: "강원",
      충북: "충북",
      충남: "충남",
      전북: "전북",
      전남: "전남",
      경북: "경북",
      경남: "경남",
      제주: "제주",
      세종: "세종",
    };

    // 소문자로 변환해서 매핑 시도
    const lowerCase = englishName.toLowerCase().trim();
    const mapped = regionMap[lowerCase];

    // 매핑된 값이 있으면 반환, 없으면 원본 반환
    return mapped || englishName;
  };

  // 히어로 배너 조회
  const { data: heroBannersData, isLoading: heroBannersLoading } =
    useHeroBanners();

  // 일반 광고 배너 조회
  const { data: bannerAdsData, isLoading: bannerAdsLoading } = useBannerAds();

  // 이력서 목록 조회 (병원 사용자인 경우에만)
  const { data: resumesData, isLoading: resumesLoading } = useResumes(
    isHospitalUser
      ? {
          limit: 5,
          sort: "latest",
        }
      : undefined
  );

  // 채용공고 목록 조회
  const { data: jobsData, isLoading: jobsLoading } = useJobs({
    limit: 5,
    sort: "latest",
  });

  // 인기 카테고리별 강의 조회 (조회수 기준으로 상위 3개 카테고리)
  const { data: popularCategoriesData, isLoading: popularCategoriesLoading } =
    usePopularLectureCategories();

  // API 응답에서 실제 데이터 추출
  const popularCategories = popularCategoriesData?.data?.categories || [];

  // 구직정보 데이터는 useResumes 훅에서 가져옴

  // 현재 활성화된 탭 상태
  const [activeTab, setActiveTab] = useState("internal");

  // 양도양수 데이터 API 조회 (최대 32개 가져와서 카테고리별로 8개씩 분배)
  const {
    data: transfersData,
    isLoading: transfersLoading,
    error: transfersError,
  } = useTransfers({
    limit: 32,
    sort: "latest",
  });

  // API 응답에서 실제 데이터 추출 및 카테고리별 필터링
  const allTransfers = transfersData?.data?.transfers || [];

  // 디버깅을 위한 로그
  React.useEffect(() => {
    if (transfersData) {
      console.log("[HomePage] Transfers data received:", transfersData);
      console.log("[HomePage] All transfers count:", allTransfers.length);
      console.log("[HomePage] First transfer item:", allTransfers[0]);

      // 카테고리별 개수 확인
      const hospitalCount = allTransfers.filter(
        (item: any) => item.category === "hospital"
      ).length;
      const machineCount = allTransfers.filter(
        (item: any) => item.category === "machine"
      ).length;
      const deviceCount = allTransfers.filter(
        (item: any) => item.category === "device"
      ).length;
      const interiorCount = allTransfers.filter(
        (item: any) => item.category === "interior"
      ).length;

      console.log("[HomePage] Category counts:", {
        hospital: hospitalCount,
        machine: machineCount,
        device: deviceCount,
        interior: interiorCount,
      });

      // 실제 카테고리 값들 확인
      const uniqueCategories = Array.from(
        new Set(allTransfers.map((item: any) => item.category))
      );
      console.log("[HomePage] Unique categories found:", uniqueCategories);
    }
    if (transfersError) {
      console.error("[HomePage] Transfers error:", transfersError);
    }
  }, [transfersData, transfersError, allTransfers.length]);

  const hospitalTransfers = allTransfers
    .filter((item: any) => item.category === "병원양도")
    .slice(0, 8);

  const machineTransfers = allTransfers
    .filter((item: any) => item.category === "기계장치")
    .slice(0, 8);

  const deviceTransfers = allTransfers
    .filter((item: any) => item.category === "의료장비")
    .slice(0, 8);

  const interiorTransfers = allTransfers
    .filter((item: any) => item.category === "인테리어")
    .slice(0, 8);

  const handleAITalentSearch = () => {
    console.log("AI로 인재 찾기 클릭");
    handleResumeNavigation("/resumes");
  };

  const handleAIHospitalSearch = () => {
    console.log("AI로 병원 찾기 클릭");
    window.location.href = "/jobs";
  };

  // Zustand 스토어에서 좋아요 상태 관리
  const {
    likedResumes,
    likedJobs,
    setResumeLike,
    setJobLike,
    setLectureLike,
    setTransferLike,
    toggleResumeLike,
    toggleJobLike,
    toggleLectureLike,
    toggleTransferLike,
    initializeResumeLikes,
    initializeJobLikes,
    syncLectureLikes,
    initializeTransferLikes,
    isResumeLiked,
    isJobLiked,
    isLectureLiked,
    isTransferLiked,
  } = useLikeStore();

  // 초기 좋아요 상태 동기화 (Zustand 스토어 사용)
  React.useEffect(() => {
    if (resumesData) {
      const resumes = resumesData.data || [];
      const likedResumeIds = resumes
        .filter((resume: any) => resume.isLiked)
        .map((resume: any) => resume.id);

      console.log("[Resume Like] 서버에서 받은 좋아요 이력서:", likedResumeIds);
      initializeResumeLikes(likedResumeIds);
    }
  }, [resumesData, initializeResumeLikes]);

  React.useEffect(() => {
    if (jobsData?.data?.jobs) {
      const jobs = jobsData.data.jobs || [];
      const likedJobIds = jobs
        .filter((job: any) => job.isLiked)
        .map((job: any) => job.id);

      console.log("[Job Like] 서버에서 받은 좋아요 채용공고:", likedJobIds);
      initializeJobLikes(likedJobIds);
    }
  }, [jobsData, initializeJobLikes]);

  // 강의 좋아요 상태 동기화 (인기 카테고리 강의들)
  React.useEffect(() => {
    if (popularCategories.length > 0) {
      const allLikedLectureIds: string[] = [];

      popularCategories.forEach((category: any) => {
        if (category.lectures && category.lectures.length > 0) {
          const likedLectureIds = category.lectures
            .filter((lecture: any) => lecture.isLiked)
            .map((lecture: any) => lecture.id);
          allLikedLectureIds.push(...likedLectureIds);
        }
      });

      console.log(
        "[Popular Categories Lecture Like] 서버에서 받은 좋아요 강의:",
        allLikedLectureIds
      );
      syncLectureLikes(allLikedLectureIds);
    }
  }, [popularCategories, syncLectureLikes]);

  // Transfer 좋아요 상태 동기화
  React.useEffect(() => {
    if (transfersData?.data?.transfers) {
      const allTransfers = transfersData.data.transfers || [];
      const likedTransferIds = allTransfers
        .filter((transfer: any) => transfer.isLiked)
        .map((transfer: any) => transfer.id);

      console.log(
        "[Transfer Like] 서버에서 받은 좋아요 양도양수:",
        likedTransferIds
      );
      initializeTransferLikes(likedTransferIds);
    }
  }, [transfersData, initializeTransferLikes]);

  // 이력서 좋아요/취소 토글 핸들러 (Zustand 스토어 사용)
  const handleResumeLike = async (resumeId: string | number) => {
    const id = resumeId.toString();
    const isCurrentlyLiked = isResumeLiked(id);

    console.log(
      `[Resume Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleResumeLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[Resume Like] API 요청: ${method} /api/resumes/${resumeId}/like`
      );

      const response = await fetch(`/api/resumes/${resumeId}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setResumeLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[Resume Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("이력서를 찾을 수 없습니다:", resumeId);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[Resume Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setResumeLike(id, true);
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

      console.log(`[Resume Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[Resume Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setResumeLike(id, isCurrentlyLiked);
    }
  };

  // 채용공고 좋아요/취소 토글 핸들러 (Zustand 스토어 사용)
  const handleJobLike = async (jobId: string | number) => {
    const id = jobId.toString();
    const isCurrentlyLiked = isJobLiked(id);

    console.log(
      `[Job Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleJobLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(`[Job Like] API 요청: ${method} /api/jobs/${jobId}/like`);

      const response = await fetch(`/api/jobs/${jobId}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setJobLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[Job Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("채용공고를 찾을 수 없습니다:", jobId);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[Job Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setJobLike(id, true);
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

      console.log(`[Job Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[Job Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setJobLike(id, isCurrentlyLiked);
    }
  };

  // 강의 좋아요/취소 토글 핸들러 (Zustand 스토어 사용)
  const handleLectureLike = async (lectureId: string | number) => {
    const id = lectureId.toString();
    const isCurrentlyLiked = isLectureLiked(id);

    console.log(
      `[Lecture Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleLectureLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[Lecture Like] API 요청: ${method} /api/lectures/${lectureId}/like`
      );

      const response = await fetch(`/api/lectures/${lectureId}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setLectureLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[Lecture Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("강의를 찾을 수 없습니다:", lectureId);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[Lecture Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setLectureLike(id, true);
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

      console.log(`[Lecture Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[Lecture Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setLectureLike(id, isCurrentlyLiked);
    }
  };

  // 양도양수 좋아요/취소 토글 핸들러 (Zustand 스토어 사용)
  const handleTransferLike = async (transferId: string | number) => {
    const id = transferId.toString();
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
          console.warn("양도양수를 찾을 수 없습니다:", transferId);
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
      setTransferLike(id, isCurrentlyLiked);
    }
  };

  // API 데이터를 BannerItem 형식으로 변환
  const heroBanners: BannerItem[] = React.useMemo(() => {
    if (!heroBannersData?.data) {
      // API 데이터가 없으면 기본 배너 사용
      return [
        {
          id: "1",
          imageUrl: banner1Img,
          alt: "첫 번째 배너",
          buttonText: "확인하러 가기",
          buttonLink: "/member-select",
        },
        {
          id: "2",
          imageUrl: banner2Img,
          alt: "두 번째 배너",
          buttonText: "확인하러 가기",
          buttonLink: "/member-select",
        },
        {
          id: "3",
          imageUrl: banner3Img,
          alt: "세 번째 배너",
          buttonText: "확인하러 가기",
          buttonLink: "/member-select",
        },
      ];
    }

    return heroBannersData.data
      .sort((a, b) => a.order - b.order) // order 필드로 정렬
      .map((banner) => ({
        id: banner.id,
        imageUrl: banner.imageUrl,
        alt: banner.title,
        buttonText: "확인하러 가기",
        buttonLink: banner.linkUrl,
      }));
  }, [heroBannersData]);

  // 일반 배너 데이터 변환
  const bannerAds = React.useMemo(() => {
    if (!bannerAdsData?.data) {
      return [];
    }

    return bannerAdsData.data
      .sort((a, b) => a.order - b.order)
      .map((ad) => ({
        id: ad.id,
        imageUrl: ad.imageUrl,
        mobileImageUrl: ad.mobileImageUrl,
        linkUrl: ad.linkUrl,
      }));
  }, [bannerAdsData]);

  return (
    <>
      <div className="w-full">
        <div className="max-w-[1440px] mx-auto md:px-[60px] py-[30px] px-[15px]">
          {/* 데스크톱: 가로 배치, 모바일: 세로 배치 */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:gap-[30px] gap-8">
            <div className="flex-1 max-w-[982px]">
              {heroBannersLoading ? (
                // 로딩 스켈레톤
                <div className="w-full h-[300px] md:h-[400px] bg-gray-200 rounded-xl animate-pulse"></div>
              ) : heroBanners.length > 0 ? (
                <BannerSlider
                  banners={heroBanners}
                  autoSlideInterval={4000}
                  showButton={true}
                />
              ) : (
                // 히어로 배너가 없을 때 안내 메시지
                <div className="w-full h-[300px] md:h-[400px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      히어로 배너가 없습니다
                    </h3>
                    <p className="text-gray-500 text-sm md:text-base mb-4">
                      관리자 페이지에서 히어로 배너를 등록해주세요
                    </p>
                    <p className="text-xs text-gray-400">
                      관리자 &gt; 광고배너 관리에서 등록할 수 있습니다
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center xl:items-start gap-[12px] xl:flex-shrink-0 xl:flex-col flex-col-reverse xl:w-auto w-full">
              <div className="flex flex-col gap-[12px] xl:w-auto w-full">
                <AITalentButton
                  title="AI로 인재 찾기"
                  description="AI로 인재를 찾아 고용해보세요!"
                  variant="lightbomb"
                  imageSrc={lightbombImg.src}
                  onClick={handleAITalentSearch}
                />

                <AITalentButton
                  title="AI로 병원 찾기"
                  description="필요한 병원을 빠르고 신속하게!"
                  variant="hospital"
                  imageSrc={hospitalImg.src}
                  onClick={handleAIHospitalSearch}
                />
              </div>
              <JobFamousList />
            </div>
          </div>
          <Tab
            defaultTab={isHospitalUser ? "internal" : "surgery"}
            variant="default"
            className="bg-box-light xl:px-[32px] py-[36px] px-[16px] rounded-[16px] mt-[30px]"
            onTabChange={setActiveTab}
          >
            <Tab.List className="flex md:justify-between md:items-center flex-col md:flex-row gap-[16px] md:gap-0">
              <div className="flex gap-4">
                {isHospitalUser && (
                  <Tab.Item value="internal">구직정보</Tab.Item>
                )}
                <Tab.Item value="surgery">구인정보</Tab.Item>
              </div>
              <button
                className="flex font-title title-light text-[16px] text-sub hover:underline self-end md:self-auto cursor-pointer"
                onClick={() => {
                  if (activeTab === "internal") {
                    router.push("/jobs");
                  } else {
                    handleResumeNavigation("/resumes");
                  }
                }}
              >
                {<PlusIcon size="21" />} 전체보기
              </button>
            </Tab.List>
            <Tab.Content value="internal">
              <div className="flex items-start gap-[10px] overflow-x-auto custom-scrollbar pb-4">
                {resumesLoading
                  ? // 로딩 스켈레톤
                    [...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm w-[294px] h-[310px] flex-shrink-0 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-full mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  : (() => {
                      const resumes = resumesData?.data || [];
                      const emptyCards = 5 - resumes.length;

                      return (
                        <>
                          {resumes.map((resume) => {
                            // 한국어 라벨 변환
                            const getKoreanLabel = (keyword: string) => {
                              const labelMap: { [key: string]: string } = {
                                internal: "내과",
                                surgery: "외과",
                                dermatology: "피부과",
                                orthopedics: "정형외과",
                                veterinarian: "수의사",
                                assistant: "수의테크니션",
                                manager: "병원장",
                                beginner: "초급",
                                intermediate: "중급",
                                advanced: "고급",
                                expert: "전문가",
                              };
                              return (
                                labelMap[keyword?.toLowerCase()] || keyword
                              );
                            };

                            // 태그 준비
                            const tags = resume.specialties
                              ? resume.specialties
                                  .map((spec) => getKoreanLabel(spec))
                                  .slice(0, 5)
                              : [];

                            // 위치 정보
                            const location =
                              resume.preferredRegions &&
                              resume.preferredRegions.length > 0
                                ? getKoreanRegionName(
                                    resume.preferredRegions[0]
                                  )
                                : "지역 미정";

                            // 경력 정보
                            const position = resume.position
                              ? getKoreanLabel(resume.position)
                              : "수의사";

                            // 날짜 계산 (수정일로부터 며칠 지났는지)
                            const updatedDate = new Date(
                              resume.updatedAt || resume.createdAt
                            );
                            const today = new Date();
                            const diffTime =
                              today.getTime() - updatedDate.getTime();
                            const diffDays = Math.ceil(
                              diffTime / (1000 * 60 * 60 * 24)
                            );
                            const dDay = diffDays;

                            return (
                              <JobInfoCard
                                key={resume.id}
                                id={resume.id}
                                hospital={resume.name}
                                dDay={dDay}
                                position={position}
                                location={location}
                                jobType="구직자"
                                tags={tags}
                                isBookmarked={isResumeLiked(resume.id)}
                                onBookmark={handleResumeLike}
                                onClick={() =>
                                  handleResumeNavigation(
                                    `/resumes/${resume.id}`
                                  )
                                }
                              />
                            );
                          })}
                          {/* 빈 카드 채우기 */}
                          {emptyCards > 0 &&
                            [...Array(emptyCards)].map((_, i) => (
                              <div
                                key={`empty-resume-${i}`}
                                className="bg-gray-200 rounded-xl border border-gray-200 p-6 max-w-sm w-[294px] h-[310px] flex-shrink-0 opacity-50"
                              ></div>
                            ))}
                        </>
                      );
                    })()}
              </div>
            </Tab.Content>
            <Tab.Content value="surgery">
              <div className="flex items-start gap-[10px] overflow-x-auto custom-scrollbar pb-4">
                {jobsLoading
                  ? // 로딩 스켈레톤
                    [...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm w-[294px] h-[310px] flex-shrink-0 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-full mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  : (() => {
                      const jobs = jobsData?.data?.jobs || [];
                      const emptyCards = 5 - jobs.length;

                      return (
                        <>
                          {jobs.map((job: any) => {
                            return (
                              <JobInfoCard
                                key={job.id}
                                id={job.id}
                                hospital={job.hospital?.name || job.hospital}
                                dDay={job.dDay || 0}
                                position={job.title}
                                location={job.location}
                                jobType={job.employmentType || job.jobType}
                                tags={job.specialties || job.tags || []}
                                isBookmarked={
                                  job.isBookmarked || isJobLiked(job.id)
                                }
                                onBookmark={handleJobLike}
                                deadline={job.recruitEndDate}
                                isAlwaysOpen={job.isUnlimitedRecruit || false}
                                onClick={() =>
                                  (window.location.href = `/jobs/${job.id}`)
                                }
                              />
                            );
                          })}
                          {/* 빈 카드 채우기 */}
                          {emptyCards > 0 &&
                            [...Array(emptyCards)].map((_, i) => (
                              <div
                                key={`empty-job-${i}`}
                                className="bg-gray-200 rounded-xl border border-gray-200 p-6 max-w-sm w-[294px] h-[310px] flex-shrink-0 opacity-50"
                              ></div>
                            ))}
                        </>
                      );
                    })()}
              </div>
            </Tab.Content>
            <Tab.Content value="regular">
              <div className="p-4">
                <h4 className="font-semibold mb-2">정규직 정보</h4>
                <p>정규직 채용 관련 정보를 확인하실 수 있습니다.</p>
              </div>
            </Tab.Content>
          </Tab>

          {/* 광고 슬라이더 섹션 */}
          <section className="pt-[40px] md:pt-[42px]">
            {bannerAdsLoading ? (
              // 로딩 스켈레톤
              <div className="w-full h-[120px] bg-gray-200 rounded-xl animate-pulse"></div>
            ) : bannerAds.length > 0 ? (
              <AdvertisementSlider
                advertisements={bannerAds}
                autoPlay={true}
                autoPlayInterval={5000}
              />
            ) : (
              // 등록된 배너가 없을 때 메시지
              <div className="w-full h-[120px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 text-sm md:text-base font-medium">
                    등록된 배너가 없습니다
                  </p>
                  <p className="text-gray-400 text-xs md:text-sm mt-1">
                    관리자 페이지에서 배너를 등록해주세요
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 기존 강의 섹션을 이 코드로 교체 */}
          {/* <section className="py-[60px]">
            <div className="flex md:justify-between md:items-center flex-col md:flex-row gap-[16px] md:gap-0 mb-[30px]">
              <h3 className="font-title text-[28px] md:text-[44px]">
                주요 분야 인기 강좌
              </h3>
              <Link
                className="flex font-title title-light text-[16px] text-sub hover:underline items-center gap-1 self-end md:self-auto"
                href="/lectures"
              >
                <PlusIcon size="21" /> 전체보기
              </Link>
            </div> */}

          {/* 동적 인기 카테고리 섹션들 */}
          {/* {popularCategoriesLoading ? (
              // 로딩 상태
              [...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="relative mb-[60px] md:mb-[120px] h-auto md:h-[400px]"
                >
                  <div className="relative md:absolute z-10 w-full md:w-[366px] h-auto md:h-[289px] bg-gray-200 rounded-[16px] animate-pulse mb-[20px] md:mb-0"></div>
                  <div className="relative md:absolute z-20 md:top-[150px] md:left-[213px] flex items-center gap-[16px] overflow-x-auto custom-scrollbar">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-[294px] h-[240px] bg-gray-200 rounded-xl animate-pulse flex-shrink-0"
                      ></div>
                    ))}
                  </div>
                </div>
              ))
            ) : popularCategories.length === 0 ? (
              // 데이터가 없는 경우
              <div className="text-center py-[120px]">
                <p className="text-gray-500 text-lg">등록된 강의가 없습니다.</p>
                <p className="text-gray-400 text-sm mt-2">
                  관리자 페이지에서 강의를 등록해주세요.
                </p>
              </div>
            ) : (
              // 인기 카테고리별 섹션 렌더링
              popularCategories.map((categoryData: any, index: number) => {
                // 교대로 핑크/흰색 스타일 적용
                const isPinkStyle = index % 2 === 0;
                const isLastSection = index === popularCategories.length - 1;

                return (
                  <div
                    key={categoryData.category}
                    className={`relative ${
                      isLastSection
                        ? "h-auto md:h-[400px]"
                        : "mb-[60px] md:mb-[120px] h-auto md:h-[400px]"
                    }`}
                  > */}
          {/* 카테고리 카드 */}
          {/* <div
                      className={`relative md:absolute z-10 w-full md:w-[366px] h-auto md:h-[289px] p-[0px] md:p-[24px] md:pr-[113px] md:pb-[24px] flex flex-col justify-center items-start gap-[20px] md:gap-[102px] rounded-[16px] bg-transparent ${
                        isPinkStyle ? "md:bg-[#FF8796]" : "md:bg-box"
                      } md:cursor-pointer md:shadow-lg mb-[20px] md:mb-0`}
                      onClick={() =>
                        (window.location.href = `/lectures?medicalField=${categoryData.category}`)
                      }
                    >
                      <div className="flex flex-col gap-[12px]">
                        <h4
                          className={`font-title title-light text-[22px] md:text-[28px] text-[#3B394D] ${
                            isPinkStyle ? "md:text-white" : "md:text-black"
                          } mb-[px] leading-[135%]`}
                        >
                          {categoryData.displayName}
                        </h4>
                        <p
                          className={`hidden md:block font-text text-[14px] md:text-[16px] text-regular ${
                            isPinkStyle
                              ? "text-white opacity-90"
                              : "text-[#6B6B6B]"
                          }`}
                        >
                          {categoryData.description
                            .split("\n")
                            .map((line: string, lineIndex: number) => (
                              <span key={lineIndex}>
                                {line}
                                {lineIndex <
                                  categoryData.description.split("\n").length -
                                    1 && <br />}
                              </span>
                            ))}
                        </p>
                      </div>
                      <button
                        className={`hidden md:flex w-[40px] h-[40px] md:w-[44px] md:h-[44px] ${
                          isPinkStyle
                            ? "border border-white bg-white bg-opacity-20 hover:bg-opacity-30"
                            : "bg-[#F8F8F9] border border-[#FF8796] hover:bg-[#EFEFF0]"
                        } rounded-full items-center justify-center transition-all duration-200`}
                      >
                        <ArrowRightIcon
                          currentColor={isPinkStyle ? "white" : "#3B394D"}
                          size="16px"
                        />
                      </button>
                    </div> */}

          {/* 강의 리스트 */}
          {/* <div className="relative md:absolute z-20 md:top-[150px] md:left-[213px] flex items-center gap-[16px] overflow-x-auto custom-scrollbar">
                      {categoryData.lectures &&
                      categoryData.lectures.length > 0 ? (
                        categoryData.lectures.map((lecture: any) => (
                          <LectureCard
                            key={lecture.id}
                            id={lecture.id}
                            title={lecture.title}
                            date={new Date(lecture.createdAt)
                              .toLocaleDateString("ko-KR")
                              .replace(/\.$/, "")}
                            views={lecture.viewCount || 0}
                            category={lecture.category}
                            imageUrl={lecture.thumbnail || lecture1Img.src}
                            isLiked={isLectureLiked(lecture.id)}
                            onLike={handleLectureLike}
                            onClick={() =>
                              (window.location.href = `/lectures/${lecture.id}`)
                            }
                          />
                        ))
                      ) : (
                        // 해당 카테고리에 강의가 없는 경우
                        <div className="w-[294px] h-[240px] bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <p className="text-gray-500 text-sm">
                            강의가 없습니다
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section> */}

          <section className="py-[60px]">
            <h3 className="font-title text-[28px] md:text-[44px] mb-[47px] text-center">
              인기 양도 매물
            </h3>

            <Tab
              defaultTab="transfer"
              variant="filled"
              className="items-center"
            >
              <Tab.List className="flex justify-center">
                <Tab.Item value="transfer">병원 양도</Tab.Item>
                <Tab.Item value="machine">기계 장치</Tab.Item>
                <Tab.Item value="device">의료 장비</Tab.Item>
                <Tab.Item value="Interior">인테리어</Tab.Item>
              </Tab.List>

              <Tab.Content value="transfer" className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[88px]">
                  {transfersLoading ? (
                    // 로딩 스켈레톤
                    [...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-xl h-[300px] animate-pulse"
                      ></div>
                    ))
                  ) : transfersError ? (
                    // 에러 상태
                    <div className="col-span-full text-center py-8 text-red-500">
                      <p>양도양수 데이터를 불러오는 중 오류가 발생했습니다.</p>
                      <p className="text-sm text-gray-500 mt-2">
                        잠시 후 다시 시도해주세요.
                      </p>
                    </div>
                  ) : hospitalTransfers.length === 0 ? (
                    // 빈 데이터 상태
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <p>현재 등록된 병원 양도 매물이 없습니다.</p>
                    </div>
                  ) : (
                    hospitalTransfers.map((transfer: any) => (
                      <TransferCard
                        key={transfer.id}
                        id={transfer.id}
                        title={transfer.title}
                        location={`${transfer.sido} ${transfer.sigungu}`}
                        hospitalType={transfer.hospitalType}
                        area={transfer.area}
                        price={transfer.price}
                        categories={transfer.categories}
                        isAd={transfer.isAd}
                        date={new Date(transfer.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")}
                        views={transfer.views}
                        imageUrl={transfer.images?.[0] || ""}
                        isLiked={isTransferLiked(transfer.id)}
                        onLike={() => handleTransferLike(transfer.id)}
                        onClick={() =>
                          (window.location.href = `/transfers/${transfer.id}`)
                        }
                      />
                    ))
                  )}
                </div>
                <div className="flex justify-center">
                  <Link
                    className="flex font-title title-light text-[16px] text-primary hover:underline items-center justfy-center px-[30px] py-[8px] border border-[1px] border-[#35313C] rounded-full"
                    href="/transfers"
                  >
                    {<PlusIcon size="21" />} 전체보기
                  </Link>
                </div>
              </Tab.Content>
              <Tab.Content value="machine" className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[88px]">
                  {transfersLoading ? (
                    // 로딩 스켈레톤
                    [...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-xl h-[300px] animate-pulse"
                      ></div>
                    ))
                  ) : transfersError ? (
                    // 에러 상태
                    <div className="col-span-full text-center py-8 text-red-500">
                      <p>양도양수 데이터를 불러오는 중 오류가 발생했습니다.</p>
                    </div>
                  ) : machineTransfers.length === 0 ? (
                    // 빈 데이터 상태
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <p>현재 등록된 기계장치 양도 매물이 없습니다.</p>
                    </div>
                  ) : (
                    machineTransfers.map((transfer: any) => (
                      <TransferCard
                        key={transfer.id}
                        id={transfer.id}
                        title={transfer.title}
                        location={`${transfer.sido} ${transfer.sigungu}`}
                        hospitalType={transfer.hospitalType}
                        area={transfer.area}
                        price={transfer.price}
                        categories={transfer.categories}
                        isAd={transfer.isAd}
                        date={new Date(transfer.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")}
                        views={transfer.views}
                        imageUrl={transfer.images?.[0] || ""}
                        isLiked={isTransferLiked(transfer.id)}
                        onLike={() => handleTransferLike(transfer.id)}
                        onClick={() =>
                          (window.location.href = `/transfers/${transfer.id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </Tab.Content>
              <Tab.Content value="device" className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[88px]">
                  {transfersLoading ? (
                    // 로딩 스켈레톤
                    [...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-xl h-[300px] animate-pulse"
                      ></div>
                    ))
                  ) : transfersError ? (
                    // 에러 상태
                    <div className="col-span-full text-center py-8 text-red-500">
                      <p>양도양수 데이터를 불러오는 중 오류가 발생했습니다.</p>
                    </div>
                  ) : deviceTransfers.length === 0 ? (
                    // 빈 데이터 상태
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <p>현재 등록된 의료장비 양도 매물이 없습니다.</p>
                    </div>
                  ) : (
                    deviceTransfers.map((transfer: any) => (
                      <TransferCard
                        key={transfer.id}
                        id={transfer.id}
                        title={transfer.title}
                        location={`${transfer.sido} ${transfer.sigungu}`}
                        hospitalType={transfer.hospitalType}
                        area={transfer.area}
                        price={transfer.price}
                        categories={transfer.categories}
                        isAd={transfer.isAd}
                        date={new Date(transfer.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")}
                        views={transfer.views}
                        imageUrl={transfer.images?.[0] || ""}
                        isLiked={isTransferLiked(transfer.id)}
                        onLike={() => handleTransferLike(transfer.id)}
                        onClick={() =>
                          (window.location.href = `/transfers/${transfer.id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </Tab.Content>
              <Tab.Content value="Interior" className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[88px]">
                  {transfersLoading ? (
                    // 로딩 스켈레톤
                    [...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-xl h-[300px] animate-pulse"
                      ></div>
                    ))
                  ) : transfersError ? (
                    // 에러 상태
                    <div className="col-span-full text-center py-8 text-red-500">
                      <p>양도양수 데이터를 불러오는 중 오류가 발생했습니다.</p>
                    </div>
                  ) : interiorTransfers.length === 0 ? (
                    // 빈 데이터 상태
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <p>현재 등록된 인테리어 양도 매물이 없습니다.</p>
                    </div>
                  ) : (
                    interiorTransfers.map((transfer: any) => (
                      <TransferCard
                        key={transfer.id}
                        id={transfer.id}
                        title={transfer.title}
                        location={`${transfer.sido} ${transfer.sigungu}`}
                        hospitalType={transfer.hospitalType}
                        area={transfer.area}
                        price={transfer.price}
                        categories={transfer.categories}
                        isAd={transfer.isAd}
                        date={new Date(transfer.createdAt)
                          .toLocaleDateString("ko-KR")
                          .replace(/\.$/, "")}
                        views={transfer.views}
                        imageUrl={transfer.images?.[0] || ""}
                        isLiked={isTransferLiked(transfer.id)}
                        onLike={() => handleTransferLike(transfer.id)}
                        onClick={() =>
                          (window.location.href = `/transfers/${transfer.id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </Tab.Content>
            </Tab>
          </section>
        </div>
      </div>

      {/* 병원 인증 모달 */}
      <HospitalAuthModal
        isOpen={isModalOpen}
        onClose={closeModal}
        returnUrl={modalReturnUrl}
      />
    </>
  );
}
