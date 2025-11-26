"use client";

import React from "react";
import { Tag } from "@/components/ui/Tag";
import LectureCard from "@/components/ui/LectureCard/LectureCard";
import { useCommentStore, Comment } from "@/store/commentStore";
import { useAuth } from "@/hooks/api/useAuth";
import { useState, useEffect } from "react";
import { useLikeStore } from "@/stores/likeStore";
import { useViewCountStore } from "@/stores/viewCountStore";
import { useRouter } from "next/navigation";
import profileImg from "@/assets/images/profile.png";
import {
  BookmarkIcon,
  BookmarkFilledIcon,
  DownloadIcon,
  ExcelIcon,
  WordIcon,
  PdfIcon,
  UpIcon,
  DownIcon,
  EditIcon,
  TrashIcon,
} from "public/icons";
import Image from "next/image";

interface ReferenceFile {
  id: string;
  name: string;
  type: "PDF" | "PPT" | "WORD" | "EXCEL";
  size: number;
  url: string;
}

interface LectureDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  uploadDate: string;
  viewCount: number;
  youtubeUrl?: string;
  thumbnailUrl: string;
  medicalField: string;
  referenceFiles: ReferenceFile[];
  recommendedLectures: any[];
  comments: {
    totalCount: number;
    comments: Comment[];
  };
  isLiked?: boolean;
}

export default function LectureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [showMoreComments, setShowMoreComments] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [lectureDetail, setLectureDetail] = useState<LectureDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand 스토어와 로그인 상태 사용
  const {
    comments,
    isLoading: commentsLoading,
    fetchComments,
    createComment,
    editComment,
    removeComment,
  } = useCommentStore();

  // 좋아요 상태 관리 (Zustand 스토어)
  const { isLectureLiked, toggleLectureLike, setLectureLike } = useLikeStore();

  // 조회수 상태 관리 (Zustand 스토어)
  const { setLectureViewCount, getLectureViewCount } = useViewCountStore();

  // useAuth 훅으로 현재 로그인한 사용자 정보 가져오기
  const { user: currentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchLectureDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lectures/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "강의를 찾을 수 없습니다");
        }

        console.log("[LectureDetail] 서버 응답 데이터:", result.data);
        console.log("[LectureDetail] youtubeUrl:", result.data?.youtubeUrl);

        setLectureDetail(result.data);

        // 좋아요 상태 동기화 (Zustand 스토어 사용)
        if (result.data?.isLiked !== undefined) {
          console.log(
            "[LectureDetail] 서버에서 받은 좋아요 상태:",
            result.data.isLiked
          );
          setLectureLike(id, result.data.isLiked);
        }

        // 조회수 초기화
        if (result.data?.viewCount !== undefined) {
          console.log(
            "[LectureDetail] 서버에서 받은 조회수:",
            result.data.viewCount
          );
          // 서버에서 받은 조회수로 초기화
          setLectureViewCount(id, result.data.viewCount);
        }

        // 댓글은 별도로 로드
        await fetchComments(id, "lecture");
      } catch (err) {
        console.error("Failed to fetch lecture detail:", err);
        setError(
          err instanceof Error ? err.message : "강의를 불러오는데 실패했습니다"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLectureDetail();
  }, [id, fetchComments]);

  // 조회수 증가 함수
  const incrementViewCount = async () => {
    try {
      console.log(
        `[LectureDetail] 조회수 증가 API 호출 시작 - Lecture ID: ${id}`
      );

      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("[LectureDetail] 인증 토큰 포함하여 요청");
      } else {
        console.log("[LectureDetail] 익명 사용자로 요청");
      }

      const apiUrl = `/api/lectures/${id}/view`;
      console.log(`[LectureDetail] API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
      });

      console.log(`[LectureDetail] API 응답 상태: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("[LectureDetail] API 응답 데이터:", data);

        if (data.status === "success" && data.data?.viewCount) {
          console.log("[LectureDetail] 조회수 증가 성공:", data.data.viewCount);
          setLectureViewCount(id, data.data.viewCount);
        } else {
          console.warn(
            "[LectureDetail] 조회수 증가 실패 - 응답 데이터 이상:",
            data
          );
        }
      } else {
        const errorData = await response.text();
        console.error(
          "[LectureDetail] 조회수 증가 실패:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("[LectureDetail] 조회수 증가 중 오류:", error);
    }
  };

  // 조회수 증가를 위한 별도 useEffect
  useEffect(() => {
    if (lectureDetail) {
      console.log(
        "[LectureDetail] 강의 데이터 로드 완료, 조회수 증가 API 호출"
      );

      // 낙관적 업데이트: API 호출 전에 먼저 클라이언트에서 조회수 증가
      const currentViewCount = getLectureViewCount(id);
      setLectureViewCount(id, currentViewCount + 1);

      // 그 다음 API 호출
      incrementViewCount();
    }
  }, [lectureDetail?.id]); // lectureDetail이 설정될 때마다 실행

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return "https://www.youtube.com/embed/dQw4w9WgXcQ";

    // iframe 태그가 포함된 경우 src에서 URL 추출
    if (url.includes("<iframe")) {
      const srcMatch = url.match(/src="([^"]+)"/);
      if (srcMatch) {
        return srcMatch[1];
      }
    }

    // 이미 embed URL인 경우
    if (url.includes("youtube.com/embed/")) {
      return url;
    }

    // 일반 YouTube URL인 경우
    const videoId = url.includes("youtube.com")
      ? url.split("v=")[1]?.split("&")[0]
      : url.split("youtu.be/")[1]?.split("?")[0];

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[LectureDetail] handleCommentSubmit 시작:", {
      newComment: newComment.substring(0, 50),
      isAuthenticated,
      currentUser: !!currentUser,
      userId: currentUser?.id,
    });

    if (!newComment.trim()) {
      console.log("[LectureDetail] 댓글 내용이 비어있음");
      return;
    }

    if (!isAuthenticated) {
      console.log("[LectureDetail] 인증되지 않은 사용자");
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      console.log("[LectureDetail] createComment 호출 중...");
      await createComment(id, "lecture", newComment);
      console.log("[LectureDetail] createComment 성공, 입력창 초기화");
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
      alert("댓글 작성에 실패했습니다.");
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    const replyContent = replyInputs[parentId];
    console.log("[LectureDetail] handleReplySubmit 시작:", {
      parentId,
      replyContent: replyContent?.substring(0, 50),
      isAuthenticated,
      currentUser: !!currentUser,
    });

    if (!replyContent?.trim()) {
      console.log("[LectureDetail] 답글 내용이 비어있음");
      return;
    }

    if (!isAuthenticated) {
      console.log("[LectureDetail] 인증되지 않은 사용자");
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      console.log("[LectureDetail] createComment (reply) 호출 중...");
      await createComment(id, "lecture", replyContent, parentId);
      console.log("[LectureDetail] createComment (reply) 성공");
      setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
      // 답글을 추가한 후 자동으로 답글 목록을 펼침
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    } catch (error) {
      console.error("Failed to create reply:", error);
      alert("답글 작성에 실패했습니다.");
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditContent(content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim() || !isAuthenticated) return;

    try {
      await editComment(id, "lecture", commentId, editContent);
      setEditingCommentId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to edit comment:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAuthenticated || !window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await removeComment(id, "lecture", commentId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  // 전체 댓글 수 계산 (댓글 + 대댓글)
  const getTotalCommentCount = () => {
    let count = 0;
    comments.forEach((comment) => {
      count++; // 댓글 카운트
      if (comment.replies) {
        count += comment.replies.length; // 대댓글 카운트
      }
    });
    return count;
  };

  // 강의 좋아요/취소 토글 핸들러
  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      router.push("/member-select");
      return;
    }

    const isCurrentlyLiked = isLectureLiked(id);

    console.log(
      `[LectureDetail Like] ${id} - 현재 상태: ${
        isCurrentlyLiked ? "좋아요됨" : "좋아요안됨"
      } -> ${isCurrentlyLiked ? "좋아요 취소" : "좋아요"}`
    );

    // 낙관적 업데이트: UI를 먼저 변경
    toggleLectureLike(id);

    try {
      const method = isCurrentlyLiked ? "DELETE" : "POST";
      const actionText = isCurrentlyLiked ? "좋아요 취소" : "좋아요";

      console.log(
        `[LectureDetail Like] API 요청: ${method} /api/lectures/${id}/like`
      );

      const response = await fetch(`/api/lectures/${id}/like`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        // 오류 발생 시 상태 롤백
        setLectureLike(id, isCurrentlyLiked);

        // 관리자 인증 필요 안내 (403 에러) - 먼저 처리
        if (response.status === 403) {
          alert(result.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }

        // 다른 에러는 로그 출력
        console.error(`[LectureDetail Like] ${actionText} 실패:`, result);

        if (response.status === 404) {
          console.warn("강의를 찾을 수 없습니다:", id);
          return;
        } else if (response.status === 400) {
          if (result.message?.includes("이미 좋아요한")) {
            console.log(
              `[LectureDetail Like] 서버에 이미 좋아요가 존재함. 상태를 동기화`
            );
            setLectureLike(id, true);
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

      console.log(`[LectureDetail Like] ${actionText} 성공:`, result);
    } catch (error) {
      console.error(
        `[LectureDetail Like] ${
          isCurrentlyLiked ? "좋아요 취소" : "좋아요"
        } 오류:`,
        error
      );

      // 오류 발생 시 상태 롤백
      setLectureLike(id, isCurrentlyLiked);
      alert("좋아요 처리 중 오류가 발생했습니다.");
    }
  };

  const displayedComments = showMoreComments ? comments : comments.slice(0, 5);

  if (loading) {
    return (
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px]">
          <div className="xl:flex xl:gap-[30px] py-8">
            <div className="flex-1">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="h-12 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="aspect-video bg-gray-200 rounded-[12px] mb-8"></div>
                <div className="border border-[#EFEFF0] rounded-[16px] p-[40px]">
                  <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !lectureDetail) {
    return (
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px]">
          <div className="py-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              오류가 발생했습니다
            </h1>
            <p className="text-gray-600 mb-4">
              {error || "강의를 찾을 수 없습니다"}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-[#FF8796] text-white rounded-[6px] hover:bg-[#FF7A8A] transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px]">
          <div className="xl:flex xl:gap-[30px] py-8">
            {/* 메인 콘텐츠 */}
            <div className="flex-1">
              {/* 카테고리 태그 */}
              <div className="mb-4">
                <Tag variant={3}>{lectureDetail.category}</Tag>
              </div>

              {/* 제목 및 메타 정보 */}
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-[32px] font-text font-bold text-primary leading-tight">
                    {lectureDetail.title}
                  </h1>
                  <button
                    onClick={handleBookmarkClick}
                    className="flex items-center justify-center w-[40px] h-[40px] rounded-[8px] hover:bg-[#F8F9FA] transition-colors"
                  >
                    {(() => {
                      const liked = isLectureLiked(id);
                      console.log(
                        `[LectureDetail UI Debug] Bookmark - Lecture ${id}: liked=${liked}`
                      );
                      return liked ? (
                        <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                      ) : (
                        <BookmarkIcon currentColor="var(--Subtext2)" />
                      );
                    })()}
                  </button>
                </div>

                <div className="flex justify-between items-center gap-4 text-[16px] text-[#9098A4]">
                  <div>
                    <span className="font-medium">
                      {lectureDetail.instructor}
                    </span>
                  </div>
                  <div className="flex gap-[12px]">
                    <span>
                      {new Date(lectureDetail.uploadDate)
                        .toLocaleDateString("ko-KR")
                        .replace(/\.$/, "")}
                    </span>
                    <span>|</span>
                    <span>조회 {getLectureViewCount(id).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 동영상 */}
              <div className="mb-8">
                <div className="relative aspect-video bg-black rounded-[12px] overflow-hidden">
                  {lectureDetail.youtubeUrl ? (
                    <iframe
                      src={getYouTubeEmbedUrl(lectureDetail.youtubeUrl)}
                      title={lectureDetail.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <p>동영상을 불러올 수 없습니다</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 영상 소개 */}
              <section className="border border-[#EFEFF0] rounded-[16px] p-[20px] xl:p-[40px]">
                <div>
                  <h2 className="text-[24px] font-title title-medium text-sub">
                    영상 소개
                  </h2>

                  <p className="font-text text-[16px] text-sub text-light leading-relaxed my-[20px]">
                    {lectureDetail.description}
                  </p>
                </div>

                {/* 참고자료 */}
                <div className="p-[20px] bg-[#FAFAFA] rounded-[16px]">
                  <h2 className="font-text text-[16px] text-sub text-light mb-[20px]">
                    참고자료
                  </h2>
                  {lectureDetail.referenceFiles &&
                  lectureDetail.referenceFiles.length > 0 ? (
                    <div className="space-y-3">
                      {lectureDetail.referenceFiles.map(
                        (file: ReferenceFile) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-4 border border-[#EFEFF0] bg-white rounded-[8px]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-[16px] h-[16px]">
                                {file.type === "PDF" ||
                                file.name.endsWith(".pdf") ? (
                                  <PdfIcon currentColor="#EF4444" />
                                ) : file.type === "WORD" ||
                                  file.name.endsWith(".doc") ||
                                  file.name.endsWith(".docx") ? (
                                  <WordIcon currentColor="#3B82F6" />
                                ) : file.type === "EXCEL" ||
                                  file.name.endsWith(".xlsx") ||
                                  file.name.endsWith(".xls") ? (
                                  <ExcelIcon currentColor="#22C55E" />
                                ) : file.type === "PPT" ||
                                  file.name.endsWith(".ppt") ||
                                  file.name.endsWith(".pptx") ? (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                  >
                                    <rect
                                      x="2"
                                      y="1"
                                      width="10"
                                      height="14"
                                      rx="1"
                                      fill="#FF8500"
                                    />
                                    <path
                                      d="M5 5h4M5 8h3M5 11h2"
                                      stroke="white"
                                      strokeWidth="1"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                  >
                                    <rect
                                      x="2"
                                      y="1"
                                      width="10"
                                      height="14"
                                      rx="1"
                                      fill="#6B7280"
                                    />
                                    <path
                                      d="M5 5h4M5 8h3M5 11h2"
                                      stroke="white"
                                      strokeWidth="1"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <p className="text-[14px] font-semibold text-[#3B394D]">
                                {file.name}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = file.url;
                                link.download = file.name;
                                link.target = "_blank";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex items-center justify-center w-[32px] h-[32px] rounded-[8px] hover:bg-[#F8F9FA] transition-colors"
                            >
                              <DownloadIcon currentColor="#9098A4" />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[14px] text-[#9098A4]">
                        첨부된 참고자료가 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* 댓글 섹션 */}
              <div className="border border-[#EFEFF0] rounded-[16px] p-[20px] xl:p-[40px] mt-[30px]">
                <h2 className="text-[24px] font-title title-medium text-sub mb-4">
                  댓글 ({getTotalCommentCount()}개)
                </h2>

                {/* 댓글 작성 */}
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <div className="flex gap-3">
                    <Image
                      src={profileImg}
                      alt="본인 프로필"
                      width={45}
                      height={45}
                      className="w-[45px] h-[45px] rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        className="w-full min-h-[80px] p-3 border border-[#EFEFF0] rounded-[8px] resize-none focus:outline-none focus:border-[#FF8796] transition-colors"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#FF8796] text-white rounded-[6px] text-[14px] font-medium hover:bg-[#FF7A8A] transition-colors"
                        >
                          댓글 달기
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* 댓글 목록 */}
                <div className="space-y-6">
                  {displayedComments.map((comment) => (
                    <div key={comment.id} className="space-y-4">
                      {/* 댓글 */}
                      <div className="flex gap-3">
                        <Image
                          src={comment.author_profile_image || profileImg}
                          alt={comment.author_name || "익명"}
                          width={45}
                          height={45}
                          className="w-[45px] h-[45px] rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-[#3B394D]">
                                {comment.author_name || "익명"}
                              </span>
                              <span className="text-[12px] text-[#9098A4]">
                                {new Date(comment.createdAt)
                                  .toLocaleDateString("ko-KR")
                                  .replace(/\.$/, "")}
                              </span>
                            </div>
                            {comment.user_id === currentUser?.id && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleEditComment(
                                      comment.id,
                                      comment.content
                                    )
                                  }
                                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                  <EditIcon size="20" currentColor="#9098A4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteComment(comment.id)
                                  }
                                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                  <TrashIcon currentColor="#9098A4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="mb-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[60px] p-3 border border-[#EFEFF0] rounded-[8px] resize-none focus:outline-none focus:border-[#FF8796] transition-colors"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 text-[12px] text-[#9098A4] hover:text-[#4F5866] transition-colors"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(comment.id)}
                                  className="px-3 py-1 bg-[#FF8796] text-white rounded-[4px] text-[12px] font-medium hover:bg-[#FF7A8A] transition-colors"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[14px] text-[#4F5866] leading-relaxed mb-2">
                              {comment.content}
                            </p>
                          )}
                          <div className="flex items-center gap-4">
                            {/* 답글 토글 버튼 */}
                            {comment.replies && comment.replies.length > 0 ? (
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="flex items-center gap-1 text-[14px] text-[#FF8796] hover:text-[#FF7A8A] transition-colors"
                              >
                                {expandedReplies[comment.id] ? (
                                  <>
                                    답글 {comment.replies.length}개
                                    <UpIcon currentColor="#FF8796" />
                                  </>
                                ) : (
                                  <>
                                    답글 {comment.replies.length}개
                                    <DownIcon currentColor="#FF8796" />
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleReplies(comment.id)}
                                className="flex items-center gap-1 text-[14px] text-[#9098A4] hover:text-[#FF8796] transition-colors"
                              >
                                {expandedReplies[comment.id] ? (
                                  <>
                                    답글 달기
                                    <UpIcon currentColor="#9098A4" />
                                  </>
                                ) : (
                                  <>
                                    답글 달기
                                    <DownIcon currentColor="#9098A4" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 답글 목록 */}
                      {comment.replies &&
                        comment.replies.length > 0 &&
                        expandedReplies[comment.id] && (
                          <div className="ml-[53px] space-y-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <Image
                                  src={reply.author_profile_image || profileImg}
                                  alt={reply.author_name || "익명"}
                                  width={36}
                                  height={36}
                                  className="w-[36px] h-[36px] rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[14px] font-semibold text-[#3B394D]">
                                        {reply.author_name || "익명"}
                                      </span>
                                      <span className="text-[12px] text-[#9098A4]">
                                        {new Date(
                                          reply.createdAt
                                        ).toLocaleDateString("ko-KR")}
                                      </span>
                                    </div>
                                    {reply.user_id === currentUser?.id && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            handleEditComment(
                                              reply.id,
                                              reply.content
                                            )
                                          }
                                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                          <EditIcon
                                            size="20"
                                            currentColor="#9098A4"
                                          />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteComment(reply.id)
                                          }
                                          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                          <TrashIcon currentColor="#9098A4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {editingCommentId === reply.id ? (
                                    <div>
                                      <textarea
                                        value={editContent}
                                        onChange={(e) =>
                                          setEditContent(e.target.value)
                                        }
                                        className="w-full min-h-[60px] p-3 border border-[#EFEFF0] rounded-[8px] resize-none focus:outline-none focus:border-[#FF8796] transition-colors"
                                      />
                                      <div className="flex justify-end gap-2 mt-2">
                                        <button
                                          onClick={handleCancelEdit}
                                          className="px-3 py-1 text-[12px] text-[#9098A4] hover:text-[#4F5866] transition-colors"
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleSaveEdit(reply.id)
                                          }
                                          className="px-3 py-1 bg-[#FF8796] text-white rounded-[4px] text-[12px] font-medium hover:bg-[#FF7A8A] transition-colors"
                                        >
                                          저장
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[14px] text-[#4F5866] leading-relaxed">
                                      {reply.content}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* 답글 작성 */}
                      {expandedReplies[comment.id] && (
                        <div className="ml-[53px]">
                          <div className="flex gap-3">
                            <Image
                              src={profileImg}
                              alt="내 프로필"
                              width={36}
                              height={36}
                              className="w-[36px] h-[36px] rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <textarea
                                value={replyInputs[comment.id] || ""}
                                onChange={(e) =>
                                  setReplyInputs((prev) => ({
                                    ...prev,
                                    [comment.id]: e.target.value,
                                  }))
                                }
                                placeholder="답글을 입력하세요"
                                className="w-full min-h-[60px] p-3 border border-[#EFEFF0] rounded-[8px] resize-none focus:outline-none focus:border-[#FF8796] transition-colors"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => toggleReplies(comment.id)}
                                  className="px-3 py-1 text-[12px] text-[#9098A4] hover:text-[#4F5866] transition-colors"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={() => handleReplySubmit(comment.id)}
                                  className="px-3 py-1 bg-[#FF8796] text-white rounded-[4px] text-[12px] font-medium hover:bg-[#FF7A8A] transition-colors"
                                >
                                  답글 달기
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 더보기 버튼 */}
                {comments.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => setShowMoreComments(!showMoreComments)}
                      className="px-6 py-2 border border-[#EFEFF0] rounded-[8px] text-[14px] text-[#4F5866] hover:bg-[#F8F9FA] transition-colors"
                    >
                      {showMoreComments
                        ? "접기"
                        : `더보기 (${comments.length - 5}개)`}
                    </button>
                  </div>
                )}
              </div>

              {/* 모바일 추천 강의 섹션 */}
              <div className="xl:hidden mt-8">
                <h3 className="text-[24px] font-title text-sub mb-4">
                  추천 강의
                </h3>
                <div className="overflow-x-auto">
                  <div
                    className="flex gap-4 pb-4"
                    style={{ width: "max-content" }}
                  >
                    {lectureDetail?.recommendedLectures?.map((lecture: any) => (
                      <div key={lecture.id} className="flex-shrink-0">
                        <LectureCard
                          id={lecture.id}
                          title={lecture.title}
                          date={new Date(lecture.uploadDate)
                            .toLocaleDateString("ko-KR")
                            .replace(/\.$/, "")}
                          views={lecture.viewCount}
                          imageUrl={lecture.thumbnailUrl}
                          category={lecture.category}
                          isLiked={isLectureLiked(lecture.id)}
                          onLike={async (lectureId) => {
                            const lectureIdStr = lectureId.toString();
                            const isCurrentlyLiked =
                              isLectureLiked(lectureIdStr);

                            // 낙관적 업데이트
                            toggleLectureLike(lectureIdStr);

                            try {
                              const method = isCurrentlyLiked
                                ? "DELETE"
                                : "POST";
                              const response = await fetch(
                                `/api/lectures/${lectureId}/like`,
                                {
                                  method,
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                }
                              );

                              if (!response.ok) {
                                // 오류 시 롤백
                                setLectureLike(lectureIdStr, isCurrentlyLiked);
                                const result = await response.json();
                                if (
                                  response.status === 400 &&
                                  result.message?.includes("이미 좋아요한")
                                ) {
                                  setLectureLike(lectureIdStr, true);
                                }
                              }
                            } catch (error) {
                              // 오류 시 롤백
                              setLectureLike(lectureIdStr, isCurrentlyLiked);
                            }
                          }}
                          onClick={() => {
                            window.location.href = `/lectures/${lecture.id}`;
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 데스크톱 추천 강의 사이드바 */}
            <aside className="hidden xl:block w-[343px] flex-shrink-0">
              <div className="sticky top-[70px]">
                <h3 className="text-[24px] font-title text-sub mb-4">
                  추천 강의
                </h3>
                <div className="space-y-4">
                  {lectureDetail?.recommendedLectures?.map((lecture: any) => (
                    <LectureCard
                      key={lecture.id}
                      id={lecture.id}
                      title={lecture.title}
                      date={new Date(lecture.uploadDate)
                        .toLocaleDateString("ko-KR")
                        .replace(/\.$/, "")}
                      views={lecture.viewCount}
                      imageUrl={lecture.thumbnailUrl}
                      category={lecture.category}
                      isLiked={isLectureLiked(lecture.id)}
                      onLike={async (lectureId) => {
                        const lectureIdStr = lectureId.toString();
                        const isCurrentlyLiked = isLectureLiked(lectureIdStr);

                        // 낙관적 업데이트
                        toggleLectureLike(lectureIdStr);

                        try {
                          const method = isCurrentlyLiked ? "DELETE" : "POST";
                          const response = await fetch(
                            `/api/lectures/${lectureId}/like`,
                            {
                              method,
                              headers: { "Content-Type": "application/json" },
                            }
                          );

                          if (!response.ok) {
                            // 오류 시 롤백
                            setLectureLike(lectureIdStr, isCurrentlyLiked);
                            const result = await response.json();
                            if (
                              response.status === 400 &&
                              result.message?.includes("이미 좋아요한")
                            ) {
                              setLectureLike(lectureIdStr, true);
                            }
                          }
                        } catch (error) {
                          // 오류 시 롤백
                          setLectureLike(lectureIdStr, isCurrentlyLiked);
                        }
                      }}
                      onClick={() => {
                        window.location.href = `/lectures/${lecture.id}`;
                      }}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
