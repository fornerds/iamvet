import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationBatchStatus } from "@prisma/client";
import { getCurrentUser } from "@/actions/auth";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  try {
    // 인증은 선택사항 (비회원도 접근 가능)
    const userResult = await getCurrentUser();
    const user = userResult.success ? userResult.user : null;

    // 발송된 공지사항만 조회 (notification_batches가 있고 COMPLETED 상태인 것)
    const sentBatches = await prisma.notification_batches.findMany({
      where: {
        status: NotificationBatchStatus.COMPLETED,
      },
      include: {
        announcements: {
          include: {
            notifications: {
              select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            users: {
              select: {
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
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // 중복 제거: 같은 announcement는 하나만 표시
    const uniqueAnnouncements = new Map();
    for (const batch of sentBatches) {
      const announcement = batch.announcements;
      if (announcement && !uniqueAnnouncements.has(announcement.id)) {
        uniqueAnnouncements.set(announcement.id, announcement);
      }
    }

    // 사용자가 로그인한 경우 읽음 상태 확인
    const transformedAnnouncements = await Promise.all(
      Array.from(uniqueAnnouncements.values()).map(async (announcement) => {
        let isRead = false;
        if (user) {
          const userNotification = await prisma.notifications.findFirst({
            where: {
              type: NotificationType.ANNOUNCEMENT,
              recipientId: user.id,
              title: announcement.notifications.title,
            },
            select: {
              isRead: true,
            },
          });
          isRead = userNotification?.isRead || false;
        }

        // content에서 이미지 정보 파싱 (JSON 형태로 저장된 경우)
        let parsedContent = announcement.notifications.content;
        let notificationImages: string[] = [];
        
        try {
          const contentData = JSON.parse(announcement.notifications.content);
          if (contentData.text && contentData.images) {
            parsedContent = contentData.text;
            notificationImages = contentData.images;
          }
        } catch (e) {
          // JSON이 아닌 경우 원본 content 사용
          parsedContent = announcement.notifications.content;
        }

        // announcement 이미지와 notification에서 파싱한 이미지 합치기
        const allImages = [
          ...(announcement.images || []),
          ...notificationImages
        ].filter(img => img && img.trim() !== '');

        // 중복 제거
        const uniqueImages = Array.from(new Set(allImages));

        return {
          id: announcement.notifications.id,
          title: announcement.notifications.title,
          content: parsedContent,
          createdAt: announcement.notifications.createdAt,
          updatedAt: announcement.notifications.updatedAt,
          isRead,
          announcements: {
            priority: announcement.priority,
            targetUserTypes: announcement.targetUserTypes,
            expiresAt: announcement.expiresAt,
            images: uniqueImages,
          },
          users_notifications_senderIdTousers: {
            realName: announcement.users?.veterinarians?.realName ||
                      announcement.users?.veterinary_students?.realName ||
                      announcement.users?.hospitals?.representativeName ||
                      "관리자",
            nickname: announcement.users?.veterinarians?.nickname || null,
          },
        };
      })
    );

    // 최신순 정렬 (읽지 않은 것 우선)
    transformedAnnouncements.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 데이터가 없는 경우 빈 배열 반환
    return NextResponse.json({
      success: true,
      data: transformedAnnouncements || [],
    });
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

// 임시 공지사항 생성
export async function POST(req: NextRequest) {
  try {
    // 관리자 계정 찾기 (임시로 첫 번째 사용자 사용)
    const adminUser = await prisma.users.findFirst();
    
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "No admin user found" },
        { status: 404 }
      );
    }

    // 임시 공지사항 데이터
    const announcements = [
      {
        title: "[시스템 점검 안내] 2025년 1월 15일 서비스 점검 예정",
        content: "더 나은 서비스 제공을 위해 시스템 점검을 진행합니다. 점검 시간 동안 서비스 이용이 제한될 수 있습니다. 양해 부탁드립니다.\n\n점검 시간: 2025년 1월 15일 오전 2시 ~ 4시 (약 2시간)",
        priority: "HIGH" as const,
      },
      {
        title: "[신규 기능 안내] 채용공고 알림 기능이 추가되었습니다",
        content: "이제 관심있는 병원의 채용공고가 올라오면 실시간으로 알림을 받아볼 수 있습니다. 마이페이지에서 알림 설정을 확인해주세요.",
        priority: "NORMAL" as const,
      },
      {
        title: "[이벤트] 신규 가입 수의사 대상 프리미엄 서비스 1개월 무료",
        content: "IAMVET 서비스에 새롭게 가입하신 수의사 회원님들께 프리미엄 서비스를 1개월간 무료로 제공합니다. 지금 바로 프리미엄 기능을 체험해보세요!",
        priority: "LOW" as const,
      },
    ];

    // 모든 사용자 조회
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        userType: true,
      },
    });

    // 공지사항 생성
    const createdAnnouncements = [];
    for (const announcement of announcements) {
      // 각 사용자에게 알림 생성
      for (const user of allUsers) {
        const notificationId = nanoid();
        const announcementId = nanoid();
        
        // 먼저 notification 생성  
        const notification = await prisma.notifications.create({
          data: {
            id: notificationId,
            type: NotificationType.ANNOUNCEMENT,
            recipientId: user.id,
            recipientType: user.userType,
            senderId: adminUser.id,
            title: announcement.title,
            content: announcement.content,
            updatedAt: new Date(),
          },
        });

        // 그 다음 announcement 생성
        const announcementRecord = await prisma.announcements.create({
          data: {
            id: announcementId,
            notificationId: notificationId,
            targetUserTypes: ["VETERINARIAN", "HOSPITAL", "VETERINARY_STUDENT"],
            priority: announcement.priority,
            createdBy: adminUser.id,
          },
        });

        createdAnnouncements.push({ notification, announcement: announcementRecord });
      }
    }

    return NextResponse.json({
      success: true,
      data: createdAnnouncements,
      message: `Created ${createdAnnouncements.length} announcements`,
    });
  } catch (error) {
    console.error("Failed to create announcements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create announcements" },
      { status: 500 }
    );
  }
}