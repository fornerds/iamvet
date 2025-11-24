"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useJobs } from "@/hooks/api/useJobs";

const JobFamousList: React.FC = () => {
  const router = useRouter();
  
  // 인기 채용공고 5개 조회 (조회수나 최신순 기준)
  const { data: jobsData, isLoading } = useJobs({
    sort: 'popular',
    limit: 5,
  });

  // 로딩 중이거나 데이터가 없으면 스켈레톤 표시
  if (isLoading) {
    return (
      <div className="bg-white rounded-[16px] border border-[line-primary] p-[20px] w-full">
        <h2 className="text-[20px] font-title title-light text-primary mb-[10px]">
          인기 채용 공고
        </h2>
        <div className="divide-y divide-[line-primary]">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-[8px] animate-pulse">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const jobs = jobsData?.jobs || [];

  return (
    <div className="bg-white rounded-[16px] border border-[line-primary] p-[20px] w-full">
      <h2 className="text-[20px] font-title title-light text-primary mb-[10px]">
        인기 채용 공고
      </h2>

      <div className="divide-y divide-[line-primary]">
        {jobs.slice(0, 5).map((job: any, index: number) => (
          <div
            key={job.id}
            className="flex items-center space-x-4 p-[8px] hover:bg-gray-50 transition-colors duration-200 cursor-pointer group"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <div
              className={`text-2xl font-bold min-w-[24px] flex items-center justify-center font-title ${
                index + 1 <= 3 ? "text-key1" : "text-guide"
              }`}
            >
              {index + 1}
            </div>

            <div className="flex-1 min-w-0 max-w-[209px]">
              <h3 className="font-text text-bold text-[15px] text-gray-900 hover:text-key1 transition-colors duration-200 truncate">
                {job.hospitalName || job.hospital}
              </h3>
              <div className="flex items-center gap-[4px] text-sm text-gray-600">
                <span className="truncate max-w-[209px]">{job.title || job.position}</span>
                <span className="font-text text-regular text-[14px] flex-shrink-0">{`(${job.workType || job.type || '정규직'})`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobFamousList;
