import { Metadata } from "next";
import { generateJobMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    // API에서 채용공고 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? getBaseDomain()
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/jobs/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "채용공고 상세",
        description: "IAMVET 수의사 채용공고 상세 정보를 확인하세요.",
      };
    }

    const jobData = await response.json();

    const metadata = generateJobMetadata({
      title: jobData.title || "수의사 채용",
      hospitalName:
        jobData.hospital?.name || jobData.hospitalName || "동물병원",
      location: jobData.location || jobData.hospital?.location || "전국",
      description:
        jobData.description ||
        `${jobData.hospital?.name || "동물병원"}에서 ${
          jobData.title || "수의사"
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
  } catch (error) {
    console.error("Error generating job metadata:", error);
    return {
      title: "채용공고 상세",
      description: "IAMVET 수의사 채용공고 상세 정보를 확인하세요.",
    };
  }
}

export default function JobDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
