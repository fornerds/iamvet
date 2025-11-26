import Link from "next/link";
import {
  EyeIcon,
  CommentIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
} from "public/icons";
import { Tag } from "../Tag";
import { useViewCountStore } from "@/stores/viewCountStore";
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useAuth } from "@/hooks/api/useAuth";
import { useState } from "react";

export interface ForumCardProps {
  id: string;
  title: string;
  tags: string[];
  viewCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt?: Date;
  onClick?: () => void;
  isBookmarked?: boolean;
  onBookmarkChange?: (id: string, isBookmarked: boolean) => void;
}

export default function ForumCard({
  id,
  title,
  tags,
  viewCount,
  commentCount,
  createdAt,
  updatedAt,
  onClick,
  isBookmarked: propIsBookmarked,
  onBookmarkChange,
}: ForumCardProps) {
  const { getForumViewCount } = useViewCountStore();
  const { isForumBookmarked, toggleForumBookmark } = useBookmarkStore();
  const { user } = useAuth();
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  const formatDate = (date: Date) => {
    return date
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\.$/, ""); // 마지막 온점 제거
  };

  const displayDate = updatedAt ? updatedAt : createdAt;

  // 스토어에서 조회수를 가져오되, 없으면 props의 viewCount 사용
  const currentViewCount = getForumViewCount(id) || viewCount;

  // 북마크 상태 - prop > 스토어 순으로 우선순위
  const isBookmarked =
    propIsBookmarked !== undefined ? propIsBookmarked : isForumBookmarked(id);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isBookmarkLoading) return;

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

        // 부모 컴포넌트에 변경사항 알림
        if (onBookmarkChange) {
          onBookmarkChange(id, newState);
        }
      } else {
        const errorData = await response.json();
        
        // 관리자 인증 필요 안내 (403 에러)
        if (response.status === 403 && errorData.requiresAdminVerification) {
          alert(errorData.message || "관리자의 인증을 받아야만 서비스를 이용할 수 있습니다. 관리자 인증이 완료될 때까지 기다려주세요.");
          return;
        }
        
        if (errorData.message === "이미 북마크한 임상포럼입니다") {
          console.warn("북마크 처리 실패: 이미 북마크한 임상포럼입니다. UI 상태를 동기화합니다.");
          // 이미 북마크된 상태이므로, UI 상태를 강제로 북마크됨으로 설정
          if (!isBookmarked) {
            toggleForumBookmark(id); // UI 상태를 북마크됨으로 변경
            if (onBookmarkChange) {
              onBookmarkChange(id, true);
            }
          }
        } else {
          console.error("북마크 처리 실패:", errorData.message || "알 수 없는 오류");
          alert(`북마크 처리 중 오류가 발생했습니다: ${errorData.message || "알 수 없는 오류"}`);
        }
      }
    } catch (error) {
      console.error("북마크 처리 중 오류:", error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  return (
    <Link href={`/forums/${id}`} onClick={onClick}>
      <div className="flex flex-col gap-[12px] pt-[16px] pb-[20px] px-[10px] border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors cursor-pointer">
        {/* Tags */}
        <div className="flex gap-2 mb-2">
          {tags.map((tag, index) => (
            <Tag variant={1} key={`${id}-${index}`}>
              {tag}
            </Tag>
          ))}
        </div>

        <div className="flex flex-col gap-[6px]">
          {/* Title */}
          <h3 className="text-[20px] font-text text-bold text-primary leading-[1.4] mb-2">
            {title}
          </h3>
          <div className="flex justify-between items-center">
            {/* Stats */}
            <div className="flex items-center gap-4 text-[#9CA3AF]">
              <div className="flex items-center gap-1">
                <EyeIcon currentColor="#9CA3AF" />
                <span className="text-[14px]">
                  {currentViewCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CommentIcon currentColor="#9CA3AF" />
                <span className="text-[14px]">{commentCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date */}
              <div className="text-[14px] text-[#9CA3AF]">
                {formatDate(displayDate)}
              </div>

              {/* Bookmark Button */}
              {user && (
                <button
                  onClick={handleBookmarkClick}
                  disabled={isBookmarkLoading}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  aria-label={isBookmarked ? "북마크 해제" : "북마크 추가"}
                >
                  {isBookmarked ? (
                    <BookmarkFilledIcon currentColor="var(--Keycolor1)" />
                  ) : (
                    <BookmarkIcon currentColor="var(--Subtext2)" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
