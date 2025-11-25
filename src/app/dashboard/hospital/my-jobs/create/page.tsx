"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { InputBox } from "@/components/ui/Input/InputBox";
import { FilterBox } from "@/components/ui/FilterBox";
import { SelectBox } from "@/components/ui/SelectBox";
import { DatePicker } from "@/components/ui/DatePicker";
import { Checkbox } from "@/components/ui/Input/Checkbox";
import { WeekdaySelector } from "@/components/features/resume/WeekdaySelector";
import { TimePicker } from "@/components/ui/TimePicker";
import { Textarea } from "@/components/ui/Input/Textarea";
import { PlusIcon, MinusIcon } from "public/icons";
import { useCreateJob, useSaveDraftJob } from "@/hooks/api/useJobs";
import { useAuth } from "@/hooks/api/useAuth";
import {
  majorOptions,
  workTypeOptions,
  experienceOptions,
  positionOptions,
  salaryTypeOptions,
} from "@/constants/options";
import { handleNumberInputChange } from "@/utils/validation";

interface JobFormData {
  title: string;
  workType: string[];
  isUnlimitedRecruit: boolean;
  recruitEndDate: Date | null;
  major: string[];
  experience: string[];
  position: string;
  salaryType: string;
  salary: string;
  workDays: string[];
  isWorkDaysNegotiable: boolean;
  workStartTime: any;
  workEndTime: any;
  isWorkTimeNegotiable: boolean;
  benefits: string;
  education: string[];
  certifications: string[];
  experienceDetails: string[];
  preferences: string[];
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  department: string;
}

export default function CreateJobPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const createJobMutation = useCreateJob();
  const saveDraftJobMutation = useSaveDraftJob();

  // 병원 계정만 접근 가능
  if (!isAuthenticated || user?.type !== "hospital") {
    return (
      <div className="bg-gray-50 min-h-screen pt-[20px] pb-[70px] px-[16px]">
        <div className="bg-white max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px] rounded-[16px] border border-[#EFEFF0]">
          <div className="max-w-[758px] mx-auto w-full">
            <h1 className="font-title text-[28px] font-light text-primary text-center mb-[60px]">
              접근 권한이 없습니다
            </h1>
            <p className="text-center text-gray-600">
              병원 계정만 채용공고를 등록할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    workType: [],
    isUnlimitedRecruit: false,
    recruitEndDate: null,
    major: [],
    experience: [],
    position: "",
    salaryType: "",
    salary: "",
    workDays: [],
    isWorkDaysNegotiable: false,
    workStartTime: null,
    workEndTime: null,
    isWorkTimeNegotiable: false,
    benefits: "",
    education: [""],
    certifications: [""],
    experienceDetails: [""],
    preferences: [""],
    managerName: "",
    managerPhone: "",
    managerEmail: "",
    department: "",
  });

  // 옵션 데이터는 constants에서 import

  // 리스트 항목 추가/삭제 함수
  const addListItem = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ""],
    }));
  };

  const removeListItem = (field: keyof typeof formData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  const updateListItem = (
    field: keyof typeof formData,
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  const handleSaveDraft = async () => {
    try {
      const result = await saveDraftJobMutation.mutateAsync(
        transformFormData(formData)
      );
      console.log("임시저장 성공:", result);
      alert("임시저장이 완료되었습니다.");
    } catch (error) {
      console.error("임시저장 실패:", error);
      alert("임시저장에 실패했습니다.");
    }
  };

  const handleSave = async () => {
    try {
      const result = await createJobMutation.mutateAsync(
        transformFormData(formData)
      );
      console.log("등록 성공:", result);
      alert("채용공고가 등록되었습니다.");
      // 성공 시 HospitalMyJobsPage로 이동
      router.push("/dashboard/hospital/my-jobs");
    } catch (error) {
      console.error("등록 실패:", error);
      alert("채용공고 등록에 실패했습니다.");
    }
  };

  const transformFormData = (data: JobFormData) => {
    return {
      title: data.title,
      workType: data.workType,
      isUnlimitedRecruit: data.isUnlimitedRecruit,
      recruitEndDate: data.recruitEndDate,
      major: data.major,
      experience: data.experience,
      position: data.position,
      salaryType: data.salaryType,
      salary: data.salary.replace(/,/g, ""),
      workDays: data.workDays,
      isWorkDaysNegotiable: data.isWorkDaysNegotiable,
      workStartTime: data.workStartTime ? formatTime(data.workStartTime) : null,
      workEndTime: data.workEndTime ? formatTime(data.workEndTime) : null,
      isWorkTimeNegotiable: data.isWorkTimeNegotiable,
      benefits: data.benefits,
      education: data.education.filter((item) => item.trim() !== ""),
      certifications: data.certifications.filter((item) => item.trim() !== ""),
      experienceDetails: data.experienceDetails.filter(
        (item) => item.trim() !== ""
      ),
      preferences: data.preferences.filter((item) => item.trim() !== ""),
      managerName: data.managerName,
      managerPhone: data.managerPhone,
      managerEmail: data.managerEmail,
      department: data.department,
    };
  };

  const formatTime = (timeObj: any): string => {
    if (!timeObj) return "";

    let hour = timeObj.hour;
    const minute = timeObj.minute;
    const period = timeObj.period;

    // AM/PM이 있는 경우 24시간 형식으로 변환
    if (period) {
      if (period === "PM" && hour !== 12) {
        hour = hour + 12; // PM 2시 → 14시
      } else if (period === "AM" && hour === 12) {
        hour = 0; // AM 12시 → 0시
      }
    }

    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-[20px] pb-[70px] px-[16px]">
      <div className="bg-white max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px] rounded-[16px] border border-[#EFEFF0]">
        <div className="max-w-[758px] mx-auto w-full">
          <h1 className="font-title text-[28px] title-light text-[#3B394D] text-center mb-[60px]">
            채용 공고 등록
          </h1>

          <div className="flex flex-col gap-[40px]">
            {/* 제목 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                제목
              </label>
              <InputBox
                value={formData.title}
                onChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                placeholder="제목을 입력해 주세요"
              />
            </div>

            {/* 근무 형태 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                근무 형태
              </label>
              <FilterBox.Group
                value={formData.workType}
                onChange={(values) =>
                  setFormData((prev) => ({ ...prev, workType: values }))
                }
              >
                {workTypeOptions.map((option) => (
                  <FilterBox.Item key={option.value} value={option.value}>
                    {option.label}
                  </FilterBox.Item>
                ))}
              </FilterBox.Group>
            </div>

            {/* 채용 종료 날짜 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                채용 종료 날짜
              </label>
              <div className="flex items-center gap-4 mb-3">
                <Checkbox.Item
                  checked={formData.isUnlimitedRecruit}
                  onChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isUnlimitedRecruit: checked }))
                  }
                >
                  무기한
                </Checkbox.Item>
              </div>
              {!formData.isUnlimitedRecruit && (
                <DatePicker
                  value={formData.recruitEndDate}
                  onChange={(date) =>
                    setFormData((prev) => ({ ...prev, recruitEndDate: date }))
                  }
                  placeholder="채용 종료 날짜를 선택해주세요"
                />
              )}
            </div>

            {/* 전공 분야 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                전공 분야
              </label>
              <FilterBox.Group
                value={formData.major}
                onChange={(values) =>
                  setFormData((prev) => ({ ...prev, major: values }))
                }
              >
                {majorOptions.map((option) => (
                  <FilterBox.Item key={option.value} value={option.value}>
                    {option.label}
                  </FilterBox.Item>
                ))}
              </FilterBox.Group>
            </div>

            {/* 지원자 경력 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                지원자 경력
              </label>
              <FilterBox.Group
                value={formData.experience}
                onChange={(values) =>
                  setFormData((prev) => ({ ...prev, experience: values }))
                }
              >
                {experienceOptions.map((option) => (
                  <FilterBox.Item key={option.value} value={option.value}>
                    {option.label}
                  </FilterBox.Item>
                ))}
              </FilterBox.Group>
            </div>

            {/* 직무 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                직무
              </label>
              <SelectBox
                value={formData.position}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, position: value }))
                }
                options={positionOptions}
                placeholder="직무를 선택하세요"
              />
            </div>

            {/* 급여 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                급여
              </label>
              <div className="flex flex-col lg:flex-row gap-[16px]">
                <div className="w-full max-w-[200px]">
                  <SelectBox
                    value={formData.salaryType}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, salaryType: value }))
                    }
                    options={salaryTypeOptions}
                    placeholder="구분"
                  />
                </div>
                <div className="w-full">
                  <InputBox
                    value={formData.salary}
                    onChange={(value) =>
                      handleNumberInputChange(value, (formattedValue) =>
                        setFormData((prev) => ({ ...prev, salary: formattedValue }))
                      )
                    }
                    placeholder="급여를 입력해 주세요"
                    suffix="만원"
                  />
                </div>
              </div>
            </div>

            {/* 희망 근무 요일 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                희망 근무 요일
              </label>
              <WeekdaySelector
                value={formData.workDays}
                onChange={(days) =>
                  setFormData((prev) => ({ ...prev, workDays: days }))
                }
              />
              <div className="mt-3">
                <Checkbox.Item
                  checked={formData.isWorkDaysNegotiable}
                  onChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isWorkDaysNegotiable: checked }))
                  }
                >
                  협의 가능
                </Checkbox.Item>
              </div>
            </div>

            {/* 희망 근무 시간 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                희망 근무 시간
              </label>
              <div className="flex items-center gap-4 mb-3">
                <TimePicker
                  value={formData.workStartTime}
                  onChange={(time) =>
                    setFormData((prev) => ({ ...prev, workStartTime: time }))
                  }
                  placeholder="시작 시간"
                />
                <span className="text-[#9EA5AF]">~</span>
                <TimePicker
                  value={formData.workEndTime}
                  onChange={(time) =>
                    setFormData((prev) => ({ ...prev, workEndTime: time }))
                  }
                  placeholder="종료 시간"
                />
              </div>
              <Checkbox.Item
                checked={formData.isWorkTimeNegotiable}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isWorkTimeNegotiable: checked }))
                }
              >
                협의 가능
              </Checkbox.Item>
            </div>

            {/* 복리후생 */}
            <div>
              <label className="block text-[20px] font-medium text-[#3B394D] mb-3">
                복리후생
              </label>
              <Textarea
                value={formData.benefits}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, benefits: value }))
                }
                placeholder="복리후생을 입력해 주세요"
                rows={4}
              />
            </div>

            {/* 자격 요구사항 */}
            <div>
              <h3 className="text-[20px] font-medium text-[#3B394D] mb-6">
                자격 요구사항
              </h3>

              {/* 학력 */}
              <div className="mb-6">
                <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                  학력
                </label>
                {formData.education.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <InputBox
                      value={item}
                      onChange={(value) =>
                        updateListItem("education", index, value)
                      }
                      className="w-full"
                      placeholder="학력을 입력해 주세요"
                    />
                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => addListItem("education")}
                        className="bg-[#FBFBFB] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <PlusIcon size="28" currentColor="#3B394D" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeListItem("education", index)}
                        className="bg-[#3B394D] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <MinusIcon currentColor="#EFEFF0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 자격증 */}
              <div className="mb-6">
                <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                  자격증
                </label>
                {formData.certifications.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <InputBox
                      value={item}
                      onChange={(value) =>
                        updateListItem("certifications", index, value)
                      }
                      className="w-full"
                      placeholder="자격증을 입력해 주세요"
                    />
                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => addListItem("certifications")}
                        className="bg-[#FBFBFB] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <PlusIcon size="28" currentColor="#3B394D" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeListItem("certifications", index)}
                        className="bg-[#3B394D] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <MinusIcon currentColor="#EFEFF0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 경력 상세 */}
              <div className="mb-6">
                <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                  경력 상세
                </label>
                {formData.experienceDetails.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <InputBox
                      value={item}
                      onChange={(value) =>
                        updateListItem("experienceDetails", index, value)
                      }
                      className="w-full"
                      placeholder="경력 상세를 입력해 주세요"
                    />
                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => addListItem("experienceDetails")}
                        className="bg-[#FBFBFB] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <PlusIcon size="28" currentColor="#3B394D" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          removeListItem("experienceDetails", index)
                        }
                        className="bg-[#3B394D] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <MinusIcon currentColor="#EFEFF0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 우대사항 */}
              <div>
                <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                  우대사항
                </label>
                {formData.preferences.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <InputBox
                      value={item}
                      onChange={(value) =>
                        updateListItem("preferences", index, value)
                      }
                      className="w-full"
                      placeholder="우대사항을 입력해 주세요"
                    />
                    {index === 0 ? (
                      <button
                        type="button"
                        onClick={() => addListItem("preferences")}
                        className="bg-[#FBFBFB] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <PlusIcon size="28" currentColor="#3B394D" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeListItem("preferences", index)}
                        className="bg-[#3B394D] w-[52px] h-[52px] rounded-[8px] flex items-center justify-center"
                      >
                        <MinusIcon currentColor="#EFEFF0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 채용 공고 담당자 정보 */}
            <div>
              <h3 className="text-[20px] font-medium text-[#3B394D] mb-6">
                채용 공고 담당자 정보
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                    담당자명
                  </label>
                  <InputBox
                    value={formData.managerName}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, managerName: value }))
                    }
                    placeholder="담당자명을 입력해 주세요"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                    연락처
                  </label>
                  <InputBox
                    value={formData.managerPhone}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, managerPhone: value }))
                    }
                    placeholder="연락처를 입력해 주세요"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                    메일
                  </label>
                  <InputBox
                    value={formData.managerEmail}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, managerEmail: value }))
                    }
                    placeholder="메일을 입력해 주세요"
                  />
                </div>

                <div>
                  <label className="block text-[16px] font-medium text-[#3B394D] mb-3">
                    담당 부서
                  </label>
                  <InputBox
                    value={formData.department}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, department: value }))
                    }
                    placeholder="담당 부서를 입력해 주세요"
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-center gap-[16px] mt-[40px]">
              <Button
                variant="line"
                size="medium"
                onClick={handleSaveDraft}
                className="px-[40px]"
              >
                임시저장
              </Button>
              <Button
                variant="default"
                size="medium"
                onClick={handleSave}
                className="px-[40px]"
              >
                등록하기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
