import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { generateUserProfile } from "@/lib/generateUserProfile";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    // 解析 UA 与 IP
    const ua = req.headers.get("user-agent") || "";
    let ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    const isPrivateOrEmpty =
      !ip ||
      ip === "::1" ||
      ip.startsWith("127.") ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("172.");

    if (isPrivateOrEmpty) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const ipResp = await fetch("https://api.ipify.org/?format=json", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (ipResp.ok) {
          const data = (await ipResp.json().catch(() => ({}))) as unknown;
          const ipField = (data as { ip?: unknown }).ip;
          if (typeof ipField === "string" && ipField) ip = ipField;
        }
      } catch {
        // ignore
      }
    }

    const deviceOS = /iphone|ipad|ipod|ios/i.test(ua)
      ? "iOS"
      : /android/i.test(ua)
        ? "Android"
        : /mac os x|macintosh/i.test(ua)
          ? "Mac"
          : /windows/i.test(ua)
            ? "Windows"
            : /linux/i.test(ua)
              ? "Linux"
              : "Unknown";

    let location: string | null = null;
    try {
      if (
        ip &&
        !ip.startsWith("127.") &&
        !ip.startsWith("10.") &&
        !ip.startsWith("192.168.") &&
        !ip.startsWith("172.16.") &&
        !ip.startsWith("172.17.") &&
        !ip.startsWith("172.18.") &&
        !ip.startsWith("172.19.") &&
        !ip.startsWith("172.2") &&
        !ip.startsWith("::1")
      ) {
        const appCode = process.env.IP_LOCATION_APPCODE;
        if (appCode) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const baseUrl =
            "https://gwgp-gskkegngtuu.n.bdcloudapi.com/ip/city/query";
          const qs = new URLSearchParams({ ip });
          const resp = await fetch(`${baseUrl}?${qs.toString()}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "X-Bce-Signature": `AppCode/${appCode}`,
            },
            cache: "no-store",
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (resp.ok) {
            type BaiDuIpCityResponse = {
              code?: number;
              success?: boolean;
              data?: {
                result?: { prov?: string; province?: string; city?: string };
              };
            };
            const jd = (await resp.json()) as BaiDuIpCityResponse;
            const ok = jd?.code === 200 || jd?.success === true;
            if (ok) {
              const result = jd?.data?.result || {};
              const prov = result.prov || result.province || "";
              const city = result.city || "";
              if (prov || city) {
                location =
                  `${prov || ""}${prov && city ? "-" : ""}${city || ""}` ||
                  null;
              }
            }
          }
        }
      }
    } catch {
      location = ip;
    }

    // 验证码校验
    const emailCode = await prisma.emailCode.findUnique({
      where: { email },
    });

    if (
      !emailCode ||
      emailCode.code !== code ||
      emailCode.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      );
    }

    // 删除已使用的验证码
    await prisma.emailCode.delete({ where: { email } });

    // 查找或创建用户
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const { userName, avatar } = generateUserProfile();
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          userName,
          avatar,
          createdAt: new Date(),
          lastLogin: new Date(),
          deviceOS,
          location,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), deviceOS, location },
      });
    }

    // 设置登录态 cookie
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("邮箱登录失败:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
