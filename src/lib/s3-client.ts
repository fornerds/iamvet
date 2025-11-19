// S3 관련 클라이언트 사이드 유틸리티 함수들

// 환경 변수에서 버킷 이름 가져오기
const getBucketName = () => {
  return process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'iamvet';
};

// 이미지 URL이 S3 URL인지 확인하는 헬퍼 함수
export function isS3Url(url: string): boolean {
  const bucketName = getBucketName();
  return url.includes(bucketName) && url.includes('amazonaws.com');
}

// S3 키를 URL에서 추출하는 헬퍼 함수
export function extractS3Key(url: string): string | null {
  try {
    const bucketName = getBucketName();
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes(bucketName));
    
    if (bucketIndex === -1) {
      return null;
    }

    return urlParts.slice(bucketIndex + 1).join('/');
  } catch {
    return null;
  }
}

// S3 URL 생성 헬퍼
export function generateS3Url(key: string): string {
  const bucketName = getBucketName();
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
}

// 파일 타입 검증
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원되는 이미지 형식이 아닙니다. (JPEG, PNG, WebP만 지원)',
    };
  }

  // 파일 크기 확인 (5MB 제한)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: '파일 크기가 너무 큽니다. (5MB 이하만 지원)',
    };
  }

  return { valid: true };
}

// 이미지 미리보기 URL 생성
export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

// 이미지 미리보기 URL 정리
export function revokeImagePreviewUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Failed to revoke object URL:', error);
  }
}

// Base64를 File 객체로 변환
export function base64ToFile(base64: string, filename: string): File | null {
  try {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
  } catch (error) {
    console.error('Base64 to File conversion error:', error);
    return null;
  }
}