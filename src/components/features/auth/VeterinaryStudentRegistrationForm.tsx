"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { Button } from "@/components/ui/Button";
import { BirthDateInput } from "@/components/ui/FormattedInput";
import { ProfileImageUpload } from "@/components/features/profile";
import { checkEmailDuplicate, checkLoginIdDuplicate, checkPhoneDuplicate } from "@/actions/auth";
import { validateStudentEmail } from "@/lib/emailValidation";
import EmailVerificationModal from "./EmailVerificationModal";
import Link from "next/link";
import { useState, useEffect } from "react";
import { VETERINARY_UNIVERSITY_DOMAINS, VETERINARY_UNIVERSITY_DOMAIN_VALUES } from "@/constants/universityDomains";

interface VeterinaryStudentRegistrationData {
  loginId: string;
  password: string;
  passwordConfirm: string;
  realName: string;
  nickname: string;
  phone: string;
  email: string;
  birthDate: string;
  profileImage: string | null;
  agreements: {
    terms: boolean;
    privacy: boolean;
    marketing: boolean;
  };
}

interface VeterinaryStudentRegistrationFormProps {
  onSubmit?: (data: VeterinaryStudentRegistrationData) => void;
  onCancel?: () => void;
  socialData?: {
    email: string;
    name: string;
    profileImage?: string;
  };
}

export const VeterinaryStudentRegistrationForm: React.FC<
  VeterinaryStudentRegistrationFormProps
> = ({ onSubmit, onCancel, socialData }) => {
  // 폼 상태 관리
  const [formData, setFormData] = useState<VeterinaryStudentRegistrationData>({
    loginId: "",
    password: socialData ? "" : "", // SNS 로그인 시 패스워드 불필요
    passwordConfirm: socialData ? "" : "",
    realName: socialData?.name || "",
    nickname: "",
    phone: "",
    email: "", // 대학 이메일은 별도 입력 필요
    birthDate: "",
    profileImage: socialData?.profileImage || null,
    agreements: {
      terms: !!socialData, // SNS 로그인 시 자동 동의
      privacy: !!socialData,
      marketing: false,
    },
  });

  // 중복확인 상태
  const [duplicateCheck, setDuplicateCheck] = useState({
    loginId: {
      isChecking: false,
      isValid: false,
    },
    email: {
      isChecking: false,
      isValid: false,
    },
    phone: {
      isChecking: false,
      isValid: false,
    },
  });

  // 이메일 인증 상태
  const [emailVerification, setEmailVerification] = useState({
    showModal: false,
    isVerified: false,
  });

  // 수의학과 학생의 경우 대학교 이메일 관련 상태
  const [universityEmailId, setUniversityEmailId] = useState("");
  const [selectedUniversityDomain, setSelectedUniversityDomain] = useState("");

  // 대학교 이메일 조합 및 업데이트
  useEffect(() => {
    if (universityEmailId && selectedUniversityDomain) {
      const fullEmail = `${universityEmailId}@${selectedUniversityDomain}`;
      setFormData((prev) => ({ ...prev, email: fullEmail }));
    }
  }, [universityEmailId, selectedUniversityDomain]);

  // 입력 에러 상태
  const [inputErrors, setInputErrors] = useState({
    loginId: "",
    password: "",
    passwordConfirm: "",
    realName: "",
    nickname: "",
    phone: "",
    email: "",
    birthDate: "",
  });

  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const handleInputChange =
    (field: keyof VeterinaryStudentRegistrationData) => (value: string) => {
      // 연락처 필드인 경우 자동 포맷팅
      if (field === "phone") {
        // 숫자만 추출
        const numbers = value.replace(/\D/g, '');
        
        // 최대 11자리까지만 허용
        const truncated = numbers.slice(0, 11);
        
        // 형식에 맞게 변환
        let formattedValue = '';
        if (truncated.length <= 3) {
          formattedValue = truncated;
        } else if (truncated.length <= 7) {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
        } else {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`;
        }
        
        setFormData((prev) => ({ ...prev, [field]: formattedValue }));
        
        // 입력 시 해당 필드 에러 초기화
        if (inputErrors[field]) {
          setInputErrors((prev) => ({ ...prev, [field]: "" }));
        }
        
        // 실시간 검증
        validateField(field, formattedValue);
        return;
      }

      // 생년월일 필드인 경우 자동 포맷팅
      if (field === "birthDate") {
        // 숫자만 추출
        const numbers = value.replace(/\D/g, '');
        
        // 최대 8자리까지만 허용 (YYYYMMDD)
        const truncated = numbers.slice(0, 8);
        
        // 기본 검증을 하면서 형식에 맞게 변환
        let formattedValue = '';
        if (truncated.length <= 4) {
          formattedValue = truncated;
        } else if (truncated.length <= 6) {
          const year = truncated.slice(0, 4);
          const month = truncated.slice(4, 6);
          
          // 월 입력 시 기본 검증 (13 이상 입력 방지)
          if (month.length === 2 && parseInt(month) > 12) {
            formattedValue = `${year}-12`;
          } else {
            formattedValue = `${year}-${month}`;
          }
        } else {
          const year = truncated.slice(0, 4);
          const month = truncated.slice(4, 6);
          const day = truncated.slice(6, 8);
          
          // 월 검증
          let validMonth = month;
          if (parseInt(month) > 12) {
            validMonth = '12';
          } else if (parseInt(month) === 0) {
            validMonth = '01';
          }
          
          // 일 검증 (기본적으로 31 이상 입력 방지)
          let validDay = day;
          if (day.length === 2 && parseInt(day) > 31) {
            validDay = '31';
          } else if (day.length === 2 && parseInt(day) === 0) {
            validDay = '01';
          }
          
          formattedValue = `${year}-${validMonth}-${validDay}`;
        }
        
        setFormData((prev) => ({ ...prev, [field]: formattedValue }));
        
        // 입력 시 해당 필드 에러 초기화
        if (inputErrors[field]) {
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
    field: keyof VeterinaryStudentRegistrationData,
    value: string
  ) => {
    let error = "";

    switch (field) {
      case "loginId":
        if (!value.trim()) {
          error = "아이디를 입력해주세요.";
        } else if (value.length < 4) {
          error = "아이디는 4자 이상이어야 합니다.";
        }
        break;

      case "password":
        if (!value.trim()) {
          error = "비밀번호를 입력해주세요.";
        } else if (value.length < 8) {
          error = "비밀번호는 8자 이상 입력해주세요.";
        }
        break;

      case "passwordConfirm":
        if (!value.trim()) {
          error = "비밀번호 확인을 입력해주세요.";
        } else if (value !== formData.password) {
          error = "비밀번호가 일치하지 않습니다.";
        }
        break;

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
        const emailRegex2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          error = "대학교 이메일을 입력해주세요.";
        } else if (!emailRegex2.test(value)) {
          error = "올바른 이메일 형식을 입력해주세요.";
        } else if (!validateStudentEmail(value)) {
          error = "수의학과가 있는 대학교의 이메일을 입력해주세요.";
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
          const [year, month, day] = value.split('-').map(Number);
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


  const handleImageChange = (field: "profileImage") => (url: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: url }));
  };

  const handleLoginIdDuplicateCheck = async () => {
    console.log("CLIENT: handleLoginIdDuplicateCheck called");
    console.log("CLIENT: formData.loginId =", formData.loginId);

    if (!formData.loginId.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }

    if (formData.loginId.length < 4) {
      alert("아이디는 4자 이상이어야 합니다.");
      return;
    }

    console.log("CLIENT: About to call checkEmailDuplicate for loginId");
    setDuplicateCheck((prev) => ({
      ...prev,
      loginId: { ...prev.loginId, isChecking: true },
    }));

    try {
      console.log("CLIENT: Calling checkLoginIdDuplicate with:", formData.loginId);
      // loginId는 checkLoginIdDuplicate를 사용
      const result = await checkLoginIdDuplicate(formData.loginId);
      console.log("CLIENT: checkLoginIdDuplicate result:", result);

      if (result.success) {
        const isValid = !result.isDuplicate;
        console.log(
          "CLIENT: isDuplicate =",
          result.isDuplicate,
          "isValid =",
          isValid
        );
        setDuplicateCheck((prev) => ({
          ...prev,
          loginId: {
            isChecking: false,
            isValid,
          },
        }));
        alert(result.message);
      } else {
        console.log("CLIENT: checkEmailDuplicate failed:", result.error);
        setDuplicateCheck((prev) => ({
          ...prev,
          loginId: { ...prev.loginId, isChecking: false },
        }));
        alert(result.error || "아이디 중복 확인 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("CLIENT: 아이디 중복 확인 오류:", error);
      setDuplicateCheck((prev) => ({
        ...prev,
        loginId: { ...prev.loginId, isChecking: false },
      }));
      alert("아이디 중복 확인 중 오류가 발생했습니다.");
    }
  };

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

    // 대학교 이메일 도메인 검증
    if (!VETERINARY_UNIVERSITY_DOMAIN_VALUES.includes(selectedUniversityDomain as any)) {
      alert("수의학과가 있는 대학교의 이메일을 입력해주세요.");
      return;
    }

    setFormData((prev) => ({ ...prev, email: fullEmail }));
    setEmailVerification({ showModal: true, isVerified: false });
  };

  const handleEmailVerified = () => {
    setEmailVerification({ showModal: false, isVerified: true });
    setDuplicateCheck((prev) => ({
      ...prev,
      email: { isChecking: false, isValid: true },
    }));
  };

  const handleEmailVerificationClose = () => {
    setEmailVerification({ showModal: false, isVerified: false });
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
      console.error("CLIENT: 연락처 중복 확인 오류:", error);
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

  const handleRegister = () => {
    // SNS 로그인 시에는 userId, password, passwordConfirm 필드 제외
    const requiredFields: (keyof typeof inputErrors)[] = socialData 
      ? ["realName", "nickname", "phone", "email", "birthDate"]
      : ["loginId", "password", "passwordConfirm", "realName", "nickname", "phone", "email", "birthDate"];
    const errors: string[] = [];

    requiredFields.forEach((field) => {
      if (field === "email") {
        // 대학교 이메일 검증
        if (!universityEmailId.trim()) {
          errors.push("이메일 아이디를 입력해주세요.");
        } else if (!selectedUniversityDomain) {
          errors.push("대학교를 선택해주세요.");
        } else {
          validateField(field as keyof VeterinaryStudentRegistrationData, formData.email);
        }
      } else {
        const value = formData[field] as string;
        validateField(field as keyof VeterinaryStudentRegistrationData, value);

        if (!value?.trim()) {
          const fieldName = {
            loginId: "아이디",
            password: "비밀번호",
            passwordConfirm: "비밀번호 확인",
            realName: "실명",
            nickname: "닉네임",
            phone: "연락처",
            email: "대학교 이메일",
            birthDate: "생년월일",
          }[field];
          errors.push(`${fieldName}를 입력해주세요.`);
        }
      }
    });

    // SNS 로그인이 아닐 때만 중복확인 검증
    if (!socialData) {
      if (!duplicateCheck.loginId.isValid) {
        errors.push("아이디 중복확인을 완료해주세요.");
      }
    }

    // 대학교 이메일 인증은 SNS 사용자도 필요
    if (!emailVerification.isVerified) {
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

    // 에러가 있다면 첫 번째 에러 표시 및 해당 필드로 포커스
    if (errors.length > 0) {
      alert(errors[0]);

      // 첫 번째 에러 필드 찾기 및 포커스
      for (const field of requiredFields) {
        if (!formData[field]?.toString().trim() || inputErrors[field]) {
          const element = document.querySelector(
            `input[placeholder*="${field}"]`
          ) as HTMLInputElement;
          if (element) {
            element.focus();
            break;
          }
        }
      }
      return;
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
        {/* 계정 정보 섹션 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            계정 정보
          </h2>

          <div className="space-y-6">
            {/* SNS 로그인이 아닐 때만 아이디 필드 표시 */}
            {!socialData && (
              <div>
                <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                  아이디
                </label>
                <InputBox
                  value={formData.loginId}
                  onChange={handleInputChange("loginId")}
                  placeholder="아이디를 입력해주세요"
                  type="text"
                  duplicateCheck={{
                    buttonText: "중복 확인",
                    onCheck: handleLoginIdDuplicateCheck,
                    isChecking: duplicateCheck.loginId.isChecking,
                    isValid: duplicateCheck.loginId.isValid,
                  }}
                  success={duplicateCheck.loginId.isValid}
                  error={!!inputErrors.loginId}
                  guide={
                    inputErrors.loginId
                      ? { text: inputErrors.loginId, type: "error" }
                      : duplicateCheck.loginId.isValid
                      ? { text: "사용 가능한 아이디입니다", type: "success" }
                      : undefined
                  }
                />
              </div>
            )}

            {/* SNS 로그인이 아닐 때만 비밀번호 필드 표시 */}
            {!socialData && (
              <>
                <div>
                  <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                    비밀번호
                  </label>
                  <InputBox
                    value={formData.password}
                    onChange={handleInputChange("password")}
                    placeholder="비밀번호를 입력해주세요"
                    type="password"
                    error={!!inputErrors.password}
                    guide={
                      inputErrors.password
                        ? { text: inputErrors.password, type: "error" }
                        : { text: "비밀번호는 8자 이상 입력해주세요", type: "info" }
                    }
                  />
                </div>

                <div>
                  <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                    비밀번호 확인
                  </label>
                  <InputBox
                    value={formData.passwordConfirm}
                    onChange={handleInputChange("passwordConfirm")}
                    placeholder="비밀번호를 다시 입력해주세요"
                    type="password"
                    error={!!inputErrors.passwordConfirm}
                    guide={
                      inputErrors.passwordConfirm
                        ? { text: inputErrors.passwordConfirm, type: "error" }
                        : undefined
                    }
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* 기본 정보 섹션 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            기본 정보
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
                  socialData ? { text: "SNS 계정 이름을 확인하고 실명을 정확히 입력해주세요", type: "info" } :
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

            {/* 대학교 이메일 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                대학교 이메일
                <span className="text-sm text-gray-500 ml-2">
                  (수의학과 인증용)
                </span>
              </label>
              {socialData && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                  <p><strong>SNS 계정:</strong> {socialData.email}</p>
                  <p>수의학과 인증을 위해 별도로 대학교 이메일을 입력해주세요.</p>
                </div>
              )}
              
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
                        email: { ...prev.email, isValid: false },
                      }));
                    }}
                    placeholder="이메일 아이디"
                    type="text"
                    error={!!inputErrors.email && !universityEmailId}
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
                        email: { ...prev.email, isValid: false },
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

              {inputErrors.email && (
                <p className="text-red-500 text-sm mt-2">
                  {inputErrors.email}
                </p>
              )}
            </div>

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
                <p className="text-red-500 text-sm mt-2">{inputErrors.birthDate}</p>
              )}
            </div>
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
            onClick={handleRegister}
            fullWidth={true}
          >
            회원가입
          </Button>
        </div>
      </div>

      {/* 이메일 인증 모달 */}
      {emailVerification.showModal && (
        <EmailVerificationModal
          email={formData.email}
          name={formData.realName}
          onVerified={handleEmailVerified}
          onClose={handleEmailVerificationClose}
          autoSend={true}
        />
      )}
    </div>
  );
};
