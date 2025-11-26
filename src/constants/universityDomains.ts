// 수의학과가 있는 대학교 이메일 도메인 목록
export const VETERINARY_UNIVERSITY_DOMAINS = [
  { value: "kangwon.ac.kr", label: "강원대학교" },
  { value: "konkuk.ac.kr", label: "건국대학교" },
  { value: "knu.ac.kr", label: "경북대학교" },
  { value: "gnu.ac.kr", label: "경상국립대학교" },
  { value: "snu.ac.kr", label: "서울대학교" },
  { value: "jnu.ac.kr", label: "전남대학교" },
  { value: "jbnu.ac.kr", label: "전북대학교" },
  { value: "stu.jejunu.ac.kr", label: "제주대학교" },
  { value: "o.cnu.ac.kr", label: "충남대학교" },
  { value: "chungbuk.ac.kr", label: "충북대학교" },
] as const;

// 도메인 값만 추출한 배열 (검증용)
export const VETERINARY_UNIVERSITY_DOMAIN_VALUES = VETERINARY_UNIVERSITY_DOMAINS.map(
  (domain) => domain.value
);

