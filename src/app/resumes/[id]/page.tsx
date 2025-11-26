"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  PhoneIcon,
  MailIcon,
  StarEmptyIcon,
  StarFilledIcon,
  StarHalfIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
} from "public/icons";
import { Button } from "@/components/ui/Button";
import ResumeCard from "@/components/ui/ResumeCard/ResumeCard";
import { Tab } from "@/components/ui/Tab";
import { SelectBox } from "@/components/ui/SelectBox";
import { Tag } from "@/components/ui/Tag";
import {
  ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_OPTIONS,
  APPLICATION_STATUS_COLORS,
  mapFromLegacyStatus,
} from "@/constants/applicationStatus";
import { useResumeDetail } from "@/hooks/useResumeDetail";
import { useRelatedResumes } from "@/hooks/useRelatedResumes";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { deleteResumeAction } from "@/actions/resumes";
import { useLikeStore } from "@/stores/likeStore";
import { useViewCountStore } from "@/stores/viewCountStore";
import { useHospitalAuth } from "@/utils/hospitalAuthGuard";
import { useHospitalAuthModal } from "@/hooks/useHospitalAuthModal";
import { HospitalAuthModal } from "@/components/ui/HospitalAuthModal";

// 별점 표시 컴포넌트 (소수점 지원)
const StarRating = ({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      // 완전히 채워진 별
      stars.push(<StarFilledIcon key={i} size={size} />);
    } else if (rating >= i - 0.5) {
      // 반쯤 채워진 별
      stars.push(<StarHalfIcon key={i} size={size} />);
    } else {
      // 빈 별
      stars.push(<StarEmptyIcon key={i} size={size} />);
    }
  }
  return <div className="flex gap-1">{stars}</div>;
};

// 인터랙티브 별점 컴포넌트 (0.5점 단위)
const InteractiveStarRating = ({
  rating,
  onRatingChange,
  size = 20,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (
    star: number,
    isHalf: boolean,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    const newRating = isHalf ? star - 0.5 : star;
    onRatingChange(newRating);
  };

  const handleMouseMove = (
    star: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const isHalf = x < width / 2;
    const newHoverRating = isHalf ? star - 0.5 : star;
    setHoverRating(newHoverRating);
  };

  const renderStar = (star: number) => {
    const displayRating = hoverRating || rating;

    if (displayRating >= star) {
      return <StarFilledIcon size={size} />;
    } else if (displayRating >= star - 0.5) {
      return <StarHalfIcon size={size} />;
    } else {
      return <StarEmptyIcon size={size} />;
    }
  };

  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className="relative cursor-pointer"
          onMouseMove={(e) => handleMouseMove(star, e)}
          style={{ width: size, height: size }}
        >
          {/* 왼쪽 절반 클릭 영역 (0.5점) */}
          <button
            className="absolute inset-y-0 left-0 w-1/2 z-10"
            onClick={(e) => handleStarClick(star, true, e)}
            aria-label={`${star - 0.5}점`}
          />
          {/* 오른쪽 절반 클릭 영역 (1점) */}
          <button
            className="absolute inset-y-0 right-0 w-1/2 z-10"
            onClick={(e) => handleStarClick(star, false, e)}
            aria-label={`${star}점`}
          />
          {/* 별 아이콘 */}
          <div className="absolute inset-0">{renderStar(star)}</div>
        </div>
      ))}
    </div>
  );
};

export default function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const {
    isAuthenticated,
    userType,
    isLoading: isAuthLoading,
  } = useHospitalAuth();
  const { showModal, isModalOpen, closeModal, modalReturnUrl } =
    useHospitalAuthModal();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
  });
  const [isOwner, setIsOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [applicationInfo, setApplicationInfo] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState<
    ApplicationStatus | ""
  >("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);

  // 평가하기 관련 상태
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [expandedEvaluations, setExpandedEvaluations] = useState<string[]>([]);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(
    null
  );
  const [ratings, setRatings] = useState({
    stressManagement: 0,
    growth: 0,
    care: 0,
    documentation: 0,
    contribution: 0,
  });
  const [comments, setComments] = useState({
    stressManagement: "",
    growth: "",
    care: "",
    documentation: "",
    contribution: "",
  });

  const { id } = use(params);

  // 병원 사용자가 아닌 경우에만 모달 표시
  React.useEffect(() => {
    if (!isAuthLoading && (!isAuthenticated || userType !== "HOSPITAL")) {
      showModal(`/resumes/${id}`);
    }
  }, [isAuthenticated, userType, showModal, id, isAuthLoading]);

  const { data: resumeData, isLoading, error } = useResumeDetail(id);
  const { data: relatedResumes, isLoading: relatedLoading } =
    useRelatedResumes(id);
  const { data: user } = useCurrentUser();
  const searchParams = useSearchParams();

  // Zustand 스토어에서 좋아요 상태 관리
  const {
    setResumeLike,
    toggleResumeLike,
    isResumeLiked,
    initializeResumeLikes,
  } = useLikeStore();

  // Zustand 스토어에서 조회수 상태 관리
  const { setResumeViewCount, getResumeViewCount } = useViewCountStore();

  // URL에서 applicationId 파라미터 가져오기
  const applicationId = searchParams.get("applicationId");

  // 이력서 ID에서 veterinarianId 추출하는 함수
  const extractVeterinarianId = (resumeId: string): string | null => {
    // resume_IVoSQNS8kgGWm1-m_1761122200523 -> IVoSQNS8kgGWm1-m
    const match = resumeId.match(/^resume_([^_]+)/);
    return match ? match[1] : null;
  };

  const veterinarianId = extractVeterinarianId(id);

  // 초기 좋아요 상태 동기화 (배열 형태로 초기화)
  useEffect(() => {
    if (resumeData) {
      console.log("[ResumeDetail] 서버에서 받은 이력서 데이터:", {
        id,
        isLiked: resumeData.isLiked,
        viewCount: resumeData.viewCount,
      });

      // 좋아요 상태 초기화
      if (resumeData.isLiked) {
        console.log("[ResumeDetail] 좋아요된 이력서로 초기화:", id);
        initializeResumeLikes([id]);
      } else {
        console.log("[ResumeDetail] 좋아요되지 않은 이력서");
        // 좋아요가 아닌 경우도 명시적으로 설정
        setResumeLike(id, false);
      }

      // 조회수 초기화
      if (resumeData.viewCount !== undefined) {
        // 서버에서 받은 조회수로 초기화
        setResumeViewCount(id, resumeData.viewCount);
      }
    }
  }, [
    resumeData,
    id,
    initializeResumeLikes,
    setResumeLike,
    setResumeViewCount,
  ]);

  // 조회수 증가 함수
  const incrementViewCount = async () => {
    try {
      console.log(
        `[ResumeDetail] 조회수 증가 API 호출 시작 - Resume ID: ${id}`
      );

      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("[ResumeDetail] 인증 토큰 포함하여 요청");
      } else {
        console.log("[ResumeDetail] 익명 사용자로 요청");
      }

      const apiUrl = `/api/resumes/${id}/view`;
      console.log(`[ResumeDetail] API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
      });

      console.log(`[ResumeDetail] API 응답 상태: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("[ResumeDetail] API 응답 데이터:", data);

        if (data.status === "success" && data.data?.viewCount) {
          console.log("[ResumeDetail] 조회수 증가 성공:", data.data.viewCount);
          setResumeViewCount(id, data.data.viewCount);
        } else {
          console.warn(
            "[ResumeDetail] 조회수 증가 실패 - 응답 데이터 이상:",
            data
          );
        }
      } else {
        const errorData = await response.text();
        console.error(
          "[ResumeDetail] 조회수 증가 실패:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("[ResumeDetail] 조회수 증가 중 오류:", error);
    }
  };

  // 조회수 증가를 위한 별도 useEffect
  useEffect(() => {
    if (resumeData) {
      console.log(
        "[ResumeDetail] 이력서 데이터 로드 완료, 조회수 증가 API 호출"
      );

      // 낙관적 업데이트: API 호출 전에 먼저 클라이언트에서 조회수 증가
      const currentViewCount = getResumeViewCount(id);
      setResumeViewCount(id, currentViewCount + 1);

      // 그 다음 API 호출
      incrementViewCount();
    }
  }, [resumeData?.id]); // resumeData가 설정될 때마다 실행

  useEffect(() => {
    console.log("=== Debug info ===");
    console.log("User:", user);
    console.log("User type:", user?.type);
    console.log("Resume ID:", id);
    console.log("Extracted VeterinarianId:", veterinarianId);
    console.log("ApplicationId from URL:", applicationId);
    console.log("ResumeData:", resumeData);
    console.log("ApplicationInfo state:", applicationInfo);
    console.log("==================");

    if (resumeData && user) {
      console.log("Ownership check:", {
        resumeUserId: resumeData.userId,
        currentUserId: user.id,
        isEqual: resumeData.userId === user.id,
      });
      setIsOwner(resumeData.userId === user.id);

      // 병원 계정인 경우 지원 정보 가져오기
      if (user.type === "hospital") {
        if (applicationId) {
          // URL에 applicationId가 있는 경우
          console.log("✅ Using applicationId from URL:", applicationId);
          fetchApplicationInfo(applicationId);
        } else if (veterinarianId) {
          // applicationId가 없지만 veterinarianId를 추출할 수 있는 경우
          console.log(
            "✅ Using veterinarianId to find application:",
            veterinarianId
          );
          findApplicationByVeterinarian(veterinarianId);
        } else {
          console.log(
            "❌ Cannot find application - no applicationId or veterinarianId"
          );
        }
      } else {
        console.log("❌ Not a hospital user:", {
          userType: user.type,
          hasApplicationId: !!applicationId,
          hasVeterinarianId: !!veterinarianId,
        });
      }
    } else {
      console.log("Missing data for ownership check:", {
        hasResumeData: !!resumeData,
        hasUser: !!user,
        resumeUserId: resumeData?.userId,
        currentUserId: user?.id,
      });
    }
  }, [resumeData, user, applicationId, veterinarianId]);

  // 평가 데이터 로드 - 조건부 return 전에 위치해야 함
  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!id) return;

      setEvaluationsLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(`/api/resumes/${id}/evaluation`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (result.status === "success") {
          console.log("Evaluations loaded:", result.data);
          setEvaluations(result.data || []);
        }
      } catch (error) {
        console.error("평가 데이터 로드 실패:", error);
      } finally {
        setEvaluationsLoading(false);
      }
    };

    fetchEvaluations();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-key1 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">이력서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">이력서를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">
            {error || "이력서가 존재하지 않습니다."}
          </p>
          <Link href="/resumes" className="text-blue-600 hover:underline">
            이력서 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/member-select");
      return;
    }

    const isCurrentlyLiked = isResumeLiked(id);

    console.log(
      `[ResumeDetail Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleResumeLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[ResumeDetail Like] API 요청: ${method} /api/resumes/${id}/like`
      );

      const response = await fetch(`/api/resumes/${id}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setResumeLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[ResumeDetail Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("이력서를 찾을 수 없습니다:", id);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[ResumeDetail Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setResumeLike(id, true);
            return;
          }
          console.warn(`${actionText} 실패:`, result.message);
          return;
        } else if (response.status === 401) {
          console.warn("로그인이 필요합니다.");
          alert("로그인이 필요합니다.");
          router.push("/member-select");
          return;
        }
        throw new Error(result.message || `${actionText} 요청에 실패했습니다.`);
      }

      console.log(`[ResumeDetail Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[ResumeDetail Like] ${
          isCurrentlyLiked ? "좋아요 취소" : "좋아요"
        } 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setResumeLike(id, isCurrentlyLiked);
      alert("좋아요 처리 중 오류가 발생했습니다.");
    }
  };

  // 한국어 라벨 변환 함수 (VeterinarianResumePage에서 실제 사용되는 값들만 매핑)
  const getKoreanLabel = (keyword: string) => {
    const labelMap: { [key: string]: string } = {
      // 진료 분야 (VeterinarianResumePage medicalFieldOptions 기준)
      internal: "내과",
      surgery: "외과",
      dermatology: "피부과",
      orthopedics: "정형외과",

      // 학위 (VeterinarianResumePage degreeOptions 기준)
      bachelor: "학사",
      master: "석사",
      doctor: "박사",

      // 졸업상태 (VeterinarianResumePage graduationStatusOptions 기준)
      graduated: "졸업",
      expected: "졸업예정",
      attending: "재학중",

      // 숙련도 (VeterinarianResumePage proficiencyOptions 기준)
      beginner: "초급",
      intermediate: "중급",
      advanced: "고급",
      expert: "전문가",

      // 자격증 등급 (VeterinarianResumePage gradeOptions 기준)
      "1": "1급",
      "2": "2급",
      "3": "3급",
      special: "특급",

      // 직무
      veterinarian: "수의사",
      assistant: "수의테크니션",
      manager: "병원장",
      intern: "인턴",
      resident: "전공의",

      // 근무 형태
      "full-time": "정규직",
      fulltime: "정규직",
      "part-time": "파트타임",
      parttime: "파트타임",
      contract: "계약직",
      freelance: "프리랜서",
      internship: "인턴십",

      // 지역
      seoul: "서울",
      busan: "부산",
      daegu: "대구",
      incheon: "인천",
      gwangju: "광주",
      daejeon: "대전",
      ulsan: "울산",
      gyeonggi: "경기",
      gangwon: "강원",
      chungbuk: "충북",
      chungnam: "충남",
      jeonbuk: "전북",
      jeonnam: "전남",
      gyeongbuk: "경북",
      gyeongnam: "경남",
      jeju: "제주",
      sejong: "세종",

      // 근무가능일 맵핑
      immediate: "즉시 가능",
      asap: "즉시 가능",
      "1week": "1주 후",
      "2weeks": "2주 후",
      "1month": "1개월 후",
      "2months": "2개월 후",
      "3months": "3개월 후",
      "6months": "6개월 후",
      negotiable: "협의 가능",
      discussion: "협의 가능",

      // 근무 요일 맵핑
      monday: "월요일",
      tuesday: "화요일",
      wednesday: "수요일",
      thursday: "목요일",
      friday: "금요일",
      saturday: "토요일",
      sunday: "일요일",
      mon: "월",
      tue: "화",
      wed: "수",
      thu: "목",
      fri: "금",
      sat: "토",
      sun: "일",
    };
    return labelMap[keyword?.toLowerCase()] || keyword;
  };

  // 요일을 월화수목금토일 순서로 정렬하는 함수
  const sortWeekdays = (weekdays: string[]) => {
    const weekdayOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const shortWeekdayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    return weekdays.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      // 전체 형태 요일 순서 확인
      let aIndex = weekdayOrder.indexOf(aLower);
      let bIndex = weekdayOrder.indexOf(bLower);

      // 축약 형태 요일 순서 확인
      if (aIndex === -1) aIndex = shortWeekdayOrder.indexOf(aLower);
      if (bIndex === -1) bIndex = shortWeekdayOrder.indexOf(bLower);

      // 순서를 찾지 못한 경우 원래 순서 유지
      if (aIndex === -1) aIndex = 999;
      if (bIndex === -1) bIndex = 999;

      return aIndex - bIndex;
    });
  };

  const handleContactClick = () => {
    setContactModalOpen(true);
  };

  const handleContactSubmit = async () => {
    if (!contactForm.subject || !contactForm.message) {
      alert("제목과 문의 내용을 모두 입력해 주세요.");
      return;
    }

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("accessToken");

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: contactForm.subject,
          message: contactForm.message,
          recipientId: resumeData.userId,
          type: "resume",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert("문의가 성공적으로 전송되었습니다!");

        setContactForm({
          subject: "",
          message: "",
        });
        setContactModalOpen(false);
      } else {
        throw new Error(result.error || "문의 전송에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Contact submit error:", error);

      if (error.message.includes("Unauthorized")) {
        alert("로그인이 필요합니다.");
        router.push("/member-select");
      } else {
        alert(error.message || "문의 전송 중 오류가 발생했습니다.");
      }
    }
  };

  // 평가 항목 토글
  const toggleEvaluation = (evaluationId: string) => {
    setExpandedEvaluations((prev) =>
      prev.includes(evaluationId)
        ? prev.filter((id) => id !== evaluationId)
        : [...prev, evaluationId]
    );
  };

  // 전체 평균 계산
  const calculateOverallAverage = () => {
    if (evaluations.length === 0) return "0.0";

    const total = evaluations.reduce(
      (sum, evaluation) => sum + evaluation.overallRating,
      0
    );
    return (total / evaluations.length).toFixed(1);
  };

  // 평가하기 관련 핸들러
  const handleModalClose = () => {
    setShowRatingModal(false);
    setEditingEvaluationId(null);
    resetRatingForm();
  };

  const handleRatingChange = (category: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [category]: rating }));
  };

  const handleCommentChange = (category: string, comment: string) => {
    setComments((prev) => ({ ...prev, [category]: comment }));
  };

  const resetRatingForm = () => {
    setRatings({
      stressManagement: 0,
      growth: 0,
      care: 0,
      documentation: 0,
      contribution: 0,
    });
    setComments({
      stressManagement: "",
      growth: "",
      care: "",
      documentation: "",
      contribution: "",
    });
  };

  const handleRatingSubmit = async () => {
    try {
      // 모든 평가 항목이 0이 아닌지 확인
      const ratingValues = Object.values(ratings);
      if (ratingValues.some((rating) => rating === 0)) {
        alert("모든 평가 항목에 점수를 주세요.");
        return;
      }

      const token = localStorage.getItem("accessToken");
      const method = editingEvaluationId ? "PUT" : "POST";
      const url = editingEvaluationId
        ? `/api/resumes/${id}/evaluation/${editingEvaluationId}`
        : `/api/resumes/${id}/evaluation`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ratings,
          comments,
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        alert(
          editingEvaluationId
            ? "평가가 성공적으로 수정되었습니다."
            : "평가가 성공적으로 등록되었습니다."
        );
        setShowRatingModal(false);
        setEditingEvaluationId(null);
        resetRatingForm();

        // 평가 목록 새로고침
        const refreshResponse = await fetch(`/api/resumes/${id}/evaluation`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const refreshResult = await refreshResponse.json();
        if (refreshResult.status === "success") {
          setEvaluations(refreshResult.data || []);
        }
      } else {
        alert(result.message || "평가 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("평가 처리 오류:", error);
      alert("평가 처리 중 오류가 발생했습니다.");
    }
  };

  const handleEditEvaluation = (evaluation: any) => {
    setEditingEvaluationId(evaluation.id);
    // 기존 평가 데이터로 폼 채우기
    setRatings({
      stressManagement:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "스트레스 관리"
        )?.rating || 0,
      growth:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "성장 잠재력"
        )?.rating || 0,
      care:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "소통 능력"
        )?.rating || 0,
      documentation:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "업무 역량"
        )?.rating || 0,
      contribution:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "협업 능력"
        )?.rating || 0,
    });
    setComments({
      stressManagement:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "스트레스 관리"
        )?.comment || "",
      growth:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "성장 잠재력"
        )?.comment || "",
      care:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "소통 능력"
        )?.comment || "",
      documentation:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "업무 역량"
        )?.comment || "",
      contribution:
        evaluation.detailedEvaluations?.find(
          (d: any) => d.category === "협업 능력"
        )?.comment || "",
    });
    setShowRatingModal(true);
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!window.confirm("정말로 이 평가를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/resumes/${id}/evaluation/${evaluationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        alert("평가가 성공적으로 삭제되었습니다.");
        // 평가 목록 새로고침
        const refreshResponse = await fetch(`/api/resumes/${id}/evaluation`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const refreshResult = await refreshResponse.json();
        if (refreshResult.status === "success") {
          setEvaluations(refreshResult.data || []);
        }
      } else {
        alert(result.message || "평가 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("평가 삭제 오류:", error);
      alert("평가 삭제 중 오류가 발생했습니다.");
    }
  };

  // 사용자가 해당 평가를 수정/삭제할 권한이 있는지 확인하는 함수
  const canUserEditEvaluation = (evaluation: any) => {
    console.log("Checking edit permission:", {
      user: user,
      userId: user?.id,
      evaluatorId: evaluation.evaluatorId,
      canEdit: user && evaluation.evaluatorId === user.id,
    });
    return user && evaluation.evaluatorId === user.id;
  };

  const resetContactForm = () => {
    setContactForm({
      subject: "",
      message: "",
    });
    setContactModalOpen(false);
  };

  const handleDeleteResume = async () => {
    if (
      !confirm(
        "정말로 이력서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteResumeAction(id);

      if (result.success) {
        alert("이력서가 성공적으로 삭제되었습니다.");
        router.push("/resumes");
      } else {
        alert(result.message || "이력서 삭제 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("이력서 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditResume = () => {
    router.push("/dashboard/veterinarian/resume");
  };

  // 상태에 따른 Tag variant 반환
  const getStatusVariant = (
    status: ApplicationStatus | ""
  ): 1 | 2 | 3 | 4 | 5 | 6 => {
    if (!status) return 4;
    return APPLICATION_STATUS_COLORS[status] || 4;
  };

  // 병원의 공고에 해당 수의사가 지원한 내역 찾기
  const findApplicationByVeterinarian = async (veterinarianId: string) => {
    try {
      console.log("🔍 Finding application for veterinarian:", veterinarianId);

      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/dashboard/hospital/applicants", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("📋 All hospital applications:", result);

        if (result.status === "success" && result.data) {
          // result.data가 배열인지 확인
          // result.data가 객체이고 applicants 속성이 배열인지 확인
          if (!result.data || !Array.isArray(result.data.applicants)) {
            console.warn(
              "result.data.applicants is not an array or result.data is not an object:",
              result.data
            );
            setApplicationInfo([]);
            return null;
          }
          // 해당 수의사가 이 병원의 공고에 지원한 모든 내역 찾기
          const targetApplications = result.data.applicants.filter(
            (app: any) => app.veterinarianId === veterinarianId
          );

          if (targetApplications.length > 0) {
            console.log("🎯 Found matching applications:", targetApplications);

            // 각 지원에 대해 상태 변환 처리
            const updatedApplications = targetApplications.map((app: any) => {
              const legacyStatus = app.status;
              const newStatus = mapFromLegacyStatus(legacyStatus);
              console.log("🔄 Status conversion for", app.job_title, ":", {
                legacyStatus,
                newStatus,
              });

              return {
                ...app,
                status: newStatus,
              };
            });

            setApplicationInfo(updatedApplications);
            setApplicationStatus(updatedApplications[0].status); // 첫 번째 지원의 상태로 초기화
            return updatedApplications;
          } else {
            console.log("❌ No application found for this veterinarian");
            return null;
          }
        }
      } else {
        console.error("❌ Failed to fetch applications:", response.status);
      }
    } catch (error) {
      console.error("💥 Error finding application:", error);
    }
    return null;
  };

  // 지원 정보 가져오기
  const fetchApplicationInfo = async (applicationId: string) => {
    try {
      console.log(
        "🔍 Fetching application info from:",
        `/api/dashboard/hospital/applicants/${applicationId}`
      );

      // Authorization 헤더 추가
      const token = localStorage.getItem("accessToken");
      console.log(
        "🔑 Using token:",
        token ? `${token.substring(0, 20)}...` : "No token"
      );

      const response = await fetch(
        `/api/dashboard/hospital/applicants/${applicationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Application data received:", result);

        // API 응답 구조 확인
        if (result.status === "success" && result.data) {
          console.log("📊 Setting application info:", result.data);
          const legacyStatus = result.data.status;
          const newStatus = mapFromLegacyStatus(legacyStatus);
          console.log("🔄 Status conversion:", { legacyStatus, newStatus });

          setApplicationInfo({
            ...result.data,
            status: newStatus, // 새 상태로 변환
          });
          setApplicationStatus(newStatus);
        } else {
          console.error("❌ Unexpected response structure:", result);
        }
      } else {
        const errorData = await response.text();
        console.error("❌ Failed to fetch application info:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      }
    } catch (error) {
      console.error("💥 Error fetching application info:", error);
    }
  };

  // 지원 상태 변경
  const handleStatusChange = async (
    newStatus: ApplicationStatus,
    targetApplicationId?: string
  ) => {
    if (!applicationInfo) return;

    // 여러 지원이 있는 경우 특정 지원 대상
    const isMultipleApplications = Array.isArray(applicationInfo);
    const targetApp = isMultipleApplications
      ? applicationInfo.find(
          (app: any) =>
            app.id === (targetApplicationId || selectedApplicationId)
        )
      : applicationInfo;

    if (!targetApp) return;
    if (newStatus === targetApp.status) return; // 상태가 동일하면 변경하지 않음

    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/dashboard/hospital/applicants/${targetApp.id}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        // applicationInfo 상태도 업데이트
        if (isMultipleApplications) {
          const updatedApplications = applicationInfo.map((app: any) =>
            app.id === targetApp.id ? { ...app, status: newStatus } : app
          );
          setApplicationInfo(updatedApplications);
        } else {
          setApplicationInfo({
            ...applicationInfo,
            status: newStatus,
          });
        }
        alert("지원 상태가 성공적으로 변경되었습니다.");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "상태 변경 중 오류가 발생했습니다.");
        // 오류 발생 시 원래 상태로 되돌림
        setApplicationStatus(applicationInfo.status);
      }
    } catch (error) {
      console.error("상태 변경 중 오류 발생:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
      // 오류 발생 시 원래 상태로 되돌림
      setApplicationStatus(applicationInfo.status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#FBFBFB]">
        <div className="max-w-[1095px] mx-auto pt-[20px] pb-[140px] px-4 lg:px-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/resumes"
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeftIcon currentColor="currentColor" />
            </Link>

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <MoreVerticalIcon size="28" currentColor="currentColor" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-[130px] bg-white border rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleEditResume}
                      className="flex justify-center items-center w-full px-[20px] py-[10px] text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <EditIcon size="24" currentColor="currentColor" />
                      <span className="ml-2">수정하기</span>
                    </button>
                    <button
                      onClick={handleDeleteResume}
                      disabled={isDeleting}
                      className="flex justify-center items-center w-full px-[20px] py-[10px] text-sm text-[#ff8796] hover:bg-gray-50 disabled:opacity-50"
                    >
                      <TrashIcon currentColor="currentColor" />
                      <span className="ml-2">
                        {isDeleting ? "삭제 중..." : "삭제하기"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 병원 계정이고 지원자인 경우 상태 변경 SelectBox */}
            {console.log("SelectBox render check:", {
              isHospital: user?.type === "hospital",
              hasApplicationInfo: !!applicationInfo,
              shouldShow: user?.type === "hospital" && applicationInfo,
              isMultiple: Array.isArray(applicationInfo),
            })}
            {user?.type === "hospital" && applicationInfo && (
              <div className="space-y-4">
                {Array.isArray(applicationInfo) ? (
                  // 여러 지원이 있는 경우
                  <>
                    <span className="text-sm text-gray-600 font-medium">
                      지원 상태 관리:
                    </span>
                    {applicationInfo.map((app: any) => (
                      <div
                        key={app.id}
                        className="bg-gray-50 p-4 rounded-lg flex gap-4 justify-between"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">
                              {app.job_title}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({app.job_position})
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            지원일:{" "}
                            {new Date(app.appliedAt).toLocaleDateString(
                              "ko-KR"
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">상태:</span>
                          {isEditingStatus &&
                          selectedApplicationId === app.id ? (
                            <>
                              <SelectBox
                                value={applicationStatus}
                                onChange={(value) =>
                                  setApplicationStatus(
                                    value as ApplicationStatus
                                  )
                                }
                                disabled={isUpdatingStatus}
                                placeholder="상태 선택"
                                options={APPLICATION_STATUS_OPTIONS}
                              />
                              <Button
                                variant="keycolor"
                                size="small"
                                onClick={() => {
                                  if (applicationStatus) {
                                    handleStatusChange(
                                      applicationStatus,
                                      app.id
                                    );
                                    setIsEditingStatus(false);
                                    setSelectedApplicationId(null);
                                  }
                                }}
                                disabled={isUpdatingStatus}
                              >
                                {isUpdatingStatus ? "변경 중..." : "변경"}
                              </Button>
                              <Button
                                variant="line"
                                size="small"
                                onClick={() => {
                                  setApplicationStatus(app.status);
                                  setIsEditingStatus(false);
                                  setSelectedApplicationId(null);
                                }}
                                disabled={isUpdatingStatus}
                              >
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Tag variant={getStatusVariant(app.status)}>
                                {
                                  APPLICATION_STATUS_LABELS[
                                    app.status as ApplicationStatus
                                  ]
                                }
                              </Tag>
                              <Button
                                variant="line"
                                size="small"
                                onClick={() => {
                                  setSelectedApplicationId(app.id);
                                  setApplicationStatus(app.status);
                                  setIsEditingStatus(true);
                                }}
                                disabled={isEditingStatus}
                              >
                                수정하기
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  // 단일 지원인 경우 (기존 UI 유지)
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">지원 상태:</span>
                    {isEditingStatus ? (
                      <>
                        <SelectBox
                          value={applicationStatus}
                          onChange={(value) =>
                            setApplicationStatus(value as ApplicationStatus)
                          }
                          disabled={isUpdatingStatus}
                          placeholder="상태 선택"
                          options={APPLICATION_STATUS_OPTIONS}
                        />
                        <Button
                          variant="keycolor"
                          size="small"
                          onClick={() => {
                            if (applicationStatus) {
                              handleStatusChange(applicationStatus);
                              setIsEditingStatus(false);
                            }
                          }}
                          disabled={isUpdatingStatus}
                        >
                          {isUpdatingStatus ? "변경 중..." : "변경"}
                        </Button>
                        <Button
                          variant="line"
                          size="small"
                          onClick={() => {
                            setApplicationStatus(applicationInfo.status);
                            setIsEditingStatus(false);
                          }}
                          disabled={isUpdatingStatus}
                        >
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <Tag variant={getStatusVariant(applicationStatus)}>
                          {applicationStatus &&
                            APPLICATION_STATUS_LABELS[applicationStatus]}
                        </Tag>
                        <Button
                          variant="line"
                          size="small"
                          onClick={() => setIsEditingStatus(true)}
                        >
                          수정하기
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <section>
            {/* 프로필 섹션 */}
            <div className="p-[30px] bg-white border border-[1px] lg:items-center border-[#EFEFF0] rounded-[16px] flex flex-col lg:flex-row lg:items-start gap-[10px] lg:gap-8">
              {/* 프로필 이미지와 모바일 북마크 */}
              <div className="flex justify-between lg:justify-start lg:items-start">
                <div className="w-[92px] h-[92px] lg:w-[160px] lg:h-[160px] aspect-square rounded-full overflow-hidden border-2 border-[#FFB5B5] bg-[#FFF5F5] flex items-center justify-center mt-[20px] lg:mt-[0px] lg:m-[30px] flex-shrink-0">
                  {resumeData.photo ? (
                    <Image
                      src={resumeData.photo}
                      alt={`${resumeData.name} 프로필`}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-key1 text-4xl font-bold">
                      {resumeData.name.charAt(0)}
                    </div>
                  )}
                </div>
                {/* 모바일 북마크 버튼 */}
                <div
                  className="lg:hidden cursor-pointer"
                  onClick={handleBookmarkClick}
                >
                  {(() => {
                    const liked = isResumeLiked(id);
                    console.log(
                      `[ResumeDetail UI Debug] Mobile bookmark - Resume ${id}: liked=${liked}`
                    );
                    return liked ? (
                      <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                    ) : (
                      <BookmarkIcon currentColor="var(--Subtext2)" />
                    );
                  })()}
                </div>
              </div>

              {/* 프로필 정보 */}
              <div className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h1 className="font-text text-[32px] font-normal text-primary mb-2">
                      {resumeData.name}
                    </h1>
                    <p className="font-text text-[16px] text-sub mb-4 lg:mr-[60px] mr-[30px]">
                      {resumeData.introduction || "소개가 작성되지 않았습니다."}
                    </p>

                    {/* 조회수 */}
                    {/* <div className="flex items-center gap-2 mb-4">
                      <EyeIcon currentColor="#9098A4" />
                      <span className="font-text text-[14px] text-[#9098A4]">
                        조회 {getResumeViewCount(id).toLocaleString()}
                      </span>
                    </div> */}

                    {/* 연락처 및 이메일 */}
                    <div className="flex flex-col lg:flex-row lg:gap-[20px] gap-2 mb-6">
                      {resumeData.phonePublic && resumeData.phone && (
                        <>
                          <div className="flex items-center gap-2">
                            <PhoneIcon currentColor="#4F5866" />
                            <span className="font-text text-[14px] lg:text-[16px] text-sub">
                              {resumeData.phone}
                            </span>
                          </div>
                          <span className="hidden lg:inline">|</span>
                        </>
                      )}
                      {resumeData.emailPublic && resumeData.email && (
                        <div className="flex items-center gap-2">
                          <MailIcon currentColor="#4F5866" />
                          <span className="font-text text-[14px] lg:text-[16px] text-sub">
                            {resumeData.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 북마크 버튼 - 데스크톱용 */}
                  <div
                    className="hidden lg:flex items-center justify-center cursor-pointer"
                    onClick={handleBookmarkClick}
                  >
                    {(() => {
                      const liked = isResumeLiked(id);
                      console.log(
                        `[ResumeDetail UI Debug] Desktop bookmark - Resume ${id}: liked=${liked}`
                      );
                      return liked ? (
                        <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                      ) : (
                        <BookmarkIcon currentColor="var(--Subtext2)" />
                      );
                    })()}
                  </div>
                </div>

                {/* 현재 직장, 총 경력, 근무가능일 */}
                <div className="bg-box-light flex flex-col lg:flex-row justify-evenly px-[20px] lg:px-[50px] py-[20px] border border-[1px] border-[#EFEFF0] rounded-[16px] gap-[16px] lg:gap-0">
                  <div className="flex flex-col gap-[4px] items-center">
                    <span className="font-text text-[14px] lg:text-[16px] text-sub">
                      직무
                    </span>
                    <span className="font-text text-key1 text-[18px] lg:text-[24px] font-semibold">
                      {getKoreanLabel(resumeData.position || "veterinarian")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[4px] items-center">
                    <span className="font-text text-[14px] lg:text-[16px] text-sub">
                      희망 연봉
                    </span>
                    <span className="font-text text-key1 text-[18px] lg:text-[24px] font-semibold">
                      {resumeData.expectedSalary
                        ? `${Number(
                            resumeData.expectedSalary
                          ).toLocaleString()}만원`
                        : "협의"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[4px] items-center">
                    <span className="font-text text-[14px] lg:text-[16px] text-sub">
                      근무가능일
                    </span>
                    <span className="font-text text-key1 text-[18px] lg:text-[24px] font-semibold">
                      {getKoreanLabel(resumeData.startDate || "immediate")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 탭 섹션 */}
            <div className="mt-[40px] lg:mt-[60px]">
              <Tab defaultTab="talent-info" variant="rounded">
                <Tab.List>
                  <Tab.Item value="talent-info">인재정보</Tab.Item>
                  <Tab.Item value="talent-evaluation">인재평가</Tab.Item>
                </Tab.List>

                <Tab.Content value="talent-info">
                  <div className="flex flex-col gap-[60px] lg:gap-[80px] w-full">
                    <div className="flex flex-col lg:flex-row gap-[40px] lg:gap-[50px] lg:justify-between">
                      {/* 인재 정보 */}
                      <div className="w-full">
                        <h3 className="font-text text-[18px] lg:text-[20px] text-semibold title-light text-primary mb-[16px]">
                          인재 정보
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              이름
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.name}
                            </span>
                          </div>
                          {resumeData.birthDate && (
                            <div className="flex gap-4">
                              <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                                생년월일
                              </span>
                              <span className="font-text text-[14px] lg:text-[16px] text-primary">
                                {resumeData.birthDate}
                              </span>
                            </div>
                          )}
                          {resumeData.phonePublic && resumeData.phone && (
                            <div className="flex gap-4">
                              <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                                연락처
                              </span>
                              <span className="font-text text-[14px] lg:text-[16px] text-primary">
                                {resumeData.phone}
                              </span>
                            </div>
                          )}
                          {resumeData.emailPublic && resumeData.email && (
                            <div className="flex gap-4">
                              <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                                이메일
                              </span>
                              <span className="font-text text-[14px] lg:text-[16px] text-primary">
                                {resumeData.email}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              직무
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {getKoreanLabel(
                                resumeData.position || "veterinarian"
                              )}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              전공분야
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.specialties
                                ? resumeData.specialties
                                    .map((s) => getKoreanLabel(s))
                                    .join(", ")
                                : "미입력"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 희망 근로 사항 */}
                      <div className="w-full">
                        <h3 className="font-text text-[18px] lg:text-[20px] text-semibold title-light text-primary mb-[16px]">
                          희망 근로 사항
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              근무형태
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.workTypes
                                ? resumeData.workTypes
                                    .map((w) => getKoreanLabel(w))
                                    .join(", ")
                                : "미입력"}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              희망연봉
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.expectedSalary
                                ? `${Number(
                                    resumeData.expectedSalary
                                  ).toLocaleString()}만원`
                                : "협의"}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              근무 요일
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.preferredWeekdays
                                ? sortWeekdays(resumeData.preferredWeekdays)
                                    .map((day) => getKoreanLabel(day))
                                    .join(", ")
                                : "미입력"}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              근무 시간
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.workStartTime &&
                              resumeData.workEndTime
                                ? `${resumeData.workStartTime} ~ ${resumeData.workEndTime}`
                                : "미입력"}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              근무 지역
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {resumeData.preferredRegions
                                ? resumeData.preferredRegions
                                    .map((r) => getKoreanLabel(r))
                                    .join(", ")
                                : "미입력"}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="font-text text-[14px] lg:text-[16px] text-sub w-[70px] lg:w-[80px] flex-shrink-0">
                              근무 가능일
                            </span>
                            <span className="font-text text-[14px] lg:text-[16px] text-primary">
                              {getKoreanLabel(
                                resumeData.startDate || "immediate"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 경력 사항 */}
                    <div>
                      <div className="flex justify-between items-center mb-[20px]">
                        <h3 className="font-text text-[20px] text-semibold title-light text-primary">
                          경력 사항
                        </h3>
                        <p className="font-text text-[20px] text-semibold text-primary">
                          총 {resumeData.experiences?.length || 0}개
                        </p>
                      </div>
                      <div className="flex flex-col gap-[16px]">
                        {resumeData.experiences &&
                        resumeData.experiences.length > 0 ? (
                          resumeData.experiences.map((experience) => (
                            <div
                              key={experience.id}
                              className="bg-white flex flex-col lg:flex-row gap-[16px] lg:gap-[40px] lg:items-center lg:justify-start"
                            >
                              <div className="flex justify-between lg:justify-start items-start lg:mb-[12px] lg:min-w-[150px]">
                                <div className="flex flex-col gap-[4px]">
                                  <span className="font-text text-[18px] lg:text-[24px] text-key1 font-bold">
                                    {(() => {
                                      if (
                                        experience.startDate &&
                                        experience.endDate
                                      ) {
                                        const start = new Date(
                                          experience.startDate
                                        );
                                        const end = new Date(
                                          experience.endDate
                                        );
                                        const diffTime = Math.abs(
                                          end.getTime() - start.getTime()
                                        );
                                        const diffDays = Math.ceil(
                                          diffTime / (1000 * 60 * 60 * 24)
                                        );
                                        const years = Math.floor(
                                          diffDays / 365
                                        );
                                        const months = Math.floor(
                                          (diffDays % 365) / 30
                                        );
                                        return years > 0
                                          ? `${years}년 ${months}개월`
                                          : `${months}개월`;
                                      }
                                      return "기간 미상";
                                    })()}
                                  </span>
                                  <span className="font-text text-[14px] lg:text-[16px] text-subtext2">
                                    {experience.startDate
                                      ? new Date(experience.startDate)
                                          .toLocaleDateString("ko-KR")
                                          .replace(/\./g, ".")
                                          .replace(/ /g, "")
                                      : ""}{" "}
                                    ~{" "}
                                    {experience.endDate
                                      ? new Date(experience.endDate)
                                          .toLocaleDateString("ko-KR")
                                          .replace(/\./g, ".")
                                          .replace(/ /g, "")
                                      : "현재"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col bg-box-light rounded-[16px] px-[20px] lg:px-[30px] py-[16px] lg:py-[20px] gap-[4px] w-full">
                                <span className="font-text text-[16px] lg:text-[20px] font-semibold text-primary truncate">
                                  {experience.hospitalName}
                                </span>
                                <p className="font-text text-[14px] lg:text-[16px] text-sub leading-relaxed line-clamp-3">
                                  {experience.mainTasks}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-box-light rounded-[16px] px-[20px] lg:px-[30px] py-[16px] lg:py-[20px] text-center">
                            <p className="font-text text-[16px] text-sub">
                              경력 사항이 없습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 학력 정보 */}
                    <div>
                      <h3 className="font-text text-[20px] text-semibold title-light text-primary mb-[20px]">
                        학력 정보
                      </h3>
                      <div className="flex flex-col gap-[16px]">
                        {resumeData.educations &&
                        resumeData.educations.length > 0 ? (
                          resumeData.educations.map((education) => (
                            <div key={education.id} className="bg-white">
                              <div className="flex justify-between items-start mb-[12px] pb-[10px] border-b border-[#EFEFF0]">
                                <div className="flex items-center gap-[12px]">
                                  <span className="font-text text-[16px] text-subtext2 font-semibold">
                                    {getKoreanLabel(education.degree)}
                                  </span>
                                  <span className="text-sub">|</span>
                                  <span className="font-text text-[16px] text-subtext2 font-semibold">
                                    {getKoreanLabel(education.graduationStatus)}
                                  </span>
                                </div>
                                <span className="font-text text-[16px] text-subtext2 font-semibold">
                                  {education.startDate
                                    ? new Date(education.startDate)
                                        .toLocaleDateString("ko-KR")
                                        .replace(/\./g, ".")
                                        .replace(/ /g, "")
                                    : ""}{" "}
                                  ~{" "}
                                  {education.endDate
                                    ? new Date(education.endDate)
                                        .toLocaleDateString("ko-KR")
                                        .replace(/\./g, ".")
                                        .replace(/ /g, "")
                                    : ""}
                                </span>
                              </div>
                              <div className="flex flex-col gap-[4px]">
                                <span className="font-text text-[20px] font-semibold text-sub">
                                  {education.schoolName}
                                </span>
                              </div>
                              <div className="flex flex-col gap-[4px]">
                                <p className="font-text text-[16px] text-sub">
                                  전공: {education.major}
                                </p>
                                {education.gpa && education.totalGpa && (
                                  <p className="font-text text-[16px] text-sub">
                                    학점: {education.gpa} / {education.totalGpa}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-box-light rounded-[16px] px-[20px] lg:px-[30px] py-[16px] lg:py-[20px] text-center">
                            <p className="font-text text-[16px] text-sub">
                              학력 정보가 없습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 자격증/면허 */}
                    <div>
                      <h3 className="font-text text-[18px] lg:text-[20px] text-semibold title-light text-primary mb-[20px]">
                        자격증/면허
                      </h3>
                      <div className="flex flex-col lg:flex-row gap-[20px]">
                        {resumeData.licenses &&
                        resumeData.licenses.length > 0 ? (
                          resumeData.licenses.map((license) => (
                            <div
                              key={license.id}
                              className="flex w-full lg:w-[343px] h-[137px] p-[20px] flex-col justify-between items-start gap-[10px] rounded-[16px] bg-box-light"
                            >
                              <div className="flex justify-between items-start w-full pb-[10px] border-b border-[#EFEFF0]">
                                <span className="font-text text-[14px] lg:text-[16px] text-subtext2">
                                  {license.issuer}
                                </span>
                                <span className="font-text text-[14px] lg:text-[16px] text-subtext2">
                                  취득일{" "}
                                  {license.acquiredDate
                                    ? new Date(license.acquiredDate)
                                        .toLocaleDateString("ko-KR")
                                        .replace(/\./g, ".")
                                        .replace(/ /g, "")
                                    : "미상"}
                                </span>
                              </div>
                              <div>
                                <span className="font-text text-[18px] lg:text-[20px] font-semibold text-sub">
                                  {license.name}
                                </span>
                                {license.grade && (
                                  <p className="font-text text-[16px] lg:text-[18px] font-semibold text-sub">
                                    {getKoreanLabel(license.grade)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-box-light rounded-[16px] px-[20px] lg:px-[30px] py-[16px] lg:py-[20px] text-center">
                            <p className="font-text text-[16px] text-sub">
                              자격증/면허 정보가 없습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 진료 상세 역량 */}
                    <div>
                      <h3 className="font-text text-[18px] lg:text-[20px] text-semibold title-light text-primary mb-[20px]">
                        진료 상세 역량
                      </h3>
                      <div className="flex flex-col lg:flex-row gap-[20px]">
                        {resumeData.medicalCapabilities &&
                        resumeData.medicalCapabilities.length > 0 ? (
                          resumeData.medicalCapabilities.map((capability) => (
                            <div
                              key={capability.id}
                              className="flex w-full lg:w-[343px] p-[20px] flex-col justify-between items-start gap-[10px] rounded-[16px] bg-box-light"
                            >
                              <div className="flex justify-between items-start w-full pb-[10px] border-b border-[#EFEFF0]">
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-text text-[14px] lg:text-[16px] text-subtext2">
                                    {getKoreanLabel(capability.field)}
                                  </span>
                                  <Tag
                                    variant={
                                      capability.proficiency === "expert" ||
                                      capability.proficiency === "advanced"
                                        ? 1
                                        : 6
                                    }
                                  >
                                    {getKoreanLabel(capability.proficiency)}
                                  </Tag>
                                </div>
                              </div>
                              <div className="mb-[8px]">
                                <span className="font-text text-[18px] lg:text-[20px] font-semibold text-sub h-[61px] flex items-center">
                                  {capability.description || capability.field}
                                </span>
                              </div>
                              {capability.others && (
                                <p className="font-text text-[14px] lg:text-[16px] text-guide">
                                  기타: {capability.others}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="bg-box-light rounded-[16px] px-[20px] lg:px-[30px] py-[16px] lg:py-[20px] text-center">
                            <p className="font-text text-[16px] text-sub">
                              진료 상세 역량 정보가 없습니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 자기소개 */}
                    <div>
                      <h3 className="font-text text-[20px] text-semibold lg:text-[20px] title-light text-primary mb-[16px]">
                        자기소개
                      </h3>
                      <div className="border border-[1px] border-[#CACAD2] bg-box-light rounded-[6px] px-[20px] py-[16px]">
                        <p className="font-text text-[14px] lg:text-[16px] text-sub leading-relaxed whitespace-pre-line">
                          {resumeData.selfIntroduction}
                        </p>
                      </div>

                      {/* 연락하기 버튼 - 본인 이력서가 아닐 때만 표시 */}
                      {!isOwner && (
                        <div className="w-full flex justify-center mt-6">
                          <Button
                            variant="keycolor"
                            size="medium"
                            onClick={handleContactClick}
                          >
                            연락하기
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Tab.Content>

                <Tab.Content value="talent-evaluation">
                  {evaluations.length === 0 ? (
                    <div className="w-full flex items-center justify-center py-20">
                      <div className="text-center">
                        <p className="font-text text-[16px] text-sub mb-4">
                          아직 평가된 병원 기록이 없습니다.
                        </p>
                        {user?.type === "hospital" && (
                          <Button
                            variant="line"
                            size="medium"
                            onClick={() => setShowRatingModal(true)}
                          >
                            평가하기
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-[40px]">
                      {/* 전체 평균 섹션 */}
                      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                        <h3 className="font-text text-[18px] lg:text-[20px] text-semibold text-primary">
                          인재 평가
                        </h3>
                        <div className="flex flex-col lg:flex-row items-center lg:gap-[12px] gap-3">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-text text-[18px] lg:text-[20px] text-semibold text-primary">
                              {calculateOverallAverage()}
                            </span>
                            <StarRating
                              rating={parseFloat(calculateOverallAverage())}
                              size={20}
                            />
                          </div>
                          {user?.type === "hospital" && (
                            <Button
                              variant="keycolor"
                              size="medium"
                              className="bg-key1 text-white px-[16px] py-[8px] rounded-[8px]"
                              onClick={() => setShowRatingModal(true)}
                            >
                              평가하기
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 병원별 평가 목록 */}
                      <div className="w-full flex flex-col">
                        {evaluations.map((evaluation) => (
                          <div
                            key={evaluation.id}
                            className="w-full bg-white overflow-hidden border-b border-[#EFEFF0]"
                          >
                            {/* 병원 헤더 */}
                            <div
                              className="flex justify-between items-center p-[16px] lg:p-[20px] cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleEvaluation(evaluation.id)}
                            >
                              <div className="flex items-center gap-[12px] lg:gap-[16px] flex-1 min-w-0">
                                <div className="w-[32px] h-[32px] lg:w-[40px] lg:h-[40px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="font-text text-[14px] lg:text-[16px] font-semibold text-sub">
                                    {evaluation.hospitalName?.charAt(0) || "H"}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-text text-[14px] lg:text-[18px] font-semibold text-primary truncate">
                                    {evaluation.hospitalName}
                                  </span>
                                  <span className="font-text text-[12px] lg:text-[14px] text-subtext2 truncate">
                                    {new Date(evaluation.evaluationDate)
                                      .toLocaleDateString("ko-KR")
                                      .replace(/\.$/, "")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-[12px] lg:gap-[16px] flex-shrink-0">
                                {/* Edit/Delete Buttons for Own Evaluations */}
                                {canUserEditEvaluation(evaluation) && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="line"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditEvaluation(evaluation);
                                      }}
                                      className="text-sm px-3 py-1"
                                    >
                                      수정
                                    </Button>
                                    <Button
                                      variant="line"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEvaluation(evaluation.id);
                                      }}
                                      className="text-sm px-3 py-1 text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      삭제
                                    </Button>
                                  </div>
                                )}
                                <div className="flex items-center gap-[6px] lg:gap-[8px]">
                                  <span className="font-text text-[16px] lg:text-[20px] font-bold text-primary">
                                    {evaluation.overallRating.toFixed(1)}
                                  </span>
                                  <StarRating
                                    rating={evaluation.overallRating}
                                    size={14}
                                  />
                                </div>
                                {expandedEvaluations.includes(evaluation.id) ? (
                                  <ChevronUpIcon currentColor="#9098A4" />
                                ) : (
                                  <ChevronDownIcon currentColor="#9098A4" />
                                )}
                              </div>
                            </div>

                            {/* 상세 평가 내용 */}
                            {expandedEvaluations.includes(evaluation.id) && (
                              <div className="pl-[55px] pb-[20px] border-t border-[#EFEFF0]">
                                <div className="flex flex-col gap-[24px] pt-[20px]">
                                  {evaluation.detailedEvaluations.map(
                                    (detail: any, index: number) => (
                                      <div key={index}>
                                        <div className="flex justify-between items-center mb-[12px]">
                                          <span className="font-text text-[16px] font-semibold text-primary">
                                            {detail.category ===
                                              "스트레스 관리" &&
                                              "스트레스 관리"}
                                            {detail.category ===
                                              "성장 잠재력" && "성장 가능성"}
                                            {detail.category === "소통 능력" &&
                                              "케어 능력"}
                                            {detail.category === "업무 역량" &&
                                              "문서 작성"}
                                            {detail.category === "협업 능력" &&
                                              "기여도"}
                                          </span>
                                          <div className="flex items-center gap-[8px]">
                                            <span className="font-text text-[16px] font-bold text-primary">
                                              {detail.rating.toFixed(1)}
                                            </span>
                                            <StarRating
                                              rating={detail.rating}
                                              size={14}
                                            />
                                          </div>
                                        </div>
                                        <div className="border border-[1px] border-[#EFEFF0] bg-box-light p-[10px] rounded-[8px]">
                                          <p className="font-text text-[16px] text-sub">
                                            {detail.comment || "-"}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Tab.Content>
              </Tab>
            </div>
          </section>

          {/* 관련 인재 정보 섹션 */}
          <section className="mt-[60px] lg:mt-[100px]">
            <h2 className="text-[24px] font-title text-sub mb-[20px]">
              관련 인재 정보
            </h2>
            {/* 데스크톱 그리드 */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              {relatedLoading ? (
                <>
                  <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
                  <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
                  <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>
                </>
              ) : relatedResumes && relatedResumes.length > 0 ? (
                relatedResumes.slice(0, 3).map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    id={resume.id}
                    name={resume.name}
                    experience={resume.experience}
                    preferredLocation={resume.preferredLocation}
                    keywords={resume.keywords}
                    lastAccessDate={resume.lastAccessDate}
                    isBookmarked={resume.isBookmarked}
                    profileImage={resume.profileImage}
                    onClick={() => {
                      window.location.href = `/resumes/${resume.id}`;
                    }}
                    onBookmarkClick={async () => {
                      if (!user) {
                        alert("로그인이 필요합니다.");
                        router.push("/member-select");
                        return;
                      }

                      const resumeIdStr = resume.id.toString();
                      const isCurrentlyLiked = resume.isBookmarked;

                      // 낙관적 업데이트
                      toggleResumeLike(resumeIdStr);

                      try {
                        const method = isCurrentlyLiked ? "DELETE" : "POST";
                        const response = await fetch(
                          `/api/resumes/${resume.id}/like`,
                          {
                            method,
                            headers: { "Content-Type": "application/json" },
                          }
                        );

                        if (!response.ok) {
                          // 오류 시 롤백
                          setResumeLike(resumeIdStr, isCurrentlyLiked);
                          const result = await response.json();
                          if (
                            response.status === 400 &&
                            result.message?.includes("이미 좋아요한")
                          ) {
                            setResumeLike(resumeIdStr, true);
                          }
                        }
                      } catch (error) {
                        // 오류 시 롤백
                        setResumeLike(resumeIdStr, isCurrentlyLiked);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="col-span-3 text-center py-8">
                  <p className="text-gray-500">관련 인재 정보가 없습니다.</p>
                </div>
              )}
            </div>
            {/* 모바일 가로 스크롤 */}
            <div className="lg:hidden overflow-x-auto">
              {relatedLoading ? (
                <div className="flex gap-4 pb-4">
                  <div className="flex-shrink-0 w-[335px] animate-pulse bg-gray-200 h-48 rounded-lg"></div>
                  <div className="flex-shrink-0 w-[335px] animate-pulse bg-gray-200 h-48 rounded-lg"></div>
                </div>
              ) : relatedResumes && relatedResumes.length > 0 ? (
                <div
                  className="flex gap-4 pb-4"
                  style={{ width: `${relatedResumes.length * 350}px` }}
                >
                  {relatedResumes.map((resume) => (
                    <div key={resume.id} className="flex-shrink-0 w-[335px]">
                      <ResumeCard
                        id={resume.id}
                        name={resume.name}
                        experience={resume.experience}
                        preferredLocation={resume.preferredLocation}
                        keywords={resume.keywords}
                        lastAccessDate={resume.lastAccessDate}
                        isBookmarked={resume.isBookmarked}
                        profileImage={resume.profileImage}
                        onClick={() => {
                          window.location.href = `/resumes/${resume.id}`;
                        }}
                        onBookmarkClick={async () => {
                          if (!user) {
                            alert("로그인이 필요합니다.");
                            router.push("/member-select");
                            return;
                          }

                          const resumeIdStr = resume.id.toString();
                          const isCurrentlyLiked = resume.isBookmarked;

                          // 낙관적 업데이트
                          toggleResumeLike(resumeIdStr);

                          try {
                            const method = isCurrentlyLiked ? "DELETE" : "POST";
                            const response = await fetch(
                              `/api/resumes/${resume.id}/like`,
                              {
                                method,
                                headers: { "Content-Type": "application/json" },
                              }
                            );

                            if (!response.ok) {
                              // 오류 시 롤백
                              setResumeLike(resumeIdStr, isCurrentlyLiked);
                              const result = await response.json();
                              
                              // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
                              if (response.status === 403) {
                                alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
                                return;
                              }
                              
                              if (
                                response.status === 400 &&
                                result.message?.includes("이미 좋아요한")
                              ) {
                                setResumeLike(resumeIdStr, true);
                              }
                            }
                          } catch (error) {
                            // 오류 시 롤백
                            setResumeLike(resumeIdStr, isCurrentlyLiked);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">관련 인재 정보가 없습니다.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 평가하기 모달 */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          {/* 데스크톱 모달 */}
          <div className="hidden lg:block relative bg-white rounded-[16px] w-[968px] max-h-[80vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center p-[24px] border-b border-[#EFEFF0]">
              <h2 className="font-title text-[24px] font-light text-primary">
                {editingEvaluationId
                  ? "수의사 평가 수정하기"
                  : "수의사 평가하기"}
              </h2>
              <button
                onClick={handleModalClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#3B394D"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="p-[24px] space-y-[32px]">
              {/* 스트레스 관리 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    스트레스 관리
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    응급 상황, 과중 업무에서의 대응력, 긴박한 상황에서 침착함
                    유지 정도
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.stressManagement}
                    onRatingChange={(rating) =>
                      handleRatingChange("stressManagement", rating)
                    }
                    size={24}
                  />
                </div>
                <textarea
                  value={comments.stressManagement}
                  onChange={(e) =>
                    handleCommentChange("stressManagement", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.stressManagement.length}/500
                  </span>
                </div>
              </div>

              {/* 성장 의지 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    성장 의지
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    피드백 수용, 학습 태도, 신규 기술 및 지식에 대한 학습 관심도
                    등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.growth}
                    onRatingChange={(rating) =>
                      handleRatingChange("growth", rating)
                    }
                    size={24}
                  />
                </div>
                <textarea
                  value={comments.growth}
                  onChange={(e) =>
                    handleCommentChange("growth", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.growth.length}/500
                  </span>
                </div>
              </div>

              {/* 고객 케어 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    고객 케어
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    질병 동물, 응급환자 대처, 보호자와의 소통 역량 등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.care}
                    onRatingChange={(rating) =>
                      handleRatingChange("care", rating)
                    }
                    size={24}
                  />
                </div>
                <textarea
                  value={comments.care}
                  onChange={(e) => handleCommentChange("care", e.target.value)}
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.care.length}/500
                  </span>
                </div>
              </div>

              {/* 기록 및 문서화 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    기록 및 문서화
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    SOAP Chart, 의뢰서 등 의료 기록 정확 작성, 기록의 정리와
                    체계적인 구성도
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.documentation}
                    onRatingChange={(rating) =>
                      handleRatingChange("documentation", rating)
                    }
                    size={24}
                  />
                </div>
                <textarea
                  value={comments.documentation}
                  onChange={(e) =>
                    handleCommentChange("documentation", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.documentation.length}/500
                  </span>
                </div>
              </div>

              {/* 조직 기여도 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    조직 기여도
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    업무 성과, 조직 문화 형성, 구성원 동기 부여 등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.contribution}
                    onRatingChange={(rating) =>
                      handleRatingChange("contribution", rating)
                    }
                    size={24}
                  />
                </div>
                <textarea
                  value={comments.contribution}
                  onChange={(e) =>
                    handleCommentChange("contribution", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.contribution.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end gap-[12px] p-[24px] border-t border-[#EFEFF0]">
              <Button
                variant="text"
                size="medium"
                onClick={() => {
                  resetRatingForm();
                  handleModalClose();
                }}
              >
                취소
              </Button>
              <Button
                variant="keycolor"
                size="medium"
                onClick={handleRatingSubmit}
                className="bg-[#4F5866] text-white"
              >
                {editingEvaluationId ? "수정하기" : "등록하기"}
              </Button>
            </div>
          </div>

          {/* 모바일 모달 (전체 화면) */}
          <div className="lg:hidden fixed inset-0 bg-white z-50 overflow-y-auto">
            {/* 모바일 헤더 */}
            <div className="flex items-center justify-between p-[16px] border-b border-[#EFEFF0]">
              <button
                onClick={handleModalClose}
                className="flex items-center justify-center w-8 h-8"
              >
                <ArrowLeftIcon currentColor="currentColor" />
              </button>
              <h2 className="font-title text-[16px] font-light text-primary">
                {editingEvaluationId
                  ? "수의사 평가 수정하기"
                  : "수의사 평가하기"}
              </h2>
              <div className="w-8 h-8"></div>
            </div>

            {/* 모바일 콘텐츠 */}
            <div className="p-[16px] pb-[120px] space-y-[24px]">
              {/* 스트레스 관리 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    스트레스 관리
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    응급 상황, 과중 업무에서의 대응력, 긴박한 상황에서 침착함
                    유지 정도
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.stressManagement}
                    onRatingChange={(rating) =>
                      handleRatingChange("stressManagement", rating)
                    }
                    size={20}
                  />
                </div>
                <textarea
                  value={comments.stressManagement}
                  onChange={(e) =>
                    handleCommentChange("stressManagement", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.stressManagement.length}/500
                  </span>
                </div>
              </div>

              {/* 성장 의지 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    성장 의지
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    피드백 수용, 학습 태도, 신규 기술 및 지식에 대한 학습 관심도
                    등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.growth}
                    onRatingChange={(rating) =>
                      handleRatingChange("growth", rating)
                    }
                    size={20}
                  />
                </div>
                <textarea
                  value={comments.growth}
                  onChange={(e) =>
                    handleCommentChange("growth", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.growth.length}/500
                  </span>
                </div>
              </div>

              {/* 고객 케어 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    고객 케어
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    질병 동물, 응급환자 대처, 보호자와의 소통 역량 등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.care}
                    onRatingChange={(rating) =>
                      handleRatingChange("care", rating)
                    }
                    size={20}
                  />
                </div>
                <textarea
                  value={comments.care}
                  onChange={(e) => handleCommentChange("care", e.target.value)}
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.care.length}/500
                  </span>
                </div>
              </div>

              {/* 기록 및 문서화 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    기록 및 문서화
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    SOAP Chart, 의뢰서 등 의료 기록 정확 작성, 기록의 정리와
                    체계적인 구성도
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.documentation}
                    onRatingChange={(rating) =>
                      handleRatingChange("documentation", rating)
                    }
                    size={20}
                  />
                </div>
                <textarea
                  value={comments.documentation}
                  onChange={(e) =>
                    handleCommentChange("documentation", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.documentation.length}/500
                  </span>
                </div>
              </div>

              {/* 조직 기여도 */}
              <div>
                <div className="mb-[12px]">
                  <h3 className="font-text text-[16px] font-semibold text-primary mb-[4px]">
                    조직 기여도
                  </h3>
                  <p className="font-text text-[16px] text-subtext2">
                    업무 성과, 조직 문화 형성, 구성원 동기 부여 등
                  </p>
                </div>
                <div className="mb-[16px]">
                  <InteractiveStarRating
                    rating={ratings.contribution}
                    onRatingChange={(rating) =>
                      handleRatingChange("contribution", rating)
                    }
                    size={20}
                  />
                </div>
                <textarea
                  value={comments.contribution}
                  onChange={(e) =>
                    handleCommentChange("contribution", e.target.value)
                  }
                  placeholder="평가에 대한 상세한 의견을 남겨주세요..."
                  className="w-full h-[80px] p-[12px] border border-[#EFEFF0] rounded-[8px] bg-[#FBFBFB] font-text text-[14px] text-primary resize-none focus:outline-none focus:border-key1"
                  maxLength={500}
                />
                <div className="text-right mt-[8px]">
                  <span className="font-text text-[12px] text-guide">
                    {comments.contribution.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* 모바일 푸터 */}
            <div className="fixed bottom-0 left-0 right-0 flex gap-[12px] p-[16px] bg-white border-t border-[#EFEFF0]">
              <Button
                variant="text"
                size="medium"
                fullWidth
                onClick={() => {
                  resetRatingForm();
                  handleModalClose();
                }}
              >
                취소
              </Button>
              <Button
                variant="keycolor"
                size="medium"
                onClick={handleRatingSubmit}
              >
                {editingEvaluationId ? "수정하기" : "등록하기"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">연락하기</h3>
              <p className="text-gray-600 mb-6">
                {resumeData.name}님에게 연락하여 채용에 대해 연락하세요.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8796] focus:border-transparent"
                    placeholder="문의 제목을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    문의 내용 *
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff8796] focus:border-transparent resize-none"
                    placeholder="문의하실 내용을 자세히 작성해 주세요..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetContactForm}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <Button
                  onClick={handleContactSubmit}
                  className="flex-1 px-4 py-2 bg-[#ff8796] text-white rounded-md hover:bg-[#ff9aa6] transition-colors font-medium"
                >
                  연락하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 병원 인증 모달 */}
      <HospitalAuthModal
        isOpen={isModalOpen}
        onClose={closeModal}
        returnUrl={modalReturnUrl}
      />
    </>
  );
}
