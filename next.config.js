/** @type {import('next').NextConfig} */
const nextConfig = {
  // skipMiddlewareUrlNormalize를 experimental 밖으로 이동
  skipMiddlewareUrlNormalize: true,


  // 외부 이미지 도메인 허용
  images: {
    domains: [
      'ssl.pstatic.net', // 네이버 프로필 이미지
      'k.kakaocdn.net', // 카카오 프로필 이미지
      'lh3.googleusercontent.com', // 구글 프로필 이미지
      'iamvet.s3.ap-northeast-2.amazonaws.com', // S3 버킷
      'img.youtube.com', // 유튜브 썸네일 이미지
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: '*.kakaocdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },

  experimental: {
    // Next.js 15에서 appDir는 기본값이므로 제거
    // devToolsButton은 더 이상 사용되지 않음
    // 필요한 경우에만 다른 experimental 옵션 추가
    serverActions: {
      bodySizeLimit: '50mb',
      // Next.js 15.5.7 호환성을 위한 설정
      allowedOrigins: process.env.NEXT_PUBLIC_SITE_URL 
        ? [process.env.NEXT_PUBLIC_SITE_URL, 'https://iam-vet.com', 'http://localhost:3000']
        : ['http://localhost:3000'],
    },
  },



  webpack: (config, { isServer }) => {
    // Handle database modules for serverless deployment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
        'pg-native': false,
      };
    }

    // Externalize pg for server builds to avoid bundling issues
    if (isServer) {
      config.externals = [...(config.externals || []), 'pg', 'pg-native'];
    }

    return config;
  },

  async headers() {
    return [
      {
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
    ];
  },

  ...(process.env.NODE_ENV === "development" && {
    compiler: {
      removeConsole: false,
    },
  }),
};

module.exports = nextConfig;
