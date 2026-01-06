import type { Metadata } from "next";

export const metadata: Metadata = {
  title: '句子听写 - 新概念英语/雅思口语/听力真题训练',
  description: '精选新概念英语、雅思口语900句、英语听力真题等高质量素材。通过句子听写训练，提高英语听力理解能力和拼写准确度，培养英语语感。',
  keywords: ['英语听写', '句子听写', '新概念英语听力', '雅思听力', '托福听力', '英语听力训练', '英语听写练习', '高考听力真题', '四六级听力真题', '雅思听力真题', '老友记']
};

export default function SentenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
