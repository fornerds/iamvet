import type { Metadata } from "next";
import { getBaseDomain, getOpenGraphImageUrl } from "@/lib/metadata-utils";

const baseDomain = getBaseDomain();
const ogImageUrl = getOpenGraphImageUrl();

export const metadata: Metadata = {
  title: "채용공고",
  description: "수의사, 수의테크니션, 병원장 등 동물병원 전문 채용 정보를 확인하고 지원하세요. 전국 동물병원의 최신 채용공고를 한눈에 볼 수 있습니다.",
  alternates: {
    canonical: `${baseDomain}/jobs`,
  },
  openGraph: {
    title: "채용공고 - IAMVET",
    description: "수의사, 수의테크니션, 병원장 등 동물병원 전문 채용 정보를 확인하고 지원하세요. 전국 동물병원의 최신 채용공고를 한눈에 볼 수 있습니다.",
    url: `${baseDomain}/jobs`,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "IAMVET 채용공고",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "채용공고 - IAMVET",
    description: "수의사, 수의테크니션, 병원장 등 동물병원 전문 채용 정보를 확인하고 지원하세요.",
    images: [{ url: ogImageUrl, alt: "IAMVET 채용공고" }],
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}