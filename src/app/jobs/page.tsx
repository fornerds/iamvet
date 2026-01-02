"use client";

import { FilterBox } from "@/components/ui/FilterBox";
import { SelectBox } from "@/components/ui/SelectBox";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import JobInfoCard from "@/components/ui/JobInfoCard";
import { useState, useEffect } from "react";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JobFamousList from "@/components/features/main/JobFamousList";
import { useJobs, JobFilters } from "@/hooks/api/useJobs";
import { useLikeStore } from "@/stores/likeStore";
import { useViewCountStore } from "@/stores/viewCountStore";
import { workTypeOptions } from "@/constants/options";
import { useAuth } from "@/hooks/api/useAuth";
import { useSideAds } from "@/hooks/api/useAdvertisements";
import Link from "next/link";
import { EditIcon } from "public/icons";

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // 병원 계정인지 확인
  const isHospitalUser = isAuthenticated && user?.type === "hospital";

  // Zustand 스토어에서 좋아요 상태 관리
  const { setJobLike, toggleJobLike, initializeJobLikes, isJobLiked } =
    useLikeStore();

  // Zustand 스토어에서 조회수 상태 관리
  const { setJobViewCount, getJobViewCount } = useViewCountStore();

  // SIDE_AD 광고 데이터 조회
  const { data: sideAdsData, isLoading: isLoadingAd } = useSideAds();

  // 필터 상태 관리 (UI용 - 아직 적용되지 않은 상태)
  const [filters, setFilters] = useState({
    workType: [] as string[],
    experience: [] as string[],
    region: "",
    searchKeyword: "",
    sortBy: "recent",
  });

  // 실제 적용된 필터 (URL과 동기화)
  const [appliedFilters, setAppliedFilters] = useState({
    workType: [] as string[],
    experience: [] as string[],
    region: "",
    searchKeyword: "",
    sortBy: "recent",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // URL에서 필터 파라미터 파싱
  const parseFiltersFromURL = () => {
    const workType =
      searchParams.get("workType")?.split(",").filter(Boolean) || [];
    const experience =
      searchParams.get("experience")?.split(",").filter(Boolean) || [];
    const region = searchParams.get("region") || "";
    const searchKeyword = searchParams.get("search") || "";
    const sortBy = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page") || "1");

    return {
      workType,
      experience,
      region,
      searchKeyword,
      sortBy,
      page,
    };
  };

  // URL 업데이트
  const updateURL = (newFilters: typeof appliedFilters, page: number = 1) => {
    const params = new URLSearchParams();

    if (newFilters.workType.length > 0) {
      params.set("workType", newFilters.workType.join(","));
    }
    if (newFilters.experience.length > 0) {
      params.set("experience", newFilters.experience.join(","));
    }
    if (newFilters.region && newFilters.region !== "all") {
      params.set("region", newFilters.region);
    }
    if (newFilters.searchKeyword.trim()) {
      params.set("search", newFilters.searchKeyword.trim());
    }
    if (newFilters.sortBy !== "recent") {
      params.set("sort", newFilters.sortBy);
    }
    if (page > 1) {
      params.set("page", page.toString());
    }

    const queryString = params.toString();
    const newPath = queryString ? `/jobs?${queryString}` : "/jobs";

    router.replace(newPath);
  };

  // 초기 로드 시 URL에서 필터 읽어오기
  useEffect(() => {
    const urlFilters = parseFiltersFromURL();

    const newFilters = {
      workType: urlFilters.workType,
      experience: urlFilters.experience,
      region: urlFilters.region,
      searchKeyword: urlFilters.searchKeyword,
      sortBy: urlFilters.sortBy,
    };

    setAppliedFilters(newFilters);
    setFilters(newFilters); // UI 필터도 동기화
    setCurrentPage(urlFilters.page);
  }, [searchParams]);

  // 사이드 광고 데이터 변환
  const sideAdData = React.useMemo(() => {
    if (!sideAdsData?.data || sideAdsData.data.length === 0) {
      return null;
    }
    
    const ad = sideAdsData.data[0]; // 첫 번째 활성 광고 사용
    return {
      id: ad.id,
      title: ad.title,
      description: ad.description || ad.title, // description이 없으면 title 사용
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
    };
  }, [sideAdsData]);

  // Build API filters from current state
  const buildApiFilters = (): JobFilters => {
    return {
      keyword: filters.searchKeyword || undefined,
      workType:
        appliedFilters.workType.length > 0
          ? appliedFilters.workType
          : undefined,
      experience:
        appliedFilters.experience.length > 0
          ? appliedFilters.experience
          : undefined,
      region:
        appliedFilters.region && appliedFilters.region !== "all"
          ? appliedFilters.region
          : undefined,
      page: currentPage,
      limit: 8,
      sort: filters.sortBy as "recent" | "deadline" | "popular",
    };
  };

  // Use the API hook
  const apiFilters = buildApiFilters();
  const { data: jobsData, isLoading, error } = useJobs(apiFilters);

  // Log error details
  if (error) {
    console.error("[JobsPage] Error fetching jobs:", error);
    console.error("[JobsPage] API filters:", apiFilters);
  }

  // Log successful data
  if (jobsData) {
    console.log("[JobsPage] Jobs data received:", {
      jobsCount: jobsData.jobs.length,
      totalCount: jobsData.totalCount,
      currentPage: jobsData.currentPage,
      totalPages: jobsData.totalPages,
    });
  }

  const totalJobs = jobsData?.totalCount || 0;
  const totalPages = jobsData?.totalPages || 0;
  const jobData = jobsData?.jobs || [];

  // 초기 좋아요 상태 동기화 (Zustand 스토어 사용)
  React.useEffect(() => {
    const jobs = jobData || [];
    if (jobs.length > 0) {
      const likedJobIds = jobs
        .filter((job: any) => job.isLiked)
        .map((job: any) => job.id);

      if (likedJobIds.length > 0) {
        console.log("[JobsPage] 서버에서 받은 좋아요 채용공고:", likedJobIds);
        initializeJobLikes(likedJobIds);
      }

      // 조회수 초기화
      jobs.forEach((job: any) => {
        if (job.viewCount !== undefined && job.id) {
          setJobViewCount(job.id.toString(), job.viewCount);
        }
      });
    }
  }, [jobData, initializeJobLikes, setJobViewCount]);

  // 채용공고 좋아요/취소 토글 핸들러 (Zustand 스토어 사용)
  const handleJobLike = async (jobId: string | number) => {
    const id = jobId.toString();
    const isCurrentlyLiked = isJobLiked(id);

    console.log(
      `[JobsPage Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleJobLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[JobsPage Like] API 요청: ${method} /api/jobs/${jobId}/like`
      );

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
        console.error(`[JobsPage Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("채용공고를 찾을 수 없습니다:", jobId);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[JobsPage Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
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

      console.log(`[JobsPage Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[JobsPage Like] ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"} 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setJobLike(id, isCurrentlyLiked);
    }
  };

  const handleFilterChange = (type: keyof typeof filters, value: any) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
  };

  const handleFilterApply = () => {
    // 검색과 정렬을 제외한 필터만 적용
    const newAppliedFilters = {
      ...appliedFilters,
      workType: filters.workType,
      experience: filters.experience,
      region: filters.region,
    };
    setAppliedFilters(newAppliedFilters);

    // URL에는 모든 필터 반영 (검색과 정렬 포함)
    updateURL(filters, 1);
    setCurrentPage(1);

    // 모바일에서 필터 닫기
    setIsMobileFilterOpen(false);
  };

  const handleFilterReset = () => {
    const resetFilters = {
      workType: [],
      experience: [],
      region: "",
      searchKeyword: "",
      sortBy: "recent",
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    updateURL(resetFilters, 1);
    setCurrentPage(1);
  };

  // 검색어 변경 시 즉시 URL 업데이트
  const handleSearchChange = (searchKeyword: string) => {
    setFilters((prev) => ({ ...prev, searchKeyword }));
    const newFilters = { ...filters, searchKeyword };
    updateURL({ ...appliedFilters, ...newFilters }, 1);
    setCurrentPage(1);
  };

  // 정렬 변경 시 즉시 적용
  const handleSortChange = (sortBy: string) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    const newFilters = { ...filters, sortBy };
    updateURL({ ...appliedFilters, ...newFilters }, 1);
    setCurrentPage(1);
  };

  // 페이지 변경 시 URL 업데이트
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL(appliedFilters, page);
  };

  return (
    <>
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px]">
          <div className="hidden xl:flex xl:gap-[30px] xl:py-8">
            {/* 왼쪽: 필터링 영역 */}
            <div className="flex-shrink-0 w-[308px] sticky top-[70px] h-fit flex p-[20px] gap-[32px] flex-col border border-[1px] border-[#EFEFF0] rounded-[8px]">
              {/* 근무 형태 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  근무 형태
                </h3>
                <FilterBox.Group
                  value={filters.workType}
                  onChange={(value) => handleFilterChange("workType", value)}
                >
                  {workTypeOptions.map((option) => (
                    <FilterBox key={option.value} value={option.value}>
                      {option.label}
                    </FilterBox>
                  ))}
                </FilterBox.Group>
              </div>

              {/* 경력 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  경력
                </h3>
                <FilterBox.Group
                  value={filters.experience}
                  onChange={(value) => handleFilterChange("experience", value)}
                >
                  <FilterBox value="신입">신입</FilterBox>
                  <FilterBox value="1-3년">1-3년</FilterBox>
                  <FilterBox value="3-5년">3-5년</FilterBox>
                  <FilterBox value="5년이상">5년 이상</FilterBox>
                </FilterBox.Group>
              </div>

              {/* 지역 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  지역
                </h3>
                <SelectBox
                  value={filters.region}
                  onChange={(value) => handleFilterChange("region", value)}
                  placeholder="지역 선택"
                  options={[
                    { value: "all", label: "전체" },
                    { value: "seoul", label: "서울" },
                    { value: "busan", label: "부산" },
                    { value: "daegu", label: "대구" },
                    { value: "incheon", label: "인천" },
                    { value: "gwangju", label: "광주" },
                    { value: "daejeon", label: "대전" },
                    { value: "ulsan", label: "울산" },
                    { value: "gyeonggi", label: "경기" },
                    { value: "gangwon", label: "강원" },
                    { value: "chungbuk", label: "충북" },
                    { value: "chungnam", label: "충남" },
                    { value: "jeonbuk", label: "전북" },
                    { value: "jeonnam", label: "전남" },
                    { value: "gyeongbuk", label: "경북" },
                    { value: "gyeongnam", label: "경남" },
                    { value: "jeju", label: "제주" },
                  ]}
                />
              </div>

              {/* 필터 적용/초기화 버튼 */}
              <div className="space-y-3">
                <Button
                  variant="default"
                  size="medium"
                  fullWidth
                  onClick={handleFilterApply}
                >
                  필터 적용
                </Button>
                <Button variant="text" size="small" onClick={handleFilterReset}>
                  필터 초기화
                </Button>
              </div>
            </div>

            {/* 중앙: 메인 콘텐츠 */}
            <div className="flex-1 space-y-6">
              {/* 제목 */}
              <div className="flex justify-between items-center self-stretch">
                <h1 className="text-[28px] font-title title-medium text-[#3B394D]">
                  채용 공고
                </h1>

                <div className="flex items-center gap-4">
                  {/* 검색바 */}
                  <SearchBar
                    value={filters.searchKeyword}
                    onChange={handleSearchChange}
                    placeholder="키워드로 검색"
                  />

                  {/* 병원 계정일 때 글쓰기 버튼 */}
                  {isHospitalUser && (
                    <Link
                      href="/dashboard/hospital/my-jobs/create"
                      className="h-[44px] w-[140px] bg-subtext hover:bg-[#3b394d] p-[10px] gap-[10px] flex items-center justify-center text-[white] rounded-[6px] font-text text-semibold text-[18px] whitespace-nowrap"
                    >
                      <EditIcon size="20" /> 글쓰기
                    </Link>
                  )}
                </div>
              </div>

              {/* 결과 정보 및 정렬 */}
              <div className="flex justify-between items-center">
                <p className="text-[16px] text-[#9098A4]">총 {totalJobs}건</p>
                <SelectBox
                  value={filters.sortBy}
                  onChange={handleSortChange}
                  placeholder="최신순"
                  options={[
                    { value: "recent", label: "최신순" },
                    { value: "popular", label: "인기순" },
                    { value: "deadline", label: "마감순" },
                  ]}
                />
              </div>

              {/* 채용 공고 목록 */}
              <div className="space-y-4">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 rounded-lg p-6 animate-pulse"
                    >
                      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
                      <div className="flex gap-2 mb-3">
                        <div className="h-6 bg-gray-300 rounded w-16"></div>
                        <div className="h-6 bg-gray-300 rounded w-12"></div>
                        <div className="h-6 bg-gray-300 rounded w-20"></div>
                      </div>
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  ))
                ) : error ? (
                  // Error state
                  <div className="text-center py-12">
                    <p className="text-red-500 mb-4">
                      채용공고를 불러오는 중 오류가 발생했습니다.
                    </p>
                    <Button
                      variant="default"
                      onClick={() => window.location.reload()}
                    >
                      다시 시도
                    </Button>
                  </div>
                ) : jobData.length === 0 ? (
                  // Empty state
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      검색 조건에 맞는 채용공고가 없습니다.
                    </p>
                    {/* Show filter reset button only if filters are applied */}
                    {(appliedFilters.workType.length > 0 ||
                      appliedFilters.experience.length > 0 ||
                      appliedFilters.region ||
                      filters.searchKeyword) && (
                      <Button variant="text" onClick={handleFilterReset}>
                        필터 초기화
                      </Button>
                    )}
                  </div>
                ) : (
                  // Job cards
                  jobData.map((job) => (
                    <JobInfoCard
                      key={job.id}
                      id={job.id}
                      hospital={job.hospital}
                      dDay={job.dDay}
                      position={job.title || job.position}
                      location={job.location?.split(" ").slice(0, 3).join(" ")}
                      jobType={job.jobType}
                      tags={job.tags}
                      isBookmarked={job.isBookmarked || isJobLiked(job.id)}
                      onBookmark={handleJobLike}
                      variant="wide"
                      showDeadline={true}
                      isNew={job.isNew}
                      deadline={job.recruitEndDate}
                      isAlwaysOpen={job.isUnlimitedRecruit || false}
                      viewCount={job.viewCount !== undefined ? job.viewCount : (getJobViewCount(job.id.toString()) || 0)}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    />
                  ))
                )}
              </div>

              {/* 페이지네이션 */}
              {!isLoading && !error && totalPages > 0 && (
                <div className="py-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>

            {/* 오른쪽: 광고 및 인기 채용공고 */}
            <div className="flex-shrink-0 w-[308px] space-y-6">
              {/* 광고 영역 */}
              {!isLoadingAd &&
                (sideAdData ? (
                  <div
                    className="flex flex-col self-stretch rounded-[16px] text-white cursor-pointer transition-all hover:scale-[1.02]"
                    style={{
                      padding: "20px",
                      background:
                        "linear-gradient(90deg, #809DFF 0%, #39B3FF 100%)",
                    }}
                    onClick={() => {
                      if (sideAdData.linkUrl) {
                        window.open(sideAdData.linkUrl, "_blank");
                      }
                    }}
                  >
                    <div className="flex self-end">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        fill="none"
                      >
                        <path
                          d="M9.33325 22.6654L22.6666 9.33203M22.6666 9.33203H9.33325M22.6666 9.33203V22.6654"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-title title-medium text-[20px] mb-[8px] text-[white]">
                        {sideAdData.title}
                      </p>
                      <p className="font-text text-medium text-[13px] text-[white] whitespace-pre-line">
                        {sideAdData.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  // 광고가 없는 경우 표시할 기본 영역
                  <div
                    className="flex flex-col self-stretch rounded-[16px] bg-gray-50 border border-gray-200"
                    style={{ padding: "20px" }}
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mb-3 text-gray-300"
                      >
                        <path
                          d="M13 7H22V20H13V7Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 7H11V12H2V7Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17H11V20H2V17Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="font-title text-[16px] text-gray-600 mb-1">
                        광고를 원하시나요?
                      </p>
                      <p className="font-text text-[12px] text-gray-400">
                        관리자에게 문의하세요
                      </p>
                    </div>
                  </div>
                ))}

              {/* 인기 채용공고 */}
              <JobFamousList />
            </div>
          </div>

          {/* 모바일/태블릿 버전 (1280px 미만) */}
          <div className="xl:hidden py-4">
            <div className="space-y-4">
              {/* 제목과 필터 버튼 */}
              <div className="flex justify-between items-center">
                <h1 className="font-title text-[28px] title-light text-[#3B394D]">
                  채용 공고
                </h1>
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="flex w-[62px] items-center gap-[10px]"
                  style={{
                    borderRadius: "999px 0px 0px 999px",
                    background: "var(--Box_Light, #FBFBFB)",
                    boxShadow: "0px 0px 12px 0px rgba(53, 53, 53, 0.12)",
                    padding: "8px 10px 8px 8px",
                    marginRight: "-16px",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20.5 11.9995H9.14676M9.14676 11.9995C9.14676 12.5588 8.93478 13.0951 8.5591 13.4906C8.18342 13.886 7.67389 14.1082 7.14259 14.1082C6.6113 14.1082 6.10177 13.886 5.72609 13.4906C5.35041 13.0951 5.13935 12.5588 5.13935 11.9995M9.14676 11.9995C9.14676 11.4403 8.93478 10.9039 8.5591 10.5085C8.18342 10.113 7.67389 9.89084 7.14259 9.89084C6.6113 9.89084 6.10177 10.113 5.72609 10.5085C5.35041 10.9039 5.13935 11.4403 5.13935 11.9995M5.13935 11.9995H3.5M20.5 18.3904H15.2181M15.2181 18.3904C15.2181 18.9497 15.0065 19.4867 14.6307 19.8822C14.255 20.2778 13.7453 20.5 13.2139 20.5C12.6826 20.5 12.1731 20.2769 11.7974 19.8814C11.4217 19.486 11.2106 18.9496 11.2106 18.3904M15.2181 18.3904C15.2181 17.831 15.0065 17.295 14.6307 16.8994C14.255 16.5039 13.7453 16.2817 13.2139 16.2817C12.6826 16.2817 12.1731 16.5038 11.7974 16.8993C11.4217 17.2947 11.2106 17.8311 11.2106 18.3904M11.2106 18.3904H3.5M20.5 5.60868H17.6468M17.6468 5.60868C17.6468 5.88559 17.594 6.1598 17.4934 6.41563C17.3927 6.67147 17.2451 6.90393 17.0591 7.09974C16.8731 7.29555 16.6522 7.45087 16.4092 7.55684C16.1662 7.66281 15.9057 7.71735 15.6426 7.71735C15.1113 7.71735 14.6018 7.49519 14.2261 7.09974C13.8504 6.70428 13.6394 6.16793 13.6394 5.60868M17.6468 5.60868C17.6468 5.33176 17.594 5.05756 17.4934 4.80172C17.3927 4.54588 17.2451 4.31343 17.0591 4.11762C16.8731 3.92181 16.6522 3.76648 16.4092 3.66051C16.1662 3.55454 15.9057 3.5 15.6426 3.5C15.1113 3.5 14.6018 3.72216 14.2261 4.11762C13.8504 4.51307 13.6394 5.04942 13.6394 5.60868M13.6394 5.60868H3.5"
                      stroke="#4F5866"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {/* 검색바 */}
              <SearchBar
                className="flex self-end"
                value={filters.searchKeyword}
                onChange={handleSearchChange}
                placeholder="키워드로 검색"
              />

              {/* 병원 계정일 때 글쓰기 버튼 */}
              {isHospitalUser && (
                <Link
                  href="/dashboard/hospital/my-jobs/create"
                  className="h-[44px] max-w-[200px] px-4 bg-subtext hover:bg-[#3b394d] flex items-center justify-center text-[white] rounded-[6px] font-text text-[16px] gap-2 whitespace-nowrap"
                >
                  <EditIcon size="20" /> 채용공고 작성하기
                </Link>
              )}

              {/* 총 결과 수와 정렬 */}
              <div className="flex justify-between items-center">
                <p className="text-[14px] text-[#9098A4]">총 {totalJobs}건</p>
                <SelectBox
                  value={filters.sortBy}
                  onChange={handleSortChange}
                  placeholder="최신순"
                  options={[
                    { value: "recent", label: "최신순" },
                    { value: "popular", label: "인기순" },
                    { value: "deadline", label: "마감순" },
                  ]}
                />
              </div>

              {/* 인기 채용공고 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  인기 채용 공고
                </h3>
                <JobFamousList />
              </div>

              {/* 첫 번째 채용공고 카드들 (절반) */}
              <div className="space-y-3">
                {isLoading ? (
                  // Loading skeleton for mobile
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-gray-100 rounded-lg p-4 animate-pulse"
                    >
                      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                      <div className="h-5 bg-gray-300 rounded w-2/3 mb-3"></div>
                      <div className="flex gap-2">
                        <div className="h-5 bg-gray-300 rounded w-12"></div>
                        <div className="h-5 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  ))
                ) : jobData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-3">
                      검색 조건에 맞는 채용공고가 없습니다.
                    </p>
                    {/* Show filter reset button only if filters are applied */}
                    {(appliedFilters.workType.length > 0 ||
                      appliedFilters.experience.length > 0 ||
                      appliedFilters.region ||
                      filters.searchKeyword) && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleFilterReset}
                      >
                        필터 초기화
                      </Button>
                    )}
                  </div>
                ) : (
                  jobData
                    .slice(0, Math.ceil(jobData.length / 2))
                    .map((job) => (
                      <JobInfoCard
                        key={job.id}
                        id={job.id}
                        hospital={job.hospital}
                        dDay={job.dDay}
                        position={job.title || job.position}
                        location={job.location
                          ?.split(" ")
                          .slice(0, 3)
                          .join(" ")}
                        jobType={job.jobType}
                        tags={job.tags.slice(0, 3)}
                        isBookmarked={job.isBookmarked || isJobLiked(job.id)}
                        onBookmark={!isHospitalUser ? handleJobLike : undefined}
                        deadline={job.recruitEndDate}
                        isAlwaysOpen={job.isUnlimitedRecruit || false}
                        variant="wide"
                        showDeadline={false}
                        isNew={job.isNew}
                        viewCount={job.viewCount !== undefined ? job.viewCount : (getJobViewCount(job.id.toString()) || 0)}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      />
                    ))
                )}
              </div>

              {/* 광고 영역 - 모바일 */}
              {!isLoadingAd &&
                (sideAdData ? (
                  <div
                    className="flex flex-col self-stretch rounded-[16px] text-white cursor-pointer"
                    style={{
                      padding: "20px",
                      background:
                        "linear-gradient(90deg, #809DFF 0%, #39B3FF 100%)",
                    }}
                    onClick={() => {
                      if (sideAdData.linkUrl) {
                        window.open(sideAdData.linkUrl, "_blank");
                      }
                    }}
                  >
                    <div className="flex self-end">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        fill="none"
                      >
                        <path
                          d="M9.33325 22.6654L22.6666 9.33203M22.6666 9.33203H9.33325M22.6666 9.33203V22.6654"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-title title-medium text-[20px] mb-[8px] text-[white]">
                        {sideAdData.title}
                      </p>
                      <p className="font-text text-medium text-[13px] text-[white] whitespace-pre-line">
                        {sideAdData.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  // 광고가 없는 경우 표시할 기본 영역
                  <div className="flex flex-col self-stretch rounded-[16px] bg-gray-50 border border-gray-200 p-5">
                    <div className="flex flex-col items-center justify-center text-center">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mb-2 text-gray-300"
                      >
                        <path
                          d="M13 7H22V20H13V7Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 7H11V12H2V7Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17H11V20H2V17Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="font-title text-[14px] text-gray-600 mb-1">
                        광고를 원하시나요?
                      </p>
                      <p className="font-text text-[11px] text-gray-400">
                        관리자에게 문의하세요
                      </p>
                    </div>
                  </div>
                ))}

              {/* 나머지 채용공고 카드들 */}
              <div className="space-y-3">
                {!isLoading &&
                  jobData.length > 0 &&
                  jobData
                    .slice(Math.ceil(jobData.length / 2))
                    .map((job) => (
                      <JobInfoCard
                        key={job.id}
                        id={job.id}
                        hospital={job.hospital}
                        dDay={job.dDay}
                        position={job.title || job.position}
                        location={job.location
                          ?.split(" ")
                          .slice(0, 3)
                          .join(" ")}
                        jobType={job.jobType}
                        tags={job.tags.slice(0, 3)}
                        isBookmarked={job.isBookmarked || isJobLiked(job.id)}
                        onBookmark={!isHospitalUser ? handleJobLike : undefined}
                        deadline={job.recruitEndDate}
                        isAlwaysOpen={job.isUnlimitedRecruit || false}
                        variant="wide"
                        showDeadline={false}
                        isNew={job.isNew}
                        viewCount={job.viewCount !== undefined ? job.viewCount : (getJobViewCount(job.id.toString()) || 0)}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      />
                    ))}
              </div>

              {/* 페이지네이션 */}
              {!isLoading && !error && totalPages > 0 && (
                <div className="py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    maxVisiblePages={3}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 모바일 필터 모달 */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 xl:hidden">
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[16px] max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  {/* 헤더 */}
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[20px] font-bold text-[#3B394D]">
                      필터
                    </h2>
                    <button
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="w-8 h-8 flex items-center justify-center"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M18 6L6 18M6 6L18 18"
                          stroke="#3B394D"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* 필터 내용 */}
                  <div className="space-y-6">
                    {/* 근무 형태 */}
                    <div>
                      <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                        근무 형태
                      </h3>
                      <FilterBox.Group
                        value={filters.workType}
                        onChange={(value) =>
                          handleFilterChange("workType", value)
                        }
                      >
                        {workTypeOptions.map((option) => (
                          <FilterBox key={option.value} value={option.value}>
                            {option.label}
                          </FilterBox>
                        ))}
                      </FilterBox.Group>
                    </div>

                    {/* 경력 */}
                    <div>
                      <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                        경력
                      </h3>
                      <FilterBox.Group
                        value={filters.experience}
                        onChange={(value) =>
                          handleFilterChange("experience", value)
                        }
                      >
                        <FilterBox value="신입">신입</FilterBox>
                        <FilterBox value="1-3년">1-3년</FilterBox>
                        <FilterBox value="3-5년">3-5년</FilterBox>
                        <FilterBox value="5년이상">5년 이상</FilterBox>
                      </FilterBox.Group>
                    </div>

                    {/* 지역 */}
                    <div>
                      <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                        지역
                      </h3>
                      <SelectBox
                        value={filters.region}
                        onChange={(value) =>
                          handleFilterChange("region", value)
                        }
                        placeholder="지역 선택"
                        options={[
                          { value: "all", label: "전체" },
                          { value: "seoul", label: "서울" },
                          { value: "busan", label: "부산" },
                          { value: "daegu", label: "대구" },
                          { value: "incheon", label: "인천" },
                          { value: "gwangju", label: "광주" },
                          { value: "daejeon", label: "대전" },
                          { value: "ulsan", label: "울산" },
                          { value: "gyeonggi", label: "경기" },
                          { value: "gangwon", label: "강원" },
                          { value: "chungbuk", label: "충북" },
                          { value: "chungnam", label: "충남" },
                          { value: "jeonbuk", label: "전북" },
                          { value: "jeonnam", label: "전남" },
                          { value: "gyeongbuk", label: "경북" },
                          { value: "gyeongnam", label: "경남" },
                          { value: "jeju", label: "제주" },
                        ]}
                      />
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex flex-col gap-[16px] w-full">
                      <Button
                        variant="default"
                        size="medium"
                        onClick={handleFilterApply}
                        fullWidth
                        className="max-w-none"
                      >
                        필터 적용
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleFilterReset}
                      >
                        초기화
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
