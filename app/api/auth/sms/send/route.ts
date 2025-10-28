import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'
import Dysmsapi20170525, * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import { randomInt } from "crypto";

const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID!;
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET!;
const SIGN_NAME = process.env.ALIYUN_SMS_SIGN_NAME!;
const TEMPLATE_CODE = process.env.ALIYUN_SMS_TEMPLATE_CODE!;

const client = createClient();

function createClient(): Dysmsapi20170525 {
  const config = new $OpenApi.Config({
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
  });
  config.endpoint = "dysmsapi.aliyuncs.com";
  return new Dysmsapi20170525(config);
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    // 生成6位随机验证码
    const code = randomInt(100000, 999999).toString();

    // 发送短信
    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: SIGN_NAME,
      templateCode: TEMPLATE_CODE,
      templateParam: `{"code":"${code}"}`,
    });

    const result = await client.sendSms(sendSmsRequest);

    console.log("SMS result:", {
      code: result.body?.code,
      message: result.body?.message,
      requestId: result.body?.requestId,
    });

    if (result.body?.code !== "OK") {
      // 根据不同的错误码返回更友好的错误信息
      const errorCode = result.body?.code;
      let errorMessage = "短信发送失败";
      
      if (errorCode === "isv.BUSINESS_LIMIT_CONTROL") {
        errorMessage = "发送过于频繁，请稍后再试";
      } else if (errorCode === "isv.DAY_LIMIT_CONTROL") {
        errorMessage = "今日发送次数已达上限";
      } else if (errorCode === "isv.INVALID_PARAMETERS") {
        errorMessage = "参数错误，请检查手机号格式";
      } else if (errorCode === "isv.TEMPLATE_OVERDUE") {
        errorMessage = "短信模板已过期";
      } else if (errorCode === "isv.MOBILE_NUMBER_ILLEGAL") {
        errorMessage = "手机号格式不正确";
      } else if (errorCode === "isv.INSUFFICIENT_BALANCE") {
        errorMessage = "账户余额不足";
      }
      
      console.error("短信发送失败:", { errorCode, message: result.body?.message });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // 保存验证码到数据库
    const EXPIRE_MINUTES = 5;
    const upsertResult = await prisma.smsCode.upsert({
      where: { phone },
      update: {
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000),
      },
      create: {
        phone,
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000),
      },
    });

    console.log({ upsertResult });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("发送短信验证码失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
