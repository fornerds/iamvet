import { Metadata } from "next";
import { generateJobMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const defaultMetadata = {
    title: "채용공고 상세",
    description: "IAMVET 수의사 채용공고 상세 정보를 확인하세요.",
  };

  try {
    const { id } = await params;

    // API에서 채용공고 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    
    // 서버 사이드에서는 상대 경로를 사용하거나 절대 URL을 안전하게 구성
    let baseUrl: string;
    if (process.env.NODE_ENV === "production") {
      baseUrl = getBaseDomain();
    } else {
      // 개발 환경에서는 상대 경로 사용 (서버 내부 요청)
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    }

    try {
      // 타임아웃을 위한 AbortController 생성
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/jobs/${id}`, {
        next: { revalidate: 3600 },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch job ${id}: ${response.status}`);
        return defaultMetadata;
      }

      const jobData = await response.json();

      // API 응답 구조 확인
      const job = jobData.data?.job || jobData.job || jobData;

      if (!job || !job.title) {
        return defaultMetadata;
      }

      const metadata = generateJobMetadata({
        title: job.title || "수의사 채용",
        hospitalName:
          job.hospital?.name || job.hospitalName || "동물병원",
        location: job.location || job.hospital?.location || "전국",
        description:
          job.description ||
          `${job.hospital?.name || "동물병원"}에서 ${
            job.title || "수의사"
          } 직무를 담당할 인재를 찾고 있습니다.`,
      });

      // 실제 페이지 URL로 업데이트
      const baseDomain = getBaseDomain();
      const actualUrl = `${baseDomain}/jobs/${id}`;
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
    } catch (fetchError) {
      // fetch 실패 시 기본 메타데이터 반환
      console.warn(`Fetch error for job ${id}:`, fetchError);
      return defaultMetadata;
    }
  } catch (error) {
    console.error("Error generating job metadata:", error);
    return defaultMetadata;
  }
}

export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
