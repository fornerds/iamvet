import { useQuery } from '@tanstack/react-query';

interface Advertisement {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl: string;
  position: 'HERO' | 'BANNER' | 'SIDEBAR' | 'CARD' | 'DASHBOARD';
  isActive: boolean;
  order: number;
  variant?: string;
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdvertisementsResponse {
  success: boolean;
  data: Advertisement[];
}

// 광고 목록 조회
export const useAdvertisements = (position?: 'HERO' | 'BANNER' | 'SIDEBAR' | 'CARD' | 'DASHBOARD') => {
  return useQuery<AdvertisementsResponse>({
    queryKey: ['advertisements', position],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (position) params.append('position', position);
      params.append('isActive', 'true'); // 활성화된 광고만
      
      console.log(`[useAdvertisements] Fetching advertisements with position: ${position}`);
      
      const response = await fetch(`/api/advertisements?${params}`);
      
      if (!response.ok) {
        throw new Error('광고 목록을 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      console.log(`[useAdvertisements] Response for position ${position}:`, data);
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
};

// 히어로 배너용 hook
export const useHeroBanners = () => {
  return useAdvertisements('HERO');
};

// 일반 배너용 hook
export const useBannerAds = () => {
  return useAdvertisements('BANNER');
};

// 사이드 광고용 hook
export const useSideAds = () => {
  return useAdvertisements('SIDEBAR');
};

// 카드 광고용 hook
export const useCardAds = () => {
  return useAdvertisements('CARD');
};

// 대시보드 배너용 hook
export const useDashboardBanners = () => {
  return useAdvertisements('DASHBOARD');
};