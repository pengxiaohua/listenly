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
export const VOCAB_LEVEL_DESC: Record<string, { name: string; level: string; description: string; count: string }> = {
  "A1": {
    name: "A1(初级)",
    level: "国内小学至初一水平",
    description: "能进行最简单的日常问候与认读",
    count: "0 - 1500 词",
  },
  "A2": {
    name: "A2(初级)",
    "level": "国内中考水平",
    description: "能胜任基本的个人生活场景沟通",
    count: "1500 - 3000 词",
  },
  "B1": {
    name: "B1(中级)",
    level: "高考/大学四级及格水平",
    description: "能在旅行中应对大多数场景，能理解在工作、学校中熟悉的场景",
    count: "3000 - 5000 词",
  },
  "B2": {
    name: "B2(中高级)",
    "level": "大学六级/考研英语高分水平",
    description: "能顺畅表达个人观点，能撰写内容清晰、详尽的文章",
    count: "5000 - 8000 词",
  },
  "C1": {
    name: "C1(高级)",
    "level": "雅思 7.0+ 水平",
    description: "能理解长篇、高难度的文章，表达流畅且即兴，使用语言灵活",
    count: "8000 - 12000 词",
  },
  "C2": {
    name: "C2(精通)",
    "level": "接近英语母语者水平",
    description: "能轻松理解几乎所有类型的内容，能在复杂的场景下进行细微的表达",
    count: "12000+ 词",
  }
}
