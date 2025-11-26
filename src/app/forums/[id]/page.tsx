"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Tag } from "@/components/ui/Tag";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/api/useAuth";
import { Toast } from "@/components/ui/Toast";
import { useCommentStore, Comment } from "@/store/commentStore";
import { useViewCountStore } from "@/stores/viewCountStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";
// Quill CSS를 동적으로 import하여 production에서도 스타일이 적용되도록 함
import "quill/dist/quill.snow.css";

const HTMLContent = dynamic(
  () =>
    import("@/components/HTMLContent").then((mod) => ({
      default: mod.HTMLContent,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-20 rounded" />,
  }
);
import { notFound, useRouter } from "next/navigation";
import profileImg from "@/assets/images/profile.png";
import {
  ArrowLeftIcon,
  MoreVerticalIcon,
  ShareIcon,
  EyeIcon,
  UpIcon,
  DownIcon,
  EditIcon,
  TrashIcon,
  CommentIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
} from "public/icons";
import Image from "next/image";
import Link from "next/link";

export default function ForumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMoreComments, setShowMoreComments] = useState(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  interface ForumDetail {
    id: string;
    title: string;
    content: string;
    animalType?: string;
    medicalField?: string;
    viewCount: number;
    createdAt: string;
    userId?: string;
    author_name?: string;
    author_display_name?: string;
    comments?: Comment[];
  }

  const [currentForum, setCurrentForum] = useState<ForumDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  const { isForumBookmarked, toggleForumBookmark } = useBookmarkStore();

  // 조회수 증가 함수
  const incrementViewCount = async () => {
    try {
      console.log(`[ForumDetail] 조회수 증가 API 호출 시작 - Forum ID: ${id}`);

      const token = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("[ForumDetail] 인증 토큰 포함하여 요청");
      } else {
        console.log("[ForumDetail] 익명 사용자로 요청");
      }

      const apiUrl = `/api/forums/${id}/view`;
      console.log(`[ForumDetail] API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
      });

      console.log(`[ForumDetail] API 응답 상태: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log("[ForumDetail] API 응답 데이터:", data);

        if (data.status === "success" && data.data?.viewCount) {
          console.log("[ForumDetail] 조회수 증가 성공:", data.data.viewCount);
          setForumViewCount(id, data.data.viewCount);
        } else {
          console.warn(
            "[ForumDetail] 조회수 증가 실패 - 응답 데이터 이상:",
            data
          );
        }
      } else {
        const errorData = await response.text();
        console.error(
          "[ForumDetail] 조회수 증가 실패:",
          response.status,
          errorData
        );
      }
    } catch (error) {
      console.error("[ForumDetail] 조회수 증가 중 오류:", error);
    }
  };

  // Zustand 스토어와 로그인 상태 사용
  const {
    comments,
    isLoading: commentsLoading,
    fetchComments,
    createComment,
    editComment,
    removeComment,
  } = useCommentStore();

  // useAuth 훅으로 현재 로그인한 사용자 정보 가져오기
  const { user: currentUser, isAuthenticated } = useAuth();

  // 북마크 핸들러
  const handleBookmarkClick = async () => {
    if (!currentUser || isBookmarkLoading) return;

    setIsBookmarkLoading(true);

    try {
      const method = isBookmarked ? "DELETE" : "POST";
      const response = await fetch(`/api/forums/${id}/bookmark`, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // 스토어 상태 업데이트
        const newState = toggleForumBookmark(id);
        setIsBookmarked(newState);
      } else {
        const errorData = await response.json();
        
        // 관리자 인증 필요 안내 (403 에러)
        if (response.status === 403 && errorData.requiresAdminVerification) {
          alert(errorData.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }
        
        console.error("북마크 처리 실패:", errorData.message || "알 수 없는 오류");
        alert(`북마크 처리 중 오류가 발생했습니다: ${errorData.message || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("북마크 처리 중 오류:", error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // 조회수 상태 관리 (Zustand 스토어)
  const { setForumViewCount, getForumViewCount } = useViewCountStore();

  // 포럼 상세 데이터 가져오기
  useEffect(() => {
    const fetchForumDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/forums/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "success") {
            console.log("Forum data:", data.data);
            console.log("Forum userId:", data.data.userId);
            console.log("Current user id:", currentUser?.id);
            setCurrentForum(data.data);

            // 조회수 설정
            if (data.data?.viewCount !== undefined) {
              console.log(
                "[ForumDetail] 서버에서 받은 조회수:",
                data.data.viewCount
              );
              // 서버에서 받은 초기 조회수 설정
              setForumViewCount(id, data.data.viewCount);
            }

            // 댓글은 별도로 로드
            await fetchComments(id, "forum");
          }
        } else if (response.status === 404) {
          notFound();
        }
      } catch (error) {
        console.error("Failed to fetch forum detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForumDetail();
  }, [id, fetchComments]);

  // 북마크 상태 초기화
  useEffect(() => {
    if (currentUser && id) {
      const currentBookmarkState = isForumBookmarked(id);
      setIsBookmarked(currentBookmarkState);
    }
  }, [currentUser, id, isForumBookmarked]);

  // 조회수 증가를 위한 별도 useEffect
  useEffect(() => {
    if (currentForum) {
      console.log("[ForumDetail] 포럼 데이터 로드 완료, 조회수 증가 API 호출");
      incrementViewCount();
    }
  }, [currentForum?.id]); // currentForum이 설정될 때마다 실행

  if (isLoading) {
    return (
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px] mt-[50px] mb-[100px]">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentForum) {
    notFound();
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;

    try {
      await createComment(id, "forum", newComment.trim());
      setNewComment("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    const replyContent = replyInputs[parentId];
    if (!replyContent?.trim() || !isAuthenticated) return;

    try {
      await createComment(id, "forum", replyContent.trim(), parentId);
      setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
      
      // 댓글 목록이 새로고침된 후 답글 영역을 다시 열어줌
      setTimeout(() => {
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      }, 100);
    } catch (error) {
      console.error("Failed to submit reply:", error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newState = {
        ...prev,
        [commentId]: !prev[commentId],
      };
      console.log(`toggleReplies: ${commentId} changed from ${prev[commentId]} to ${newState[commentId]}`);
      console.log('Current expandedReplies state:', newState);
      return newState;
    });
  };

  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditContent(content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await editComment(id, "forum", commentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent("");
      setToast({ message: "댓글이 수정되었습니다.", type: "success" });
    } catch (error) {
      console.error("Failed to edit comment:", error);
      setToast({ message: "댓글 수정에 실패했습니다.", type: "error" });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm("댓글을 삭제하시겠습니까?")) {
      try {
        await removeComment(id, "forum", commentId);
        setToast({ message: "댓글이 삭제되었습니다.", type: "success" });
      } catch (error) {
        console.error("Failed to delete comment:", error);
        setToast({ message: "댓글 삭제에 실패했습니다.", type: "error" });
      }
    }
  };

  const displayedComments = showMoreComments ? comments : comments.slice(0, 5);

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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("URL이 클립보드에 복사되었습니다!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      // 폴백: 수동으로 텍스트 선택
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("URL이 클립보드에 복사되었습니다!");
    }
  };

  const handleDeleteForum = async () => {
    if (!window.confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/forums/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === "success") {
        setToast({ message: "게시글이 삭제되었습니다.", type: "success" });
        // 잠시 후 목록 페이지로 이동
        setTimeout(() => {
          router.push("/forums");
        }, 1500);
      } else {
        setToast({
          message: data.message || "게시글 삭제에 실패했습니다.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Failed to delete forum:", error);
      setToast({
        message: "게시글 삭제 중 오류가 발생했습니다.",
        type: "error",
      });
    }
  };

  return (
    <>
      <main className="pt-[50px] bg-white">
        <div className="max-w-[1440px] mx-auto px-[16px]">
          {/* 헤더 영역 */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/forums"
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeftIcon currentColor="currentColor" />
            </Link>

            {(() => {
              const showMenu =
                isAuthenticated && currentUser?.id === currentForum?.userId;
              console.log("Show menu check:", {
                isAuthenticated,
                currentUserId: currentUser?.id,
                forumUserId: currentForum?.userId,
                showMenu,
              });
              return showMenu;
            })() && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <MoreVerticalIcon size="28" currentColor="currentColor" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-[130px] bg-white border rounded-lg shadow-lg z-10">
                    <Link
                      href={`/forums/${id}/edit`}
                      className="flex justify-center items-center px-[20px] py-[10px] text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <EditIcon size="20" currentColor="currentColor" />
                      <span className="ml-2">수정하기</span>
                    </Link>
                    <button
                      onClick={handleDeleteForum}
                      className="flex justify-center items-center w-full px-[20px] py-[10px] text-sm text-[#ff8796] hover:bg-gray-50"
                    >
                      <TrashIcon currentColor="currentColor" />
                      <span className="ml-2">삭제하기</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="border border-[#EFEFF0] rounded-[16px] p-[16px] md:p-[20px]">
            {/* 포럼 헤더 */}
            <div className="border-b border-[#EFEFF0] px-[0px] md:p-[20px]">
              <h1 className="text-[28px] font-text font-bold text-[#3B394D] mb-4">
                {currentForum.title}
              </h1>

              <div className="flex justify-between">
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentForum.animalType && (
                    <Tag key="animal" variant={1}>
                      {currentForum.animalType}
                    </Tag>
                  )}
                  {currentForum.medicalField && (
                    <Tag key="field" variant={1}>
                      {currentForum.medicalField}
                    </Tag>
                  )}
                </div>

                <div className="text-[14px] text-[#9098A4]">
                  {new Date(currentForum.createdAt)
                    .toLocaleDateString("ko-KR")
                    .replace(/\.$/, "")}
                </div>
              </div>
            </div>

            {/* 포럼 내용 */}
            <div className="border-b border-[#EFEFF0] px-[0px] md:p-[20px]">
              <HTMLContent
                content={currentForum.content}
                className="text-[16px] text-[#4F5866] leading-relaxed"
                style={{
                  fontFamily: "SUIT, sans-serif",
                }}
              />
            </div>

            {/* 조회수, 댓글 수, 북마크, 공유하기 */}
            <div className="flex items-center justify-between py-[16px] px-[20px]">
              <div className="flex items-center gap-6 text-[14px] text-[#9098A4]">
                <div className="flex items-center gap-1">
                  <EyeIcon currentColor="#9098A4" />
                  <span>{getForumViewCount(id).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CommentIcon currentColor="#9098A4" />
                  <span>{getTotalCommentCount()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 북마크 버튼 */}
                {isAuthenticated && (
                  <button
                    onClick={handleBookmarkClick}
                    disabled={isBookmarkLoading}
                    className="flex items-center gap-2 px-4 py-2 text-[14px] hover:bg-[#F8F9FA] rounded-[8px] transition-colors disabled:opacity-50"
                    aria-label={isBookmarked ? "북마크 해제" : "북마크 추가"}
                  >
                    {isBookmarked ? (
                      <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                    ) : (
                      <BookmarkIcon currentColor="#9098A4" />
                    )}
                  </button>
                )}

                {/* 공유 버튼 */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 text-[14px] text-[#9098A4] hover:bg-[#F8F9FA] rounded-[8px] transition-colors"
                >
                  <ShareIcon currentColor="#9098A4" />
                  공유
                </button>
              </div>
            </div>
          </section>

          {/* 댓글 섹션 */}
          <div className="border border-[#EFEFF0] rounded-[16px] py-[30px] px-[16px] md:p-[40px] mt-[30px] mb-[270px]">
            <h2 className="text-[24px] font-title font-light text-sub mb-4">
              댓글 ({getTotalCommentCount()}개)
            </h2>

            {/* 댓글 작성 */}
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mb-8" noValidate>
                <div className="flex gap-3">
                  <Image
                    src={currentUser?.profileImage || profileImg}
                    alt="내 프로필"
                    width={40}
                    height={40}
                    className="w-[40px] h-[40px] rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="댓글을 입력하세요"
                      className="w-full min-h-[80px] p-3 border border-[#EFEFF0] rounded-[8px] resize-none focus:outline-none focus:border-[#FF8796] transition-colors"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={!newComment.trim() || commentsLoading}
                        className="px-4 py-2 bg-[#FF8796] text-white rounded-[6px] text-[14px] font-medium hover:bg-[#FF7A8A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {commentsLoading ? "작성 중..." : "댓글 달기"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">
                  댓글을 작성하려면 로그인이 필요합니다.
                </p>
              </div>
            )}

            {/* 댓글 목록 */}
            <div className="space-y-6">
              {displayedComments.map((comment) => (
                <div key={comment.id} className="space-y-4">
                  {/* 댓글 */}
                  <div className="flex gap-3">
                    <Image
                      src={comment.author_profile_image || profileImg}
                      alt={comment.author_name || "익명"}
                      width={40}
                      height={40}
                      className="w-[40px] h-[40px] rounded-full object-cover"
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
                        {isAuthenticated &&
                          comment.user_id === currentUser?.id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  handleEditComment(comment.id, comment.content)
                                }
                                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <EditIcon size="20" currentColor="#9098A4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
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
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
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
                            onClick={() => {
                              console.log(`Toggling replies for comment ${comment.id}, current state: ${expandedReplies[comment.id]}`);
                              toggleReplies(comment.id);
                            }}
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
                  {(() => {
                    console.log(`Comment ${comment.id}: replies=${comment.replies?.length || 0}, expanded=${expandedReplies[comment.id]}`);
                    return comment.replies &&
                      comment.replies.length > 0 &&
                      expandedReplies[comment.id];
                  })() && (
                      <div className="ml-[53px] space-y-4">
                        {comment.replies?.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <Image
                              src={reply.author_profile_image || profileImg}
                              alt={reply.author_name || "익명"}
                              width={32}
                              height={32}
                              className="w-[32px] h-[32px] rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-semibold text-[#3B394D]">
                                    {reply.author_name || "익명"}
                                  </span>
                                  <span className="text-[12px] text-[#9098A4]">
                                    {new Date(reply.createdAt)
                                      .toLocaleDateString("ko-KR")
                                      .replace(/\.$/, "")}
                                  </span>
                                </div>
                                {isAuthenticated &&
                                  reply.user_id === currentUser?.id && (
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
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1 text-[12px] text-[#9098A4] hover:text-[#4F5866] transition-colors"
                                    >
                                      취소
                                    </button>
                                    <button
                                      onClick={() => handleSaveEdit(reply.id)}
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
                  {expandedReplies[comment.id] && isAuthenticated && (
                    <div className="ml-[53px]">
                      <div className="flex gap-3">
                        <Image
                          src={currentUser?.profileImage || profileImg}
                          alt="내 프로필"
                          width={32}
                          height={32}
                          className="w-[32px] h-[32px] rounded-full object-cover"
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
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
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
                              disabled={
                                !replyInputs[comment.id]?.trim() ||
                                commentsLoading
                              }
                              className="px-3 py-1 bg-[#FF8796] text-white rounded-[4px] text-[12px] font-medium hover:bg-[#FF7A8A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {commentsLoading ? "작성 중..." : "답글 달기"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 로그인하지 않은 경우 답글 작성 불가 메시지 */}
                  {expandedReplies[comment.id] && !isAuthenticated && (
                    <div className="ml-[53px] mt-4">
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-600 text-sm">
                          답글을 작성하려면 로그인이 필요합니다.
                        </p>
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
        </div>
      </main>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
