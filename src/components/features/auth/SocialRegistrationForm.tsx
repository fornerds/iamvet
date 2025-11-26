"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { Button } from "@/components/ui/Button";
import { BirthDateInput } from "@/components/ui/FormattedInput";
import {
  ProfileImageUpload,
  LicenseImageUpload,
} from "@/components/features/profile";
import { checkEmailDuplicate, checkPhoneDuplicate } from "@/actions/auth";
import Link from "next/link";
import { useState, useEffect } from "react";
import { VETERINARY_UNIVERSITY_DOMAINS, VETERINARY_UNIVERSITY_DOMAIN_VALUES } from "@/constants/universityDomains";
import EmailVerificationModal from "@/components/features/auth/EmailVerificationModal";

interface SocialRegistrationData {
  nickname: string;
  phone: string;
  email: string; // 수의학과 학생의 경우 대학교 이메일
  realName: string; // 실명 (SNS 이름과 별도)
  birthDate: string;
  profileImage: string | null;
  licenseImage?: string | null; // 수의사만 필요
  universityEmail?: string; // 수의학과 학생만 필요
  agreements: {
    terms: boolean;
    privacy: boolean;
    marketing: boolean;
  };
}

interface SocialRegistrationFormProps {
  userType: "veterinarian" | "veterinary-student";
  socialData: {
    email: string;
    name: string;
    profileImage?: string;
  };
  onSubmit?: (data: SocialRegistrationData) => void;
  onCancel?: () => void;
}

export const SocialRegistrationForm: React.FC<SocialRegistrationFormProps> = ({
  userType,
  socialData,
  onSubmit,
  onCancel,
}) => {
  // 수의학과 학생의 경우 대학교 이메일 관련 상태
  const [universityEmailId, setUniversityEmailId] = useState("");
  const [selectedUniversityDomain, setSelectedUniversityDomain] = useState("");
  const [emailVerification, setEmailVerification] = useState({
    showModal: false,
    isVerified: false,
  });

  // 폼 상태 관리
  const [formData, setFormData] = useState<SocialRegistrationData>({    nickname: socialData.name || "",
    phone: "",
    email: userType === "veterinary-student" ? "" : socialData.email, // 수의사는 SNS 이메일 사용
    realName: "", // 실명은 사용자가 직접 입력
    birthDate: "",
    profileImage: socialData.profileImage || null,
    licenseImage: null,
    universityEmail: userType === "veterinary-student" ? "" : undefined,
    agreements: {
      terms: true, // SNS 로그인 시 자동 동의
      privacy: true,
      marketing: false,
    },
  });

  // 중복확인 상태
  const [duplicateCheck, setDuplicateCheck] = useState({
    email: {
      isChecking: false,
      isValid: userType === "veterinarian", // 수의사는 SNS 이메일 사용하므로 기본 valid
    },
    universityEmail: {
      isChecking: false,
      isValid: false,
    },
    phone: {
      isChecking: false,
      isValid: false,
    },
  });

  // 입력 에러 상태
  const [inputErrors, setInputErrors] = useState({    realName: "",
    nickname: "",
    phone: "",
    email: "",
    birthDate: "",
    universityEmail: "",
  });

  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: true, // SNS 로그인 시 필수 약관은 자동 동의
    terms: true,
    privacy: true,
    marketing: false,
  });

  const handleInputChange =
    (field: keyof SocialRegistrationData) => (value: string) => {
      // 연락처 필드인 경우 자동 포맷팅
      if (field === "phone") {
        // 숫자만 추출
        const numbers = value.replace(/\D/g, "");

        // 최대 11자리까지만 허용
        const truncated = numbers.slice(0, 11);

        // 형식에 맞게 변환
        let formattedValue = "";
        if (truncated.length <= 3) {
          formattedValue = truncated;
        } else if (truncated.length <= 7) {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
        } else {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(
            3,
            7
          )}-${truncated.slice(7)}`;
        }

        setFormData((prev) => ({ ...prev, [field]: formattedValue }));

        // 입력 시 해당 필드 에러 초기화
        if (inputErrors[field as keyof typeof inputErrors]) {
          setInputErrors((prev) => ({ ...prev, [field]: "" }));
        }

        // 실시간 검증
        validateField(field, formattedValue);
        return;
      }

      setFormData((prev) => ({ ...prev, [field]: value }));

      // 입력 시 해당 필드 에러 초기화
      if (inputErrors[field as keyof typeof inputErrors]) {
        setInputErrors((prev) => ({ ...prev, [field]: "" }));
      }

      // 실시간 검증
      validateField(field, value);
    };

  const validateField = (
    field: keyof SocialRegistrationData,
    value: string
  ) => {
    let error = "";

    switch (field) {
      case "realName":
        if (!value.trim()) {
          error = "실명을 입력해주세요.";
        } else if (value.length < 2) {
          error = "실명은 2자 이상 입력해주세요.";
        }
        break;

      case "nickname":
        if (!value.trim()) {
          error = "닉네임을 입력해주세요.";
        } else if (value.length < 2) {
          error = "닉네임은 2자 이상 입력해주세요.";
        }
        break;

      case "phone":
        const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;
        if (!value.trim()) {
          error = "연락처를 입력해주세요.";
        } else if (!phoneRegex.test(value)) {
          error = "000-0000-0000 형식으로 입력해주세요.";
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          error = "이메일을 입력해주세요.";
        } else if (!emailRegex.test(value)) {
          error = "올바른 이메일 형식을 입력해주세요.";
        }
        break;
      
      case "universityEmail":
        if (!universityEmailId.trim()) {
          error = "이메일 아이디를 입력해주세요.";
        } else if (!selectedUniversityDomain) {
          error = "대학교를 선택해주세요.";
        }
        break;

      case "birthDate":
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!value.trim()) {
          error = "생년월일을 입력해주세요.";
        } else if (!dateRegex.test(value)) {
          error = "YYYY-MM-DD 형식으로 입력해주세요.";
        } else {
          // 날짜 유효성 검증
          const [year, month, day] = value.split("-").map(Number);
          const inputDate = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // 월 유효성 검증 (1-12)
          if (month < 1 || month > 12) {
            error = "월은 1월부터 12월까지만 입력 가능합니다.";
          }
          // 일 유효성 검증
          else if (day < 1 || day > 31) {
            error = "일은 1일부터 31일까지만 입력 가능합니다.";
          }
          // 각 월의 일수 검증
          else if (inputDate.getMonth() !== month - 1) {
            // JavaScript Date 객체가 자동으로 날짜를 조정하면 잘못된 날짜
            error = `${month}월은 ${day}일이 존재하지 않습니다.`;
          }
          // 미래 날짜 검증
          else if (inputDate > today) {
            error = "미래 날짜는 선택할 수 없습니다.";
          }
          // 너무 오래된 날짜 검증 (100년 이상)
          else if (year < today.getFullYear() - 100) {
            error = "올바른 생년월일을 입력해주세요.";
          }
        }
        break;
    }

    setInputErrors((prev) => ({ ...prev, [field]: error }));
  };

  // 대학교 이메일 검증 (수의학과가 있는 대학교만)
  const validateUniversityEmail = (email: string): boolean => {
    const domain = email.split("@")[1]?.toLowerCase();
    return VETERINARY_UNIVERSITY_DOMAIN_VALUES.includes(domain as any);
  };

  // 대학교 이메일 조합 및 업데이트
  useEffect(() => {
    if (userType === "veterinary-student" && universityEmailId && selectedUniversityDomain) {
      const fullEmail = `${universityEmailId}@${selectedUniversityDomain}`;
      setFormData((prev) => ({ ...prev, universityEmail: fullEmail }));
    }
  }, [universityEmailId, selectedUniversityDomain, userType]);

  // 이메일 인증 모달 열기
  const handleOpenEmailVerification = () => {
    if (!universityEmailId.trim()) {
      alert("이메일 아이디를 입력해주세요.");
      return;
    }

    if (!selectedUniversityDomain) {
      alert("대학교를 선택해주세요.");
      return;
    }

    const fullEmail = `${universityEmailId}@${selectedUniversityDomain}`;
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fullEmail)) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setFormData((prev) => ({ ...prev, universityEmail: fullEmail }));
    setEmailVerification({ showModal: true, isVerified: false });
  };

  // 이메일 인증 완료 처리
  const handleEmailVerified = () => {
    setEmailVerification({ showModal: false, isVerified: true });
    setDuplicateCheck((prev) => ({
      ...prev,
      universityEmail: {
        ...prev.universityEmail,
        isValid: true,
      },
    }));
  };

  // 이메일 인증 모달 닫기
  const handleEmailVerificationClose = () => {
    setEmailVerification({ showModal: false, isVerified: false });
  };

  const handleImageChange =
    (
      field: keyof Pick<SocialRegistrationData, "profileImage" | "licenseImage">
    ) =>
    (url: string | null) => {
      setFormData((prev) => ({ ...prev, [field]: url }));
    };


  const handlePhoneDuplicateCheck = async () => {
    if (!formData.phone.trim()) {
      alert("연락처를 입력해주세요.");
      return;
    }

    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert("000-0000-0000 형식으로 입력해주세요.");
      return;
    }

    setDuplicateCheck((prev) => ({
      ...prev,
      phone: { ...prev.phone, isChecking: true },
    }));

    try {
      const result = await checkPhoneDuplicate(formData.phone);

      if (result.success) {
        const isValid = !result.isDuplicate;
        setDuplicateCheck((prev) => ({
          ...prev,
          phone: {
            isChecking: false,
            isValid,
          },
        }));
        alert(result.message);
      } else {
        setDuplicateCheck((prev) => ({
          ...prev,
          phone: { ...prev.phone, isChecking: false },
        }));
        alert(result.error || "연락처 중복 확인 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("연락처 중복 확인 오류:", error);
      setDuplicateCheck((prev) => ({
        ...prev,
        phone: { ...prev.phone, isChecking: false },
      }));
      alert("연락처 중복 확인 중 오류가 발생했습니다.");
    }
  };

  const handleAgreementChange =
    (field: keyof typeof agreements) => (checked: boolean) => {
      setAgreements((prev) => {
        const newAgreements = { ...prev, [field]: checked };

        // 전체 동의 체크/해제
        if (field === "all") {
          const updatedAgreements = {
            all: checked,
            terms: checked,
            privacy: checked,
            marketing: checked,
          };

          // formData.agreements도 동기화
          setFormData((prevFormData) => ({
            ...prevFormData,
            agreements: {
              terms: checked,
              privacy: checked,
              marketing: checked,
            },
          }));

          return updatedAgreements;
        }

        // 개별 항목 체크 시 전체 동의 상태 업데이트
        const { all, ...others } = newAgreements;
        const allChecked = Object.values(others).every(Boolean);
        newAgreements.all = allChecked;

        // formData.agreements도 동기화
        setFormData((prevFormData) => ({
          ...prevFormData,
          agreements: {
            terms: field === "terms" ? checked : prevFormData.agreements.terms,
            privacy:
              field === "privacy" ? checked : prevFormData.agreements.privacy,
            marketing:
              field === "marketing"
                ? checked
                : prevFormData.agreements.marketing,
          },
        }));

        return newAgreements;
      });
    };

  const handleSubmit = () => {
    const requiredFields: (keyof typeof inputErrors)[] = [
      "realName",
      "nickname",
      "phone",
      "birthDate",
    ];

    // 수의학과 학생의 경우 대학교 이메일 필수
    if (userType === "veterinary-student") {
      requiredFields.push("universityEmail");
    }

    const errors: string[] = [];

    requiredFields.forEach((field) => {
      if (field === "universityEmail") {
        // 대학교 이메일 검증
        if (!universityEmailId.trim()) {
          errors.push("이메일 아이디를 입력해주세요.");
        } else if (!selectedUniversityDomain) {
          errors.push("대학교를 선택해주세요.");
        } else {
          validateField("universityEmail" as any, formData.universityEmail || "");
        }
      } else {
        const value = formData[field] as string;
        validateField(field as keyof SocialRegistrationData, value);

        if (!value?.trim()) {
          const fieldName: Record<string, string> = {
            realName: "실명",
            nickname: "닉네임",
            phone: "연락처",
            birthDate: "생년월일",
            email: "이메일",
          };
          errors.push(`${fieldName[field]}를 입력해주세요.`);
        }
      }
    });

    // 수의학과 학생의 경우 대학교 이메일 인증 확인
    if (
      userType === "veterinary-student" &&
      !emailVerification.isVerified
    ) {
      errors.push("대학교 이메일 인증을 완료해주세요.");
    }

    // 연락처 중복확인 검증
    if (!duplicateCheck.phone.isValid) {
      errors.push("연락처 중복확인을 완료해주세요.");
    }

    // 약관 동의 검증
    if (!formData.agreements.terms || !formData.agreements.privacy) {
      errors.push("필수 약관에 동의해주세요.");
    }

    // 에러가 있다면 첫 번째 에러 표시
    if (errors.length > 0) {
      alert(errors[0]);
      return;
    }

    // 수의학과 학생의 경우 universityEmail을 email로 설정
    if (userType === "veterinary-student" && formData.universityEmail) {
      formData.email = formData.universityEmail;
    }

    onSubmit?.(formData);
  };

  const handleCancel = () => {
    if (confirm("작성 중인 내용이 모두 사라집니다. 정말 취소하시겠습니까?")) {
      onCancel?.();
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="flex flex-col gap-[80px]">
        {/* SNS 계정 정보 표시 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            연결된 SNS 계정
          </h2>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700 mb-2">
              <strong>이름:</strong> {socialData.name}
            </p>
            <p className="text-sm text-blue-700">
              <strong>이메일:</strong> {socialData.email}
            </p>
          </div>
        </section>

        {/* 기본 정보 섹션 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            추가 정보 입력
          </h2>

          {/* 프로필 사진 */}
          <div className="mb-6">
            <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
              프로필 사진
            </label>
            <ProfileImageUpload
              value={formData.profileImage || undefined}
              onChange={handleImageChange("profileImage")}
              folder="profiles"
            />
          </div>

          <div className="space-y-6">
            {/* 실명 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                실명
              </label>
              <InputBox
                value={formData.realName}
                onChange={handleInputChange("realName")}
                placeholder="실명을 입력해주세요"
                error={!!inputErrors.realName}
                guide={
                  inputErrors.realName
                    ? { text: inputErrors.realName, type: "error" }
                    : undefined
                }
              />
            </div>

            {/* 닉네임 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                닉네임
              </label>
              <InputBox
                value={formData.nickname}
                onChange={handleInputChange("nickname")}
                placeholder="닉네임을 입력해주세요"
                error={!!inputErrors.nickname}
                guide={
                  inputErrors.nickname
                    ? { text: inputErrors.nickname, type: "error" }
                    : undefined
                }
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                연락처
              </label>
              <InputBox
                value={formData.phone}
                onChange={handleInputChange("phone")}
                placeholder="000-0000-0000 형식으로 입력해주세요"
                duplicateCheck={{
                  buttonText: "중복 확인",
                  onCheck: handlePhoneDuplicateCheck,
                  isChecking: duplicateCheck.phone.isChecking,
                  isValid: duplicateCheck.phone.isValid,
                }}
                success={duplicateCheck.phone.isValid}
                error={!!inputErrors.phone}
                guide={
                  inputErrors.phone
                    ? { text: inputErrors.phone, type: "error" }
                    : duplicateCheck.phone.isValid
                    ? { text: "사용 가능한 연락처입니다.", type: "success" }
                    : undefined
                }
              />
            </div>

            {/* 수의학과 학생의 경우 대학교 이메일 입력 */}
            {userType === "veterinary-student" && (
              <div>
                <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                  대학교 이메일
                  <span className="text-sm text-gray-500 ml-2">
                    (수의학과 인증용)
                  </span>
                </label>
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
                  <p>수의학과 인증을 위해 대학교 이메일을 입력해주세요.</p>
                </div>
                
                {/* 이메일 아이디 입력 및 도메인 선택 */}
                <div className="flex gap-2 mb-3 items-center">
                  <div className="flex-1">
                    <InputBox
                      value={universityEmailId}
                      onChange={(value) => {
                        setUniversityEmailId(value);
                        setEmailVerification({ showModal: false, isVerified: false });
                        setDuplicateCheck((prev) => ({
                          ...prev,
                          universityEmail: { ...prev.universityEmail, isValid: false },
                        }));
                      }}
                      placeholder="이메일 아이디"
                      type="text"
                      error={!!inputErrors.universityEmail && !universityEmailId}
                    />
                  </div>
                  <div className="flex items-center text-gray-500 text-[16px] px-2 font-medium">
                    @
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedUniversityDomain}
                      onChange={(e) => {
                        setSelectedUniversityDomain(e.target.value);
                        setEmailVerification({ showModal: false, isVerified: false });
                        setDuplicateCheck((prev) => ({
                          ...prev,
                          universityEmail: { ...prev.universityEmail, isValid: false },
                        }));
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md text-[16px] focus:outline-none focus:ring-2 focus:ring-[#FF8796] focus:border-transparent bg-white"
                    >
                      <option value="">도메인 선택</option>
                      {VETERINARY_UNIVERSITY_DOMAINS.map((domain) => (
                        <option key={domain.value} value={domain.value}>
                          {domain.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 인증 버튼 */}
                <div className="mb-3">
                  <Button
                    variant="line"
                    size="medium"
                    onClick={handleOpenEmailVerification}
                    disabled={!universityEmailId || !selectedUniversityDomain || emailVerification.isVerified}
                    fullWidth={true}
                  >
                    {emailVerification.isVerified ? "인증 완료" : "인증번호 받기"}
                  </Button>
                </div>

                {/* 인증 상태 표시 */}
                {emailVerification.isVerified && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                    <p>✅ 이메일 인증이 완료되었습니다.</p>
                  </div>
                )}

                {inputErrors.universityEmail && (
                  <p className="text-red-500 text-sm mt-2">
                    {inputErrors.universityEmail}
                  </p>
                )}
              </div>
            )}

            {/* 생년월일 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                생년월일
              </label>
              <BirthDateInput
                value={formData.birthDate}
                onChange={handleInputChange("birthDate")}
                placeholder="YYYY-MM-DD"
                className={inputErrors.birthDate ? "border-red-500" : ""}
              />
              {inputErrors.birthDate && (
                <p className="text-red-500 text-sm mt-2">
                  {inputErrors.birthDate}
                </p>
              )}
            </div>

            {/* 수의사의 경우 면허증 이미지 */}
            {userType === "veterinarian" && (
              <div>
                <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                  수의사 면허증
                  <span className="text-sm text-gray-500 ml-2">(선택)</span>
                </label>
                <LicenseImageUpload
                  value={formData.licenseImage || undefined}
                  onChange={handleImageChange("licenseImage")}
                />
              </div>
            )}
          </div>
        </section>

        {/* 약관 동의 섹션 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            약관 동의
          </h2>

          <div className="p-[20px] rounded-[16px] space-y-4 border border-[1px] border-[line-primary]">
            {/* 전체 동의 */}
            <div className="pb-4 border-b border-[#E5E5E5]">
              <Checkbox
                checked={agreements.all}
                onChange={handleAgreementChange("all")}
                className="text-[18px] font-bold text-[#3B394D]"
              >
                전체동의
              </Checkbox>
            </div>

            {/* 개별 약관 */}
            <div className="space-y-3 flex flex-col">
              <Checkbox
                checked={agreements.terms}
                onChange={handleAgreementChange("terms")}
                className="text-[16px] text-[#35313C] w-full"
              >
                <Link href="/terms" className="text-[#35313C] underline">
                  이용약관
                </Link>{" "}
                동의 <span className="text-[#FF4A4A]">(필수)</span>
              </Checkbox>

              <Checkbox
                checked={agreements.privacy}
                onChange={handleAgreementChange("privacy")}
                className="text-[16px] text-[#35313C] w-full"
              >
                <Link href="/privacy" className="text-[#35313C] underline">
                  개인정보처리방침
                </Link>{" "}
                동의 <span className="text-[#FF4A4A]">(필수)</span>
              </Checkbox>

              <Checkbox
                checked={agreements.marketing}
                onChange={handleAgreementChange("marketing")}
                className="text-[16px] text-[#35313C] w-full"
              >
                <Link href="/marketing" className="text-[#35313C] underline">
                  마케팅정보수신
                </Link>{" "}
                동의 <span className="text-[#C5CCD8]">(선택)</span>
              </Checkbox>
            </div>
          </div>
        </section>

        {/* 버튼 영역 */}
        <div className="flex gap-4 w-full min-w-0 flex justify-center">
          <Button
            variant="line"
            size="medium"
            onClick={handleCancel}
            fullWidth={true}
          >
            취소
          </Button>
          <Button
            variant="keycolor"
            size="medium"
            onClick={handleSubmit}
            fullWidth={true}
          >
            회원가입 완료
          </Button>
        </div>
      </div>

      {/* 이메일 인증 모달 */}
      {userType === "veterinary-student" && emailVerification.showModal && formData.universityEmail && (
        <EmailVerificationModal
          email={formData.universityEmail}
          name={formData.realName || socialData.name}
          onVerified={handleEmailVerified}
          onClose={handleEmailVerificationClose}
          autoSend={true}
        />
      )}
    </div>
  );
};
