import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    // unoptimized: process.env.NODE_ENV === 'development', // 开发环境禁用图片优化
  },
};

export default nextConfig;
