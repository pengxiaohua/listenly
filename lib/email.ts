import Dm20151123, * as $Dm20151123 from "@alicloud/dm20151123";
import * as $OpenApi from "@alicloud/openapi-client";

const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID!;
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET!;
const EMAIL_ACCOUNT_NAME = process.env.ALIYUN_EMAIL_ACCOUNT_NAME!;

function createClient(): Dm20151123 {
  const config = new $OpenApi.Config({
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
  });
  config.endpoint = "dm.aliyuncs.com";
  return new Dm20151123(config);
}

const client = createClient();

export async function sendEmailCode(email: string, code: string) {
  const request = new $Dm20151123.SingleSendMailRequest({
    accountName: EMAIL_ACCOUNT_NAME,
    addressType: 1,
    replyToAddress: false,
    toAddress: email,
    subject: "Listenly 登录验证码",
    htmlBody: `
      <div style="max-width:480px;margin:0 auto;padding:32px;font-family:system-ui,-apple-system,sans-serif;">
        <h2 style="color:#6366f1;margin-bottom:24px;">Listenly.cn</h2>
        <p style="font-size:16px;color:#334155;">您的登录验证码为：</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#6366f1;background:#f1f5f9;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">
          ${code}
        </div>
        <p style="font-size:14px;color:#64748b;">验证码 5 分钟内有效，请勿泄露给他人。</p>
        <p style="font-size:14px;color:#64748b;">如非本人操作，请忽略此邮件。</p>
      </div>
    `,
  });

  const result = await client.singleSendMail(request);
  return result;
}
