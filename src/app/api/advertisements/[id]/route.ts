import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/admin-auth";
import { deleteImage } from "@/lib/s3";
import { isS3Url } from "@/lib/s3-client";

// GET: 특정 광고 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const advertisement = await (prisma as any).advertisements.findUnique({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        admin_users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 조회수 증가
    await (prisma as any).advertisements.update({
      where: { id: id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: advertisement,
    });
  } catch (error) {
    console.error("Failed to fetch advertisement:", error);
    return NextResponse.json(
      { success: false, message: "광고 조회 실패" },
      { status: 500 }
    );
  }
}

// PUT: 광고 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const admin = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const advertisement = await (prisma as any).advertisements.findUnique({
      where: { id: id },
    });

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 관리자는 모든 광고를 수정할 수 있음

    const body = await req.json();
    const {
      title,
      description,
      type,
      imageUrl,
      mobileImageUrl,
      linkUrl,
      startDate,
      endDate,
      targetAudience,
      buttonText,
      variant,
      isActive,
    } = body;

    // 이미지가 변경된 경우 기존 S3 이미지 삭제
    if (imageUrl !== advertisement.imageUrl && advertisement.imageUrl && isS3Url(advertisement.imageUrl)) {
      try {
        await deleteImage(advertisement.imageUrl);
      } catch (error) {
        console.error("Failed to delete old image:", error);
      }
    }

    // 모바일 이미지가 변경된 경우 기존 S3 이미지 삭제
    if (mobileImageUrl !== advertisement.mobileImageUrl && advertisement.mobileImageUrl && isS3Url(advertisement.mobileImageUrl)) {
      try {
        await deleteImage(advertisement.mobileImageUrl);
      } catch (error) {
        console.error("Failed to delete old mobile image:", error);
      }
    }

    const updatedAdvertisement = await (prisma as any).advertisements.update({
      where: { id: id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(mobileImageUrl !== undefined && { mobileImageUrl }),
        ...(linkUrl !== undefined && { linkUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(buttonText !== undefined && { buttonText }),
        ...(variant !== undefined && { variant }),
        updatedAt: new Date(),
      },
      include: {
        admin_users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAdvertisement,
    });
  } catch (error) {
    console.error("Failed to update advertisement:", error);
    return NextResponse.json(
      { success: false, message: "광고 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 광고 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const admin = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const advertisement = await (prisma as any).advertisements.findUnique({
      where: { id: id },
    });

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 관리자는 모든 광고를 삭제할 수 있음

    // S3 이미지 삭제
    if (advertisement.imageUrl && isS3Url(advertisement.imageUrl)) {
      try {
        await deleteImage(advertisement.imageUrl);
      } catch (error) {
        console.error("Failed to delete image:", error);
      }
    }

    // S3 모바일 이미지 삭제
    if (advertisement.mobileImageUrl && isS3Url(advertisement.mobileImageUrl)) {
      try {
        await deleteImage(advertisement.mobileImageUrl);
      } catch (error) {
        console.error("Failed to delete mobile image:", error);
      }
    }

    // Soft delete
    await (prisma as any).advertisements.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "광고가 삭제되었습니다",
    });
  } catch (error) {
    console.error("Failed to delete advertisement:", error);
    return NextResponse.json(
      { success: false, message: "광고 삭제 실패" },
      { status: 500 }
    );
  }
}

// PATCH: 광고 상태 토글
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const admin = await authenticateAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const advertisement = await (prisma as any).advertisements.findUnique({
      where: { id: id },
    });

    if (!advertisement) {
      return NextResponse.json(
        { success: false, message: "광고를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 관리자는 모든 광고를 토글할 수 있음

    const updatedAdvertisement = await (prisma as any).advertisements.update({
      where: { id: id },
      data: {
        isActive: !advertisement.isActive,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAdvertisement,
    });
  } catch (error) {
    console.error("Failed to toggle advertisement status:", error);
    return NextResponse.json(
      { success: false, message: "광고 상태 변경 실패" },
      { status: 500 }
    );
  }
}