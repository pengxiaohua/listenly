import crypto from "crypto"

function cleanFilename(sentence: string): string {
  return sentence
    .replace(/[^a-zA-Z0-9\s]/g, "") // 去掉标点
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")           // 空格转下划线
}

// 生成 mp3 文件名
export function getMp3Filename(sentence: string): string {
  const hash = crypto
    .createHash("md5")
    .update(sentence + (process.env.MP3_FILENAME_SALT))
    .digest("hex")
    .slice(0, 6);

  const slug = cleanFilename(sentence);
  return `${hash}_${slug}.mp3`;
}
