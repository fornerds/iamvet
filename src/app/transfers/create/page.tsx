"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "public/icons";
import { InputBox } from "@/components/ui/Input/InputBox";
import { Textarea } from "@/components/ui/Input/Textarea";
import { SelectBox } from "@/components/ui/SelectBox";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { Button } from "@/components/ui/Button";
import { regionOptions } from "@/data/regionOptions";
import { DocumentUpload } from "@/components/features/profile/DocumentUpload";
import { MultiImageUpload } from "@/components/features/profile/MultiImageUpload";
import { uploadFile } from "@/lib/s3";
import { useAuth } from "@/hooks/api/useAuth";
import { MapLocationModal } from "@/components/features/map/MapLocationModal";

interface FormData {
  title: string;
  category: string;
  isSale: boolean; // 매매 여부 (true: 매매, false: 임대)
  salePrice: string; // 매매 가격
  rentPrice: string; // 월세 가격
  area: string; // 평수 (병원양도일 때만)
  description: string;
  address: string; // 기본주소 (우편번호 검색으로 받은 주소)
  detailAddress: string; // 상세주소 (사용자가 입력하는 상세 주소)
  sido: string; // 시도 (서울, 경기, 부산 등)
  sigungu: string; // 시군구 (강남구, 분당구 등)
  latitude?: number; // 위도
  longitude?: number; // 경도
  images: string[]; // 양도양수 이미지 URL들 (MultiImageUpload에서 처리됨)
  documents: File[]; // 양도양수 파일들 (UI 표시용)
  documentUrls: string[]; // 업로드된 문서 URL들
}

const categoryOptions = [
  { value: "병원양도", label: "병원양도" },
  { value: "기계장치", label: "기계장치" },
  { value: "의료장비", label: "의료장비" },
  { value: "인테리어", label: "인테리어" },
];

export default function CreateTransferPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    isSale: true, // 기본값은 매매
    salePrice: "",
    rentPrice: "",
      area: "",
      description: "",
      address: "",
      detailAddress: "",
      sido: "",
      sigungu: "",
      latitude: undefined,
      longitude: undefined,
      images: [], // URL 배열
      documents: [], // UI 표시용
      documentUrls: [], // 실제 업로드된 URL들
    });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // 컴포넌트 마운트 시 임시저장 확인
  useEffect(() => {
    const checkDraftTransfer = async () => {
      if (!user) return;

      try {
        const response = await fetch("/api/transfers/draft", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.hasDraft && data.data?.draft) {
            setDraftData(data.data.draft);
            setShowDraftModal(true);
          }
        }
      } catch (error) {
        console.error("임시저장 확인 오류:", error);
      }
    };

    checkDraftTransfer();
  }, [user]);

  const handleInputChange = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // 에러 제거
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // 가격 입력 필드 전용 핸들러 (숫자 포맷팅)
  const handlePriceInputChange =
    (field: "salePrice" | "rentPrice") => (value: string) => {
      // 숫자만 추출
      const numericValue = value.replace(/[^\d]/g, "");

      // 숫자를 천 단위 콤마 형식으로 변환
      const formattedValue = numericValue
        ? parseInt(numericValue).toLocaleString()
        : "";

      setFormData((prev) => ({
        ...prev,
        [field]: formattedValue,
      }));

      // 에러 제거
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  const handleSaleTypeChange = (isSale: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isSale: isSale,
    }));
  };

  const handleImageUpload = (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: urls,
    }));
  };

  const handleDocumentUpload = (files: File[]) => {
    setFormData((prev) => ({
      ...prev,
      documents: files,
    }));
  };

  const handleDocumentUploadComplete = (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      documentUrls: [...prev.documentUrls, ...urls],
    }));
  };

  // 주소 검색 후 시도/시군구 추출 함수
  const extractRegionFromAddress = (address: string) => {
    // 주소에서 시도와 시군구 추출
    for (const [sido, districts] of Object.entries(regionOptions)) {
      if (address.includes(sido)) {
        // 해당 시도의 시군구 중에서 주소에 포함된 것 찾기
        const foundDistrict = districts.find((district) =>
          address.includes(district)
        );
        if (foundDistrict) {
          return { sido, sigungu: foundDistrict };
        }
        // 시군구를 찾지 못한 경우 시도만 반환
        return { sido, sigungu: "" };
      }
    }
    return { sido: "", sigungu: "" };
  };


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "제목을 입력해주세요.";
    }

    if (!formData.category) {
      newErrors.category = "카테고리를 선택해주세요.";
    }

    if (formData.category === "병원양도") {
      if (!formData.area.trim()) {
        newErrors.area = "평수를 입력해주세요.";
      }
    }

    if (formData.category === "병원양도") {
      if (formData.isSale && !formData.salePrice.trim()) {
        newErrors.salePrice = "매매 가격을 입력해주세요.";
      }
      if (!formData.isSale && !formData.rentPrice.trim()) {
        newErrors.rentPrice = "월세 가격을 입력해주세요.";
      }
    } else {
      if (!formData.salePrice.trim()) {
        newErrors.salePrice = "가격을 입력해주세요.";
      }
    }

    if (!formData.description.trim()) {
      newErrors.description = "상세 내용을 입력해주세요.";
    }

    if (!formData.address.trim()) {
      newErrors.address = "기본주소를 입력해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDraftForm = (): boolean => {
    // 임시저장 시에는 제목만 필수
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "제목은 필수입니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    // 임시저장과 정식 등록에 따라 다른 유효성 검사
    if (isDraft) {
      if (!validateDraftForm()) return;
    } else {
      if (!validateForm()) return;
    }

    setIsLoading(true);
    try {
      // 양도양수 이미지들은 이미 MultiImageUpload에서 업로드됨
      console.log("[DEBUG] 양도양수 이미지 URL들:", formData.images);

      // 문서 파일들은 이미 DocumentUpload에서 업로드됨
      console.log("[DEBUG] 문서 URL들:", formData.documentUrls);

      // API 요청 데이터 구성
      const transferData = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        location: `${formData.address} ${formData.detailAddress}`.trim(), // 호환성을 위해 유지
        baseAddress: formData.address, // 기본주소
        detailAddress: formData.detailAddress, // 상세주소
        sido: formData.sido, // 시도
        sigungu: formData.sigungu, // 시군구
        latitude: formData.latitude, // 위도
        longitude: formData.longitude, // 경도
        price:
          parseInt(
            (formData.category === "병원양도"
              ? formData.isSale
                ? formData.salePrice
                : formData.rentPrice
              : formData.salePrice
            ).replace(/[^\d]/g, "") // 콤마 제거 후 숫자만 추출
          ) || 0,
        area:
          formData.category === "병원양도"
            ? parseInt(formData.area) || null
            : null,
        images: formData.images, // 이미지 파일 URL들
        documents: formData.documentUrls, // 문서 파일 URL들
        status: "ACTIVE", // 상태는 항상 ACTIVE
        isDraft: isDraft, // isDraft 필드로 임시저장 구분
      };

      // API 호출
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // 관리자 인증 필요 안내 (403 에러)
        if (response.status === 403 && errorData.requiresAdminVerification) {
          alert(errorData.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }
        
        throw new Error(
          errorData.message || "양도양수 게시글 등록에 실패했습니다."
        );
      }

      // 성공 알림 및 페이지 이동
      if (isDraft) {
        alert("양도양수 게시글이 임시저장되었습니다!");
        router.push("/transfers/drafts"); // 임시저장 목록으로 이동
      } else {
        alert("양도양수 게시글이 성공적으로 생성되었습니다!");
        router.push("/transfers"); // 양도양수 목록으로 이동
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSalePricePlaceholder = () => {
    return formData.category === "병원양도"
      ? "매매 가격을 입력해주세요"
      : "가격을 입력해주세요";
  };

  const getRentPricePlaceholder = () => {
    return "월세 가격을 입력해주세요";
  };

  // 임시저장 데이터 불러오기
  const loadDraftData = () => {
    if (!draftData) return;

    setFormData({
      title: draftData.title || "",
      category: draftData.category || "",
      isSale: true, // 기본값
      salePrice: draftData.price ? draftData.price.toString() : "",
      rentPrice: "",
      area: draftData.area ? draftData.area.toString() : "",
      description: draftData.description || "",
      address: draftData.baseAddress || "",
      detailAddress: draftData.detailAddress || "",
      sido: draftData.sido || "",
      sigungu: draftData.sigungu || "",
      images: draftData.images || [],
      documents: [], // 문서는 File 객체가 필요하므로 빈 배열
      documentUrls: draftData.documents || [], // 문서 URL들
    });

    setShowDraftModal(false);
  };

  return (
    <>
      {/* 임시저장 불러오기 모달 */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              임시저장된 내용이 있습니다
            </h2>
            <p className="text-gray-600 mb-6">
              이전에 작성하던 양도양수 게시글이 있습니다. 해당 내용을
              불러올까요?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="line"
                size="medium"
                onClick={() => setShowDraftModal(false)}
              >
                아니오
              </Button>
              <Button variant="default" size="medium" onClick={loadDraftData}>
                예
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-white">
        <div className="max-w-[878px] mx-auto pt-[20px] pb-[140px] px-4 lg:px-0">
          {/* 헤더 */}
          <div className="flex flex-col gap-[10px] lg:mb-[30px] lg:py-[0px] py-[17px] items-start">
            <Link
              href="/transfers"
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <ArrowLeftIcon currentColor="currentColor" />
            </Link>
            <h1 className="font-title text-[28px] title-light text-[#3B394D]">
              양도양수 게시글 작성
            </h1>
          </div>

          <div className="bg-white border border-[#EFEFF0] rounded-[20px] p-6 lg:p-[60px]">
            {/* 제목 */}
            <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center w-full lg:gap-[9px] gap-[15px]">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary w-fit">
                제목
              </label>
              <InputBox
                className="w-full max-w-[649px]"
                value={formData.title}
                onChange={handleInputChange("title")}
                placeholder="제목을 입력해주세요"
                error={!!errors.title}
                guide={
                  errors.title
                    ? { text: errors.title, type: "error" }
                    : undefined
                }
              />
            </div>

            {/* 카테고리 */}
            <div className="mb-8">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                카테고리
              </label>
              <SelectBox
                options={categoryOptions}
                value={formData.category}
                onChange={handleInputChange("category")}
                placeholder="카테고리를 선택해주세요"
                error={!!errors.category}
              />
              {errors.category && (
                <p className="mt-2 text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            {/* 병원양도일 때만 표시되는 매매 여부 */}
            {formData.category === "병원양도" && (
              <div className="mb-8">
                <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                  매매 여부
                </label>
                <Checkbox
                  value="isSale"
                  checked={formData.isSale}
                  onChange={(checked) => handleSaleTypeChange(checked)}
                >
                  매매 (체크 해제시 임대)
                </Checkbox>
              </div>
            )}

            {/* 가격 설정 */}
            <div className="mb-8">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                가격 설정
              </label>

              {/* 병원양도일 때 매매/임대에 따른 가격 입력 */}
              {formData.category === "병원양도" ? (
                <>
                  {formData.isSale && (
                    <div className="mb-4">
                      <InputBox
                        value={formData.salePrice}
                        onChange={handlePriceInputChange("salePrice")}
                        placeholder={getSalePricePlaceholder()}
                        suffix="원"
                        error={!!errors.salePrice}
                        guide={
                          errors.salePrice
                            ? { text: errors.salePrice, type: "error" }
                            : undefined
                        }
                      />
                    </div>
                  )}
                  {!formData.isSale && (
                    <div className="mb-4">
                      <InputBox
                        value={formData.rentPrice}
                        onChange={handlePriceInputChange("rentPrice")}
                        placeholder={getRentPricePlaceholder()}
                        suffix="원/월"
                        error={!!errors.rentPrice}
                        guide={
                          errors.rentPrice
                            ? { text: errors.rentPrice, type: "error" }
                            : undefined
                        }
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="mb-4">
                  <InputBox
                    value={formData.salePrice}
                    onChange={handlePriceInputChange("salePrice")}
                    placeholder={getSalePricePlaceholder()}
                    suffix="원"
                    error={!!errors.salePrice}
                    guide={
                      errors.salePrice
                        ? { text: errors.salePrice, type: "error" }
                        : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* 평수 (병원양도일 때만) */}
            {formData.category === "병원양도" && (
              <div className="mb-8">
                <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                  평수
                </label>
                <InputBox
                  value={formData.area}
                  onChange={handleInputChange("area")}
                  placeholder="평수를 입력해주세요"
                  suffix="평"
                  error={!!errors.area}
                  guide={
                    errors.area
                      ? { text: errors.area, type: "error" }
                      : undefined
                  }
                />
              </div>
            )}

            {/* 상세 내용 */}
            <div className="mb-8">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                상세 내용
              </label>
              <Textarea
                value={formData.description}
                onChange={handleInputChange("description")}
                placeholder="병원 소개, 양도/임대 조건 등 상세 정보를 입력해주세요"
                error={!!errors.description}
                resize="vertical"
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.description}
                </p>
              )}
            </div>

            {/* 주소 검색 */}
            <div className="mb-8">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-4">
                주소 검색
              </label>
              
              {formData.address ? (
                <div className="space-y-3">
                  <InputBox
                    value={formData.address}
                    readOnly
                    placeholder="지도에서 주소를 선택해주세요"
                    className="w-full"
                  />
                  <InputBox
                    value={formData.detailAddress}
                    onChange={handleInputChange("detailAddress")}
                    placeholder="상세주소를 입력하세요 (예: 동/호수, 층수 등)"
                    className="w-full"
                  />
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
                <div className="border border-[#EFEFF0] rounded-md p-6 bg-gray-50 text-center">
                  <p className="text-gray-600 mb-4">지도에서 주소를 선택해주세요</p>
                  <Button
                    variant="default"
                    size="medium"
                    onClick={() => setIsMapModalOpen(true)}
                    className="w-full"
                  >
                    지도에서 주소 선택
                  </Button>
                </div>
              )}
              
              {errors.address && (
                <p className="mt-2 text-sm text-red-500">{errors.address}</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#EFEFF0] rounded-[20px] p-6 lg:p-[60px] mt-[40px]">
            {/* 이미지/파일 첨부 */}
            <div className="mb-8">
              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-2">
                양도양수 이미지
              </label>

              {/* 양도양수 이미지들 업로드 (첫 번째 이미지가 썸네일로 사용됨) */}

              <MultiImageUpload
                value={formData.images}
                onChange={handleImageUpload}
                maxImages={10}
                folder="transfers"
                className="mt-[40px]"
              />

              <label className="block font-title text-[16px] lg:text-[20px] title-light text-primary mb-6 mt-8">
                첨부 파일
              </label>

              {/* 양도양수 파일들 업로드 */}

              <DocumentUpload
                value={formData.documents}
                onChange={handleDocumentUpload}
                onUploadComplete={handleDocumentUploadComplete}
                maxFiles={3}
              />
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex flex-row gap-4 justify-center mt-[40px]">
            <Button
              variant="line"
              size="large"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
            >
              임시저장
            </Button>
            <Button
              variant="default"
              size="large"
              onClick={() => handleSubmit(false)}
              loading={isLoading}
            >
              등록하기
            </Button>
          </div>
        </div>
      </div>

      {/* 지도 모달 */}
      <MapLocationModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={(data) => {
          const { sido, sigungu } = extractRegionFromAddress(data.address);
          setFormData((prev) => ({
            ...prev,
            address: data.address,
            detailAddress: data.detailAddress || '',
            sido,
            sigungu,
            latitude: data.latitude,
            longitude: data.longitude,
          }));
          setIsMapModalOpen(false);
        }}
        initialAddress={formData.address}
        initialDetailAddress={formData.detailAddress}
        initialLatitude={formData.latitude}
        initialLongitude={formData.longitude}
      />
    </>
  );
}
