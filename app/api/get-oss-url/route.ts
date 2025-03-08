import { NextResponse } from "next/server";
import OSS from "ali-oss";

export async function GET() {
  const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || "",
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || "",
    bucket: process.env.OSS_BUCKET_NAME,
  });

  const url = client.signatureUrl("updated_words_latest.json", {
    expires: 3600,
  });

  return NextResponse.json({ url });
}
