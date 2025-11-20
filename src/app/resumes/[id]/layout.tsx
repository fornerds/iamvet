import { Metadata } from "next";
import { generateResumeMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    // API에서 이력서 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? getBaseDomain()
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/resumes/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "이력서 상세",
        description: "IAMVET 수의사 이력서 상세 정보를 확인하세요.",
      };
    }

    const resumeData = await response.json();

    // 전문분야 정보 추출
    const specialties = [
      ...(resumeData.specialties || []),
      ...(resumeData.interests || []),
      ...(resumeData.skills || []),
    ].filter(Boolean);

    const metadata = generateResumeMetadata({
      title: resumeData.title || "수의사 이력서",
      name: resumeData.user?.name || resumeData.name || "수의사",
      experience:
        resumeData.experience ||
        resumeData.workExperience?.[0]?.duration ||
        "신입",
      specialties: specialties.length > 0 ? specialties : undefined,
    });

    // 실제 페이지 URL로 업데이트
    const baseDomain = getBaseDomain();
    const actualUrl = `${baseDomain}/resumes/${id}`;
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
    console.error("Error generating resume metadata:", error);
    return {
      title: "이력서 상세",
      description: "IAMVET 수의사 이력서 상세 정보를 확인하세요.",
    };
  }
}

export default function ResumeDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
