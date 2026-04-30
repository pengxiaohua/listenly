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

export const FAQ_LIST = [
  {
    question: '单词拼写有哪些课程？',
    answer: '目前提供中小学教材、中考、高考、四级、六级、考研、雅思、托福、GRE、牛津3000等多个级别的词汇课程，共计超过62000个单词。每个课程均支持英式和美式、男声和女声共4种发音，以及0.5-2.0播放倍速调节，满足不同学习阶段的需求。',
  },
  {
    question: '句子听写有哪些课程？',
    answer: '句子听写涵盖新概念英语、雅思真题听力、中小学英语教材、外企地道表达1100句等高质量素材。更多课程如四六级听力真题、BBC慢速英语等也在持续上线中，帮助你全面提升长句听力理解能力。',
  },
  {
    question: '影子跟读是什么？如何使用？',
    answer: '影子跟读是一种高效的口语训练方法，通过跟读音频来提升发音和语感。Listenly 基于 AI 智能分析你的发音，从准确度、流利度和完整度三个维度给出专业评估，帮助你有针对性地改善口语表达。',
  },
  {
    question: 'Listenly 是免费的吗？',
    answer: 'Listenly 目前部分课程内容是免费使用，包括单词拼写、句子听写和影子跟读。会员模式是19元一个月，49元一个季度，159一年。可以享受全部会员课程和高级的发音体验',
  },
  {
    question: '支持哪些设备和浏览器？',
    answer: 'Listenly 是一个在线网页应用，支持电脑和手机浏览器访问。推荐使用 Chrome、Safari、Edge 等主流浏览器，无需下载安装任何应用，打开网页即可开始学习。',
  },
  {
    question: '学习进度会保存吗？',
    answer: '登录后，你的学习进度会自动保存到云端，包括已学单词、听写记录、跟读评分等。换设备登录同一账号即可继续之前的学习进度，不会丢失任何数据。',
  },
];

export const FEATURE_LIST = [
  {
    id: 1,
    title: '单词拼写',
    description: '覆盖中考、高考、四六级、雅思、托福、新概念英语、中小学教材（人教版、外研社、接力版等）等各级别词汇，提供英式和美式两种发音，常规和慢速两种播放速度。',
    targets: ['中考', '高考', '四六级', '雅思', '托福', '新概念英语', '中小学教材'],
    color: 'from-indigo-500 via-indigo-600 to-indigo-500',
    icon: '📝',
    route: '/word'
  },
  {
    id: 2,
    title: '句子听写',
    description: '提供雅思、托福、新概念英语、中小学教材（人教版、外研社、接力版等）、BBC慢速英语等高质量素材，帮助提升长句听力理解能力，提高记忆和拼写水平。',
    targets: ['雅思', '托福', '新概念英语', '中小学教材', 'BBC慢速英语', '老友记', '高考听力真题'],
    color: 'from-purple-500 via-purple-600 to-purple-500',
    icon: '🎯',
    route: '/sentence'
  },
  {
    id: 3,
    title: '影子跟读',
    description: '基于AI智能分析发音，提供准确度、流利度和完整度三个维度的专业评估。精选雅思、新概念英语、中小学教材（人教版、外研社、接力版等）等高质量素材，通过跟读训练提升听说能力，改善口语发音和语调，培养语感。',
    targets: ['雅思考试', '新概念英语', '中小学教材'],
    color: 'from-emerald-500 via-emerald-600 to-teal-500',
    icon: '🎤',
    route: '/shadowing',
    aiFeatures: ['准确度', '流利度', '完整度']
  },
  {
    id: 4,
    title: '视听演练',
    description: '精选 YouTube 优质短视频，涵盖 TED 演讲、Vlog、脱口秀、经典电影片段、热门美剧片段等丰富素材，通过看视频逐句学习和跟读，在真实语境中逐步提升听力理解和口语表达能力。',
    targets: ['TED演讲', 'Vlog', '脱口秀', '经典电影', '热门美剧'],
    color: 'from-rose-400 via-rose-500 to-rose-400',
    icon: '🎬',
    route: '/video',
  },
];

export const FEATURE_CASE_LIST = [
  {
    title: '单词拼写',
    subtitle: '听音拼写，高效记忆',
    description: '覆盖小学到中高考，再到雅思全级别词汇，支持英式/美式发音与常规/慢速播放，通过听音拼写强化单词记忆。',
    video: '/images/home/word-learning.mov',
    color: 'from-indigo-600 to-cyan-500',
    route: '/word',
  },
  {
    title: '句子听写',
    subtitle: '精听训练，提升理解',
    description: '涵盖中小学英语教材、新概念英语、雅思听力真题原文、外企地道表达 1100 句、BBC 6 分钟英语等高质量素材，逐句听写提升长句理解能力。',
    video: '/images/home/sentence-learning.mp4',
    color: 'from-purple-600 to-pink-500',
    route: '/sentence',
  },
  {
    title: '影子跟读',
    subtitle: 'AI评估，精准提升',
    description: '基于AI智能分析发音，从准确度、流利度和完整度三个维度给出专业评估，有效改善口语表达。',
    video: '/images/home/shadowing-learning.mp4',
    color: 'from-emerald-600 to-emerald-500',
    route: '/shadowing',
  },
];

// 用户好评数组，用户头像、用户名、用户好评内容
export const USER_REVIEWS = [
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEICiauicMLzJd32Jluc3icQw70zQ4u9drqRCVYapiaxFE69k8nQ22gEZRzD3icY6lwIZaIfB3S0EhBV3jqKvlCPbU0ATH2vE8PxMoIpTmmoDhnVPbw/132",
    name: "cherry",
    content: "这个网站太上头了，已经成了我的上班摸鱼神器🤫，戴上耳机，敲键盘学单词，感觉词汇量提升了不少。",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTIrr1iaYiahtsQ01bPPnhpPaoA0Hf9euzs4tZgMYibET2yk2IGksz4ia311H9DrsKawvN24yD6k5CNnoA/132",
    name: "汇林",
    content: "1，交互舒服 2，页面感觉不错 3，反馈的问题更新及时",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/NKV85veJoGuIPExz9JuWfjHLm5JU6iaQMQhc7Km9XbdYSxwkAFrJvAh3H7C1e4BibxgQePgQLWDXyib95D3mhVnia1IV7747JgA3ayaaufQuwxU/132",
    name: "大黄蜂的帽子",
    content: "非常好的软件，容易上手，简单易学，每个人都适合，值得推荐！",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEIj8c4Ivr24s2ovor82MqtLxlupgNoZKlIaicZKU5SWrdyBHVB4dLR98jibF7MNsBeV6ODIabXv45qf5ZRM2e8L16s6SibSJGaiaFe61QgnticnoPQ/132",
    name: "Dantes Tang",
    content: "功能比较全面，适合中小学生记单词",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/kDibSib4NdZg6HUePEyibaeX9iaYeliaRKCcpE39S9cdvfBcyoj6TLBpu3lib8LMTBI4ECXfJukicwhU8ia6pFFOAsysjbNcOYCbd8bSQgIpeQxia3FQ/132",
    name: "Mememelody🎈",
    content: "界面简单干净好操作，单词发音比其他软件更标准，影子跟读功能非常适合练口语！",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/FmPp7GdSQibYUoia5NQ4GNsmfvoMzZKUzHOjGuVCXb4FfURibrzNv2tWnMibYz647fpTHDr2I1RKtHHZpt9MpOzCP0N8lakujxFpakY4CupIAAs/132",
    name: "圆子",
    content: "当时心血来潮想练习拼写，在网站上搜索挨个点进去发现了这个网站，很宝藏，我的基础蛮一般的，从小学的开始练发现了自己的很多问题，也产生了些练习英文的乐趣。最让我惊喜的是如果有问题提出，反馈和改善的速度超级快。\n学习英文是一个很漫长的过程对我来说，希望我们陪伴彼此能走很远，祝越来越好。",
    role: "学生党"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/J80iaBHbOzg8OAQVZT7xAvPTBdD8iblREQLmD7OJuLVXJoH3EIvQto2gmFd1jiaEZv5Af4Ku2ZDqgGm7IzAxXaj60g4FxPBHPaRS6OC10bZOPc/132",
    name: "北辰星",
    content: "用键盘拼写的方式比较新颖，效果也不错，值得好评",
    role: "学生党"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/t6LPsCbJ0TZxCX6iaqozpoJRiaDc8zibOmyEn5UW6nDTXkUo7xf3VmQ5ojARicnaoqzZykkyYsXwzos6vyO5V0wgSg/132",
    name: "Reigns",
    content: "不哆嗦，yyds好吧",
    role: "学生党"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaELwict14g0ewf2ZUDnzlubGl9icoxwAwJVibAJCEYGcYuwmxUWulsKddicewn76sm3rT9blba156tDBRKv3UVZ0VtSJfshFFQmIQ56fgPt9LD717A/132",
    name: "寂寞沙洲冷",
    content: "挺好的，希望保持现在的简洁明了，增加更多的句子库。",
    role: "学生党"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEJXOEzvNaK14YjRUp3UviavrcGNHY9eaKOiaNYWqD8TO54XVOF0k0BLRB5SocMr1cIF9eMpbPnLpeGd3MYQx6Thlk3X1ADtmfIJFp093IcaNagg/132",
    name: "匿名用户",
    content: "刚接触 listenly 没多久，本意是想搜索一款方便听写的网站，然后选择了几个比较好的，但是当我选择到 listenly 的时候发现没有我所需要的教材以后，我就加入群聊跟团队反馈了，没想到团队一接到反馈就直接行动，这效率必点赞，然后我也试着使用了几天，体验还是不错的，发音清晰且标准。",
    role: "宝妈"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/W7z4uB2e2Z7r99g9Y3tSy8Ssp3mDgicA2HQMa0EpLYKgxaDUcfJ4SJlDGNLugrVzIbZdElN6b3AKtm117Bs4p8Iiagxszh5WqOMmEqT4fh0icM/132",
    name: "Sun",
    content: "很好的软件，使我英语水平迅速提升(&gt;‿◠)✌️",
    role: "学生党"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/W7z4uB2e2Z7r99g9Y3tSy8Ssp3mDgicA2HQMa0EpLYKgxaDUcfJ4SJlDGNLugrVzIbZdElN6b3AKtm117Bs4p8Iiagxszh5WqOMmEqT4fh0icM/132",
    name: "Kimlen Zhong",
    content: "网站反应迅速，句子发音标准发音标准，页面简洁，影子跟读功能很好用，全网独一份的。",
    role: "上班族"
  },
  {
    avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaELj4MlEGLwicbDZc0zyqPyNP5xia2ph7Hn8E34VKibsV1AkW6qXG5pw1U4icyJ3lDp9IjtmAtO7cwibUOjxIcB35t9VRic4Y2vbnUmR9WO6cMyofG5g/132",
    name: "K",
    content: "轻轻松松就把英语学习啦～挺不错的",
    role: "上班族"
  },
];

export const VOICE_PREVIEWS = [
  { image: '/images/tones/us_female.png', title: '美式发音-女声', description: '热情洋溢，音色清脆明亮，语速轻快活泼且富有极强的节奏感', audioSrc: '/tones/us_female.mp3' },
  { image: '/images/tones/us_male.png', title: '美式发音-男声', description: '声线低沉浑厚且富有磁性，说话节奏平稳有力、自信从容', audioSrc: '/tones/us_male.mp3' },
  { image: '/images/tones/uk_female.png', title: '英式发音-女声', description: '声线清脆明亮且极具穿透力，说话节奏抑扬顿挫、咬字清晰精准', audioSrc: '/tones/uk_female.mp3' },
  { image: '/images/tones/uk_male.png', title: '英式发音-男声', description: '声线清亮且富有张力，说话节奏抑扬顿挫、起伏明显', audioSrc: '/tones/uk_male.mp3' },
];