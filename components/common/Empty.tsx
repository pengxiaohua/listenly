"use client";

import Image from 'next/image';

export default function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="text-center dark:text-gray-400 mt-6">
      <Image src="/images/empty.png" alt="暂无数据" width={200} height={200} className="object-contain text-center mx-auto" />
      <div>{text}</div>
    </div>
  );
}
