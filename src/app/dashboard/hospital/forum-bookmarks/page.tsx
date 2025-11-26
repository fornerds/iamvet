"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { SelectBox } from "@/components/ui/SelectBox";
import { FilterBox } from "@/components/ui/FilterBox";
import { Pagination } from "@/components/ui/Pagination";
import { ForumCard } from "@/components/ui/ForumCard";
import { useBookmarkStore } from "@/stores/bookmarkStore";

interface Forum {
  id: string;
  title: string;
  animalType?: string;
  medicalField?: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
}

export default function HospitalForumBookmarksPage() {
  const router = useRouter();

  // Zustand 스토어에서 북마크 상태 관리
  const {
    setForumBookmark,
    toggleForumBookmark,
    initializeForumBookmarks,
    isForumBookmarked,
  } = useBookmarkStore();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // API 상태 관리
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalForums, setTotalForums] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const itemsPerPage = 10;

  // 모바일 필터 모달이 열렸을 때 body 스크롤 방지
  useEffect(() => {
    if (isMobileFilterOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isMobileFilterOpen]);

  // 북마크된 포럼 목록 가져오기
  const fetchBookmarkedForums = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/forums/bookmarks", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("북마크한 포럼 목록을 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.status === "success") {
        let bookmarkedForums = result.data || [];

        // 클라이언트 사이드 필터링
        if (searchKeyword.trim()) {
          const keyword = searchKeyword.toLowerCase().trim();
          bookmarkedForums = bookmarkedForums.filter(
            (forum: Forum) =>
              forum.title.toLowerCase().includes(keyword) ||
              forum.animalType?.toLowerCase().includes(keyword) ||
              forum.medicalField?.toLowerCase().includes(keyword)
          );
        }

        if (selectedFields.length > 0) {
          bookmarkedForums = bookmarkedForums.filter((forum: Forum) =>
            selectedFields.includes(forum.medicalField || "")
          );
        }

        if (selectedAnimals.length > 0) {
          bookmarkedForums = bookmarkedForums.filter((forum: Forum) =>
            selectedAnimals.includes(forum.animalType || "")
          );
        }

        // 정렬 적용
        switch (sortBy) {
          case "recent":
            bookmarkedForums.sort(
              (a: Forum, b: Forum) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
            break;
          case "popular":
            bookmarkedForums.sort(
              (a: Forum, b: Forum) => b.viewCount - a.viewCount
            );
            break;
          case "comments":
            bookmarkedForums.sort(
              (a: Forum, b: Forum) => b.commentCount - a.commentCount
            );
            break;
        }

        // 페이지네이션 적용
        const total = bookmarkedForums.length;
        const totalPagesCount = Math.ceil(total / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedForums = bookmarkedForums.slice(
          startIndex,
          startIndex + itemsPerPage
        );

        setForums(paginatedForums);
        setTotalForums(total);
        setTotalPages(totalPagesCount);

        // 북마크 상태 초기화
        const forumIds = result.data.map((forum: Forum) => forum.id);
        initializeForumBookmarks(forumIds);
      } else {
        throw new Error(
          result.message || "북마크한 포럼 목록을 불러오는데 실패했습니다."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      console.error("북마크 포럼 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 필터나 페이지가 변경될 때마다 API 호출
  useEffect(() => {
    fetchBookmarkedForums();
  }, [searchKeyword, sortBy, selectedFields, selectedAnimals, currentPage]);

  // 포럼 북마크 변경 핸들러
  const handleBookmarkChange = async (
    forumId: string,
    isBookmarked: boolean
  ) => {
    try {
      const method = isBookmarked ? "POST" : "DELETE";
      const response = await fetch(`/api/forums/${forumId}/bookmark`, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // 스토어 상태 업데이트
        toggleForumBookmark(forumId);

        // 북마크 제거 시 목록 새로고침
        if (!isBookmarked) {
          await fetchBookmarkedForums();
        }
      } else {
        const errorData = await response.json();
        
        // 관리자 인증 필요 안내 (403 에러)
        if (response.status === 403 && errorData.requiresAdminVerification) {
          alert(errorData.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }
        
        if (errorData.message === "북마크가 존재하지 않습니다") {
          console.warn(
            "북마크 처리 실패: 북마크가 존재하지 않습니다. UI 상태를 동기화합니다."
          );
          // 백엔드에 북마크가 없으므로, UI 상태를 북마크 해제됨으로 설정
          if (isBookmarked) {
            // If frontend thought it was bookmarked
            setForumBookmark(forumId, false); // Force unbookmarked state
          }
          // If unbookmarking from a bookmarked list, refetch to remove it
          if (!isBookmarked) {
            await fetchBookmarkedForums();
          }
        } else {
          console.error(
            "북마크 처리 실패:",
            errorData.message || "알 수 없는 오류"
          );
          alert(
            `북마크 처리 중 오류가 발생했습니다: ${
              errorData.message || "알 수 없는 오류"
            }`
          );
        }
      }
    } catch (error) {
      console.error("북마크 처리 중 오류:", error);
    }
  };

  const fieldOptions = ["내과", "외과", "피부과", "응급의학", "예방의학"];

  const animalOptions = ["개", "고양이", "대동물", "특수동물"];

  const handleFieldChange = (fields: string[]) => {
    setSelectedFields(fields);
    setCurrentPage(1);
  };

  const handleAnimalChange = (animals: string[]) => {
    setSelectedAnimals(animals);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setSelectedFields([]);
    setSelectedAnimals([]);
    setCurrentPage(1);
  };

  return (
    <>
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-[1240px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
          <div className="hidden xl:flex xl:gap-[30px] xl:py-8">
            {/* 왼쪽: 필터링 영역 */}
            <div className="bg-white flex-shrink-0 w-[308px] sticky top-[70px] h-fit flex p-[20px] gap-[32px] flex-col border border-[1px] border-[#EFEFF0] rounded-[8px]">
              {/* 진료 과목 필터 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  진료 과목
                </h3>
                <FilterBox.Group
                  value={selectedFields}
                  onChange={handleFieldChange}
                >
                  {fieldOptions.map((field) => (
                    <FilterBox key={field} value={field}>
                      {field}
                    </FilterBox>
                  ))}
                </FilterBox.Group>
              </div>

              {/* 동물 필터 */}
              <div>
                <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                  동물
                </h3>
                <FilterBox.Group
                  value={selectedAnimals}
                  onChange={handleAnimalChange}
                >
                  {animalOptions.map((animal) => (
                    <FilterBox key={animal} value={animal}>
                      {animal}
                    </FilterBox>
                  ))}
                </FilterBox.Group>
              </div>

              {/* 필터 초기화 버튼 */}
              <div className="space-y-3">
                <button
                  onClick={handleFilterReset}
                  className="text-[14px] text-[#FF8796] hover:underline"
                >
                  필터 초기화
                </button>
              </div>
            </div>

            {/* 중앙: 메인 콘텐츠 */}
            <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px] flex-1 space-y-6">
              {/* 제목 */}
              <div className="flex justify-between items-center self-stretch">
                <h1 className="text-primary font-text text-[24px] text-bold mb-6">
                  임상포럼 북마크
                </h1>

                {/* 검색바 */}
                <SearchBar
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  placeholder="제목, 태그 검색"
                />
              </div>

              {/* 결과 정보 및 정렬 */}
              <div className="flex justify-between items-center">
                <p className="text-[16px] text-[#9098A4]">총 {totalForums}건</p>
                <SelectBox
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="최신순"
                  options={[
                    { value: "recent", label: "최신순" },
                    { value: "popular", label: "인기순" },
                    { value: "comments", label: "댓글순" },
                  ]}
                />
              </div>

              {/* 로딩 상태 */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff8796] mx-auto mb-4"></div>
                    <p className="text-[#9098A4]">
                      북마크한 포럼을 불러오는 중...
                    </p>
                  </div>
                </div>
              )}

              {/* 에러 상태 */}
              {error && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                      onClick={fetchBookmarkedForums}
                      className="px-4 py-2 bg-[#ff8796] text-white rounded-lg hover:bg-[#ffb7b8]"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}

              {/* 포럼 목록 */}
              {!loading && !error && (
                <div className="space-y-0">
                  {forums.map((forum) => {
                    const tags = [];
                    if (forum.animalType) tags.push(forum.animalType);
                    if (forum.medicalField) tags.push(forum.medicalField);

                    return (
                      <ForumCard
                        key={forum.id}
                        id={forum.id}
                        title={forum.title}
                        tags={tags}
                        viewCount={forum.viewCount}
                        commentCount={forum.commentCount}
                        createdAt={new Date(forum.createdAt)}
                        updatedAt={
                          forum.updatedAt
                            ? new Date(forum.updatedAt)
                            : undefined
                        }
                        isBookmarked={isForumBookmarked(forum.id)}
                        onBookmarkChange={handleBookmarkChange}
                      />
                    );
                  })}
                </div>
              )}

              {/* 데이터 없음 상태 */}
              {!loading && !error && forums.length === 0 && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <p className="text-[#9098A4] text-lg">
                      북마크한 임상포럼이 없습니다.
                    </p>
                    <p className="text-[#9098A4] text-sm mt-2">
                      임상포럼에서 관심있는 게시글을 북마크해보세요.
                    </p>
                    <button
                      onClick={() => router.push("/forums")}
                      className="mt-4 px-4 py-2 bg-[#ff8796] text-white rounded-lg hover:bg-[#ffb7b8]"
                    >
                      임상포럼 둘러보기
                    </button>
                  </div>
                </div>
              )}

              {/* 페이지네이션 */}
              {!loading && !error && totalPages > 1 && (
                <div className="py-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 모바일/태블릿 버전 (1280px 미만) */}
          <div className="xl:hidden py-4">
            <div className="space-y-4">
              {/* 제목과 필터 버튼 */}
              <div className="flex justify-between items-center">
                <h1 className="text-primary font-text text-[24px] text-bold mb-6">
                  임상포럼 북마크
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
                value={searchKeyword}
                onChange={setSearchKeyword}
                placeholder="제목, 태그 검색"
              />

              {/* 총 결과 수와 정렬 */}
              <div className="flex justify-between items-center">
                <p className="text-[14px] text-[#9098A4]">총 {totalForums}건</p>
                <SelectBox
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="최신순"
                  options={[
                    { value: "recent", label: "최신순" },
                    { value: "popular", label: "인기순" },
                    { value: "comments", label: "댓글순" },
                  ]}
                />
              </div>

              {/* 로딩 상태 (모바일) */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff8796] mx-auto mb-4"></div>
                    <p className="text-[#9098A4]">
                      북마크한 포럼을 불러오는 중...
                    </p>
                  </div>
                </div>
              )}

              {/* 에러 상태 (모바일) */}
              {error && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                      onClick={fetchBookmarkedForums}
                      className="px-4 py-2 bg-[#ff8796] text-white rounded-lg hover:bg-[#ffb7b8]"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}

              {/* 포럼 목록 (모바일) */}
              {!loading && !error && (
                <div className="space-y-0">
                  {forums.map((forum) => {
                    const tags = [];
                    if (forum.animalType) tags.push(forum.animalType);
                    if (forum.medicalField) tags.push(forum.medicalField);

                    return (
                      <ForumCard
                        key={forum.id}
                        id={forum.id}
                        title={forum.title}
                        tags={tags}
                        viewCount={forum.viewCount}
                        commentCount={forum.commentCount}
                        createdAt={new Date(forum.createdAt)}
                        updatedAt={
                          forum.updatedAt
                            ? new Date(forum.updatedAt)
                            : undefined
                        }
                        isBookmarked={isForumBookmarked(forum.id)}
                        onBookmarkChange={handleBookmarkChange}
                      />
                    );
                  })}
                </div>
              )}

              {/* 데이터 없음 상태 (모바일) */}
              {!loading && !error && forums.length === 0 && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <p className="text-[#9098A4] text-lg">
                      북마크한 임상포럼이 없습니다.
                    </p>
                    <p className="text-[#9098A4] text-sm mt-2">
                      임상포럼에서 관심있는 게시글을 북마크해보세요.
                    </p>
                    <button
                      onClick={() => router.push("/forums")}
                      className="mt-4 px-4 py-2 bg-[#ff8796] text-white rounded-lg hover:bg-[#ffb7b8]"
                    >
                      임상포럼 둘러보기
                    </button>
                  </div>
                </div>
              )}

              {/* 페이지네이션 */}
              {!loading && !error && totalPages > 1 && (
                <div className="py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    maxVisiblePages={3}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 모바일 필터 모달 */}
          {isMobileFilterOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 xl:hidden"
              style={{
                height: "100dvh",
                width: "100vw",
                overflow: "hidden",
              }}
              onClick={() => setIsMobileFilterOpen(false)}
            >
              <div
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[16px] max-h-[80vh] overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  msOverflowStyle: "scrollbar",
                }}
                onClick={(e) => e.stopPropagation()}
              >
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
                    {/* 진료 과목 필터 */}
                    <div>
                      <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                        진료 과목
                      </h3>
                      <FilterBox.Group
                        value={selectedFields}
                        onChange={handleFieldChange}
                      >
                        {fieldOptions.map((field) => (
                          <FilterBox key={field} value={field}>
                            {field}
                          </FilterBox>
                        ))}
                      </FilterBox.Group>
                    </div>

                    {/* 동물 필터 */}
                    <div>
                      <h3 className="text-[18px] font-bold text-[#3B394D] mb-4">
                        동물
                      </h3>
                      <FilterBox.Group
                        value={selectedAnimals}
                        onChange={handleAnimalChange}
                      >
                        {animalOptions.map((animal) => (
                          <FilterBox key={animal} value={animal}>
                            {animal}
                          </FilterBox>
                        ))}
                      </FilterBox.Group>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex flex-col gap-[16px] w-full">
                      <button
                        onClick={() => {
                          setIsMobileFilterOpen(false);
                        }}
                        className="w-full py-3 bg-[#ff8796] text-white rounded-lg hover:bg-[#ffb7b8]"
                      >
                        필터 적용
                      </button>
                      <button
                        onClick={handleFilterReset}
                        className="text-[14px] text-[#FF8796] hover:underline"
                      >
                        초기화
                      </button>
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
