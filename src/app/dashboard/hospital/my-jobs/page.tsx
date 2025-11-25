"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeftIcon, EditIcon } from "public/icons";
import { SelectBox } from "@/components/ui/SelectBox";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import JobInfoCard from "@/components/ui/JobInfoCard";
import { useMyJobs, jobKeys } from "@/hooks/api/useJobs";
import { Job } from "@/types/job";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export default function HospitalMyJobsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [inactiveModalOpen, setInactiveModalOpen] = useState(false);
  const [clickedJobId, setClickedJobId] = useState<string | null>(null);
  const itemsPerPage = 8;

  const { data: jobs = [], isLoading, error } = useMyJobs();
  const queryClient = useQueryClient();

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = [...jobs];

    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => {
        const isExpired =
          job.recruitEndDate && new Date(job.recruitEndDate) < new Date();

        switch (statusFilter) {
          case "active":
            return job.isActive && !isExpired && !job.deletedAt;
          case "expired":
            return isExpired;
          case "inactive":
            return !job.isActive || !!job.deletedAt; // 비활성화 또는 삭제된 채용공고
          default:
            return true;
        }
      });
    }

    switch (sortBy) {
      case "recent":
        return filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "deadline":
        return filtered.sort((a, b) => {
          if (!a.recruitEndDate && !b.recruitEndDate) return 0;
          if (!a.recruitEndDate) return 1;
          if (!b.recruitEndDate) return -1;
          return (
            new Date(a.recruitEndDate).getTime() -
            new Date(b.recruitEndDate).getTime()
          );
        });
      default:
        return filtered;
    }
  }, [jobs, sortBy, statusFilter]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filteredAndSortedJobs.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleJobClick = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    // 비활성화된 채용공고인 경우 모달 표시
    if (job && (!job.isActive || job.deletedAt)) {
      setClickedJobId(jobId);
      setInactiveModalOpen(true);
      return;
    }
    window.location.href = `/jobs/${jobId}`;
  };

  const handleToggleActive = async (jobId: string | number) => {
    const jobIdStr = String(jobId);
    if (togglingIds.has(jobIdStr)) return; // 이미 토글 중이면 무시

    setTogglingIds((prev) => new Set(prev).add(jobIdStr));

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("accessToken");
      const response = await axios.put(
        `/api/dashboard/hospital/my-jobs/${jobIdStr}/toggle-active`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === "success") {
        // 데이터 다시 불러오기
        await queryClient.invalidateQueries({ queryKey: jobKeys.myJobs });
      } else {
        alert(response.data.message || "상태 변경에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Toggle active error:", error);
      const errorMessage =
        error.response?.data?.message || "상태 변경 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobIdStr);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white">
        <div className="max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white">
        <div className="max-w-[1240px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-red-500">
              오류가 발생했습니다: {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
        {/* 컨텐츠 영역 */}
        <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
          {/* 헤더: 제목과 정렬 SelectBox */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-primary font-title text-[28px] mb-2">
              올린 공고 관리
            </h1>
          </div>

          {/* 필터링 및 정렬 */}
          <div className="flex justify-between">
            <div className="flex gap-4 mb-6">
              <SelectBox
                options={[
                  { value: "all", label: "전체" },
                  { value: "active", label: "모집중" },
                  { value: "expired", label: "마감" },
                  { value: "inactive", label: "비활성" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="상태 선택"
              />
              <SelectBox
                options={[
                  { value: "recent", label: "최신순" },
                  { value: "deadline", label: "마감일순" },
                ]}
                value={sortBy}
                onChange={setSortBy}
                placeholder="정렬 기준"
              />
            </div>
            <Link
              href="/dashboard/hospital/my-jobs/create"
              className="h-[44px] w-[140px] bg-subtext hover:bg-[#3b394d] p-[10px] gap-[10px] flex items-center justify-center text-[white] rounded-[6px] font-text text-semibold text-[18px] whitespace-nowrap"
            >
              <EditIcon size="20" /> 글쓰기
            </Link>
          </div>

          {/* 공고 목록 - 그리드 형태 */}
          <div className="flex flex-col gap-[16px]">
            {currentJobs.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                등록된 채용 공고가 없습니다.
              </div>
            ) : (
              currentJobs.map((job) => {
                const dDay = job.recruitEndDate
                  ? Math.ceil(
                      (new Date(job.recruitEndDate).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    ) > 0
                    ? Math.ceil(
                        (new Date(job.recruitEndDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0
                  : null;

                return (
                  <JobInfoCard
                    key={job.id}
                    id={job.id}
                    hospital={job.hospitalName || "병원명 미설정"}
                    dDay={dDay}
                    position={job.title}
                    location={job.position || "위치 미설정"}
                    jobType={job.experience.join(", ") || "경력무관"}
                    tags={[...job.major, ...job.workType]}
                    isBookmarked={false}
                    isNew={
                      new Date(job.createdAt).getTime() >
                      Date.now() - 7 * 24 * 60 * 60 * 1000
                    }
                    variant="wide"
                    showDeadline={job.recruitEndDate !== null}
                    showToggle={true}
                    isActive={job.isActive}
                    onToggleActive={handleToggleActive}
                    onClick={() => handleJobClick(job.id)}
                  />
                );
              })
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex justify-center my-[50px]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* 비활성화된 채용공고 접근 모달 */}
      {inactiveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                비활성화된 채용공고
              </h3>
              <p className="text-gray-600 mb-6">
                이 채용공고는 현재 비활성화 상태입니다. 채용공고를 활성화하면
                접근할 수 있습니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setInactiveModalOpen(false);
                    setClickedJobId(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
                {clickedJobId && (
                  <button
                    onClick={async () => {
                      setInactiveModalOpen(false);
                      await handleToggleActive(clickedJobId);
                      setClickedJobId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-[#ff8796] text-white rounded-md hover:bg-[#ff9aa6] transition-colors font-medium"
                  >
                    활성화하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
