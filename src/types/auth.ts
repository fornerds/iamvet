export interface LoginRequest {
  email: string;
  password: string;
  userType: 'VETERINARIAN' | 'HOSPITAL' | 'VETERINARY_STUDENT';
}

// 통합 회원가입 요청 타입 (신규)
export interface SignupRequest {
  // 공통 필수 필드
  email: string;
  phone: string;
  realName: string;
  userType: 'VETERINARIAN' | 'HOSPITAL' | 'VETERINARY_STUDENT';
  
  // 인증 정보 (SNS 로그인 시 제외)
  loginId?: string;
  password?: string;
  
  // 약관 동의 (필수)
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
  
  // 수의사/학생 전용 필드
  nickname?: string; // 수의사/학생 필수
  birthDate?: Date; // 수의사/학생 필수
  profileImage?: File;
  licenseImage?: File; // 수의사 필수, 학생 선택
  universityEmail?: string; // 학생 필수
  
  // 병원 전용 필드
  hospitalName?: string; // 병원 필수
  establishedDate?: Date; // 병원 필수
  businessNumber?: string; // 병원 필수
  hospitalWebsite?: string;
  hospitalLogo?: File;
  hospitalAddress?: string; // 병원 필수
  hospitalAddressDetail?: string;
  hospitalFacilityImages?: File[]; // 최대 10장
  treatmentAnimals?: ('DOG' | 'CAT' | 'EXOTIC' | 'LARGE_ANIMAL')[]; // 병원 필수
  treatmentSpecialties?: ('INTERNAL_MEDICINE' | 'SURGERY' | 'DERMATOLOGY' | 'DENTISTRY' | 'OPHTHALMOLOGY' | 'NEUROLOGY' | 'ORTHOPEDICS')[]; // 병원 필수
  businessLicenseFile?: File; // 병원 필수
}

// 기존 호환성을 위한 타입 (deprecated)
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// SNS Login Types
export interface SocialLoginRequest {
  provider: 'GOOGLE' | 'KAKAO' | 'NAVER';
  userType: 'veterinarian' | 'hospital' | 'veterinary-student';
}

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  realName?: string;
  phone?: string;
  birthDate?: string;
  profileImage?: string;
  provider: 'GOOGLE' | 'KAKAO' | 'NAVER';
  providerId: string;
  userType: string;
  nickname?: string;
  socialAccounts?: any[];
}

export interface SocialLoginResponse {
  user: SocialUser | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
  } | null;
  isNewUser: boolean;
  isProfileComplete: boolean;
  socialData?: {
    email: string;
    name: string;
    realName?: string;
    phone?: string;
    birthDate?: string;
    profileImage?: string;
    provider: string;
    providerId: string;
    userType: string;
    kakaoTalkUuid?: string;
  };
  // 기존 계정 에러를 위한 추가 필드들
  email?: string;
  hasPassword?: boolean;
  existingProviders?: string[];
  attemptedProvider?: string;
}

// SNS 회원가입 완료 요청 타입
export interface SocialSignupCompleteRequest {
  // SNS에서 받은 기본 정보
  email: string;
  realName: string;
  profileImage?: string;
  provider: 'GOOGLE' | 'KAKAO' | 'NAVER';
  providerId: string;
  
  // 공통 필수 정보
  phone: string;
  userType: 'VETERINARIAN' | 'VETERINARY_STUDENT';
  
  // 약관 동의 (필수)
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
  
  // 수의사/학생 공통 필수
  nickname: string;
  birthDate: Date;
  
  // 수의사 전용
  licenseImage?: File; // 수의사는 필수
  
  // 학생 전용
  universityEmail?: string; // 학생은 필수
}

// 기존 호환성을 위한 타입 (deprecated)
export interface SocialRegistrationData {
  email: string;
  name: string;
  profileImage?: string;
}

export interface VeterinarianSocialRegistration extends SocialRegistrationData {
  // 수의사는 SNS 이메일을 그대로 사용
}

export interface VeterinaryStudentSocialRegistration extends SocialRegistrationData {
  // 수의학과 학생은 별도 대학교 이메일 필요
  universityEmail: string;
}

// Auth Service Response Types
export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Profile Completeness Types
export interface ProfileCompleteness {
  isComplete: boolean;
  missingFields?: string[];
  userType: string;
}