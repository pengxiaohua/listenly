"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';

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
  { name: '更多英语词汇', count: 'Coming Soon' },
];

const upcomingFeatures = [
  { name: '日常对话300句', type: '句子听写' },
  { name: '新概念英语', type: '句子听写' },
  { name: '雅思听力真题', type: '影子跟读' },
];

const HomePage = () => {
  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    categories: false,
    upcoming: false,
  });

  const heroRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const categoriesRef = useRef<HTMLElement | null>(null);
  const upcomingRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(() => ({
    hero: heroRef,
    features: featuresRef,
    categories: categoriesRef,
    upcoming: upcomingRef,
  }), []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
    };

    const observers: Record<string, IntersectionObserver> = {};

    Object.entries(sectionRefs).forEach(([key, ref]) => {
      observers[key] = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [key]: true }));
          }
        });
      }, observerOptions);

      if (ref.current) {
        observers[key].observe(ref.current);
      }
    });

    return () => {
      Object.values(observers).forEach(observer => observer.disconnect());
    };
  }, [sectionRefs]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section
        ref={sectionRefs.hero}
        className={`min-h-screen flex flex-col justify-center items-center px-4 py-16 transition-opacity duration-1000 ${isVisible.hero ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="big-title" style={{ translate: 'none', rotate: 'none', scale: 'none', transform: 'translate(0px, 0px)', opacity: 1 }}>
            {/* Listenly.cn */}
            LISTENLY.CN
          </p>

          <p className="text-2xl mb-8 font-light">
            <span className="animate-fade-in-text">Listen Daily, Up Greatly</span>
          </p>

          <div className="space-y-4">
            <p className="text-xl text-gray-300">
              踏上英语听力提升之旅的第一步
            </p>
            <a
              href="#features"
              className="inline-block mt-8 px-8 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors"
            >
              开始探索
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={sectionRefs.features}
        className={`py-20 px-4 transition-all duration-1000 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">三大核心功能</h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="bg-gray-900 p-8 rounded-lg">
              <div className="h-20 w-20 bg-white text-black rounded-full flex items-center justify-center text-3xl font-bold mb-6">01</div>
              <h3 className="text-2xl font-bold mb-4">单词听写</h3>
              <p className="text-gray-400">
                覆盖中考、高考、四六级、考研、雅思、托福等各级别词汇，提供英式和美式两种发音，常规和慢速两种播放速度。
              </p>
            </div>

            <div className="bg-gray-900 p-8 rounded-lg">
              <div className="h-20 w-20 bg-white text-black rounded-full flex items-center justify-center text-3xl font-bold mb-6">02</div>
              <h3 className="text-2xl font-bold mb-4">句子听写</h3>
              <p className="text-gray-400">
                提供日常对话300句、新概念英语、雅思真题等素材，帮助提升长句听力理解能力，提高记忆和拼写水平。
              </p>
            </div>

            <div className="bg-gray-900 p-8 rounded-lg">
              <div className="h-20 w-20 bg-white text-black rounded-full flex items-center justify-center text-3xl font-bold mb-6">03</div>
              <h3 className="text-2xl font-bold mb-4">影子跟读</h3>
              <p className="text-gray-400">
                选取高质量素材，通过跟读训练提升听说能力，改善口语发音和语调，培养语感。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section
        ref={sectionRefs.categories}
        className={`py-20 px-4 bg-gray-950 transition-all duration-1000 ${isVisible.categories ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">词汇分类</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div
                key={category.name}
                className="bg-black border border-gray-800 p-6 rounded-lg hover:border-white transition-all duration-300"
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: isVisible.categories ? 1 : 0,
                  transform: isVisible.categories ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 500ms ${index * 100}ms ease-out`
                }}
              >
                <h3 className="text-xl font-medium mb-2">{category.name}</h3>
                <p className="text-3xl font-bold">{category.count}</p>
                <p className="text-gray-500 text-sm">词汇量</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Features */}
      <section
        ref={sectionRefs.upcoming}
        className={`py-20 px-4 transition-all duration-1000 ${isVisible.upcoming ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-center">即将上线</h2>
          <p className="text-xl text-gray-400 text-center mb-16">更多精选高质量听力材料，敬请期待</p>

          <div className="space-y-6">
            {upcomingFeatures.map((feature, index) => (
              <div
                key={feature.name}
                className="flex items-center p-4 border-l-4 border-white bg-gray-900 rounded"
                style={{
                  animationDelay: `${index * 200}ms`,
                  opacity: isVisible.upcoming ? 1 : 0,
                  transform: isVisible.upcoming ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `all 500ms ${index * 200}ms ease-out`
                }}
              >
                <div className="mr-6">
                  <div className="text-sm text-gray-400">{feature.type}</div>
                  <div className="text-xl font-medium">{feature.name}</div>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full">即将上线</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Listenly.cn</h2>
          <p className="text-gray-400 mb-8">Listen Daily, Up Greatly</p>
          <div className="flex justify-center items-center gap-2 text-sm text-gray-500">
            <p>Copyright© {new Date().getFullYear()} </p>
            <p>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-100"
              >
                鄂ICP备2023019395号-2
              </a>
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeInText {
          0% { color: #6b7280; }
          100% { color: #ffffff; }
        }

        .animate-fade-in-text {
          animation: fadeInText 2s forwards;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
