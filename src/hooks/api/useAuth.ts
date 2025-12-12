import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, login as loginAction, logout as logoutAction } from '@/actions/auth';
import { useAuthStore } from '@/store/authStore';
import { removeAuthCookie } from '@/lib/auth';
import { getTokenFromStorage } from '@/utils/auth';
import type { User } from '@/store/authStore';

interface LoginCredentials {
  email: string;
  password: string;
  userType?: "VETERINARIAN" | "HOSPITAL" | "VETERINARY_STUDENT";
}

// React Query 키 상수
export const authKeys = {
  currentUser: ['auth', 'currentUser'] as const,
};

// 현재 사용자 정보 조회 (서버 상태)
export function useCurrentUser() {
  // useState 대신 매번 localStorage를 직접 확인
  const getHasToken = () => {
    if (typeof window === 'undefined') return false;
    const token = getTokenFromStorage(); // 쿠키 우선으로 토큰 확인
    const hasValidToken = !!token && token.length > 10;
    console.log('[getHasToken] checking token:', { hasToken: !!token, isValid: hasValidToken, length: token?.length });
    return hasValidToken;
  };

  const getLocalUser = () => {
    if (typeof window === 'undefined') return null;
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        return JSON.parse(userString);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: async (): Promise<(User & { phone?: string }) | null> => {
      const hasToken = getHasToken();
      const localUser = getLocalUser();
      
      console.log('[useCurrentUser] queryFn called, hasToken:', hasToken, 'localUser:', !!localUser);
      
      if (!hasToken) {
        console.log('[useCurrentUser] No token found, returning null');
        // 토큰이 없지만 사용자 정보가 있다면 정리
        if (localUser) {
          console.log('[useCurrentUser] Cleaning up stale user data without token');
          localStorage.removeItem('user');
          // HttpOnly 쿠키는 JavaScript로 설정할 수 없음
          document.cookie = 'auth-token=; Max-Age=0; Path=/; SameSite=Strict';
        }
        return null;
      }
      
      // 서버에서 최신 사용자 정보 가져오기 (DB의 연락처, 실명 등 최신 정보 반영)
      const result = await getCurrentUser();
      console.log('[useCurrentUser] getCurrentUser result:', result);
      
      // 서버에서 데이터를 가져올 수 없는 경우 처리
      if (!result.success) {
        // 계정 정보 불완전 오류인 경우 자동 로그아웃
        if (result.error?.includes?.('계정 정보가 불완전') || 
            result.error?.includes?.('유효하지 않은 사용자')) {
          console.log('[useCurrentUser] 계정 정보 불완전 - 자동 로그아웃 처리');
          // 토큰 및 사용자 정보 삭제
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          // 쿠키도 삭제 (HttpOnly는 JavaScript로 설정 불가)
          document.cookie = 'auth-token=; Max-Age=0; Path=/; SameSite=Strict';
          return null;
        }
        
        // 다른 서버 오류의 경우 localStorage 폴백 사용
        if (localUser) {
          console.log('[useCurrentUser] Server failed, using localStorage fallback:', localUser);
          const userData = {
            id: localUser.id,
            name: localUser.name || localUser.realName || localUser.email,
            email: localUser.email,
            realName: localUser.realName || localUser.name,
            type: (localUser.userType === "veterinary-student" || localUser.userType === "VETERINARY_STUDENT") ? "veterinarian" : localUser.userType,
            profileName: localUser.profileName || (localUser.userType === "hospital" ? localUser.hospitalName : localUser.name) || localUser.realName,
            profileImage: localUser.profileImage,
            hospitalName: localUser.hospitalName,
            hospitalLogo: localUser.hospitalLogo,
            phone: localUser.phone,
            birthDate: localUser.birthDate ? (typeof localUser.birthDate === 'string' ? localUser.birthDate : localUser.birthDate.toISOString().split('T')[0]) : undefined,
            provider: localUser.provider,
          };
          return userData;
        }
      }
      
      if (result.success && 'user' in result && result.user) {
        const userData = {
          id: result.user.id,
          name: result.user.nickname || result.user.realName || result.user.email,
          email: result.user.email,
          realName: result.user.realName || result.user.nickname,
          type: (result.user.userType === "VETERINARIAN" || result.user.userType === "VETERINARY_STUDENT") ? "veterinarian" as const : "hospital" as const,
          profileName: result.user.profileName || (result.user.userType === "HOSPITAL" ? result.user.hospitalName : result.user.realName) || result.user.nickname,
          profileImage: result.user.profileImage,
          hospitalName: result.user.hospitalName,
          hospitalLogo: result.user.hospitalLogo,
          phone: result.user.phone,
          birthDate: result.user.birthDate ? (typeof result.user.birthDate === 'string' ? result.user.birthDate : result.user.birthDate.toISOString().split('T')[0]) : undefined,
          provider: result.user.provider,
          isActive: result.user.isActive, // 관리자 인증 상태 추가
        };
        console.log('[useCurrentUser] returning server user data:', userData);
        
                    // localStorage에 최신 사용자 정보 저장 (SNS 로그인 시에도 realName과 phone이 포함됨)
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            realName: userData.realName,
            userType: userData.type,
            profileName: userData.profileName,
            profileImage: userData.profileImage,
            hospitalName: userData.hospitalName,
            hospitalLogo: userData.hospitalLogo,
            phone: userData.phone,
            birthDate: userData.birthDate,
            provider: userData.provider,
          }));
        }
        
        return userData;
      }
      console.log('[useCurrentUser] returning null');
      return null;
    },
    enabled: getHasToken(), // 매번 쿠키와 localStorage를 확인
    staleTime: 1000 * 30, // 30초간 fresh (DB 최신 정보 반영 위해 짧게 설정)
    retry: false, // 인증 실패 시 재시도하지 않음
    refetchOnMount: true, // 마운트 시 항상 새로고침 (새로고침 대응)
    refetchOnWindowFocus: true // 윈도우 포커스 시 새로고침
  });
}

// 로그인 뮤테이션
export function useLogin() {
  const queryClient = useQueryClient();
  const { setAuthenticated, setLoading } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      setLoading(true);
      try {
        // Server Action 호출 (타임아웃 설정)
        const result = await Promise.race([
          loginAction(credentials),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('로그인 요청 시간이 초과되었습니다')), 15000)
          )
        ]) as any;
        return result;
      } catch (error) {
        console.error('[useLogin] Server Action 오류:', error);
        // Server Action 실패 시 API Route로 fallback
        const userType = credentials.userType?.toLowerCase() || 'veterinarian';
        const response = await fetch(`/api/login/${userType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.email,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            status: "error", 
            message: "로그인 요청이 실패했습니다" 
          }));
          throw new Error(errorData.message || '로그인에 실패했습니다');
        }

        const data = await response.json();
        
        // API Route 응답을 Server Action 형식으로 변환
        if (data.status === 'success' && data.data) {
          const apiData = data.data;
          const user = apiData.user;
          
          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              phone: user.phone || '',
              realName: user.realName || user.nickname,
              nickname: user.nickname || user.username,
              userType: user.userType,
              profileImage: user.profileImage,
              hospitalName: user.hospitalName,
              hospitalLogo: user.hospitalLogo,
            },
            tokens: apiData.tokens || {
              accessToken: apiData.tokens?.accessToken,
              refreshToken: apiData.tokens?.refreshToken,
            },
          };
        } else {
          throw new Error(data.message || '로그인에 실패했습니다');
        }
      }
    },
    onSuccess: (result) => {
      if (result.success && 'user' in result && result.user) {
        // 서버에서 제공하는 실제 JWT 토큰 사용
        if ('tokens' in result && result.tokens && typeof result.tokens === 'object') {
          const tokens = result.tokens as { accessToken?: string; refreshToken?: string };
          if (tokens.accessToken) {
            localStorage.setItem('accessToken', tokens.accessToken);
          }
          if (tokens.refreshToken) {
            localStorage.setItem('refreshToken', tokens.refreshToken);
          }
        } else {
          // 토큰이 없는 경우 로그인 실패로 처리
          throw new Error('서버에서 인증 토큰을 제공하지 않았습니다');
        }
        localStorage.setItem('user', JSON.stringify({
          id: result.user.id,
          name: result.user.nickname || result.user.realName || result.user.hospitalName,
          email: result.user.email,
          realName: result.user.realName,
          userType: result.user.userType === "HOSPITAL" ? "hospital" : result.user.userType === "VETERINARIAN" || result.user.userType === "VETERINARY_STUDENT" ? "veterinarian" : result.user.userType,
          profileImage: result.user.profileImage,
          profileName: result.user.hospitalName || result.user.nickname,
          hospitalName: result.user.hospitalName,
          hospitalLogo: result.user.hospitalLogo,
          provider: 'NORMAL',
        }));
        
        // Zustand 상태 업데이트
        setAuthenticated(true);
        
        // React Query 캐시 무효화하여 사용자 정보 다시 가져오기
        queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
      }
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
    },
  });
}

// 로그아웃 뮤테이션
export function useLogout() {
  const queryClient = useQueryClient();
  const { reset } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const result = await logoutAction();
      return result;
    },
    onSuccess: () => {
      // Zustand 상태 초기화
      reset();
      
      // localStorage와 쿠키에서 토큰 제거
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      
      // 쿠키 제거
      removeAuthCookie();
      
      // React Query 캐시 클리어
      queryClient.setQueryData(authKeys.currentUser, null);
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
}

// 인증 상태 훅 (Zustand + React Query 결합)
export function useAuth() {
  const { data: user, isLoading: isUserLoading, error, refetch } = useCurrentUser();
  const { isAuthenticated, isLoading: isAuthLoading, setAuthenticated } = useAuthStore();
  
  // 초기 로드 시 토큰 확인 및 상태 복원
  React.useEffect(() => {
    const token = getTokenFromStorage();
    console.log('[useAuth] Initial load - token check:', !!token);
    
    if (token && !user && !isUserLoading) {
      console.log('[useAuth] Token found on initial load, triggering refetch');
      refetch();
    }
  }, []); // 컴포넌트 마운트 시 한번만 실행
  
  console.log('[useAuth] Current state:', {
    user: !!user,
    isUserLoading,
    error: !!error,
    isAuthenticated,
    isAuthLoading
  });
  
  // localStorage 토큰을 쿠키로 동기화
  React.useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      console.log('[useAuth] Setting cookie from localStorage token');
      const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // 개발 환경에서는 secure 옵션 제거
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? '; secure' : '';
      
      document.cookie = `auth-token=${accessToken}; expires=${expireDate.toUTCString()}; path=/${secureFlag}; samesite=strict`;
      console.log('[useAuth] Cookie set successfully');
    }
  }, []);
  
  // URL 파라미터에서 auth=success 확인 시 즉시 상태 업데이트
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      console.log('[useAuth] Auth success detected in URL, refetching...');
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && !user) {
        refetch();
      }
      
      // URL에서 auth 파라미터 제거
      urlParams.delete('auth');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [user, refetch]);

  // localStorage 및 쿠키 변화 감지하여 사용자 정보 다시 가져오기
  React.useEffect(() => {
    const handleStorageChange = () => {
      const token = getTokenFromStorage();
      console.log('[useAuth] handleStorageChange - token:', !!token, 'user:', !!user);
      
      // 토큰이 있으면 쿠키와 동기화
      if (token) {
        // 쿠키 설정
        const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const isProduction = process.env.NODE_ENV === 'production';
        const secureFlag = isProduction ? '; secure' : '';
        document.cookie = `auth-token=${token}; expires=${expireDate.toUTCString()}; path=/${secureFlag}; samesite=strict`;
        
        console.log('[useAuth] Token synchronized');
        
        // 사용자 정보가 있지만 phone이나 birthDate가 누락된 경우 새로고침
        if (user && (!user.phone || !user.birthDate)) {
          // 병원 사용자의 경우 phone/birthDate가 없을 수 있으므로 경고만 출력
          if (user?.type === 'hospital') {
            console.log('[useAuth] Hospital user - phone/birthDate may be optional');
          } else {
            console.log('[useAuth] User missing phone/birthDate, refetching...');
            refetch();
          }
        } else if (!user) {
          console.log('[useAuth] Refetching user data...');
          // 토큰이 있지만 사용자 정보가 없으면 다시 가져오기
          refetch();
        }
      }
    };

    // 페이지 포커스 시에도 확인 (다른 탭에서 로그인했을 경우)
    window.addEventListener('focus', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    // 컴포넌트 마운트 시 즉시 확인
    handleStorageChange();

    return () => {
      window.removeEventListener('focus', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, refetch]);
  
  // 서버 상태와 클라이언트 상태 동기화
  const actuallyAuthenticated = !!user && !error;
  
  console.log('[useAuth] Authentication status:', {
    actuallyAuthenticated,
    isAuthenticated,
    userExists: !!user,
    hasError: !!error
  });
  
  // useEffect로 상태 동기화 (렌더링 중 setState 방지)
  React.useEffect(() => {
    if (actuallyAuthenticated !== isAuthenticated) {
      console.log('[useAuth] Updating authentication state:', actuallyAuthenticated);
      setAuthenticated(actuallyAuthenticated);
    }
  }, [actuallyAuthenticated, isAuthenticated, setAuthenticated]);

  return {
    user,
    isAuthenticated: actuallyAuthenticated,
    isLoading: isUserLoading || isAuthLoading,
    error,
  };
}