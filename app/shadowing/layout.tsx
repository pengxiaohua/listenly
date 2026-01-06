import type { Metadata } from "next";

export const metadata: Metadata = {
  title: '影子跟读 - 英语口语发音评分/流利度训练',
  description: '基于AI智能语音评测技术，提供英语影子跟读（Shadowing）训练。实时评估发音准确度、流利度和完整度，帮助您改善英语口音，提升口语自信。',
  keywords: ['影子跟读', '英语跟读', 'Shadowing', '英语口语训练', '英语发音纠正', 'AI英语口语', '英语口语评分']
};

export default function ShadowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
