import { NextResponse } from 'next/server';

/**
 * 서버 상태 확인 API
 * GET /api/health
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // 기본 정보
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      checks: {
        server: 'ok',
        database: 'unknown',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      responseTime: 0
    };

    // 데이터베이스 연결 확인 (선택사항)
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      health.checks.database = 'ok';
    } catch (error) {
      health.checks.database = 'error';
      // 데이터베이스 오류는 치명적이지 않을 수 있으므로 상태는 'ok' 유지
    }

    health.checks.responseTime = Date.now() - startTime;

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

