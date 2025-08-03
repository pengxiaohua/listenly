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

export const wordsTagsInfo: Record<WordTags, {
  name: string;
  description: string;
  count: number;
}> = {
  zk: { name: "中考", description: "中考词汇", count: 1603 },
  gk: { name: "高考", description: "高考词汇", count: 3676 },
  cet4: { name: "四级", description: "四级词汇", count: 3849 },
  cet6: { name: "六级", description: "六级词汇", count: 5407 },
  ky: { name: "考研", description: "考研词汇", count: 4801 },
  ielts: { name: "雅思", description: "雅思词汇", count: 5040 },
  toefl: { name: "托福", description: "托福词汇", count: 6974 },
  gre: { name: "GRE", description: "GRE词汇", count: 7504 },
  oxford3000: { name: "牛津3000", description: "牛津3000词汇", count: 3460 },
};

// 添加页面大小选项
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
