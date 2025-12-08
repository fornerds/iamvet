'use client';

import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    server: string;
    database: string;
    memory: {
      used: number;
      total: number;
      unit: string;
    };
    responseTime: number;
  };
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/health', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30초마다 자동 갱신
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getCheckStatusColor = (check: string) => {
    switch (check) {
      case 'ok':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">서버 상태 모니터링</h1>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600">오류: {error}</p>
          </div>
        )}

        {health && (
          <>
            {/* 전체 상태 */}
            <div className="mb-6 p-6 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">전체 상태</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                    {health.status === 'ok' ? '✅ 정상' : '❌ 오류'}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}</p>
                  <p>응답 시간: {health.checks.responseTime}ms</p>
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 서버 정보 */}
              <div className="p-6 bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">서버 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">상태:</span>
                    <span className={getCheckStatusColor(health.checks.server)}>
                      {health.checks.server === 'ok' ? '✅ 정상' : '❌ 오류'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">환경:</span>
                    <span className="font-medium">{health.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">버전:</span>
                    <span className="font-medium">{health.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">가동 시간:</span>
                    <span className="font-medium">{formatUptime(health.uptime)}</span>
                  </div>
                </div>
              </div>

              {/* 메모리 정보 */}
              <div className="p-6 bg-white rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">메모리 사용량</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">사용 중:</span>
                    <span className="font-medium">{health.checks.memory.used} {health.checks.memory.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">전체:</span>
                    <span className="font-medium">{health.checks.memory.total} {health.checks.memory.unit}</span>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(health.checks.memory.used / health.checks.memory.total) * 100}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((health.checks.memory.used / health.checks.memory.total) * 100)}% 사용 중
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 체크 항목 */}
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">상태 체크</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">서버</span>
                  <span className={getCheckStatusColor(health.checks.server)}>
                    {health.checks.server === 'ok' ? '✅ 정상' : '❌ 오류'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">데이터베이스</span>
                  <span className={getCheckStatusColor(health.checks.database)}>
                    {health.checks.database === 'ok' ? '✅ 정상' : health.checks.database === 'error' ? '❌ 오류' : '⚠️ 확인 불가'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {loading && !health && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">상태 확인 중...</p>
          </div>
        )}

        {/* 자동 갱신 안내 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>이 페이지는 30초마다 자동으로 갱신됩니다.</p>
        </div>
      </div>
    </div>
  );
}

