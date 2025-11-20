import { Metadata } from "next";
import { generateLectureMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    // API에서 강의 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? getBaseDomain()
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/lectures/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "강의 상세",
        description: "IAMVET 수의학 전문 강의 영상을 시청하세요.",
      };
    }

    const lectureData = await response.json();

    // 강의 시간 포맷팅
    const formatDuration = (duration: string | number) => {
      if (!duration) return "강의 영상";
      if (typeof duration === "number") {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
      }
      return duration;
    };

    const metadata = generateLectureMetadata({
      title: lectureData.title || "수의학 강의",
      instructor: lectureData.instructor || "전문 강사",
      duration: formatDuration(lectureData.duration),
      description:
        lectureData.description ||
        `${lectureData.instructor || "전문 강사"}의 ${
          lectureData.title || "수의학 강의"
        } 영상입니다.`,
    });

    // 실제 페이지 URL로 업데이트
    const baseDomain = getBaseDomain();
    const actualUrl = `${baseDomain}/lectures/${id}`;
    return {
      ...metadata,
      alternates: {
        canonical: actualUrl,
      },
      openGraph: {
        ...metadata.openGraph,
        url: actualUrl,
      },
    };
  } catch (error) {
    console.error("Error generating lecture metadata:", error);
    return {
      title: "강의 상세",
      description: "IAMVET 수의학 전문 강의 영상을 시청하세요.",
    };
  }
}

export default function LectureDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
