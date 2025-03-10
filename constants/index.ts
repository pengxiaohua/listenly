export type WordTags =
  | "zk"
  | "gk"
  | "cet4"
  | "cet6"
  | "ky"
  | "ielts"
  | "toefl"
  | "gre"
  | "oxford3000";

export const wordsTagsChineseMap: Record<WordTags, string> = {
  zk: "中考",
  gk: "高考",
  cet4: "四级",
  cet6: "六级",
  ky: "考研",
  ielts: "雅思",
  toefl: "托福",
  gre: "GRE",
  oxford3000: "牛津3000",
};

// 添加页面大小选项
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];