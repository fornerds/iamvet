import { NextRequest, NextResponse } from "next/server";
import { withAdminVerification } from "@/lib/middleware";
import { createApiResponse, createErrorResponse, generateUserIdentifier } from "@/lib/utils";
import {
  getTransferById,
  getTransferByIdForEdit,
  updateTransfer,
  deleteTransfer,
  incrementTransferViewCount,
  getRelatedTransfers,
} from "@/lib/database";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const transferId = params.id;

    // 양도양수 게시글 조회
    const transfer = await getTransferById(transferId);
    if (!transfer) {
      return NextResponse.json(
        createErrorResponse("양도양수 게시글을 찾을 수 없습니다"),
        { status: 404 }
      );
    }

    // 사용자 정보 확인 (선택적)
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // 조회수 증가 (회원/비회원 모두 처리, 24시간 중복 방지)
    const userIdentifier = generateUserIdentifier(request, userId);
    await incrementTransferViewCount(transferId, userIdentifier, userId);

    // 좋아요 여부 확인 (로그인한 경우에만)
    let isLiked = false;
    if (userId) {
      const likeCheck = await (prisma as any).transferLike.findUnique({
        where: {
          userId_transferId: {
            userId: userId,
            transferId: transferId
          }
        }
      });
      isLiked = !!likeCheck;
    }

    // 관련 양도양수 게시글
    const relatedTransfersRaw = await getRelatedTransfers(transferId, 5);
    
    // 관련 양도양수 게시글의 좋아요 정보 조회
    let relatedTransferLikes: string[] = [];
    if (userId && relatedTransfersRaw.length > 0) {
      const relatedTransferIds = relatedTransfersRaw.map((t: any) => t.id);
      const likes = await (prisma as any).transferLike.findMany({
        where: {
          userId: userId,
          transferId: { in: relatedTransferIds },
        },
        select: {
          transferId: true,
        },
      });
      relatedTransferLikes = likes.map((like: any) => like.transferId);
    }

    // 관련 양도양수 데이터 변환
    const relatedTransfers = relatedTransfersRaw.map((t: any) => {
      // images 파싱
      let images = [];
      try {
        if (t.images) {
          images = typeof t.images === "string" ? JSON.parse(t.images) : t.images;
        }
      } catch (error) {
        console.error("Error parsing images for related transfer:", t.id, error);
        images = [];
      }

      return {
        id: t.id,
        title: t.title,
        location: t.location || `${t.sido || ""} ${t.sigungu || ""}`.trim(),
        hospitalType: t.category || "", // category를 hospitalType으로 전달 (병원양도, 기계장치, 의료장비, 인테리어)
        area: Number(t.area) || 0,
        price: t.price ? (typeof t.price === "number" ? t.price.toString() : t.price) : null,
        category: t.category,
        categories: t.category, // TransferCard에서 사용
        images: images,
        viewCount: Number(t.views) || 0,
        views: Number(t.views) || 0, // 호환성을 위해 둘 다 제공
        createdAt: t.createdAt,
        isLiked: relatedTransferLikes.includes(t.id),
        isBookmarked: relatedTransferLikes.includes(t.id),
      };
    });

    const transferDetail = {
      ...transfer,
      relatedTransfers,
      isLiked: isLiked,
    };

    return NextResponse.json(
      createApiResponse("success", "양도양수 게시글 조회 성공", transferDetail)
    );
  } catch (error) {
    console.error("Transfer detail error:", error);
    return NextResponse.json(
      createErrorResponse("양도양수 게시글 조회 중 오류가 발생했습니다"),
      { status: 500 }
    );
  }
}

export const PUT = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const transferId = params.id;
      const updateData = await request.json();

      // 양도양수 게시글 존재 및 권한 확인
      const transfer = await getTransferById(transferId);
      if (!transfer) {
        return NextResponse.json(
          createErrorResponse("양도양수 게시글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (transfer.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 게시글을 수정할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 게시글 수정
      const updatedTransfer = await updateTransfer(transferId, updateData);

      return NextResponse.json(
        createApiResponse(
          "success",
          "양도양수 게시글이 수정되었습니다",
          updatedTransfer
        )
      );
    } catch (error) {
      console.error("Transfer update error:", error);
      return NextResponse.json(
        createErrorResponse("양도양수 게시글 수정 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (request: NextRequest, context: RouteContext) => {
    try {
      const user = (request as any).user;
      const params = await context.params;
      const transferId = params.id;

      // 양도양수 게시글 존재 및 권한 확인
      const transfer = await getTransferById(transferId);
      if (!transfer) {
        return NextResponse.json(
          createErrorResponse("양도양수 게시글을 찾을 수 없습니다"),
          { status: 404 }
        );
      }

      if (transfer.userId !== user.userId) {
        return NextResponse.json(
          createErrorResponse("이 게시글을 삭제할 권한이 없습니다"),
          { status: 403 }
        );
      }

      // 게시글 삭제
      await deleteTransfer(transferId);

      return NextResponse.json(
        createApiResponse("success", "양도양수 게시글이 삭제되었습니다")
      );
    } catch (error) {
      console.error("Transfer delete error:", error);
      return NextResponse.json(
        createErrorResponse("양도양수 게시글 삭제 중 오류가 발생했습니다"),
        { status: 500 }
      );
    }
  }
);
