import { NextRequest, NextResponse } from "next/server";
import { createApiResponse, createErrorResponse } from "@/lib/utils";
import { withAdminVerification } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export const POST = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = (request as any).user;
      const resolvedParams = await params;
      const transferId = resolvedParams.id;

      console.log(
        "Transfer like POST - User:",
        user.userId,
        "Transfer:",
        transferId
      );

      const transfer = await (prisma as any).transfers.findUnique({
        where: { id: transferId },
        select: {
          id: true,
          title: true,
          status: true,
          deletedAt: true,
        },
      });

      if (!transfer) {
        console.log("Transfer not found:", transferId);
        return NextResponse.json(
          createErrorResponse("양도양수 게시글을 찾을 수 없습니다."),
          { status: 404 }
        );
      }

      console.log("Transfer found:", transfer.id);

      const existingLike = await (prisma as any).transfer_likes.findUnique({
        where: {
          userId_transferId: {
            userId: user.userId,
            transferId: transferId,
          },
        },
      });

      console.log("Existing like:", existingLike);

      if (existingLike) {
        console.log(
          "Already liked by user:",
          user.userId,
          "transfer:",
          transferId
        );
        return NextResponse.json(
          createErrorResponse("이미 좋아요한 양도양수 게시글입니다."),
          { status: 400 }
        );
      }

      console.log("Creating new like...");
      
      await (prisma as any).transfer_likes.create({
        data: {
          id: `like_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 11)}`,
          userId: user.userId,
          transferId: transferId,
        },
      });

      console.log("Like created successfully");
      return NextResponse.json(
        createApiResponse("success", "좋아요가 추가되었습니다."),
        { status: 201 }
      );
    } catch (error) {
      console.error("Transfer like error:", error);
      return NextResponse.json(
        createErrorResponse("좋아요 처리 중 오류가 발생했습니다."),
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAdminVerification(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const user = (request as any).user;
      const resolvedParams = await params;
      const transferId = resolvedParams.id;

      console.log(
        "Transfer like DELETE - User:",
        user.userId,
        "Transfer:",
        transferId
      );

      const existingLike = await (prisma as any).transfer_likes.findUnique({
        where: {
          userId_transferId: {
            userId: user.userId,
            transferId: transferId,
          },
        },
      });

      console.log("Existing like for delete:", existingLike);

      if (!existingLike) {
        console.log(
          "No existing like found for user:",
          user.userId,
          "transfer:",
          transferId
        );
        return NextResponse.json(
          createErrorResponse("좋아요하지 않은 양도양수 게시글입니다."),
          { status: 400 }
        );
      }

      console.log("Deleting like...");
      await (prisma as any).transfer_likes.delete({
        where: {
          userId_transferId: {
            userId: user.userId,
            transferId: transferId,
          },
        },
      });

      console.log("Like deleted successfully");
      return NextResponse.json(
        createApiResponse("success", "좋아요가 취소되었습니다.")
      );
    } catch (error) {
      console.error("Transfer unlike error:", error);
      return NextResponse.json(
        createErrorResponse("좋아요 취소 중 오류가 발생했습니다."),
        { status: 500 }
      );
    }
  }
);
