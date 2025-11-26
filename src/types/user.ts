export interface User {
  id: string;
  email: string;
  name: string;
  type: 'veterinarian' | 'hospital';
  isActive?: boolean; // 관리자 인증 상태
}