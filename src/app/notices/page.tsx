"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "public/icons";
import { SelectBox } from "@/components/ui/SelectBox";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import NotificationCard from "@/components/ui/NotificationCard";
import axios from "axios";

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  announcements?: {
    priority: string;
    targetUserTypes: string[];
    expiresAt: string | null;
    images: string[];
  } | null;
  users_notifications_senderIdTousers?: {
    nickname: string | null;
    realName: string;
  } | null;
}

const sortOptions = [
  { value: "recent", label: "최신순" },
  { value: "oldest", label: "오래된순" },
];

const filterOptions = [
  { value: "all", label: "전체" },
  { value: "unread", label: "읽지 않음" },
  { value: "read", label: "읽음" },
];

const priorityOptions = [
  { value: "all", label: "전체 중요도" },
  { value: "HIGH", label: "높음" },
  { value: "NORMAL", label: "보통" },
  { value: "LOW", label: "낮음" },
];

export default function NoticesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 6;

  // 공지사항 목록 조회
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/notices");
      if (response.data.success) {
        console.log("Raw API response:", response.data.data);
        console.log("First announcement:", response.data.data[0]);
        console.log("First announcement images:", response.data.data[0]?.announcements?.images);
        
        // 각 announcement의 이미지 상태 확인
        response.data.data.forEach((ann: any, index: number) => {
          console.log(`Announcement ${index} (${ann.id}):`, {
            hasAnnouncements: !!ann.announcements,
            images: ann.announcements?.images || 'no images',
            contentPreview: ann.content.substring(0, 50)
          });
        });
        
        setAnnouncements(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch announcements:", error);
      // 비회원도 접근 가능하므로 에러가 발생해도 빈 배열로 설정
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: string) => {
    // Find announcement by string ID
    const announcement = announcements.find((a) => a.id === notificationId);
    if (!announcement) return;

    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === notificationId.toString() ? { ...item, isRead: true } : item
      )
    );

    // 실제 API 호출
    try {
      await axios.patch(`/api/notices/${notificationId}/read`);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // 필터링 및 정렬 로직
  const filteredAndSortedAnnouncements = useMemo(() => {
    let filtered = [...announcements];

    // 읽음/읽지않음 필터링
    switch (filterBy) {
      case "unread":
        filtered = filtered.filter((item) => !item.isRead);
        break;
      case "read":
        filtered = filtered.filter((item) => item.isRead);
        break;
      default:
        break;
    }

    // 중요도 필터링
    if (priorityFilter !== "all") {
      console.log("Priority filter selected:", priorityFilter);
      console.log(
        "Available announcements:",
        announcements.map((item) => ({
          id: item.id,
          title: item.title,
          priority: item.announcements?.priority || "NORMAL",
          fullAnnouncement: item.announcements,
        }))
      );

      filtered = filtered.filter((item) => {
        // announcements가 없는 경우 NORMAL로 기본값 설정
        const priority = item.announcements?.priority || "NORMAL";
        // Prisma enum 값을 문자열로 변환하여 비교
        const priorityString = String(priority);
        console.log(
          `Comparing: "${priorityString}" === "${priorityFilter}"`,
          priorityString === priorityFilter
        );
        return priorityString === priorityFilter;
      });

      console.log("Filtered results:", filtered.length);
    }

    // 정렬 (읽음 상태 우선 정렬 후 날짜 정렬)
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => {
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        break;
      case "oldest":
        filtered.sort((a, b) => {
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [announcements, filterBy, sortBy, priorityFilter]);

  // 페이지네이션
  const totalPages = Math.ceil(
    filteredAndSortedAnnouncements.length / itemsPerPage
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentAnnouncements = filteredAndSortedAnnouncements.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "중요";
      case "NORMAL":
        return "보통";
      case "LOW":
        return "낮음";
      default:
        return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 font-bold";
      case "NORMAL":
        return "text-gray-600";
      case "LOW":
        return "text-gray-400";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
        {/* 뒤로가기 버튼 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2">
            <ArrowLeftIcon currentColor="currentColor" />
          </Link>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[16px] xl:p-[20px]">
          {/* 헤더: 제목과 SelectBox들 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-primary font-text text-[24px] font-bold">
                공지사항
              </h1>
            </div>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <SelectBox
                value={priorityFilter}
                onChange={(value) => {
                  console.log("Priority filter changed to:", value);
                  setPriorityFilter(value);
                }}
                placeholder="전체 중요도"
                options={priorityOptions}
              />
              <SelectBox
                value={filterBy}
                onChange={setFilterBy}
                placeholder="전체"
                options={filterOptions}
              />
              <SelectBox
                value={sortBy}
                onChange={setSortBy}
                placeholder="최신순"
                options={sortOptions}
              />
            </div>
          </div>

          {/* 공지사항이 없을 때 메시지 */}
          {announcements.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">아직 공지사항이 없습니다.</p>
            </div>
          )}

          {/* 공지사항 목록 */}
          <div className="space-y-4">
            {currentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="relative">
                {/* 중요도 표시 */}
                <div className="absolute -top-2 left-4 z-10">
                  <span
                    className={`px-2 py-1 text-xs rounded-full bg-white border ${getPriorityColor(
                      String(announcement.announcements?.priority || "NORMAL")
                    )}`}
                  >
                    [
                    {getPriorityLabel(
                      String(announcement.announcements?.priority || "NORMAL")
                    )}
                    ]
                  </span>
                </div>
                <NotificationCard
                  id={announcement.id}
                  title={announcement.title}
                  content={announcement.content}
                  createdAt={formatDate(announcement.createdAt)}
                  isRead={true}
                  onMarkAsRead={handleMarkAsRead}
                  basePath="/notices"
                  images={announcement.announcements?.images || []}
                />
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
