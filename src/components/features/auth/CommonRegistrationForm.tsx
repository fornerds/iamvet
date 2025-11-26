"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { Button } from "@/components/ui/Button";
import {
  ProfileImageUpload,
  LicenseImageUpload,
} from "@/components/features/profile";
import { checkUserIdDuplicate, checkEmailDuplicate } from "@/actions/auth";
import Link from "next/link";
import { useState } from "react";
import { VETERINARY_UNIVERSITY_DOMAIN_VALUES } from "@/constants/universityDomains";
import {
  BaseRegistrationData,
  VeterinarianRegistrationData,
  VeterinaryStudentRegistrationData,
  DuplicateCheckState,
  InputErrorState,
  UserRegistrationType,
} from "./types";

type RegistrationData =
  | VeterinarianRegistrationData
  | VeterinaryStudentRegistrationData;

interface CommonRegistrationFormProps {
  userType: UserRegistrationType;
  onSubmit?: (data: RegistrationData) => void;
  onCancel?: () => void;
}

export const CommonRegistrationForm: React.FC<CommonRegistrationFormProps> = ({
  userType,
  onSubmit,
  onCancel,
}) => {
  const isVeterinarian = userType === "veterinarian";
  const isVeterinaryStudent = userType === "veterinary-student";

  // 폼 상태 관리
  const [formData, setFormData] = useState<RegistrationData>(() => {
    const baseData: BaseRegistrationData = {
      userId: "",
      password: "",
      passwordConfirm: "",
      realName: "",
      nickname: "",
      phone: "",
      email: "",
      birthDate: "",
      profileImage: null,
      agreements: {
        terms: false,
        privacy: false,
        marketing: false,
      },
    };

    if (isVeterinarian) {
      return {
        ...baseData,
        licenseImage: null,
      } as VeterinarianRegistrationData;
    } else {
      return {
        ...baseData,
        universityEmail: "",
      } as VeterinaryStudentRegistrationData;
    }
  });

  // 중복 검사 상태
  const [duplicateChecks, setDuplicateChecks] = useState<{
    userId: DuplicateCheckState;
    email: DuplicateCheckState;
    universityEmail: DuplicateCheckState;
  }>({
    userId: { checked: false, available: false, message: "" },
    email: { checked: false, available: false, message: "" },
    universityEmail: { checked: false, available: false, message: "" },
  });

  // 에러 상태
  const [errors, setErrors] = useState<InputErrorState>({
    userId: "",
    password: "",
    passwordConfirm: "",
    realName: "",
    nickname: "",
    phone: "",
    email: "",
    universityEmail: "",
    birthDate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 필드 업데이트
  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // 해당 필드의 에러 클리어
    if (errors[field as keyof InputErrorState]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // 중복 검사 상태 리셋 (userId, email, universityEmail의 경우)
    if (
      field === "userId" ||
      field === "email" ||
      (field === "universityEmail" && isVeterinaryStudent)
    ) {
      setDuplicateChecks((prev) => ({
        ...prev,
        [field]: { checked: false, available: false, message: "" },
      }));
    }
  };

  // 아이디 중복 검사
  const handleUserIdDuplicateCheck = async () => {
    if (!formData.userId) {
      setErrors((prev) => ({ ...prev, userId: "아이디를 입력해주세요." }));
      return;
    }

    if (formData.userId.length < 4) {
      setErrors((prev) => ({
        ...prev,
        userId: "아이디는 4자 이상이어야 합니다.",
      }));
      return;
    }

    try {
      const result = await checkUserIdDuplicate(formData.userId);
      setDuplicateChecks((prev) => ({
        ...prev,
        userId: {
          checked: true,
          available: !result.isDuplicate,
          message: result.message || "",
        },
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        userId: "중복 검사 중 오류가 발생했습니다.",
      }));
    }
  };

  // 이메일 중복 검사
  const handleEmailDuplicateCheck = async () => {
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "이메일을 입력해주세요." }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: "올바른 이메일 형식을 입력해주세요.",
      }));
      return;
    }

    try {
      const result = await checkEmailDuplicate(formData.email);
      setDuplicateChecks((prev) => ({
        ...prev,
        email: {
          checked: true,
          available: !result.isDuplicate,
          message: result.message || "",
        },
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        email: "중복 검사 중 오류가 발생했습니다.",
      }));
    }
  };

  // 대학교 이메일 검증
  const validateUniversityEmail = (email: string): boolean => {
    const domain = email.split("@")[1]?.toLowerCase();
    return VETERINARY_UNIVERSITY_DOMAIN_VALUES.some((uniDomain) => domain === uniDomain);
  };

  // 대학교 이메일 중복 검사
  const handleUniversityEmailDuplicateCheck = async () => {
    if (!isVeterinaryStudent || !("universityEmail" in formData)) return;

    const universityEmail = (formData as VeterinaryStudentRegistrationData)
      .universityEmail;

    if (!universityEmail) {
      setErrors((prev) => ({
        ...prev,
        universityEmail: "대학교 이메일을 입력해주세요.",
      }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(universityEmail)) {
      setErrors((prev) => ({
        ...prev,
        universityEmail: "올바른 이메일 형식을 입력해주세요.",
      }));
      return;
    }

    if (!validateUniversityEmail(universityEmail)) {
      setErrors((prev) => ({
        ...prev,
        universityEmail: "인증된 대학교 이메일을 입력해주세요.",
      }));
      return;
    }

    try {
      const result = await checkEmailDuplicate(universityEmail);
      setDuplicateChecks((prev) => ({
        ...prev,
        universityEmail: {
          checked: true,
          available: !result.isDuplicate,
          message: result.message || "",
        },
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        universityEmail: "중복 검사 중 오류가 발생했습니다.",
      }));
    }
  };

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: InputErrorState = {
      userId: "",
      password: "",
      passwordConfirm: "",
      realName: "",
      nickname: "",
      phone: "",
      email: "",
      universityEmail: "",
      birthDate: "",
    };

    // 필수 필드 검증
    if (!formData.userId) newErrors.userId = "아이디를 입력해주세요.";
    if (!formData.password) newErrors.password = "비밀번호를 입력해주세요.";
    if (!formData.passwordConfirm)
      newErrors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    if (!formData.realName) newErrors.realName = "실명을 입력해주세요.";
    if (!formData.nickname) newErrors.nickname = "닉네임을 입력해주세요.";
    if (!formData.phone) newErrors.phone = "전화번호를 입력해주세요.";
    if (!formData.email) newErrors.email = "이메일을 입력해주세요.";
    if (!formData.birthDate) newErrors.birthDate = "생년월일을 입력해주세요.";

    // 수의학과 학생인 경우 대학교 이메일 검증
    if (isVeterinaryStudent && "universityEmail" in formData) {
      if (!formData.universityEmail) {
        newErrors.universityEmail = "대학교 이메일을 입력해주세요.";
      }
    }

    // 비밀번호 일치 검증
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    // 비밀번호 강도 검증
    if (formData.password && formData.password.length < 8) {
      newErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    }

    // 중복 검사 완료 여부 확인
    if (!duplicateChecks.userId.checked || !duplicateChecks.userId.available) {
      newErrors.userId = "아이디 중복 검사를 완료해주세요.";
    }
    if (!duplicateChecks.email.checked || !duplicateChecks.email.available) {
      newErrors.email = "이메일 중복 검사를 완료해주세요.";
    }
    if (
      isVeterinaryStudent &&
      (!duplicateChecks.universityEmail.checked ||
        !duplicateChecks.universityEmail.available)
    ) {
      newErrors.universityEmail = "대학교 이메일 중복 검사를 완료해주세요.";
    }

    // 약관 동의 검증
    if (!formData.agreements.terms) {
      newErrors.userId = newErrors.userId || "이용약관에 동의해주세요.";
    }
    if (!formData.agreements.privacy) {
      newErrors.userId =
        newErrors.userId || "개인정보 처리방침에 동의해주세요.";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  // 폼 제출
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1155px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[40px] lg:gap-[100px]">
        {/* 왼쪽 폼 */}
        <div className="space-y-[24px]">
          {/* 아이디 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              아이디 *
            </label>
            <div className="flex gap-[8px]">
              <div className="flex-1">
                <InputBox
                  value={formData.userId}
                  onChange={(value) => updateField("userId", value)}
                  placeholder="아이디를 입력해주세요"
                  error={!!errors.userId}
                />
              </div>
              <Button
                variant="line"
                onClick={handleUserIdDuplicateCheck}
                className="whitespace-nowrap"
              >
                중복검사
              </Button>
            </div>
            {errors.userId && (
              <p className="text-red-500 text-sm mt-1">{errors.userId}</p>
            )}
            {duplicateChecks.userId.checked && (
              <p
                className={`text-sm mt-1 ${
                  duplicateChecks.userId.available
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {duplicateChecks.userId.message}
              </p>
            )}
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              비밀번호 *
            </label>
            <InputBox
              value={formData.password}
              onChange={(value) => updateField("password", value)}
              placeholder="비밀번호를 입력해주세요"
              type="password"
              error={!!errors.password}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              비밀번호 확인 *
            </label>
            <InputBox
              value={formData.passwordConfirm}
              onChange={(value) => updateField("passwordConfirm", value)}
              placeholder="비밀번호를 다시 입력해주세요"
              type="password"
              error={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && (
              <p className="text-red-500 text-sm mt-1">
                {errors.passwordConfirm}
              </p>
            )}
          </div>

          {/* 실명 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              실명 *
            </label>
            <InputBox
              value={formData.realName}
              onChange={(value) => updateField("realName", value)}
              placeholder="실명을 입력해주세요"
              error={!!errors.realName}
            />
            {errors.realName && (
              <p className="text-red-500 text-sm mt-1">{errors.realName}</p>
            )}
          </div>

          {/* 닉네임 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              닉네임 *
            </label>
            <InputBox
              value={formData.nickname}
              onChange={(value) => updateField("nickname", value)}
              placeholder="닉네임을 입력해주세요"
              error={!!errors.nickname}
            />
            {errors.nickname && (
              <p className="text-red-500 text-sm mt-1">{errors.nickname}</p>
            )}
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              전화번호 *
            </label>
            <InputBox
              value={formData.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="전화번호를 입력해주세요"
              error={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* 오른쪽 폼 */}
        <div className="space-y-[24px]">
          {/* 이메일 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              이메일 *
            </label>
            <div className="flex gap-[8px]">
              <div className="flex-1">
                <InputBox
                  value={formData.email}
                  onChange={(value) => updateField("email", value)}
                  placeholder="이메일을 입력해주세요"
                  type="email"
                  error={!!errors.email}
                />
              </div>
              <Button
                variant="line"
                onClick={handleEmailDuplicateCheck}
                className="whitespace-nowrap"
              >
                중복검사
              </Button>
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            {duplicateChecks.email.checked && (
              <p
                className={`text-sm mt-1 ${
                  duplicateChecks.email.available
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {duplicateChecks.email.message}
              </p>
            )}
          </div>

          {/* 대학교 이메일 (수의학과 학생만) */}
          {isVeterinaryStudent && (
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
                대학교 이메일 *
                <span className="text-sm text-gray-500 ml-2">
                  (수의학과 인증용)
                </span>
              </label>
              <div className="flex gap-[8px]">
                <div className="flex-1">
                  <InputBox
                    value={
                      "universityEmail" in formData
                        ? formData.universityEmail
                        : ""
                    }
                    onChange={(value) => updateField("universityEmail", value)}
                    placeholder="대학교 이메일을 입력해주세요 (예: student@snu.ac.kr)"
                    type="email"
                    error={!!errors.universityEmail}
                  />
                </div>
                <Button
                  variant="line"
                  onClick={handleUniversityEmailDuplicateCheck}
                  className="whitespace-nowrap"
                >
                  인증
                </Button>
              </div>
              {errors.universityEmail && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.universityEmail}
                </p>
              )}
              {duplicateChecks.universityEmail.checked && (
                <p
                  className={`text-sm mt-1 ${
                    duplicateChecks.universityEmail.available
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {duplicateChecks.universityEmail.message}
                </p>
              )}
            </div>
          )}

          {/* 생년월일 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              생년월일 *
            </label>
            <InputBox
              value={formData.birthDate}
              onChange={(value) => updateField("birthDate", value)}
              placeholder="YYYY-MM-DD"
              type="text"
              error={!!errors.birthDate}
            />
            {errors.birthDate && (
              <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>
            )}
          </div>

          {/* 프로필 이미지 */}
          <div>
            <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
              프로필 이미지
            </label>
            <ProfileImageUpload
              value={formData.profileImage || undefined}
              onChange={(url) => updateField("profileImage", url)}
              folder="profiles"
            />
          </div>

          {/* 면허증 이미지 (수의사만) */}
          {isVeterinarian && (
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-[8px]">
                수의사 면허증 *
              </label>
              <LicenseImageUpload
                value={
                  "licenseImage" in formData
                    ? formData.licenseImage || undefined
                    : undefined
                }
                onChange={(url) => updateField("licenseImage", url)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="mt-[60px] space-y-[16px]">
        <h3 className="text-[20px] font-medium text-[#3B394D] mb-[24px]">
          약관 동의
        </h3>

        <Checkbox
          checked={formData.agreements.terms}
          onChange={(checked) =>
            updateField("agreements", {
              ...formData.agreements,
              terms: checked,
            })
          }
        >
          <span>
            <Link href="/terms" className="text-keycolor1 underline">
              이용약관
            </Link>
            에 동의합니다. (필수)
          </span>
        </Checkbox>

        <Checkbox
          checked={formData.agreements.privacy}
          onChange={(checked) =>
            updateField("agreements", {
              ...formData.agreements,
              privacy: checked,
            })
          }
        >
          <span>
            <Link href="/privacy" className="text-keycolor1 underline">
              개인정보 처리방침
            </Link>
            에 동의합니다. (필수)
          </span>
        </Checkbox>

        <Checkbox
          checked={formData.agreements.marketing}
          onChange={(checked) =>
            updateField("agreements", {
              ...formData.agreements,
              marketing: checked,
            })
          }
        >
          마케팅 정보 수신에 동의합니다. (선택)
        </Checkbox>
      </div>

      {/* 버튼 */}
      <div className="flex gap-[16px] mt-[60px] justify-center">
        <Button variant="line" onClick={onCancel} className="w-[200px]">
          취소
        </Button>
        <Button
          variant="keycolor"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-[200px]"
        >
          {isSubmitting ? "가입 중..." : "가입하기"}
        </Button>
      </div>
    </div>
  );
};
