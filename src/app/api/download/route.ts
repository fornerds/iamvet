import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createErrorResponse } from "@/lib/utils";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME?.replace('arn:aws:s3:::', '') || 
                   process.env.AWS_S3_BUCKET || 'iamvet';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json(
        createErrorResponse("파일 URL이 필요합니다"),
        { status: 400 }
      );
    }

    // S3 key 추출
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes(BUCKET_NAME));
    
    if (bucketIndex === -1) {
      return NextResponse.json(
        createErrorResponse("유효하지 않은 파일 URL입니다"),
        { status: 400 }
      );
    }

    const key = urlParts.slice(bucketIndex + 1).join('/');

    // S3에서 파일 메타데이터 가져오기
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const metadata = await s3Client.send(headCommand);
    
    // 원본 파일명 복원
    const originalFileName = metadata.Metadata?.['original-filename'] 
      ? decodeURIComponent(metadata.Metadata['original-filename'])
      : key.split('/').pop() || 'download';

    // S3에서 파일 스트림 가져오기
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      return NextResponse.json(
        createErrorResponse("파일을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    // 파일 스트림을 Buffer로 변환
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // UTF-8 인코딩된 파일명으로 응답 헤더 설정
    const encodedFileName = encodeURIComponent(originalFileName);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("파일 다운로드 오류:", error);
    return NextResponse.json(
      createErrorResponse("파일 다운로드 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}