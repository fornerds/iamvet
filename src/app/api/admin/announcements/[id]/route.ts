import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority, UserType, NotificationBatchStatus } from "@prisma/client";
import { verifyAdminToken } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = verifyAdminToken(req);
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, error: adminAuth.error || "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, content, images, priority, targetUsers } = body;
    const resolvedParams = await params;
    const announcementId = resolvedParams.id;

    // 공지사항 수정
    const result = await prisma.$transaction(async (tx) => {
      // 1. announcement 정보 조회
      const announcement = await tx.announcements.findUnique({
        where: { id: announcementId },
        include: { notifications: true },
      });

      if (!announcement) {
        throw new Error("공지사항을 찾을 수 없습니다.");
      }

      // 2. notification 업데이트
      const updatedNotification = await tx.notifications.update({
        where: { id: announcement.notificationId },
        data: {
          title,
          content,
          updatedAt: new Date(),
        },
      });

      // 3. announcement 업데이트
      const updatedAnnouncement = await tx.announcements.update({
        where: { id: announcementId },
        data: {
          targetUserTypes: Array.isArray(targetUsers) ? targetUsers : [targetUsers],
          priority: priority as NotificationPriority,
          images: Array.isArray(images) ? images.filter(img => img !== null && img !== undefined) : [],
        } as any,
      });

      return { notification: updatedNotification, announcement: updatedAnnouncement };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.announcement.id,
        title,
        content,
        priority,
        targetUsers: result.announcement.targetUserTypes,
        updatedAt: result.notification.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = verifyAdminToken(req);
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, error: adminAuth.error || "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const announcementId = resolvedParams.id;

    // 트랜잭션으로 관련 데이터 함께 삭제
    await prisma.$transaction(async (tx) => {
      try {
        // 1. 공지사항 정보 조회 (notification title 확인용)
        const announcement = await tx.announcements.findUnique({
          where: { id: announcementId },
          include: { 
            notifications: true,
            notification_batches: true,
          },
        });

        if (!announcement) {
          throw new Error("공지사항을 찾을 수 없습니다.");
        }

        console.log("Deleting announcement:", {
          id: announcementId,
          hasNotifications: !!announcement.notifications,
          hasBatches: announcement.notification_batches?.length || 0,
        });

        // 2. notification_batches 먼저 삭제 (announcements를 참조하므로)
        if (announcement.notification_batches && announcement.notification_batches.length > 0) {
          console.log("Deleting notification_batches:", announcement.notification_batches.length);
          await tx.notification_batches.deleteMany({
            where: { announcementId },
          });
        }

        // 3. announcements 삭제
        // (notifications는 cascade로 자동 삭제됨)
        // 단, announcements의 notificationId를 참조하는 notification을 먼저 삭제해야 함
        console.log("Deleting announcement:", announcementId);
        
        // announcements를 삭제하면 notifications도 cascade로 삭제되지만,
        // 개별로 발송된 notification들은 별도로 삭제해야 함
        if (announcement.notifications) {
          const notificationTitle = announcement.notifications.title;
          const senderId = announcement.createdBy;
          const notificationId = announcement.notificationId;

          console.log("Deleting notifications:", { title: notificationTitle, senderId, notificationId });

          // 1) announcements의 notificationId를 참조하는 notification 삭제 (cascade로 announcements도 삭제됨)
          // 하지만 이렇게 하면 announcements가 먼저 삭제되어서 문제가 될 수 있음
          // 따라서 개별 notification만 먼저 삭제하고, announcements의 notification은 나중에 삭제
          
          // 같은 제목과 발신자로 생성된 모든 notification 삭제 (announcements의 notificationId 제외)
          const deletedCount = await tx.notifications.deleteMany({
            where: {
              type: NotificationType.ANNOUNCEMENT,
              senderId: senderId,
              title: notificationTitle,
              id: {
                not: notificationId, // announcements의 notificationId는 제외
              },
            },
          });

          console.log("Deleted notifications count:", deletedCount.count);

          // 2) announcements의 notification 삭제 (이것이 cascade로 announcements도 삭제함)
          await tx.notifications.delete({
            where: { id: notificationId },
          });
        } else {
          // notification이 없는 경우 (드래프트 상태일 수 있음)
          await tx.announcements.delete({
            where: { id: announcementId },
          });
        }

        console.log("Announcement deleted successfully");
      } catch (txError: any) {
        console.error("Transaction error:", txError);
        throw txError;
      }
    });

    return NextResponse.json({
      success: true,
      message: "공지사항이 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("Failed to delete announcement:", error);
    const errorMessage = error?.message || "공지사항 삭제에 실패했습니다.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = verifyAdminToken(req);
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, error: adminAuth.error || "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body; // 'publish' 또는 'send'
    const resolvedParams = await params;
    const announcementId = resolvedParams.id;

    if (action === 'publish') {
      // 게시 상태로 변경 (실제 발송은 하지 않음)
      return NextResponse.json({
        success: true,
        message: "공지사항이 게시되었습니다.",
      });
    }

    if (action === 'send') {
      // 실제 사용자들에게 공지사항 발송
      const result = await prisma.$transaction(async (tx) => {
        // 1. 공지사항 정보 조회
        const announcement = await tx.announcements.findUnique({
          where: { id: announcementId },
          include: { notifications: true },
        });

        if (!announcement) {
          throw new Error("공지사항을 찾을 수 없습니다.");
        }

        // 2. 대상 사용자들 조회 (작성자 본인 제외)
        // 항상 전체 사용자에게 발송
        const targetUsers = await tx.users.findMany({
          where: {
            id: {
              not: announcement.createdBy // 작성자 본인 제외
            }
          },
          select: { id: true, userType: true },
        });

        // 3. 배치 기록 생성
        const batchId = nanoid();
        await tx.notification_batches.create({
          data: {
            id: batchId,
            announcementId: announcementId,
            totalRecipients: targetUsers.length,
            sentCount: 0,
            status: NotificationBatchStatus.PENDING,
            startedAt: new Date(),
          },
        });

        // 4. 각 대상 사용자에게 개별 알림 생성
        let sentCount = 0;
        const notifications = [];

        // announcement의 이미지 정보를 JSON 형태로 content에 포함
        const contentWithImages = JSON.stringify({
          text: announcement.notifications.content,
          images: announcement.images || []
        });

        for (const user of targetUsers) {
          try {
            const notificationId = nanoid();
            const notification = await tx.notifications.create({
              data: {
                id: notificationId,
                type: NotificationType.ANNOUNCEMENT,
                recipientId: user.id,
                recipientType: user.userType,
                senderId: announcement.createdBy,
                title: announcement.notifications.title,
                content: contentWithImages,
                updatedAt: new Date(),
              },
            });
            notifications.push(notification);
            sentCount++;
          } catch (error) {
            console.error(`Failed to send notification to user ${user.id}:`, error);
          }
        }

        // 5. 배치 상태 업데이트
        await tx.notification_batches.update({
          where: { id: batchId },
          data: {
            sentCount,
            status: sentCount === targetUsers.length ? NotificationBatchStatus.COMPLETED : NotificationBatchStatus.FAILED,
            completedAt: new Date(),
          },
        });

        return { sentCount, totalRecipients: targetUsers.length, notifications };
      });

      return NextResponse.json({
        success: true,
        message: "저장한 공지사항을 발송했습니다.",
        data: {
          sentCount: result.sentCount,
          totalRecipients: result.totalRecipients,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process announcement action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 }
    );
  }
}