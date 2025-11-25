import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { api } from "@/lib/api-client";

interface WorkConditions {
  workType: string;
  workDays: string;
  workHours: string;
  salary: string;
  benefits: string;
}

interface Qualifications {
  education: string;
  certificates: string;
  experience: string;
}

interface Hospital {
  id: string;
  name: string;
  location: string;
  description: string;
  website: string;
  phone: string;
  keywords: string[];
  image?: string;
  userId?: string;
}

interface JobDetail {
  id: string;
  title: string;
  position: string;
  experienceLevel: string;
  location: string;
  keywords: string[];
  deadline: string;
  recruitEndDate: string;
  workConditions: WorkConditions;
  qualifications: Qualifications;
  preferredQualifications: string[];
  hospital: Hospital;
  hospitalId: string;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
  workType: string | string[];
  experience: string | string[];
  major: string[];
  medicalField: string[];
  department: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  benefits: string;
  workDays: string;
  workStartTime: string;
  workEndTime: string;
  isWorkDaysNegotiable: boolean;
  isWorkTimeNegotiable: boolean;
  salary: string;
  salaryType: string;
  relatedJobs: any[];
  hospitalUserId?: string;
  isOwner?: boolean;
  hasApplied?: boolean;
  isLiked?: boolean;
}

export const useJobDetail = (jobId: string) => {
  return useQuery<JobDetail>({
    queryKey: [QUERY_KEYS.JOB_DETAIL, jobId],
    queryFn: async () => {
      console.log("[useJobDetail] Making API request with cookie auth");
      const response = await api.get(`/jobs/${jobId}`);

      if (response.data.status === "success") {
        const job = response.data.data;

        // 디버깅: API 응답 확인
        console.log("API response job data:", job);
        console.log("hasApplied from API:", job.hasApplied);

        // Transform API response to match the expected format
        const transformedJob = {
          ...job,
          isOwner: job.isOwner,
          hasApplied: job.hasApplied || false,
          hospitalUserId: job.hospitalUserId || job.userid || job.hospitalId,
          experienceLevel: Array.isArray(job.experience)
            ? job.experience.join(", ")
            : job.experience || "경력무관",
          keywords: [
            ...(Array.isArray(job.workType)
              ? job.workType
              : [job.workType].filter(Boolean)),
            ...(Array.isArray(job.experience)
              ? job.experience
              : [job.experience].filter(Boolean)),
            ...(Array.isArray(job.major) ? job.major.slice(0, 2) : []),
          ].filter(Boolean),
          deadline: job.recruitEndDate
            ? `D-${Math.max(
                0,
                Math.ceil(
                  (new Date(job.recruitEndDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              )}`
            : "상시",
          location: job.hospital_address || "위치 정보 없음",
          workConditions: {
            workType: Array.isArray(job.workType)
              ? job.workType.join(", ")
              : job.workType?.[0] || "정규직",
            workDays: (() => {
              if (!job.workDays) return "주 5일";
              if (Array.isArray(job.workDays)) {
                const dayMap: { [key: string]: string } = {
                  monday: "월",
                  tuesday: "화",
                  wednesday: "수",
                  thursday: "목",
                  friday: "금",
                  saturday: "토",
                  sunday: "일",
                };
                return (
                  job.workDays
                    .map((day: string) => dayMap[day] || day)
                    .join(", ") + "요일"
                );
              }
              return job.workDays;
            })(),
            workHours:
              job.workStartTime && job.workEndTime
                ? `${job.workStartTime} - ${job.workEndTime}`
                : job.isWorkTimeNegotiable
                ? "협의 가능"
                : "09:00 - 18:00",
            salary:
              job.salary && job.salaryType
                ? `${job.salaryType} ${job.salary}만원`
                : "협의",
          },
          benefits: job.benefits || "",
          qualifications: {
            education: Array.isArray(job.education)
              ? job.education.join(", ")
              : job.education?.[0] || "학력무관",
            certificates: Array.isArray(job.certifications)
              ? job.certifications.join(", ")
              : job.certifications?.[0] || "수의사 면허",
            experience: Array.isArray(job.experienceDetails)
              ? job.experienceDetails.join(", ")
              : job.experienceDetails?.[0] || "경력무관",
          },
          preferredQualifications: job.preferences || [],
          hospital: {
            id: job.hospitalId || "",
            name: job.hospital_name || "병원명",
            location: job.hospital_address || "위치 정보 없음",
            description: job.hospitalDescription || "",
            website: job.hospital_website || "",
            phone: job.hospital_phone || "",
            keywords: [],
            image: job.hospital_logo,
            userId: job.hospital?.userId || job.hospitalUserId || job.userId,
          },
        };

        console.log("Transformed job hasApplied:", transformedJob.hasApplied);
        return transformedJob;
      }

      throw new Error(response.data.message || "채용공고를 불러올 수 없습니다");
    },
    enabled: !!jobId,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
