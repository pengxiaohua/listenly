import crypto from "crypto"

function cleanFilename(sentence: string): string {
  return sentence
    .replace(/[^a-zA-Z0-9\s]/g, "") // 去掉标点
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")           // 空格转下划线
}

const MAX_SLUG_LENGTH = 120;

// 生成 mp3 文件名，兼容已有 hash+slug 和超长句子的 hash 唯一名
export function getMp3Filename(sentence: string): string {
  const hash = crypto
    .createHash("md5")
    .update(sentence + (process.env.MP3_FILENAME_SALT))
    .digest("hex")
    .slice(0, 6);

  const slug = cleanFilename(sentence);
  // 超过 120 个字符的句子，使用 hash + slug的前 20 位
  if (!slug || slug.length > MAX_SLUG_LENGTH) {
    return `${hash}_${slug.slice(0, 20)}.mp3`;
  }

  return `${hash}_${slug}.mp3`;
}
