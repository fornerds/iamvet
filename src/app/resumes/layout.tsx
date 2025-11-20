import type { Metadata } from "next";
import { getBaseDomain, getOpenGraphImageUrl } from "@/lib/metadata-utils";

const baseDomain = getBaseDomain();
const ogImageUrl = getOpenGraphImageUrl();

export const metadata: Metadata = {
  title: "인재 채용",
  description: "경력 있는 수의사와 수의테크니션의 이력서를 확인하고 우수한 인재를 채용하세요. 다양한 분야의 전문 인력을 만나보실 수 있습니다.",
  alternates: {
    canonical: `${baseDomain}/resumes`,
  },
  openGraph: {
    title: "인재 채용 - IAMVET",
    description: "경력 있는 수의사와 수의테크니션의 이력서를 확인하고 우수한 인재를 채용하세요. 다양한 분야의 전문 인력을 만나보실 수 있습니다.",
    url: `${baseDomain}/resumes`,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "IAMVET 인재 채용",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "인재 채용 - IAMVET",
    description: "경력 있는 수의사와 수의테크니션의 이력서를 확인하고 우수한 인재를 채용하세요.",
    images: [{ url: ogImageUrl, alt: "IAMVET 인재 채용" }],
  },
};

export default function ResumesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}