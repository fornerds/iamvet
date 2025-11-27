"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ArrowLeftIcon } from "public/icons";
import { Tag } from "@/components/ui/Tag";
import { SelectBox } from "@/components/ui/SelectBox";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { useVeterinarianApplications } from "@/hooks/api/useVeterinarianApplications";
import profileImg from "@/assets/images/profile.png";
import { ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/constants/applicationStatus";
import JobClosedModal from "@/components/ui/JobClosedModal";
import { checkJobStatusById } from "@/utils/jobStatus";

interface ApplicationData {
  id: number;
  jobId: string;
  applicationDate: string;
  hospitalName: string;
  jobPosition: string;
  hospitalContact: string;
  status: ApplicationStatus;
  hospitalLogo?: string;
}

const MobileApplicationCard: React.FC<{ 
  application: ApplicationData;
  onJobClick: (jobId: string) => void;
}> = ({
  application,
  onJobClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onJobClick(application.jobId);
  };

  return (
    <div className="bg-white border border-[#EFEFF0] rounded-[12px] p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Image
            src={application.hospitalLogo || profileImg}
            alt="병원 로고"
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover"
          />
          <span className="text-[16px] font-bold text-primary">
            {application.hospitalName}
          </span>
        </div>
        <button onClick={handleClick} className="cursor-pointer">
          <ArrowRightIcon currentColor="currentColor" size="20" />
        </button>
      </div>

      <div className="flex flex-col gap-[4px]">
        <div className="flex gap-[20px]">
          <span className="text-[14px] text-gray-500 block w-[70px]">
            지원 포지션
          </span>
          <span className="text-[14px] text-primary font-medium">
            {application.jobPosition}
          </span>
        </div>
        <div className="flex gap-[20px]">
          <span className="text-[14px] text-gray-500 block w-[70px]">
            연락처
          </span>
          <span className="text-[14px] text-gray-700">
            {application.hospitalContact}
          </span>
        </div>
      </div>

      <div className="mt-[20px] flex items-center justify-between">
        <span className="text-[12px] text-gray-500">
          {application.applicationDate}
        </span>
        <Tag variant={APPLICATION_STATUS_COLORS[application.status]}>
          {APPLICATION_STATUS_LABELS[application.status]}
        </Tag>
      </div>
    </div>
  );
};

const sortOptions = [
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "status", label: "상태순" },
];

export default function VeterinarianApplicationsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("latest");
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API를 통해 지원내역 데이터 가져오기
  const { data: applicationsData, isLoading, error } = useVeterinarianApplications(sortBy);
  
  const allApplications: ApplicationData[] = applicationsData?.applications?.map((app: any) => ({
    id: app.id,
    jobId: app.jobId,
    applicationDate: app.applicationDate,
    hospitalName: app.hospitalName,
    jobPosition: app.jobPosition,
    hospitalContact: app.hospitalContact,
    status: app.status,
    hospitalLogo: app.hospitalLogo,
  })) || [];

  // 클라이언트 사이드 정렬은 서버에서 이미 정렬된 데이터를 사용하므로 제거
  const sortedApplications = allApplications;

  // 페이지네이션
  const totalPages = Math.ceil(sortedApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentApplications = sortedApplications.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // 채용공고 클릭 핸들러
  const handleJobClick = async (jobId: string) => {
    const status = await checkJobStatusById(jobId);
    if (status?.isClosed) {
      setIsModalOpen(true);
    } else {
      window.location.href = `/jobs/${jobId}`;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
        {/* 뒤로가기 버튼 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/veterinarian" className="p-2">
            <ArrowLeftIcon currentColor="currentColor" />
          </Link>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
          {/* 헤더: 제목과 정렬 SelectBox */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-primary font-text text-[24px] text-bold">
              지원 내역
            </h1>
            <SelectBox
              value={sortBy}
              onChange={setSortBy}
              placeholder="최신순"
              options={sortOptions}
            />
          </div>
          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-gray-500">지원내역을 불러오는 중...</div>
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="flex justify-center items-center py-20">
              <div className="text-red-500">지원내역을 불러오는데 실패했습니다.</div>
            </div>
          )}

          {/* 데이터가 없는 경우 */}
          {!isLoading && !error && currentApplications.length === 0 && (
            <div className="flex justify-center items-center py-20">
              <div className="text-gray-500">지원내역이 없습니다.</div>
            </div>
          )}

          {/* 모바일 버전 (xl 이하) */}
          {!isLoading && !error && currentApplications.length > 0 && (
            <div className="block xl:hidden">
              {currentApplications.map((application) => (
                <MobileApplicationCard
                  key={application.id}
                  application={application}
                  onJobClick={handleJobClick}
                />
              ))}
            </div>
          )}

          {/* 데스크톱 버전 (xl 이상) */}
          {!isLoading && !error && currentApplications.length > 0 && (
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-box-light">
                  <th className="text-left py-[22px] pl-[30px] text-sm font-medium text-gray-500 border border-[#EFEFF0] border-r-0 rounded-l-[8px]">
                    지원일자
                  </th>
                  <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                    지원한 병원
                  </th>
                  <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                    병원 연락처/이메일
                  </th>
                  <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                    상태
                  </th>
                  <th className="text-left py-[22px] pr-[30px] text-sm font-medium text-gray-500 border border-[#EFEFF0] border-l-0 rounded-r-[8px]">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentApplications.map((application) => (
                  <tr key={application.id} className="border-b border-gray-100">
                    <td className="py-[22px] pl-[30px] text-sm text-gray-900">
                      {application.applicationDate}
                    </td>
                    <td className="py-[22px] text-sm text-gray-900">
                      {application.hospitalName}
                    </td>
                    <td className="py-[22px] text-sm text-gray-600">
                      {application.hospitalContact}
                    </td>
                    <td className="py-[22px]">
                      <Tag variant={APPLICATION_STATUS_COLORS[application.status]}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Tag>
                    </td>
                    <td className="py-[22px] pr-[30px]">
                      <button
                        onClick={() => handleJobClick(application.jobId)}
                        className="text-key1 text-[16px] font-bold no-underline hover:underline hover:underline-offset-[3px] cursor-pointer"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {!isLoading && !error && currentApplications.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* 마감/삭제된 공고 모달 */}
      <JobClosedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
