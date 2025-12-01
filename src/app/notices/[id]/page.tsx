"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon } from "public/icons";
import axios from "axios";
import { useAuth } from "@/hooks/api/useAuth";

interface AnnouncementDetail {
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

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAnnouncementDetail();
      // 로그인한 사용자만 읽음 처리
      if (isAuthenticated) {
        markAsRead();
      }
    }
  }, [id, isAuthenticated]);

  const fetchAnnouncementDetail = async () => {
    try {
      setIsLoading(true);
      // 개별 API 엔드포인트 사용
      const response = await axios.get(`/api/notices/${id}`);
      if (response.data.success) {
        console.log("NoticeDetail API response:", response.data.data);
        setAnnouncement(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch announcement detail:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // content에서 텍스트 부분만 추출 (JSON 형태인 경우)
  const getDisplayContent = () => {
    if (!announcement?.content) return '';
    
    try {
      const contentData = JSON.parse(announcement.content);
      if (contentData.text) {
        return contentData.text;
      }
    } catch (e) {
      // JSON이 아닌 경우 원본 content 사용
    }
    return announcement.content;
  };

  const markAsRead = async () => {
    // 로그인한 사용자만 읽음 처리
    if (!isAuthenticated) {
      return;
    }

    try {
      await axios.patch(`/api/notices/${id}/read`);
    } catch (error) {
      // 읽음 처리 실패는 조용히 무시 (콘솔 에러 표시 안 함)
      // console.error("Failed to mark as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
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
        return "bg-red-100 text-red-700";
      case "NORMAL":
        return "bg-gray-100 text-gray-700";
      case "LOW":
        return "bg-gray-50 text-gray-500";
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

  if (!announcement) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">공지사항을 찾을 수 없습니다.</p>
          <Link href="/notices" className="text-primary hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-[1095px] w-full mx-auto px-[16px] lg:px-[20px] pt-[30px] pb-[156px]">
        {/* 뒤로가기 버튼 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/notices" className="p-2">
            <ArrowLeftIcon currentColor="currentColor" />
          </Link>
          <h2 className="text-lg font-medium">공지사항 상세</h2>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="bg-white w-full mx-auto rounded-[16px] border border-[#EFEFF0] p-[24px] xl:p-[32px]">
          {/* 중요도 표시 및 읽음 상태 */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(
                announcement.announcements?.priority || "NORMAL"
              )}`}
            >
              {getPriorityLabel(announcement.announcements?.priority || "NORMAL")}
            </span>
            {announcement.isRead && (
              <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600">
                읽음
              </span>
            )}
            <span className="text-sm text-gray-500">
              {formatDate(announcement.createdAt)}
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {announcement.title}
          </h1>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-2 mb-8 pb-8 border-b border-gray-200">
            <span className="text-sm text-gray-600">작성자:</span>
            <span className="text-sm font-medium">
              {announcement.users_notifications_senderIdTousers?.nickname || 
               announcement.users_notifications_senderIdTousers?.realName || "시스템 관리자"}
            </span>
          </div>

          {/* 내용 */}
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
              {getDisplayContent()}
            </pre>
          </div>

          {/* 첨부 이미지 */}
          {announcement.announcements?.images && announcement.announcements.images.filter(img => img && img.trim() !== '').length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-4">첨부 이미지</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {announcement.announcements.images.filter(img => img && img.trim() !== '').map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={imageUrl}
                        alt={`첨부 이미지 ${index + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    {/* 클릭 시 원본 이미지 보기 */}
                    <button
                      onClick={() => window.open(imageUrl, '_blank')}
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-white text-sm bg-black bg-opacity-70 px-3 py-1 rounded transition-opacity duration-200">
                        원본 보기
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대상 사용자 정보 */}
          {announcement.announcements?.targetUserTypes && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">대상</h3>
              <div className="flex gap-2">
                {announcement.announcements.targetUserTypes.includes("ALL") && (
                  <span className="px-3 py-1 bg-gray-50 text-gray-700 text-sm rounded-full">
                    전체
                  </span>
                )}
                {announcement.announcements.targetUserTypes.includes("VETERINARIAN") && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    수의사
                  </span>
                )}
                {announcement.announcements.targetUserTypes.includes("HOSPITAL") && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    병원
                  </span>
                )}
                {announcement.announcements.targetUserTypes.includes("VETERINARY_STUDENT") && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                    수의대생
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 만료일 정보 (있는 경우) */}
          {announcement.announcements?.expiresAt && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">만료일</h3>
              <p className="text-sm text-gray-700">
                {formatDate(announcement.announcements.expiresAt)}
              </p>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex justify-center mt-12">
            <Link
              href="/notices"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}