import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 在生产构建期间忽略TypeScript错误
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'listenly.oss-cn-hangzhou.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'listenly.oss-cn-hangzhou.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thirdwx.qlogo.cn',
        port: '',
        pathname: '/**',
      }
    ],
    domains: ['listenly.cn', 'www.listenly.cn'],
    deviceSizes: [48, 96, 128, 256, 384],
    imageSizes: [16, 32, 48, 64, 96],
    unoptimized: true, // 禁用图片优化，直接使用原图
  },
};

export default nextConfig;
