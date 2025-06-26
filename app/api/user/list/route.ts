import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true, // 强制使用HTTPS
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 管理员模式：获取所有用户信息
    const skip = (page - 1) * pageSize;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          userName: true,
          avatar: true,
          phone: true,
          wechatOpenId: true,
          createdAt: true,
          lastLogin: true,
        },
        skip,
        take: pageSize,
        orderBy: {
          lastLogin: 'desc'
        }
      }),
      prisma.user.count()
    ]);

    // 处理头像签名URL
    const processedUsers = users.map(user => {
      let avatarUrl = user.avatar;
      if (user.avatar) {
        if (user.avatar.startsWith('avatars/')) {
          // 新格式：OSS key，需要生成签名URL
          try {
            avatarUrl = client.signatureUrl(user.avatar, {
              expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
            });
          } catch (error) {
            console.error('生成头像签名URL失败:', error);
          }
        } else if (user.avatar.includes('listenly.oss-cn-hangzhou.aliyuncs.com/avatars/')) {
          // 兼容旧格式：完整URL，提取OSS key并生成签名URL
          try {
            const urlParts = user.avatar.split('listenly.oss-cn-hangzhou.aliyuncs.com/');
            if (urlParts.length > 1) {
              const ossKey = urlParts[1].split('?')[0]; // 移除可能的查询参数
              avatarUrl = client.signatureUrl(ossKey, {
                expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
              });
            }
          } catch (error) {
            console.error('处理旧格式头像URL失败:', error);
          }
        }
        // 其他格式（如微信头像）保持不变
      }
      return {
        ...user,
        avatar: avatarUrl,
      };
    });

    return NextResponse.json({
      users: processedUsers,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        total: totalCount
      }
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}
