import { Metadata } from "next";
import { gmarketSans, suit } from "@/lib/fonts";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { getBaseDomain, getAllDomains, getOpenGraphImageUrl } from "@/lib/metadata-utils";
import "./globals.css";
import "./fonts.css";

const baseDomain = getBaseDomain();
const ogImageUrl = getOpenGraphImageUrl();

export const metadata: Metadata = {
  title: {
    default: "IAMVET - 수의사 커뮤니티",
    template: "%s | IAMVET",
  },
  description: "수의사를 위한 채용, 이력서, 포럼, 양도양수, 강의 플랫폼",
  keywords: ["수의사", "수의대", "동물병원", "채용", "구인구직", "커뮤니티"],
  authors: [{ name: "IAMVET" }],
  icons: {
    icon: "/iamvet.ico",
    shortcut: "/iamvet.ico",
    apple: "/iamvet.ico",
  },
  alternates: {
    canonical: baseDomain,
    languages: {
      ko: getAllDomains(),
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: baseDomain,
    siteName: "IAMVET",
    title: "IAMVET - 수의사 커뮤니티",
    description: "수의사를 위한 채용, 이력서, 포럼, 양도양수, 강의 플랫폼",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "IAMVET - 수의사 커뮤니티",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IAMVET - 수의사 커뮤니티",
    description: "수의사를 위한 채용, 이력서, 포럼, 양도양수, 강의 플랫폼",
    images: [
      {
        url: ogImageUrl,
        alt: "IAMVET - 수의사 커뮤니티",
      },
    ],
  },
  verification: {
    google: "td2rnXEEwjO-IAgJVIJmSwbbGRgFl4fpl2Zst_rEvFQ",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${gmarketSans.variable} ${suit.variable}`}>
      <body className="font-text">
        <QueryProvider>
          <ClientLayout>{children}</ClientLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
