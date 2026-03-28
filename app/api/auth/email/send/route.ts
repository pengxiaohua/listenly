import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailCode } from "@/lib/email";
import { randomInt } from "crypto";

// IP 限频：每个 IP 每小时最多 10 次
const IP_LIMIT = 10;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  if (!record || now > record.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }

  if (record.count >= IP_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// 定期清理过期记录，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap) {
    if (now > record.resetAt) ipRequestMap.delete(ip);
  }
}, 10 * 60 * 1000); // 每 10 分钟清理一次

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // IP 级别频率限制
    if (!checkIpLimit(ip)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请输入正确的邮箱地址" },
        { status: 400 }
      );
    }

    // 同一邮箱 60 秒内只能发一次
    const existing = await prisma.emailCode.findUnique({ where: { email } });
    if (existing && existing.createdAt.getTime() > Date.now() - 60 * 1000) {
      return NextResponse.json(
        { error: "发送过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const code = randomInt(100000, 999999).toString();

    const result = await sendEmailCode(email, code);
    console.log("Email send result:", result);

    const EXPIRE_MINUTES = 5;
    await prisma.emailCode.upsert({
      where: { email },
      update: {
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000),
        createdAt: new Date(),
      },
      create: {
        email,
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("发送邮箱验证码失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
