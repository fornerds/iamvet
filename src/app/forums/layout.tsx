import type { Metadata } from "next";
import { getBaseDomain, getOpenGraphImageUrl } from "@/lib/metadata-utils";

const baseDomain = getBaseDomain();
const ogImageUrl = getOpenGraphImageUrl();

export const metadata: Metadata = {
  title: "임상 포럼",
  description: "수의사들이 임상 경험과 지식을 공유하는 전문 포럼입니다. 내과, 외과, 특수동물 등 다양한 분야의 임상 케이스와 토론을 확인하세요.",
  alternates: {
    canonical: `${baseDomain}/forums`,
  },
  openGraph: {
    title: "임상 포럼 - IAMVET",
    description: "수의사들이 임상 경험과 지식을 공유하는 전문 포럼입니다. 내과, 외과, 특수동물 등 다양한 분야의 임상 케이스와 토론을 확인하세요.",
    url: `${baseDomain}/forums`,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "IAMVET 임상 포럼",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "임상 포럼 - IAMVET",
    description: "수의사들이 임상 경험과 지식을 공유하는 전문 포럼입니다.",
    images: [{ url: ogImageUrl, alt: "IAMVET 임상 포럼" }],
  },
};

export default function ForumsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}