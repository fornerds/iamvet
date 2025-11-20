/**
 * 메타데이터 생성을 위한 유틸리티 함수
 * www와 non-www 도메인을 모두 지원
 */

/**
 * 기본 도메인을 반환합니다 (www 없이)
 */
export function getBaseDomain(): string {
  // 환경 변수에서 도메인 가져오기
  const envDomain = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  
  if (envDomain) {
    // 환경 변수에서 www 제거
    return envDomain.replace(/^https?:\/\/(www\.)?/, 'https://');
  }
  
  // 기본값
  return 'https://iam-vet.com';
}

/**
 * www와 non-www를 모두 포함한 도메인 배열 반환
 */
export function getAllDomains(): string[] {
  const baseDomain = getBaseDomain();
  const domainWithoutProtocol = baseDomain.replace(/^https?:\/\//, '');
  const domainWithoutWww = domainWithoutProtocol.replace(/^www\./, '');
  
  return [
    `https://${domainWithoutWww}`,
    `https://www.${domainWithoutWww}`,
  ];
}

/**
 * 요청된 호스트에 따라 적절한 도메인 반환
 * @param host 요청된 호스트 (예: 'iam-vet.com' 또는 'www.iam-vet.com')
 */
export function getDomainForHost(host?: string): string {
  if (!host) {
    return getBaseDomain();
  }
  
  // www가 있으면 그대로, 없으면 non-www 반환
  if (host.startsWith('www.')) {
    return `https://${host}`;
  }
  
  return `https://${host}`;
}

/**
 * Open Graph 이미지 URL 생성 (www와 non-www 모두 지원)
 */
export function getOpenGraphImageUrl(host?: string): string {
  const domain = host ? getDomainForHost(host) : getBaseDomain();
  return `${domain}/opengraph.png`;
}

