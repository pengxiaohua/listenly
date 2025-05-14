"use client";

import React from 'react';

const categories = [
  { name: '中考词汇', count: 1603 },
  { name: '高考词汇', count: 3676 },
  { name: '四级词汇', count: 3849 },
  { name: '六级词汇', count: 5407 },
  { name: '考研词汇', count: 4801 },
  { name: '雅思词汇', count: 5040 },
  { name: '托福词汇', count: 6974 },
  { name: 'GRE词汇', count: 7504 },
  { name: '牛津3000词汇', count: 3460 },
];

const HomePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">Listenly</h1>
      <p className="text-xl text-center mb-12">
        欢迎来到 Listenly，一个帮助你提高英语听力和拼写能力的学习平台！
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-center mb-4">单词类别</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div key={category.name} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg shadow-md text-center">
              <h3 className="text-lg">{category.name}</h3>
              <p className="text-xl font-bold">{category.count} words</p>
            </div>
          ))}
        </div>
      </section>

      {/* <section className="mb-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">总词汇量</h2>
        <p className="text-xl">
          目前我们的平台已拥有 <strong>15279</strong> 个单词，涵盖多个英语考试的词汇库，
          帮助你高效提升英语听力和拼写能力。
        </p>
      </section> */}

      <section className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">功能介绍</h2>
        <p className="mb-4">
          我们为你提供了丰富的单词和句子听写功能，涵盖了多个英语考试的单词库，如：
          <strong>四六级、雅思、托福、GRE、考研等</strong>。无论你是想提高词汇量，还是想练习听力，我们都为你提供了精准且高效的学习工具。
        </p>
        <p>
          通过我们的拼写练习和听写抄写功能，你可以轻松记录自己的学习进度，并在每次拼写正确后自动切换到下一个单词，帮助你快速积累词汇并提高听力水平。
        </p>
      </section>
    </div>
  );
};

export default HomePage;
