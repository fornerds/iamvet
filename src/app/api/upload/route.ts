import { uploadFile } from "@/lib/s3";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";

export const POST = withAdminVerification(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(
        createErrorResponse("파일이 선택되지 않았습니다"),
        { status: 400 }
      );
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        createErrorResponse("파일 크기는 10MB를 초과할 수 없습니다"),
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        createErrorResponse("지원하지 않는 파일 형식입니다"),
        { status: 400 }
      );
    }

    const fileUrl = await uploadFile(file, folder);

    return NextResponse.json(
      createApiResponse("success", "파일 업로드 성공", {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })
    );
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      createErrorResponse("파일 업로드 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
});
