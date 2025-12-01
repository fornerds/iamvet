"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useAuth, useLogout } from "@/hooks/api/useAuth";
import { useAuthStore as useHospitalAuthStore } from "@/stores/authStore";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);

  // 새로운 상태 관리 시스템 사용
  const { user, isAuthenticated, isLoading } = useAuth();
  const logoutMutation = useLogout();

  // 병원 인증용 스토어
  const { setAuth, checkAuth, logout: hospitalLogout } = useHospitalAuthStore();

  // 클라이언트 hydration 완료 체크
  React.useEffect(() => {
    setIsHydrated(true);
    checkAuth(); // 병원 인증 스토어 초기화
  }, [checkAuth]);

  // 인증 상태가 변경되면 병원 인증 스토어도 동기화
  React.useEffect(() => {
    console.log("[ClientLayout] Auth sync:", {
      user: !!user,
      isAuthenticated,
      userType: user?.type,
    });
    if (user) {
      const userType =
        user.type === "hospital"
          ? "HOSPITAL"
          : user.type === "veterinarian"
          ? "VETERINARIAN"
          : "VETERINARY_STUDENT";
      console.log("[ClientLayout] Setting hospital auth:", {
        isAuthenticated,
        userType,
        userId: user.id,
      });
      setAuth(isAuthenticated, userType, user.id);
    } else if (!isAuthenticated) {
      console.log("[ClientLayout] Clearing hospital auth");
      setAuth(false);
    }
  }, [user, isAuthenticated, setAuth]);

  // 관리자 페이지인지 확인
  const isAdminPage = pathname.startsWith("/admin");

  // 로그아웃 처리
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    hospitalLogout(); // 병원 인증 스토어도 초기화
    router.push("/");
  };

  // 로그인 처리
  const handleLogin = () => {
    router.push("/member-select");
  };

  // 회원가입 처리
  const handleSignup = () => {
    router.push("/member-select");
  };

  // 알림 클릭 처리
  const handleNotificationClick = () => {
    if (user?.type === "veterinarian") {
      router.push("/dashboard/veterinarian/messages");
    } else if (user?.type === "hospital") {
      router.push("/dashboard/hospital/messages");
    }
  };

  // 관리자 페이지는 헤더/푸터 없이 렌더링
  if (isAdminPage) {
    return <>{children}</>;
  }

  // hydration이 완료되지 않았거나 로딩 중일 때는 헤더 없이 렌더링 (깜빡임 방지)
  if (!isHydrated || isLoading) {
    return <>{children}</>;
  }

  // 테스트용 네비게이션 아이템
  const navigationItems = [
    { label: "채용공고", href: "/jobs", active: pathname === "/jobs" },
    { label: "인재정보", href: "/resumes", active: pathname === "/resumes" },
    { label: "강의영상", href: "/lectures", active: pathname === "/lectures" },
    {
      label: "양도양수",
      href: "/transfers",
      active: pathname === "/transfers",
    },
    { label: "임상포럼", href: "/forums", active: pathname === "/forums" },
    // 공지사항은 비회원도 볼 수 있도록 항상 표시
    {
      label: "공지사항",
      href: "/notices",
      active: pathname === "/notices",
    },
  ];

  return (
    <>
      <Header
        isLoggedIn={isAuthenticated}
        user={user || undefined}
        navigationItems={navigationItems}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onLogout={handleLogout}
        onProfileClick={() => console.log("프로필 클릭")}
        onNotificationClick={handleNotificationClick}
      />
      {children}
      <Footer />
    </>
  );
};
