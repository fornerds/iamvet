import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HospitalOnlyButton } from "@/components/ui/HospitalOnlyButton";
import { useHospitalAuthModal } from "@/hooks/useHospitalAuthModal";
import { HospitalAuthModal } from "@/components/ui/HospitalAuthModal";
import { useServiceNotReadyModal } from "@/hooks/useServiceNotReadyModal";
import { ServiceNotReadyModal } from "@/components/ui/ServiceNotReadyModal";
import { useNotificationStore } from "@/store/notificationStore";
import { HeaderMobileMenuProps, DashboardMenuItem } from "./types";
import {
  HomeIcon,
  UserPlusIcon,
  ListIcon,
  BellOutlineIcon,
  UsersIcon,
  BookmarkIcon,
  SettingsIcon,
} from "public/icons";

// 모바일용 북마크 아이콘 (Sidebar와 동일한 크기)
const BookmarkMenuIcon: React.FC<{ currentColor?: string }> = ({
  currentColor = "currentColor",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16.8"
    height="16"
    viewBox="0 0 21 20"
    fill="none"
  >
    <path
      d="M17.375 18.75L10.5 14.375L3.625 18.75V4.6875C3.625 4.20707 3.81532 3.74622 4.15273 3.40881C4.49014 3.0714 4.95099 2.88108 5.43142 2.88108H15.5686C16.049 2.88108 16.5099 3.0714 16.8473 3.40881C17.1847 3.74622 17.375 4.20707 17.375 4.6875V18.75Z"
      stroke={currentColor}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 펼침/접힘 아이콘 컴포넌트
const ChevronDownIcon: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const CommentIcon: React.FC<{ currentColor?: string }> = ({
  currentColor = "currentColor",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M15 10.3333C15 10.7459 14.8361 11.1416 14.5444 11.4333C14.2527 11.725 13.857 11.8889 13.4444 11.8889H4.11111L1 15V2.55556C1 2.143 1.16389 1.74733 1.45561 1.45561C1.74733 1.16389 2.143 1 2.55556 1H13.4444C13.857 1 14.2527 1.16389 14.5444 1.45561C14.8361 1.74733 15 2.143 15 2.55556V10.3333Z"
      stroke="currentColor"
      strokeWidth="1.0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface BookmarkChildMenuItem {
  id: string;
  label: string;
  href: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ currentColor?: string }>;
  children: BookmarkChildMenuItem[];
}

export const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = ({
  isOpen,
  onToggle,
  navigationItems = [],
  isLoggedIn = false,
  user,
  userType,
  onLogin,
  onSignup,
  onLogout,
  onProfileClick,
  className = "",
}) => {
  const pathname = usePathname();
  const { showModal, isModalOpen, closeModal, modalReturnUrl } =
    useHospitalAuthModal();
  const {
    showModal: showServiceNotReadyModal,
    isModalOpen: isServiceNotReadyModalOpen,
    closeModal: closeServiceNotReadyModal,
  } = useServiceNotReadyModal();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(["posts-management", "comments-management", "bookmarks"])
  );

  // active 상태 확인 함수 (Sidebar와 동일한 로직)
  const isActive = (href: string, userType: "veterinarian" | "hospital") => {
    if (href === `/dashboard/${userType}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // 게시물 관리 그룹 정의
  const getPostsGroup = (type: "veterinarian" | "hospital"): MenuGroup => {
    return {
      id: "posts-management",
      label: "게시물 관리",
      icon: ListIcon,
      children: [
        {
          id: "my-forum-posts",
          label: "임상포럼 게시물",
          href: `/dashboard/${type}/my-forum-posts`,
        },
        {
          id: "my-transfer-posts",
          label: "양도양수 게시물",
          href: `/dashboard/${type}/my-transfer-posts`,
        },
      ],
    };
  };

  // 북마크 그룹 정의
  const getBookmarkGroup = (type: "veterinarian" | "hospital"): MenuGroup => {
    if (type === "veterinarian") {
      return {
        id: "bookmarks",
        label: "북마크 관리",
        icon: BookmarkMenuIcon,
        children: [
          {
            id: "transfer-bookmarks",
            label: "양도양수 북마크",
            href: "/dashboard/veterinarian/transfer-bookmarks",
          },
          {
            id: "lecture-bookmarks",
            label: "강의 북마크",
            href: "/dashboard/veterinarian/lecture-bookmarks",
          },
          {
            id: "forum-bookmarks",
            label: "임상포럼 북마크",
            href: "/dashboard/veterinarian/forum-bookmarks",
          },
          {
            id: "job-bookmarks",
            label: "채용공고 북마크",
            href: "/dashboard/veterinarian/job-bookmarks",
          },
        ],
      };
    } else {
      return {
        id: "bookmarks",
        label: "북마크 관리",
        icon: BookmarkMenuIcon,
        children: [
          {
            id: "transfer-bookmarks",
            label: "양도양수 북마크",
            href: "/dashboard/hospital/transfer-bookmarks",
          },
          {
            id: "lecture-bookmarks",
            label: "강의 북마크",
            href: "/dashboard/hospital/lecture-bookmarks",
          },
          {
            id: "forum-bookmarks",
            label: "임상포럼 북마크",
            href: "/dashboard/hospital/forum-bookmarks",
          },
          {
            id: "favorite-talents",
            label: "이력서 북마크",
            href: "/dashboard/hospital/favorite-talents",
          },
        ],
      };
    }
  };

  // 사용자 타입에 따른 마이페이지 메뉴 데이터 (북마크 관련 제거)
  const getDashboardMenuItems = (
    type: "veterinarian" | "hospital"
  ): DashboardMenuItem[] => {
    if (type === "veterinarian") {
      return [
        {
          id: "dashboard",
          label: "대시보드 홈",
          icon: HomeIcon,
          href: "/dashboard/veterinarian",
        },
        {
          id: "resume",
          label: "나의 이력서",
          icon: UserPlusIcon,
          href: "/dashboard/veterinarian/resume",
        },
        {
          id: "applications",
          label: "지원 내역 관리",
          icon: ListIcon,
          href: "/dashboard/veterinarian/applications",
        },
        {
          id: "messages",
          label: "알림/메시지 관리",
          icon: BellOutlineIcon,
          href: "/dashboard/veterinarian/messages",
          badge: unreadCount,
        },
        {
          id: "profile",
          label: "프로필 설정",
          icon: SettingsIcon,
          href: "/dashboard/veterinarian/profile",
        },
        {
          id: "my-comments",
          label: "댓글 관리",
          icon: CommentIcon,
          href: `/dashboard/veterinarian/my-comments`,
        },
      ];
    } else {
      return [
        {
          id: "dashboard",
          label: "대시보드 홈",
          icon: HomeIcon,
          href: "/dashboard/hospital",
        },
        {
          id: "my-jobs",
          label: "올린 공고 관리",
          icon: ListIcon,
          href: "/dashboard/hospital/my-jobs",
        },
        {
          id: "applicants",
          label: "지원자 목록",
          icon: UsersIcon,
          href: "/dashboard/hospital/applicants",
        },
        {
          id: "messages",
          label: "알림/메시지 관리",
          icon: BellOutlineIcon,
          href: "/dashboard/hospital/messages",
          badge: unreadCount,
        },
        {
          id: "profile",
          label: "프로필 설정",
          icon: SettingsIcon,
          href: "/dashboard/hospital/profile",
        },
        {
          id: "my-comments",
          label: "댓글 관리",
          icon: CommentIcon,
          href: `/dashboard/hospital/my-comments`,
        },
      ];
    }
  };

  // userType이 undefined일 때 user.type을 직접 사용
  const actualUserType = userType || user?.type;
  const dashboardItems = actualUserType
    ? getDashboardMenuItems(actualUserType)
    : [];
  const postsGroup = actualUserType ? getPostsGroup(actualUserType) : null;
  const bookmarkGroup = actualUserType
    ? getBookmarkGroup(actualUserType)
    : null;

  // 그룹의 활성 상태 확인
  const isGroupActive = (group: MenuGroup) => {
    return group.children.some(
      (child) => actualUserType && isActive(child.href, actualUserType)
    );
  };

  // 그룹 토글 함수
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 알림 수 가져오기
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // 메뉴가 열렸을 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // 스크롤 위치 복원
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  const MenuIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );

  const CloseIcon = () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );

  return (
    <>
      {/* 모바일 메뉴 토글 버튼 */}
      <button
        onClick={onToggle}
        className={`p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${className}`}
        aria-label="메뉴"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* 모바일 메뉴 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50"
          style={{
            height: "100dvh", // 동적 뷰포트 높이 지원
            width: "100vw",
            overflow: "hidden", // 외부 스크롤 방지
          }}
        >
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-200"
            onClick={onToggle}
            style={{
              height: "100dvh",
              width: "100vw",
            }}
          />

          {/* 메뉴 패널 */}
          <div
            className="absolute right-0 top-0 w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-out"
            style={{
              height: "100dvh",
              maxHeight: "100dvh",
              transform: isOpen ? "translateX(0)" : "translateX(100%)",
              willChange: "transform",
            }}
          >
            <div className="flex flex-col h-full">
              {/* 헤더 - 고정 영역 */}
              <div className="flex-shrink-0 flex items-center justify-end p-4">
                <button
                  onClick={onToggle}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* 네비게이션 메뉴 - 스크롤 가능 영역 */}
              <nav
                className="flex-1 px-4 py-6 space-y-2"
                style={{
                  overflowY: "auto",
                  overflowX: "hidden",
                  WebkitOverflowScrolling: "touch", // iOS 부드러운 스크롤
                  scrollbarWidth: "thin", // Firefox 스크롤바
                  msOverflowStyle: "scrollbar", // IE/Edge 스크롤바
                }}
              >
                {navigationItems.map((item, index) => {
                  const isResumeRoute = item.href.startsWith("/resumes");
                  const isLectureRoute = item.href.startsWith("/lectures");

                  const handleLectureClick = (e: React.MouseEvent) => {
                    e.preventDefault();
                    showServiceNotReadyModal();
                    onToggle();
                  };

                  const handleResumeClick = () => {
                    onToggle();
                  };

                  const handleNormalClick = () => {
                    onToggle();
                  };

                  if (isResumeRoute) {
                    return (
                      <HospitalOnlyButton
                        key={index}
                        href={item.href}
                        onClick={handleResumeClick}
                        className={`
                        block px-4 py-3 font-title text-base font-medium rounded-lg transition-colors duration-200 
                        ${
                          item.active
                            ? "text-[#FF8796] bg-[#FFF7F7]"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }
                        border-none bg-none cursor-pointer text-left
                      `}
                        showAuthModal={showModal}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          padding: "12px 16px",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          fontWeight: "inherit",
                        }}
                      >
                        {item.label}
                      </HospitalOnlyButton>
                    );
                  }

                  return (
                    <Link
                      key={index}
                      href={item.href}
                      onClick={
                        isLectureRoute ? handleLectureClick : handleNormalClick
                      }
                      className={`
                        block px-4 py-3 font-title text-base font-medium rounded-lg transition-colors duration-200 
                        ${
                          item.active
                            ? "text-[#FF8796] bg-[#FFF7F7]"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {/* 로그인된 경우 마이페이지 섹션 */}
                {isLoggedIn && actualUserType && (
                  <>
                    <h3 className="text-gray-700 block px-4 py-3 font-title text-base font-medium rounded-lg transition-colors duration-200">
                      마이페이지
                    </h3>

                    {/* 사용자 계정 유형에 따른 마이페이지만 표시 */}
                    <div className="pl-4 space-y-1">
                      {dashboardItems.map((item) => {
                        const IconComponent = item.icon;
                        const active = isActive(item.href, actualUserType);

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={onToggle}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 relative ${
                              active
                                ? "text-[#FF8796] bg-[#FFF7F7]"
                                : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <IconComponent
                              currentColor={active ? "#FF8796" : "#4F5866"}
                            />
                            <span className="ml-3">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-auto bg-[#FF8796] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {item.badge > 9 ? "9+" : item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}

                      {/* 게시물 관리 그룹 */}
                      {postsGroup && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleGroup(postsGroup.id)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              isGroupActive(postsGroup)
                                ? "text-[#FF8796] bg-[#FFF7F7]"
                                : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <postsGroup.icon
                              currentColor={
                                isGroupActive(postsGroup)
                                  ? "#FF8796"
                                  : "#4F5866"
                              }
                            />
                            <span className="ml-3">{postsGroup.label}</span>
                            <span className="ml-auto">
                              {expandedGroups.has(postsGroup.id) ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </span>
                          </button>

                          {/* 하위 메뉴 */}
                          {expandedGroups.has(postsGroup.id) && (
                            <div className="mt-2 ml-6 space-y-1">
                              {postsGroup.children.map((child) => {
                                const childActive =
                                  actualUserType &&
                                  isActive(child.href, actualUserType);

                                return (
                                  <Link
                                    key={child.id}
                                    href={child.href}
                                    onClick={onToggle}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                      childActive
                                        ? "text-[#FF8796] bg-[#FFF7F7]"
                                        : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                                  >
                                    <span>{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 댓글 관리 그룹 */}
                      {/* {commentsGroup && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleGroup(commentsGroup.id)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              isGroupActive(commentsGroup)
                                ? "text-[#FF8796] bg-[#FFF7F7]"
                                : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <commentsGroup.icon
                              currentColor={
                                isGroupActive(commentsGroup)
                                  ? "#FF8796"
                                  : "#4F5866"
                              }
                            />
                            <span className="ml-3">{commentsGroup.label}</span>
                            <span className="ml-auto">
                              {expandedGroups.has(commentsGroup.id) ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </span>
                          </button> */}

                      {/* 하위 메뉴 */}
                      {/* {expandedGroups.has(commentsGroup.id) && (
                            <div className="mt-2 ml-6 space-y-1">
                              {commentsGroup.children.map((child) => {
                                const childActive =
                                  actualUserType &&
                                  isActive(child.href, actualUserType);

                                return (
                                  <Link
                                    key={child.id}
                                    href={child.href}
                                    onClick={onToggle}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                      childActive
                                        ? "text-[#FF8796] bg-[#FFF7F7]"
                                        : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                                  >
                                    <span>{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )} */}

                      {/* 북마크 그룹 */}
                      {bookmarkGroup && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleGroup(bookmarkGroup.id)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              isGroupActive(bookmarkGroup)
                                ? "text-[#FF8796] bg-[#FFF7F7]"
                                : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <bookmarkGroup.icon
                              currentColor={
                                isGroupActive(bookmarkGroup)
                                  ? "#FF8796"
                                  : "#4F5866"
                              }
                            />
                            <span className="ml-3">{bookmarkGroup.label}</span>
                            <span className="ml-auto">
                              {expandedGroups.has(bookmarkGroup.id) ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </span>
                          </button>

                          {/* 하위 메뉴 */}
                          {expandedGroups.has(bookmarkGroup.id) && (
                            <div className="mt-2 ml-6 space-y-1">
                              {bookmarkGroup.children.map((child) => {
                                const childActive =
                                  actualUserType &&
                                  isActive(child.href, actualUserType);

                                return (
                                  <Link
                                    key={child.id}
                                    href={child.href}
                                    onClick={onToggle}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                      childActive
                                        ? "text-[#FF8796] bg-[#FFF7F7]"
                                        : "text-[#4F5866] hover:text-gray-900 hover:bg-gray-100"
                                    }`}
                                  >
                                    <span>{child.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 추가 여백을 위한 패딩 */}
                <div className="h-4"></div>
              </nav>

              {/* 하단 액션 버튼 - 고정 영역 */}
              <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      onLogout?.();
                      onToggle();
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    로그아웃
                  </button>
                ) : (
                  <Link href="/member-select" onClick={onToggle}>
                    <button className="font-title title-light w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200">
                      로그인/회원가입
                    </button>
                  </Link>
                )}
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

      {/* 서비스 준비중 모달 */}
      <ServiceNotReadyModal
        isOpen={isServiceNotReadyModalOpen}
        onClose={closeServiceNotReadyModal}
      />
    </>
  );
};
