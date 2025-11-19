"use server";

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectAclCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";

// S3 클라이언트 설정
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// 버킷 이름에서 ARN 부분 제거
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME?.replace('arn:aws:s3:::', '') || 
                   process.env.AWS_S3_BUCKET || 'iamvet';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Server-side S3 key extraction helper (async for server actions compliance)
export async function extractS3Key(url: string): Promise<string | null> {
  try {
    const publicBucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || BUCKET_NAME;
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes(publicBucketName));
    
    if (bucketIndex === -1) {
      return null;
    }

    return urlParts.slice(bucketIndex + 1).join('/');
  } catch {
    return null;
  }
}

// 이미지 업로드 (File 객체로부터)
export async function uploadImage(
  file: File,
  folder: 'profiles' | 'licenses' | 'hospitals' | 'resumes' | 'transfers' | 'advertisements' | 'lecture-materials' | 'hospital-facilities' | 'announcement-images' = 'profiles'
): Promise<UploadResult> {
  console.log('[S3] uploadImage 시작:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    folder
  });
  
  try {
    // 파일 확장자 확인
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: '지원되는 이미지 형식이 아닙니다. (JPEG, PNG, WebP, GIF만 지원)',
      };
    }

    // 파일 크기 확인 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: '파일 크기가 너무 큽니다. (10MB 이하만 지원)',
      };
    }

    // 고유한 파일명 생성 (안전한 파일명 사용)
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const safeFileName = `${folder}/${createId()}.${fileExtension}`;
    
    console.log('[S3] 파일명 생성:', {
      originalName: file.name,
      extension: fileExtension,
      safeName: safeFileName
    });

    // 파일을 Buffer로 변환
    const buffer = Buffer.from(await file.arrayBuffer());

    return await uploadToS3(safeFileName, buffer, file.type, undefined, file.name);
  } catch (error) {
    console.error('[S3] uploadImage catch 블록:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fileName: file.name,
      fileSize: file.size,
      folder
    });
    return handleS3Error(error, '이미지 업로드 중 오류가 발생했습니다.');
  }
}

// 이미지 업로드 (Base64 문자열로부터)
export async function uploadImageFromBase64(
  base64Data: string,
  folder: 'profiles' | 'licenses' | 'hospitals' | 'resumes' | 'transfers' | 'advertisements' | 'lecture-materials' | 'hospital-facilities' | 'announcement-images' = 'profiles',
  fileName?: string
): Promise<UploadResult> {
  try {
    // base64 데이터에서 MIME 타입과 데이터 분리
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return {
        success: false,
        error: '잘못된 base64 이미지 데이터입니다.',
      };
    }

    const mimeType = matches[1];
    const base64 = matches[2];

    // 지원되는 이미지 타입 확인
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return {
        success: false,
        error: '지원되는 이미지 형식이 아닙니다. (JPEG, PNG, WebP만 지원)',
      };
    }

    // Buffer로 변환
    const buffer = Buffer.from(base64, 'base64');

    // 파일 크기 확인 (5MB 제한)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return {
        success: false,
        error: '파일 크기가 너무 큽니다. (5MB 이하만 지원)',
      };
    }

    // 파일 확장자 결정
    const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    const generatedFileName = fileName || `${folder}/${createId()}.${extension}`;

    return await uploadToS3(generatedFileName, buffer, mimeType);
  } catch (error) {
    return handleS3Error(error, '이미지 업로드 중 오류가 발생했습니다.');
  }
}

// 일반 파일 업로드 (src/lib/upload.ts 대체용)
export async function uploadFile(
  file: File,
  folder: string
): Promise<string> {
  try {
    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}/${createId()}.${fileExtension}`;

    const buffer = await file.arrayBuffer();

    const result = await uploadToS3(fileName, new Uint8Array(buffer), file.type, 'inline', file.name);
    
    if (!result.success) {
      throw new Error(result.error || '파일 업로드에 실패했습니다');
    }

    return result.url!;
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error("파일 업로드에 실패했습니다");
  }
}

// 이미지 삭제
export async function deleteImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await extractS3Key(imageUrl);
    
    if (!key) {
      return {
        success: false,
        error: '잘못된 이미지 URL입니다.',
      };
    }

    // S3에서 삭제
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: '이미지 삭제 중 오류가 발생했습니다.',
    };
  }
}

// 서명된 URL 생성 (private 파일 접근 시 사용)
export async function getSignedImageUrl(
  key: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      success: true,
      url: signedUrl,
    };
  } catch (error) {
    console.error('Get signed URL error:', error);
    return {
      success: false,
      error: '서명된 URL 생성 중 오류가 발생했습니다.',
    };
  }
}

// 기존 이미지를 public으로 변경
export async function makeImagePublic(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = await extractS3Key(imageUrl);
    
    if (!key) {
      return {
        success: false,
        error: '잘못된 이미지 URL입니다.',
      };
    }

    // ACL을 public-read로 변경
    const command = new PutObjectAclCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('Make image public error:', error);
    return {
      success: false,
      error: '이미지 공개 설정 중 오류가 발생했습니다.',
    };
  }
}

// 내부 헬퍼 함수들

async function uploadToS3(
  key: string, 
  body: Buffer | Uint8Array, 
  contentType: string, 
  contentDisposition?: string,
  originalFileName?: string
): Promise<UploadResult> {
  try {
    const commandParams: any = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    };

    // 원본 파일명이 있으면 메타데이터에 저장
    if (originalFileName) {
      const encodedOriginalFileName = encodeURIComponent(originalFileName);
      commandParams.Metadata = {
        'original-filename': encodedOriginalFileName,
      };
      commandParams.ContentDisposition = `attachment; filename*=UTF-8''${encodedOriginalFileName}`;
    }

    // contentDisposition이 별도로 지정되어 있으면 우선 적용
    if (contentDisposition) {
      commandParams.ContentDisposition = contentDisposition;
    }

    const command = new PutObjectCommand(commandParams);

    console.log('[S3] S3 업로드 명령 실행 중...', {
      bucket: BUCKET_NAME,
      key,
      contentType,
      bodySize: body.length
    });

    const result = await s3Client.send(command);
    console.log('[S3] S3 업로드 성공:', result);

    // S3 URL 생성
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    console.log('[S3] 최종 URL 생성:', url);
    
    return {
      success: true,
      url,
    };
  } catch (error) {
    console.error('[S3] 업로드 에러 상세:', error);
    throw error;
  }
}

function handleS3Error(error: unknown, defaultMessage: string): UploadResult {
  console.error('[S3] 에러 처리:', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : undefined,
  });
  
  // AWS SDK 특정 에러 처리
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    if (error.name === 'CredentialsProviderError') {
      errorMessage = 'AWS 자격 증명 오류: 환경 변수를 확인해주세요.';
    } else if (error.name === 'AccessDenied') {
      errorMessage = 'S3 접근 권한이 없습니다. IAM 설정을 확인해주세요.';
    } else if (error.name === 'NoSuchBucket') {
      errorMessage = 'S3 버킷을 찾을 수 없습니다.';
    } else if (error.message.includes('Network')) {
      errorMessage = '네트워크 오류: 인터넷 연결을 확인해주세요.';
    } else {
      errorMessage = `업로드 오류: ${error.message}`;
    }
  }
  
  return {
    success: false,
    error: errorMessage,
  };
}