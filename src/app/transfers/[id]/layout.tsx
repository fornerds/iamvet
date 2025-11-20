import { Metadata } from "next";
import { generateTransferMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    // API에서 양도양수 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? getBaseDomain()
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/transfers/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "양도양수 상세",
        description: "IAMVET 동물병원 양도양수 상세 정보를 확인하세요.",
      };
    }

    const transferData = await response.json();

    // 가격 정보 포맷팅
    const formatPrice = (price: number | string) => {
      if (!price) return "";
      const numPrice = typeof price === "string" ? parseInt(price) : price;
      return `${(numPrice / 10000).toLocaleString()}만원`;
    };

    const metadata = generateTransferMetadata({
      title: transferData.title || "양도양수",
      type: transferData.type || transferData.category || "동물병원",
      location: transferData.location || transferData.address || "전국",
      price: transferData.price ? formatPrice(transferData.price) : undefined,
    });

    // 실제 페이지 URL로 업데이트
    const baseDomain = getBaseDomain();
    const actualUrl = `${baseDomain}/transfers/${id}`;
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
    console.error("Error generating transfer metadata:", error);
    return {
      title: "양도양수 상세",
      description: "IAMVET 동물병원 양도양수 상세 정보를 확인하세요.",
    };
  }
}

export default function TransferDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
