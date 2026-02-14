import type { Metadata } from "next";

export const metadata: Metadata = {
  title: '在线背单词 - 雅思/托福/四六级/考研/中小学英语词汇拼写',
  description: '提供科学的在线背单词功能，涵盖雅思、托福、GRE、四六级、考研、中考、高考及人教版英语教材词汇。通过原声例句和拼写练习，加深记忆，彻底掌握英语单词。',
  keywords: ['背单词', '单词拼写', '雅思词汇', '托福单词', '考研英语词汇', '四级单词', '六级单词', '中考英语', '高考英语']
};

export default function WordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
