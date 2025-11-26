"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";
import { useAuth } from "@/hooks/api/useAuth";
import AdminVerificationModal from "@/components/features/auth/AdminVerificationModal";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // 경로를 기반으로 사용자 타입 결정
  const userType = pathname.startsWith("/dashboard/hospital")
    ? "hospital"
    : "veterinarian"; // veterinary-student도 veterinarian으로 처리

  // 관리자 인증 체크
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // user 객체에 isActive 필드가 있는지 확인
      const userIsActive = (user as any).isActive;
      
      if (userIsActive === false) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    } else if (!isLoading && !isAuthenticated) {
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      router.push("/member-select");
    }
  }, [user, isAuthenticated, isLoading, router]);

  // 로딩 중이거나 인증되지 않은 경우
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8796] mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated || !user) {
    return null; // 리다이렉트 중
  }

  // 관리자 인증이 완료되지 않은 경우 모달 표시
  if ((user as any).isActive === false) {
    return (
      <>
        <AdminVerificationModal
          isOpen={showModal}
          userType={userType}
          onClose={() => {
            setShowModal(false);
            router.push("/");
          }}
        />
        <div className="flex min-h-screen bg-gray-50 opacity-50 pointer-events-none">
          <Sidebar userType={userType} />
          <main className="flex-1 overflow-auto lg:ml-0">{children}</main>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userType={userType} />
      <main className="flex-1 overflow-auto lg:ml-0">{children}</main>
    </div>
  );
}
