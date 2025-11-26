// 클라이언트 사이드에서 사용할 수 있는 이메일 검증 함수들
import { VETERINARY_UNIVERSITY_DOMAIN_VALUES } from "@/constants/universityDomains";

// 수의학과 학생 이메일 검증
export function validateStudentEmail(email: string): boolean {
  // 수의과대학 도메인 목록 사용
  const isUniversityEmail = VETERINARY_UNIVERSITY_DOMAIN_VALUES.some((domain) =>
    email.endsWith(`@${domain}`)
  );

  // 대학 이메일만 허용
  return isUniversityEmail;
}
