import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true, // 强制使用HTTPS
});

export async function POST(req: NextRequest) {
  try {
    // 获取用户身份信息
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 PNG、JPG、JPEG 格式的图片' },
        { status: 400 }
      );
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过 5MB' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const ossKey = `avatars/${fileName}`;

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到OSS
    const result = await client.put(ossKey, buffer, {
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!result.url) {
      throw new Error('OSS上传失败');
    }

    // 更新用户头像，存储OSS key而不是完整URL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: ossKey },
      select: {
        id: true,
        userName: true,
        avatar: true,
      },
    });

    // 生成签名URL返回给前端
    const signedUrl = client.signatureUrl(ossKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    });

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      user: {
        ...updatedUser,
        avatar: signedUrl, // 返回签名URL给前端显示
      },
      url: signedUrl,
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '头像上传失败',
      },
      { status: 500 }
    );
  }
}
