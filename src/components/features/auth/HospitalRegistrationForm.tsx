"use client";

import { InputBox } from "@/components/ui/Input/InputBox";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { Button } from "@/components/ui/Button";
import { BirthDateInput } from "@/components/ui/FormattedInput";
import { Textarea } from "@/components/ui/Input/Textarea";
import {
  ProfileImageUpload,
  MultiImageUpload,
} from "@/components/features/profile";
import { FileUpload } from "@/components/ui/FileUpload";
import {
  checkEmailDuplicate,
  checkLoginIdDuplicate,
  checkPhoneDuplicate,
  checkBusinessNumberDuplicate,
} from "@/actions/auth";
import { HospitalRegistrationData } from "@/types/hospital";
import Link from "next/link";
import { useState } from "react";
import { majorOptions } from "@/constants/options";
import { MapLocationModal } from "@/components/features/map/MapLocationModal";

interface HospitalRegistrationFormProps {
  onSubmit?: (data: HospitalRegistrationData) => void;
  onCancel?: () => void;
}

export const HospitalRegistrationForm: React.FC<
  HospitalRegistrationFormProps
> = ({ onSubmit, onCancel }) => {
  // 폼 상태 관리
  const [formData, setFormData] = useState<HospitalRegistrationData>({
    // 계정 정보
    loginId: "",
    password: "",
    passwordConfirm: "",
    
    // 기본 정보
    realName: "",
    hospitalName: "",
    establishedDate: "",
    businessNumber: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    detailAddress: "",
    postalCode: "",
    latitude: null,
    longitude: null,
    hospitalLogo: null,
    description: "",
    
    // 진료 정보
    treatmentAnimals: [],
    treatmentSpecialties: [],
    
    // 병원 이미지 (최대 10장)
    hospitalImages: [],
    
    // 사업자등록증
    businessLicense: {
      file: null,
      url: null,
      fileName: null,
      fileType: null,
      mimeType: null,
      fileSize: null,
    },
    
    // 약관 동의
    agreements: {
      terms: false,
      privacy: false,
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
    businessNumber: {
      isChecking: false,
      isValid: false,
    },
  });

  // 입력 에러 상태
  const [inputErrors, setInputErrors] = useState({
    loginId: "",
    password: "",
    passwordConfirm: "",
    realName: "", // 대표자명
    hospitalName: "",
    establishedDate: "", // 병원 설립일
    businessNumber: "",
    phone: "",
    email: "",
    address: "",
    detailAddress: "",
    description: "",
  });

  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  // 지도 모달 상태
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const handleInputChange =
    (field: keyof HospitalRegistrationData) => (value: string) => {
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
        if (inputErrors[field]) {
          setInputErrors((prev) => ({ ...prev, [field]: "" }));
        }

        // 실시간 검증
        validateField(field, formattedValue);
        return;
      }

      // 사업자등록번호 필드인 경우 자동 포맷팅
      if (field === "businessNumber") {
        // 숫자만 추출
        const numbers = value.replace(/\D/g, "");
        
        // 최대 10자리까지만 허용
        const truncated = numbers.slice(0, 10);
        
        // 형식에 맞게 변환 (000-00-00000)
        let formattedValue = "";
        if (truncated.length <= 3) {
          formattedValue = truncated;
        } else if (truncated.length <= 5) {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
        } else {
          formattedValue = `${truncated.slice(0, 3)}-${truncated.slice(3, 5)}-${truncated.slice(5)}`;
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

      // 병원 설립일 필드인 경우 자동 포맷팅
      if (field === "establishedDate") {
        // 숫자만 추출
        const numbers = value.replace(/\D/g, "");
        
        // 최대 8자리까지만 허용 (YYYYMMDD)
        const truncated = numbers.slice(0, 8);
        
        // 기본 검증을 하면서 형식에 맞게 변환
        let formattedValue = "";
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
            validMonth = "12";
          } else if (parseInt(month) === 0) {
            validMonth = "01";
          }
          
          // 일 검증 (기본적으로 31 이상 입력 방지)
          let validDay = day;
          if (day.length === 2 && parseInt(day) > 31) {
            validDay = "31";
          } else if (day.length === 2 && parseInt(day) === 0) {
            validDay = "01";
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
    field: keyof HospitalRegistrationData,
    value: string
  ) => {
    let error = "";

    switch (field) {
      case "loginId":
        if (!value.trim()) {
          error = "아이디를 입력해주세요.";
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
          error = "대표자명을 입력해주세요.";
        } else if (value.length < 2) {
          error = "대표자명은 2자 이상 입력해주세요.";
        }
        break;

      case "hospitalName":
        if (!value.trim()) {
          error = "병원명을 입력해주세요.";
        } else if (value.length < 2) {
          error = "병원명은 2자 이상 입력해주세요.";
        }
        break;

      case "establishedDate":
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!value.trim()) {
          error = "병원 설립일을 입력해주세요.";
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
          // 너무 오래된 날짜 검증 (200년 이상 - 병원은 생년월일보다 더 넓은 범위)
          else if (year < today.getFullYear() - 200) {
            error = "올바른 설립일을 입력해주세요.";
          }
        }
        break;

      case "businessNumber":
        const businessRegex = /^\d{3}-\d{2}-\d{5}$/;
        if (!value.trim()) {
          error = "사업자등록번호를 입력해주세요.";
        } else if (!businessRegex.test(value)) {
          error = "000-00-00000 형식으로 입력해주세요.";
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
          error = "이메일을 입력해주세요.";
        } else if (!emailRegex2.test(value)) {
          error = "올바른 이메일 형식을 입력해주세요.";
        }
        break;

      case "address":
        if (!value.trim()) {
          error = "주소를 입력해주세요.";
        }
        break;

      case "detailAddress":
        // 상세주소는 선택사항이므로 검증하지 않음
        break;
    }

    setInputErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleImageChange = (field: "hospitalLogo") => (url: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: url }));
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setFormData((prev) => ({
        ...prev,
        businessLicense: {
          file: null,
          url: null,
          fileName: null,
          fileType: null,
          mimeType: null,
          fileSize: null,
        }
      }));
      return;
    }

    // 일단 파일만 설정 (업로드 중 표시용)
    setFormData((prev) => ({
      ...prev,
      businessLicense: {
        file: file,
        url: null,
        fileName: null,
        fileType: null,
        mimeType: null,
        fileSize: null,
      }
    }));

    try {
      // 서버를 통한 파일 업로드 (CORS 문제 방지)
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload/business-license', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.status !== "success") {
        throw new Error(uploadResult.message || '파일 업로드 실패');
      }

      // 업로드 성공
      setFormData((prev) => ({
        ...prev,
        businessLicense: {
          file: file,
          url: uploadResult.data.fileUrl,
          fileName: uploadResult.data.fileName,
          fileType: uploadResult.data.fileType || (file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document'),
          mimeType: uploadResult.data.mimeType || file.type,
          fileSize: uploadResult.data.fileSize || file.size,
        }
      }));
    } catch (error) {
      console.error('File upload error:', error);
      alert('파일 업로드 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      // 에러 시 파일만 유지
      setFormData((prev) => ({
        ...prev,
        businessLicense: {
          file: file,
          url: null,
          fileName: null,
          fileType: null,
          mimeType: null,
          fileSize: null,
        }
      }));
    }
  };

  const handleCheckboxChange =
    (field: "treatmentAnimals" | "treatmentSpecialties") =>
    (checked: boolean, value?: string) => {
      if (!value) return; // value가 없으면 처리하지 않음

      setFormData((prev) => ({
        ...prev,
        [field]: checked
          ? [...prev[field], value]
          : prev[field].filter((item) => item !== value),
      }));
    };

  const handleLoginIdDuplicateCheck = async () => {
    console.log("CLIENT: handleLoginIdDuplicateCheck called");
    console.log("CLIENT: formData.loginId =", formData.loginId);

    if (!formData.loginId.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }

    console.log("CLIENT: About to call checkEmailDuplicate");
    setDuplicateCheck((prev) => ({
      ...prev,
      loginId: { ...prev.loginId, isChecking: true },
    }));

    try {
      console.log(
        "CLIENT: Calling checkEmailDuplicate with:",
        formData.loginId
      );
      const result = await checkLoginIdDuplicate(formData.loginId);
      console.log("CLIENT: checkEmailDuplicate result:", result);

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
        alert(result.error || "이메일 중복 확인 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("CLIENT: 이메일 중복 확인 오류:", error);
      setDuplicateCheck((prev) => ({
        ...prev,
        loginId: { ...prev.loginId, isChecking: false },
      }));
      alert("이메일 중복 확인 중 오류가 발생했습니다.");
    }
  };

  const handleEmailDuplicateCheck = async () => {
    if (!formData.email.trim()) {
      alert("이메일을 입력해주세요.");
      return;
    }

    setDuplicateCheck((prev) => ({
      ...prev,
      email: { ...prev.email, isChecking: true },
    }));

    try {
      const result = await checkEmailDuplicate(formData.email);

      if (result.success) {
        const isValid = !result.isDuplicate;
        setDuplicateCheck((prev) => ({
          ...prev,
          email: {
            isChecking: false,
            isValid,
          },
        }));
        alert(result.message);
      } else {
        setDuplicateCheck((prev) => ({
          ...prev,
          email: { ...prev.email, isChecking: false },
        }));
        alert(result.error || "이메일 중복 확인 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("CLIENT: 이메일 중복 확인 오류:", error);
      setDuplicateCheck((prev) => ({
        ...prev,
        email: { ...prev.email, isChecking: false },
      }));
      alert("이메일 중복 확인 중 오류가 발생했습니다.");
    }
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

  const handleBusinessNumberDuplicateCheck = async () => {
    if (!formData.businessNumber.trim()) {
      alert("사업자등록번호를 입력해주세요.");
      return;
    }

    const businessRegex = /^\d{3}-\d{2}-\d{5}$/;
    if (!businessRegex.test(formData.businessNumber)) {
      alert("000-00-00000 형식으로 입력해주세요.");
      return;
    }

    setDuplicateCheck((prev) => ({
      ...prev,
      businessNumber: { ...prev.businessNumber, isChecking: true },
    }));

    try {
      const result = await checkBusinessNumberDuplicate(
        formData.businessNumber
      );

      if (result.success) {
        const isValid = !result.isDuplicate;
        setDuplicateCheck((prev) => ({
          ...prev,
          businessNumber: {
            isChecking: false,
            isValid,
          },
        }));
        alert(result.message);
      } else {
        setDuplicateCheck((prev) => ({
          ...prev,
          businessNumber: { ...prev.businessNumber, isChecking: false },
        }));
        alert(
          result.error || "사업자등록번호 중복 확인 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.error("CLIENT: 사업자등록번호 중복 확인 오류:", error);
      setDuplicateCheck((prev) => ({
        ...prev,
        businessNumber: { ...prev.businessNumber, isChecking: false },
      }));
      alert("사업자등록번호 중복 확인 중 오류가 발생했습니다.");
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
    // 모든 필드 검증
    const fields: (keyof Pick<
      HospitalRegistrationData,
      | "loginId"
      | "password"
      | "passwordConfirm"
      | "realName"
      | "hospitalName"
      | "establishedDate"
      | "businessNumber"
      | "phone"
      | "email"
      | "address"
    >)[] = [
      "loginId",
      "password",
      "passwordConfirm",
      "realName",
      "hospitalName",
      "establishedDate",
      "businessNumber",
      "phone",
      "email",
      "address",
    ];
    const errors: string[] = [];

    fields.forEach((field) => {
      const value = formData[field] as string;
      validateField(field as keyof HospitalRegistrationData, value);

      if (!value?.trim()) {
        const fieldName = {
          loginId: "이메일 (아이디)",
          password: "비밀번호",
          passwordConfirm: "비밀번호 확인",
          realName: "대표자명",
          hospitalName: "병원명",
          establishedDate: "병원 설립일",
          businessNumber: "사업자등록번호",
          phone: "연락처",
          email: "이메일",
          address: "주소",
          detailAddress: "상세주소",
        }[field];
        errors.push(`${fieldName}을 입력해주세요.`);
      }
    });

    // 중복확인 검증
    if (!duplicateCheck.loginId.isValid) {
      errors.push("아이디 중복확인을 완료해주세요.");
    }

    if (!duplicateCheck.email.isValid) {
      errors.push("이메일 중복확인을 완료해주세요.");
    }

    if (!duplicateCheck.phone.isValid) {
      errors.push("연락처 중복확인을 완료해주세요.");
    }

    if (!duplicateCheck.businessNumber.isValid) {
      errors.push("사업자등록번호 중복확인을 완료해주세요.");
    }

    // 진료 가능 동물 및 진료 분야 검증
    if (formData.treatmentAnimals.length === 0) {
      errors.push("진료 가능한 동물을 선택해주세요.");
    }

    if (formData.treatmentSpecialties.length === 0) {
      errors.push("진료 분야를 선택해주세요.");
    }

    // 사업자등록증 파일 검증
    if (!formData.businessLicense.file || !formData.businessLicense.url) {
      errors.push("사업자등록증 파일을 업로드해주세요.");
    }

    // 약관 동의 검증
    if (!formData.agreements.terms || !formData.agreements.privacy) {
      errors.push("필수 약관에 동의해주세요.");
    }

    // 에러가 있다면 첫 번째 에러 표시 및 해당 필드로 포커스
    if (errors.length > 0) {
      alert(errors[0]);

      // 첫 번째 에러 필드 찾기 및 포커스
      for (const field of fields) {
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
            {/* 아이디 */}
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
                    ? { text: "사용 가능한 아이디입니다.", type: "success" }
                    : undefined
                }
              />
            </div>

            {/* 비밀번호 */}
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

            {/* 비밀번호 확인 */}
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
          </div>
        </section>

        {/* 병원 정보 섹션 */}
        <section>
          <h2 className="font-text text-[28px] font-bold text-primary mb-6">
            병원 정보
          </h2>

          {/* 프로필 사진 */}
          <div className="mb-6">
            <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
              병원 로고
            </label>
            <ProfileImageUpload
              value={formData.hospitalLogo || undefined}
              onChange={handleImageChange("hospitalLogo")}
              folder="hospitals"
            />
          </div>

          <div className="space-y-6">
            {/* 대표자명 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                대표자명
              </label>
              <InputBox
                value={formData.realName}
                onChange={handleInputChange("realName")}
                placeholder="대표자명을 입력해주세요"
                error={!!inputErrors.realName}
                guide={
                  inputErrors.realName
                    ? { text: inputErrors.realName, type: "error" }
                    : undefined
                }
              />
            </div>

            {/* 병원명 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                병원명
              </label>
              <InputBox
                value={formData.hospitalName}
                onChange={handleInputChange("hospitalName")}
                placeholder="병원명을 입력해주세요"
                error={!!inputErrors.hospitalName}
                guide={
                  inputErrors.hospitalName
                    ? { text: inputErrors.hospitalName, type: "error" }
                    : undefined
                }
              />
            </div>

            {/* 병원 설립일 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                병원 설립일
              </label>
              <BirthDateInput
                value={formData.establishedDate}
                onChange={handleInputChange("establishedDate")}
                placeholder="YYYY-MM-DD"
                className={inputErrors.establishedDate ? "border-red-500" : ""}
              />
              {inputErrors.establishedDate && (
                <p className="text-red-500 text-sm mt-2">
                  {inputErrors.establishedDate}
                </p>
              )}
            </div>

            {/* 사업자등록번호 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                사업자등록번호
              </label>
              <InputBox
                value={formData.businessNumber}
                onChange={handleInputChange("businessNumber")}
                placeholder="000-00-00000 형식으로 입력해주세요"
                duplicateCheck={{
                  buttonText: "중복 확인",
                  onCheck: handleBusinessNumberDuplicateCheck,
                  isChecking: duplicateCheck.businessNumber.isChecking,
                  isValid: duplicateCheck.businessNumber.isValid,
                }}
                success={duplicateCheck.businessNumber.isValid}
                error={!!inputErrors.businessNumber}
                guide={
                  inputErrors.businessNumber
                    ? { text: inputErrors.businessNumber, type: "error" }
                    : duplicateCheck.businessNumber.isValid
                    ? {
                        text: "사용 가능한 사업자등록번호입니다.",
                        type: "success",
                      }
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

            {/* 이메일 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                이메일
              </label>
              <InputBox
                value={formData.email}
                onChange={handleInputChange("email")}
                placeholder="이메일을 입력해 주세요"
                type="email"
                duplicateCheck={{
                  buttonText: "중복 확인",
                  onCheck: handleEmailDuplicateCheck,
                  isChecking: duplicateCheck.email.isChecking,
                  isValid: duplicateCheck.email.isValid,
                }}
                success={duplicateCheck.email.isValid}
                error={!!inputErrors.email}
                guide={
                  inputErrors.email
                    ? { text: inputErrors.email, type: "error" }
                    : duplicateCheck.email.isValid
                    ? { text: "사용 가능한 이메일입니다.", type: "success" }
                    : undefined
                }
              />
            </div>

            {/* 웹사이트 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                웹사이트 (선택)
              </label>
              <InputBox
                value={formData.website}
                onChange={handleInputChange("website")}
                placeholder="https://www.example.com"
                type="url"
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                주소 <span className="text-[#FF4A4A]">(필수)</span>
              </label>
              
              {formData.address ? (
                <div className="space-y-3">
                  <div>
                    <InputBox
                      value={formData.address}
                      readOnly
                      placeholder="지도에서 주소를 선택해주세요"
                      className="mb-2"
                    />
                  </div>
                  <div>
                    <InputBox
                      value={formData.detailAddress}
                      onChange={handleInputChange("detailAddress")}
                      placeholder="상세주소를 입력하세요 (예: 동/호수, 층수 등)"
                    />
                  </div>
                  <Button
                    variant="line"
                    size="medium"
                    onClick={() => setIsMapModalOpen(true)}
                    className="w-full"
                  >
                    주소 변경하기
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50 text-center">
                    <p className="text-gray-600 mb-3">지도에서 주소를 선택해주세요</p>
                    <Button
                      variant="default"
                      size="medium"
                      onClick={() => setIsMapModalOpen(true)}
                      className="w-full"
                    >
                      지도에서 주소 선택
                    </Button>
                  </div>
                </div>
              )}
              
              {inputErrors.address && (
                <p className="mt-2 text-sm text-red-500">{inputErrors.address}</p>
              )}
            </div>
            {/* 진료 가능 동물 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                진료 가능 동물 <span className="text-[#FF4A4A]">(필수)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "DOG", label: "개" },
                  { value: "CAT", label: "고양이" },
                  { value: "EXOTIC", label: "특수동물" },
                  { value: "LARGE_ANIMAL", label: "대동물" },
                ].map((animal) => (
                  <Checkbox
                    key={animal.value}
                    checked={formData.treatmentAnimals.includes(animal.value)}
                    onChange={handleCheckboxChange("treatmentAnimals")}
                    value={animal.value}
                    className="text-[16px] text-[#35313C]"
                  >
                    {animal.label}
                  </Checkbox>
                ))}
              </div>
            </div>

            {/* 진료 분야 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                진료 분야 <span className="text-[#FF4A4A]">(필수)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {majorOptions.map((specialty) => (
                  <Checkbox
                    key={specialty.value}
                    checked={formData.treatmentSpecialties.includes(
                      specialty.value
                    )}
                    onChange={handleCheckboxChange("treatmentSpecialties")}
                    value={specialty.value}
                    className="text-[16px] text-[#35313C]"
                  >
                    {specialty.label}
                  </Checkbox>
                ))}
              </div>
            </div>

            {/* 병원 소개 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                병원 소개 <span className="text-[#C5CCD8]">(선택)</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="병원을 간단하게 소개해 주세요"
                rows={5}
              />
            </div>

            {/* 병원 이미지 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                병원 이미지 <span className="text-[#C5CCD8]">(선택, 최대 10장)</span>
              </label>
              <MultiImageUpload
                value={formData.hospitalImages}
                onChange={(urls) => {
                  setFormData({ ...formData, hospitalImages: urls });
                }}
                folder="hospital-facilities"
                maxImages={10}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-2">
                병원 시설, 진료실, 대기실 등의 사진을 업로드해주세요.
              </p>
            </div>
          </div>

          {/* 사업자등록증 파일 */}
          <div className="mt-6">
            <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
              사업자등록증 <span className="text-[#FF4A4A]">(필수)</span>
            </label>
            <FileUpload
              onFileSelect={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
              maxSize={50 * 1024 * 1024}
              placeholder="사업자등록증 파일을 업로드해주세요 (최대 50MB, 이미지/PDF/Word 파일)"
            />
            {formData.businessLicense.file && formData.businessLicense.url && (
              <div className="text-sm text-green-600 mt-2">
                <p>✅ 업로드 완료: {formData.businessLicense.file.name}</p>
                <p className="text-xs text-gray-500">
                  파일 형식: {formData.businessLicense.fileType} | 
                  크기: {Math.round(formData.businessLicense.file.size / 1024)}KB
                </p>
              </div>
            )}
            {formData.businessLicense.file && !formData.businessLicense.url && (
              <p className="text-sm text-amber-600 mt-2">
                📤 업로드 중...
              </p>
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
            onClick={handleRegister}
            fullWidth={true}
          >
            회원가입
          </Button>
        </div>
      </div>

      {/* 지도 모달 */}
      <MapLocationModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={(data) => {
          setFormData((prev) => ({
            ...prev,
            address: data.address,
            detailAddress: data.detailAddress || '',
            latitude: data.latitude,
            longitude: data.longitude,
          }));
          setIsMapModalOpen(false);
        }}
        initialAddress={formData.address}
        initialDetailAddress={formData.detailAddress}
        initialLatitude={formData.latitude || undefined}
        initialLongitude={formData.longitude || undefined}
      />
    </div>
  );
};
