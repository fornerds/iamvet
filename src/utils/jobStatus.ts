/**
 * 채용공고가 마감되었거나 삭제되었는지 확인하는 유틸리티 함수
 */

export interface JobStatus {
  isExpired: boolean;
  isDeleted: boolean;
  isInactive: boolean;
  isClosed: boolean; // 마감, 삭제, 비활성화 중 하나라도 true면 true
}

/**
 * 채용공고 상태 확인
 * @param job 채용공고 객체 (recruitEndDate, deletedAt, isActive 필드 포함)
 * @returns JobStatus 객체
 */
export function checkJobStatus(job: {
  recruitEndDate?: string | Date | null;
  deletedAt?: string | Date | null;
  isActive?: boolean;
}): JobStatus {
  const now = new Date();
  
  // 마감일 확인
  const isExpired = (() => {
    if (!job.recruitEndDate) return false;
    const deadline = new Date(job.recruitEndDate);
    return deadline < now;
  })();

  // 삭제 여부 확인
  const isDeleted = !!job.deletedAt;

  // 비활성화 여부 확인
  const isInactive = job.isActive === false;

  // 종합: 마감, 삭제, 비활성화 중 하나라도 true면 접근 불가
  const isClosed = isExpired || isDeleted || isInactive;

  return {
    isExpired,
    isDeleted,
    isInactive,
    isClosed,
  };
}

/**
 * 채용공고 ID로 상태 확인 (API 호출)
 * @param jobId 채용공고 ID
 * @returns Promise<JobStatus | null> (null이면 API 호출 실패)
 */
export async function checkJobStatusById(jobId: string): Promise<JobStatus | null> {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      // 404면 삭제된 것으로 간주
      if (response.status === 404) {
        return {
          isExpired: false,
          isDeleted: true,
          isInactive: false,
          isClosed: true,
        };
      }
      return null;
    }

    const result = await response.json();
    if (result.status === "success" && result.data) {
      return checkJobStatus(result.data);
    }

    return null;
  } catch (error) {
    console.error("채용공고 상태 확인 실패:", error);
    return null;
  }
}

