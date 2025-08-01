"use client";

import { Footer, Header } from "@/components";
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
import { allJobData } from "@/data/jobsData";

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // 필터링 및 검색 로직 (검색과 정렬은 즉시 적용, 나머지는 appliedFilters 사용)
  const getFilteredData = () => {
    let filtered = [...allJobData];

    // 키워드 검색 (즉시 적용)
    if (filters.searchKeyword.trim()) {
      const keyword = filters.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (job) =>
          job.hospital.toLowerCase().includes(keyword) ||
          job.position.toLowerCase().includes(keyword) ||
          job.location.toLowerCase().includes(keyword) ||
          job.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    }

    // 근무형태 필터 (필터 적용 버튼 필요)
    if (appliedFilters.workType.length > 0) {
      filtered = filtered.filter((job) =>
        appliedFilters.workType.includes(job.workType)
      );
    }

    // 경력 필터 (필터 적용 버튼 필요)
    if (appliedFilters.experience.length > 0) {
      filtered = filtered.filter((job) =>
        appliedFilters.experience.includes(job.experience)
      );
    }

    // 지역 필터 (필터 적용 버튼 필요)
    if (appliedFilters.region && appliedFilters.region !== "all") {
      filtered = filtered.filter((job) => job.region === appliedFilters.region);
    }

    // 정렬 (즉시 적용)
    switch (filters.sortBy) {
      case "recent":
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "deadline":
        filtered.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
        break;
      case "popular":
        // 북마크된 것들을 위로, 그 다음 신규 순서로
        filtered.sort((a, b) => {
          if (a.isBookmarked && !b.isBookmarked) return -1;
          if (!a.isBookmarked && b.isBookmarked) return 1;
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalJobs = filteredData.length;
  const totalPages = Math.ceil(totalJobs / 8);

  // 페이지네이션
  const startIndex = (currentPage - 1) * 8;
  const jobData = filteredData.slice(startIndex, startIndex + 8);

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
      <Header isLoggedIn={false} />

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
                  <FilterBox value="fulltime">정규직</FilterBox>
                  <FilterBox value="parttime">파트타임</FilterBox>
                  <FilterBox value="contract">계약직</FilterBox>
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
                  <FilterBox value="new">신입</FilterBox>
                  <FilterBox value="junior">1~3년</FilterBox>
                  <FilterBox value="mid">3~5년</FilterBox>
                  <FilterBox value="senior">5년 이상</FilterBox>
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

                {/* 검색바 */}
                <SearchBar
                  value={filters.searchKeyword}
                  onChange={handleSearchChange}
                  placeholder="키워드로 검색"
                />
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
                {jobData.map((job) => (
                  <JobInfoCard
                    key={job.id}
                    hospital={job.hospital}
                    dDay={job.dDay}
                    position={job.position}
                    location={job.location}
                    jobType={job.jobType}
                    tags={job.tags}
                    isBookmarked={job.isBookmarked}
                    variant="wide"
                    showDeadline={true}
                    isNew={job.isNew}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              <div className="py-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>

            {/* 오른쪽: 광고 및 인기 채용공고 */}
            <div className="flex-shrink-0 w-[308px] space-y-6">
              {/* 가상 광고 영역 */}
              <div
                className="flex flex-col self-stretch rounded-[16px] text-white"
                style={{
                  padding: "20px",
                  background:
                    "linear-gradient(90deg, #809DFF 0%, #39B3FF 100%)",
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
                    가상 광고 영역
                  </p>
                  <p className="font-text text-medium text-[13px] text-[white]">
                    전문가의 이력서 첨삭 20% 할인
                  </p>
                </div>
              </div>

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
                {jobData.slice(0, Math.ceil(jobData.length / 2)).map((job) => (
                  <JobInfoCard
                    key={job.id}
                    hospital={job.hospital}
                    dDay={job.dDay}
                    position={job.position}
                    location={job.location}
                    jobType={job.jobType}
                    tags={job.tags.slice(0, 3)}
                    isBookmarked={job.isBookmarked}
                    variant="wide"
                    showDeadline={false}
                    isNew={job.isNew}
                  />
                ))}
              </div>

              {/* 가상 광고 영역 */}
              <div
                className="flex flex-col self-stretch rounded-[16px] text-white"
                style={{
                  padding: "20px",
                  background:
                    "linear-gradient(90deg, #809DFF 0%, #39B3FF 100%)",
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
                    가상 광고 영역
                  </p>
                  <p className="font-text text-medium text-[13px] text-[white]">
                    전문가의 이력서 첨삭 20% 할인
                  </p>
                </div>
              </div>

              {/* 나머지 채용공고 카드들 */}
              <div className="space-y-3">
                {jobData.slice(Math.ceil(jobData.length / 2)).map((job) => (
                  <JobInfoCard
                    key={job.id}
                    hospital={job.hospital}
                    dDay={job.dDay}
                    position={job.position}
                    location={job.location}
                    jobType={job.jobType}
                    tags={job.tags.slice(0, 3)}
                    isBookmarked={job.isBookmarked}
                    variant="wide"
                    showDeadline={false}
                    isNew={job.isNew}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              <div className="py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  maxVisiblePages={3}
                />
              </div>
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
                        <FilterBox value="fulltime">정규직</FilterBox>
                        <FilterBox value="parttime">파트타임</FilterBox>
                        <FilterBox value="contract">계약직</FilterBox>
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
                        <FilterBox value="new">신입</FilterBox>
                        <FilterBox value="junior">1~3년</FilterBox>
                        <FilterBox value="mid">3~5년</FilterBox>
                        <FilterBox value="senior">5년 이상</FilterBox>
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

      <Footer />
    </>
  );
}
