import { NextResponse } from 'next/server';

/**
 * 외부 헬스체크용 API (최소한의 의존성)
 * 서버가 다운되어도 최대한 빠르게 응답
 * GET /api/health-external
 */
export async function GET() {
  try {
    // 최소한의 정보만 반환 (데이터베이스 연결 없이)
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'iamvet',
        version: process.env.npm_package_version || 'unknown'
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    // 에러 발생 시에도 빠르게 응답
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'iamvet'
      },
      { status: 500 }
    );
  }
}

