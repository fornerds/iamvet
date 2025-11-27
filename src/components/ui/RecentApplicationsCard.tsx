"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag } from "./Tag";
import { ArrowRightIcon } from "public/icons";
import profileImg from "@/assets/images/profile.png";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationStatus, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/constants/applicationStatus";
import JobClosedModal from "@/components/ui/JobClosedModal";
import { checkJobStatusById } from "@/utils/jobStatus";

interface ApplicationData {
  id: number;
  applicationDate: string;
  applicant: string;
  position: string;
  contact: string;
  status: ApplicationStatus;
  profileImage?: string;
  jobId: string;
  applicationId: string;
}

interface RecentApplicationsCardProps {
  applications?: ApplicationData[];
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
            src={application.profileImage || profileImg}
            alt="프로필"
            width={36}
            height={36}
            className="w-10 h-10 rounded-full object-cover"
          />
          <span className="text-[16px] font-bold text-primary">
            {application.applicant}
          </span>
        </div>
        <button onClick={handleClick} className="cursor-pointer">
          <ArrowRightIcon size="20" />
        </button>
      </div>

      <div className="flex flex-col gap-[4px]">
        <div className="flex gap-[20px]">
          <span className="text-[14px] text-gray-500 block w-[70px]">
            지원 포지션
          </span>
          <span className="text-[14px] text-primary font-medium">
            {application.position}
          </span>
        </div>
        <div className="flex gap-[20px]">
          <span className="text-[14px] text-gray-500 block w-[70px]">
            연락처
          </span>
          <span className="text-[14px] text-gray-700">
            {application.contact}
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

const RecentApplicationsCard: React.FC<RecentApplicationsCardProps> = () => {
  const { applications, loading, error } = useApplications(3);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 채용공고 클릭 핸들러
  const handleJobClick = async (jobId: string) => {
    const status = await checkJobStatusById(jobId);
    if (status?.isClosed) {
      setIsModalOpen(true);
    } else {
      window.location.href = `/jobs/${jobId}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold text-primary">최근 지원 내역</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <span className="text-gray-500">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold text-primary">최근 지원 내역</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <span className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</span>
        </div>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-bold text-primary">최근 지원 내역</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <span className="text-gray-500">아직 지원한 공고가 없습니다.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-primary">최근 지원 내역</h2>
        <Link
          href="/dashboard/veterinarian/applications"
          className="text-key1 text-[16px] font-bold no-underline hover:underline hover:underline-offset-[3px]"
        >
          전체보기
        </Link>
      </div>

      {/* 모바일 버전 (xl 이하) */}
      <div className="block xl:hidden">
        {applications.slice(0, 3).map((application) => (
          <MobileApplicationCard
            key={application.id}
            application={application}
            onJobClick={handleJobClick}
          />
        ))}
      </div>

      {/* 데스크톱 버전 (xl 이상) */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-box-light">
              <th className="text-left py-[22px] pl-[30px] text-sm font-medium text-gray-500 border border-[#EFEFF0] border-r-0 rounded-l-[8px]">
                지원일자
              </th>
              <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                지원자
              </th>
              <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                지원 포지션
              </th>
              <th className="text-left py-[22px] text-sm font-medium text-gray-500 border-t border-b border-[#EFEFF0]">
                연락처/이메일
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
            {applications.map((application) => (
              <tr key={application.id} className="border-b border-gray-100">
                <td className="py-[22px] pl-[30px] text-sm text-gray-900">
                  {application.applicationDate}
                </td>
                <td className="py-[22px] text-sm text-gray-900">
                  {application.applicant}
                </td>
                <td className="py-[22px] text-sm text-gray-900">
                  {application.position}
                </td>
                <td className="py-[22px] text-sm text-gray-600">
                  {application.contact}
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

      {/* 마감/삭제된 공고 모달 */}
      <JobClosedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default RecentApplicationsCard;
