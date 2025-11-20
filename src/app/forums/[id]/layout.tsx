import { Metadata } from "next";
import { generateForumMetadata } from "@/lib/metadata-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    // API에서 포럼 게시글 정보 가져오기
    const { getBaseDomain } = await import("@/lib/metadata-utils");
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? getBaseDomain()
        : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/forums/${id}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "포럼 게시글",
        description: "IAMVET 수의사 포럼의 임상 토론 게시글을 확인하세요.",
      };
    }

    const forumData = await response.json();

    // 내용에서 HTML 태그 제거하고 짧은 발췌문 생성
    const cleanContent = forumData.content?.replace(/<[^>]*>/g, "") || "";
    const excerpt =
      cleanContent.length > 100
        ? cleanContent.substring(0, 100) + "..."
        : cleanContent;

    const metadata = generateForumMetadata({
      title: forumData.title || "포럼 게시글",
      author: forumData.user?.name || forumData.author || "수의사",
      category: forumData.category || "임상토론",
      excerpt:
        excerpt ||
        `${forumData.user?.name || "수의사"}님이 작성한 ${
          forumData.category || "임상토론"
        } 게시글입니다.`,
    });

    // 실제 페이지 URL로 업데이트
    const baseDomain = getBaseDomain();
    const actualUrl = `${baseDomain}/forums/${id}`;
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
    console.error("Error generating forum metadata:", error);
    return {
      title: "포럼 게시글",
      description: "IAMVET 수의사 포럼의 임상 토론 게시글을 확인하세요.",
    };
  }
}

export default function ForumDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
