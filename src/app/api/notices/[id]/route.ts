import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth";
import { NotificationType, NotificationBatchStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증은 선택사항 (비회원도 접근 가능)
    const userResult = await getCurrentUser();
    const user = userResult.success ? userResult.user : null;

    const { id } = await params;

    // 발송된 공지사항 중에서 찾기 (notification ID로 조회)
    // 먼저 notification을 찾고, 해당 notification이 발송된 공지사항인지 확인
    const notification = await prisma.notifications.findFirst({
      where: {
        id: id,
        type: NotificationType.ANNOUNCEMENT,
      },
      include: {
        users_notifications_senderIdTousers: {
          include: {
            veterinarians: {
              select: {
                realName: true,
                nickname: true,
              },
            },
            veterinary_students: {
              select: {
                realName: true,
                nickname: true,
              },
            },
            hospitals: {
              select: {
                representativeName: true,
                hospitalName: true,
              },
            },
          },
        },
        announcements: {
          include: {
            notification_batches: {
              where: {
                status: NotificationBatchStatus.COMPLETED,
              },
            },
          },
        },
      },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 발송된 공지사항인지 확인 (notification_batches가 있고 COMPLETED 상태인 것)
    if (!notification.announcements || notification.announcements.notification_batches.length === 0) {
      return NextResponse.json(
        { success: false, error: "아직 발송되지 않은 공지사항입니다." },
        { status: 404 }
      );
    }

    // 사용자가 로그인한 경우 읽음 상태 확인
    let isRead = false;
    if (user) {
      const userNotification = await prisma.notifications.findFirst({
        where: {
          type: NotificationType.ANNOUNCEMENT,
          recipientId: user.id,
          title: notification.title,
        },
        select: {
          isRead: true,
        },
      });
      isRead = userNotification?.isRead || false;
    }
    
    // content에서 이미지 정보 파싱 (JSON 형태로 저장된 경우)
    let parsedContent = notification.content;
    let images: string[] = [];
    
    try {
      const contentData = JSON.parse(notification.content);
      if (contentData.text && contentData.images) {
        parsedContent = contentData.text;
        images = contentData.images;
      }
    } catch (e) {
      // JSON이 아닌 경우 원본 content 사용
      parsedContent = notification.content;
    }

    // announcement에서 이미지가 있으면 그것도 포함
    if (notification.announcements?.images) {
      images = [...images, ...notification.announcements.images];
    }

    // 빈 이미지 필터링 및 중복 제거
    images = Array.from(new Set(images.filter(img => img && img.trim() !== '')));

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        title: notification.title,
        content: parsedContent,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        isRead,
        announcements: notification.announcements ? {
          priority: notification.announcements.priority,
          targetUserTypes: notification.announcements.targetUserTypes,
          expiresAt: notification.announcements.expiresAt,
          images: images,
        } : {
          priority: 'NORMAL',
          targetUserTypes: [],
          expiresAt: null,
          images: images,
        },
        users_notifications_senderIdTousers: {
          realName: notification.users_notifications_senderIdTousers?.veterinarians?.realName ||
                    notification.users_notifications_senderIdTousers?.veterinary_students?.realName ||
                    notification.users_notifications_senderIdTousers?.hospitals?.representativeName ||
                    "관리자",
          nickname: notification.users_notifications_senderIdTousers?.veterinarians?.nickname || null,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch announcement detail:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch announcement detail" },
      { status: 500 }
    );
  }
}
