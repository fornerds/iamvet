import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// RDS SSL 인증서 검증 비활성화 (프로덕션 환경에서만)
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // 연결 풀 설정: DATABASE_URL에 connection_limit 파라미터 추가 필요
  // 예: DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Ensure Prisma is connected
export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}