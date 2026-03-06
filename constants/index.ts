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

// 排名周期
export const RANK_PERIODS: { label: string; value: 'day' | 'week' | 'month' | 'year' }[] = [
  { label: '今日', value: 'day' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全年', value: 'year' },
];

// 词汇量等级描述
export const VOCAB_LEVEL_DESC: Record<string, { name: string; description: string; count: string }> = {
  "A1": {
    name: "A1(初级)",
    description: "相当于国内小学至初一水平，能进行最简单的日常问候与认读",
    count: "0 - 1500 词",
  },
  "A2": {
    name: "A2(初级)",
    description: "相当于国内中考水平，能胜任基本的个人生活场景沟通",
    count: "1500 - 3000 词",
  },
  "B1": {
    name: "B1(中级)",
    description: "相当于国内高考或大学四级及格水平，能应对独立出国旅行",
    count: "3000 - 5000 词",
  },
  "B2": {
    name: "B2(中高级)",
    description: "大多数国内高考/四六级的高分区间，能顺畅表达个人观点",
    count: "5000 - 8000 词",
  },
  "C1": {
    name: "C1(高级)",
    description: "雅思 7.0+ 水平，能流利阅读英文外刊及专业文献",
    count: "8000 - 12000 词",
  },
  "C2": {
    name: "C2(精通)",
    description: "接近英语母语者水平，能几乎无障碍地进行深度沟通",
    count: "12000+ 词",
  }
}
