import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdmin } from "@/lib/admin-auth";
import { generateId } from "@/lib/utils/id";
import { AdvertisementType, AdvertisementTargetAudience } from "@prisma/client";

// API Route의 파일 크기 제한 설정
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// GET: 광고 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type");
    const position = searchParams.get("position"); // 홈페이지용 position 파라미터 추가
    const status = searchParams.get("status");
    const isActive = searchParams.get("isActive"); // 홈페이지용 isActive 파라미터 추가
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;
    const now = new Date();
    // 테스트를 위해 현재 시간을 하루 뒤로 설정
    now.setDate(now.getDate() + 1);

    // 필터 조건 구성
    const where: any = {
      deletedAt: null,
    };

    // 홈페이지에서 활성화된 광고만 조회하는 경우
    if (isActive === 'true') {
      where.isActive = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
      console.log(`[API] Date filter applied - Current time: ${now.toISOString()}`);
    }

    // position 기반 필터링 (HERO, BANNER 등)
    if (position) {
      // position 파라미터를 AdvertisementType으로 매핑
      const typeMapping: { [key: string]: AdvertisementType } = {
        'HERO': 'HERO_BANNER',
        'BANNER': 'GENERAL_BANNER',
        'SIDEBAR': 'SIDE_AD',
        'CARD': 'AD_CARD',
        'DASHBOARD': 'DASHBOARD_BANNER'
      };
      const mappedType = typeMapping[position];
      if (mappedType) {
        where.type = mappedType;
      }
    } else if (type && type !== "ALL") {
      where.type = type as AdvertisementType;
    }

    if (status && !isActive) {
      switch (status) {
        case "ACTIVE":
          where.isActive = true;
          where.startDate = { lte: now };
          where.endDate = { gte: now };
          break;
        case "INACTIVE":
          where.isActive = false;
          break;
        case "EXPIRED":
          where.endDate = { lt: now };
          break;
        case "SCHEDULED":
          where.startDate = { gt: now };
          break;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // 데이터 조회
    const [advertisements, total] = await Promise.all([
      (prisma as any).advertisements.findMany({
        where,
        include: {
          admin_users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { startDate: "desc" }, // 최신 순서로 정렬 (display order가 없으므로)
          { createdAt: "desc" }
        ],
        skip: isActive === 'true' ? 0 : skip, // 홈페이지용 조회시 페이징 무시
        take: isActive === 'true' ? undefined : limit, // 홈페이지용 조회시 제한 없음
      }),
      (prisma as any).advertisements.count({ where }),
    ]);

    // 홈페이지용 간단한 응답 형식
    if (isActive === 'true') {
      console.log(`[API] Filtering result: Found ${advertisements.length} advertisements for position: ${position}`);
      console.log(`[API] Query conditions:`, { position, isActive, whereClause: where });
      return NextResponse.json({
        success: true,
        data: advertisements.map((ad: any) => ({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          mobileImageUrl: ad.mobileImageUrl,
          linkUrl: ad.linkUrl,
          variant: ad.variant,
          targetAudience: ad.targetAudience,
          order: 0, // 기본값
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: advertisements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch advertisements:", error);
    return NextResponse.json(
      { success: false, message: "광고 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 새 광고 생성
export async function POST(req: NextRequest) {
  try {
    console.log("[POST /api/advertisements] 관리자 인증 시작");
    console.log("[POST /api/advertisements] 쿠키:", req.cookies.get("admin-token")?.value ? "존재함" : "없음");
    
    const admin = await authenticateAdmin(req);
    console.log("[POST /api/advertisements] 인증 결과:", admin ? `성공 (${admin.email})` : "실패");
    
    if (!admin) {
      console.log("[POST /api/advertisements] 관리자 권한 없음");
      return NextResponse.json(
        { success: false, message: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

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
      isActive = true,
    } = body;

    // 필수 필드 검증
    if (!title || !description || !type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: "필수 정보를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    // 날짜 유효성 검증
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return NextResponse.json(
        { success: false, message: "종료일은 시작일 이후여야 합니다" },
        { status: 400 }
      );
    }

    const advertisement = await (prisma as any).advertisements.create({
      data: {
        id: generateId("ad"),
        title,
        description,
        type,
        imageUrl,
        mobileImageUrl,
        linkUrl,
        isActive,
        startDate: start,
        endDate: end,
        targetAudience: targetAudience || "ALL",
        buttonText,
        variant,
        createdBy: admin.id,
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
      data: advertisement,
    });
  } catch (error) {
    console.error("Failed to create advertisement:", error);
    return NextResponse.json(
      { success: false, message: "광고 생성 실패" },
      { status: 500 }
    );
  }
}