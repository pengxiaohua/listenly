"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
// import SplashCursor from '@/components/animation/SplashCursor';
import CountUp from '@/components/animation/CountUp';
import GradientText from '@/components/animation/GradientText';
import { Plus, Minus } from 'lucide-react';

const categories = [
  { name: '中考词汇', count: 1603, color: 'from-blue-500 to-cyan-500' },
  { name: '高考词汇', count: 3676, color: 'from-purple-500 to-pink-500' },
  { name: '四级词汇', count: 3849, color: 'from-green-500 to-emerald-500' },
  { name: '六级词汇', count: 5407, color: 'from-orange-500 to-red-500' },
  { name: '考研词汇', count: 4801, color: 'from-indigo-500 to-blue-500' },
  { name: '雅思词汇', count: 5040, color: 'from-yellow-500 to-orange-500' },
  { name: '托福词汇', count: 6974, color: 'from-teal-500 to-cyan-500' },
  { name: 'GRE词汇', count: 7504, color: 'from-rose-500 to-pink-500' },
  { name: '牛津3000词汇', count: 3460, color: 'from-violet-500 to-purple-500' },
  { name: '更多英语词汇', count: 'Coming Soon', color: 'from-gray-400 to-gray-600' },
];

const upcomingFeatures = [
  { name: '高考听力真题', type: '句子听写' },
  { name: '四六级听力真题', type: '句子听写' },
  { name: '雅思听力真题', type: '句子听写' },
  { name: '老友记', type: '句子听写' },
  { name: '更多英语听力内容', type: '句子听写' },
];

const faqItems = [
  {
    question: '单词拼写有哪些课程？',
    answer: '目前提供中考、高考、四级、六级、考研、雅思、托福、GRE、牛津3000等多个级别的词汇课程，共计超过42000个单词。每个课程均支持英式和美式两种发音，以及常规和慢速两种播放速度，满足不同学习阶段的需求。',
  },
  {
    question: '句子听写有哪些课程？',
    answer: '句子听写涵盖新概念英语、雅思听力、托福听力、BBC慢速英语、高考听力真题、老友记等高质量素材。更多课程如四六级听力真题、雅思听力真题等也在持续上线中，帮助你全面提升长句听力理解能力。',
  },
  {
    question: '影子跟读是什么？如何使用？',
    answer: '影子跟读是一种高效的口语训练方法，通过跟读音频来提升发音和语感。Listenly 基于 AI 智能分析你的发音，从准确度、流利度和完整度三个维度给出专业评估，帮助你有针对性地改善口语表达。',
  },
  {
    question: 'Listenly 是免费的吗？',
    answer: '是的，Listenly 目前所有核心功能均可免费使用，包括单词拼写、句子听写和影子跟读。我们致力于为英语学习者提供高质量的免费学习工具。',
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

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 px-6 text-left cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-gray-900 pr-4">{question}</span>
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${isOpen ? 'bg-gray-900 text-white' : 'bg-green-500 text-white'}`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-6 pb-5 text-gray-600 leading-relaxed text-sm sm:text-base">{answer}</p>
      </div>
    </div>
  );
};

const features = [
  {
    id: 1,
    title: '单词听写',
    description: '覆盖中考、高考、四六级、雅思、托福、新概念英语、中小学教材等各级别词汇，提供英式和美式两种发音，常规和慢速两种播放速度。',
    targets: ['中考', '高考', '四六级', '雅思', '托福', '新概念英语', '中小学教材'],
    // color: 'from-blue-500 via-cyan-500 to-teal-500',
    color: 'from-blue-500 to-cyan-500',
    icon: '📝',
    route: '/word'
  },
  {
    id: 2,
    title: '句子听写',
    description: '提供雅思、托福、新概念英语、中小学教材、BBC慢速英语等高质量素材，帮助提升长句听力理解能力，提高记忆和拼写水平。',
    targets: ['雅思', '托福', '新概念英语', '中小学教材', 'BBC慢速英语', '老友记', "高考听力真题"],
    // color: 'from-purple-500 via-pink-500 to-rose-500',
    color: 'from-purple-500 to-pink-500',
    icon: '🎯',
    route: '/sentence'
  },
  {
    id: 3,
    title: '影子跟读',
    description: '基于AI智能分析发音，提供准确度、流利度和完整度三个维度的专业评估。精选雅思、新概念英语、中小学教材等高质量素材，通过跟读训练提升听说能力，改善口语发音和语调，培养语感。',
    targets: ['雅思', '新概念英语', '中小学教材'],
    color: 'from-green-500 via-emerald-500 to-teal-500',
    icon: '🎤',
    route: '/shadowing',
    aiFeatures: ['准确度', '流利度', '完整度']
  },
];

const HomePage = () => {
  const router = useRouter();
  const isLogged = useAuthStore(state => state.isLogged);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog);

  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    categories: false,
    upcoming: false,
    faq: false,
  });

  // const [isMobile, setIsMobile] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // 检测按钮是否在视口中
  useEffect(() => {
    if (!isInitialized || isLogged || !buttonRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsButtonVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1, // 当按钮10%可见时认为可见
      }
    );

    observer.observe(buttonRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isInitialized, isLogged]);

  // 检测是否为移动端
  // useEffect(() => {
  //   // 使用媒体查询检测移动端
  //   const mediaQuery = window.matchMedia('(max-width: 767px)');

  //   // 设置初始状态
  //   setIsMobile(mediaQuery.matches);

  //   // 监听媒体查询变化
  //   const handleChange = (e: MediaQueryListEvent) => {
  //     setIsMobile(e.matches);
  //   };

  //   // 添加监听器
  //   mediaQuery.addEventListener('change', handleChange);

  //   // 清理监听器
  //   return () => {
  //     mediaQuery.removeEventListener('change', handleChange);
  //   };
  // }, []);

  const heroRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const categoriesRef = useRef<HTMLElement | null>(null);
  const upcomingRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(() => ({
    hero: heroRef,
    features: featuresRef,
    categories: categoriesRef,
    upcoming: upcomingRef,
    faq: faqRef,
  }), []);

  // 登录后重定向到 我的 页面
  useEffect(() => {
    if (isInitialized && isLogged) {
      router.push('/my');
    }
  }, [isInitialized, isLogged, router]);

  // 确保首页内容在未登录时能正确显示
  useEffect(() => {
    if (isInitialized && !isLogged) {
      // 立即显示 hero section
      setIsVisible(prev => ({ ...prev, hero: true }));
    }
  }, [isInitialized, isLogged]);

  useEffect(() => {
    // 只有在未登录且初始化完成时才设置 Observer
    if (isInitialized && !isLogged) {
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
    }
  }, [sectionRefs, isInitialized, isLogged]);

  const handleExploreClick = () => {
    setShowLoginDialog(true);
  };

  // 如果已登录，重定向到单词页面
  if (isInitialized && isLogged) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-2xl font-bold">Loading...</div>
    </div>;
  }

  // 如果还在初始化中，显示加载画面
  if (!isInitialized) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-2xl font-bold">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 text-gray-900">
      {/* {!isMobile && <SplashCursor />} */}
      {/* Hero Section */}
      <section
        ref={sectionRefs.hero}
        className={`min-h-screen flex flex-col justify-center items-center px-4 py-16 transition-opacity duration-1000 relative overflow-hidden ${isVisible.hero ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <GradientText
              colors={["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"]}
              animationSpeed={2}
              showBorder={false}
            >
              <p className="big-title text-5xl sm:text-8xl md:text-9xl font-bold" style={{ translate: 'none', rotate: 'none', scale: 'none', transform: 'translate(0px, 0px)', opacity: 1 }}>
                LISTENLY.CN
              </p>
            </GradientText>
          </div>

          <p className="text-2xl sm:text-4xl md:text-6xl mb-8 font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Listen Daily, Up Greatly
          </p>

          <div className="space-y-6">
            <p className="text-xl sm:text-2xl text-gray-700 font-medium">
              踏上英语听力提升之旅的第一步
            </p>
            <button
              ref={buttonRef}
              onClick={handleExploreClick}
              className="text-lg inline-block mt-8 px-16 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              开始学习
            </button>
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
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            三大核心功能
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg">全面提升你的英语听力水平</p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className="bg-white p-8 rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-purple-300"
                onClick={() => router.push(feature.route)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: isVisible.features ? 1 : 0,
                  transform: isVisible.features ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 500ms ${index * 100}ms ease-out`
                }}
              >
                <div className={`h-20 w-20 bg-gradient-to-br ${feature.color} text-white rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg`}>
                  {feature.icon}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-400">0{feature.id}</span>
                  <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-2">适用场景：</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.targets.map((target, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 bg-gradient-to-r ${feature.color} bg-opacity-10 text-white rounded-full text-xs font-medium border border-gray-200`}
                      >
                        {target}
                      </span>
                    ))}
                  </div>
                  {feature.aiFeatures && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-500 mb-2">AI评估维度：</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.aiFeatures.map((ai, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-medium border border-green-200"
                          >
                            {ai}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section
        ref={sectionRefs.categories}
        className={`py-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 transition-all duration-1000 ${isVisible.categories ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            词汇分类
          </h2>
          <div className="text-center mb-16">
            <GradientText
              colors={["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"]}
              animationSpeed={3}
              showBorder={false}
            >
              <span className="text-2xl font-bold text-gray-700">共</span>
              <CountUp
                to={42313}
                from={0}
                duration={2}
                separator=","
                className="text-4xl font-bold w-[120px] inline-block"
              />
              <span className="text-2xl font-bold text-gray-700">词汇量</span>
            </GradientText>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div
                key={category.name}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-blue-300"
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: isVisible.categories ? 1 : 0,
                  transform: isVisible.categories ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 500ms ${index * 100}ms ease-out`
                }}
              >
                <h3 className="text-lg font-semibold mb-3 text-gray-800">{category.name}</h3>
                <div className={`inline-block px-4 py-2 bg-gradient-to-r ${category.color} rounded-lg mb-2`}>
                  <p className="text-3xl font-bold text-white">{category.count}</p>
                </div>
                <p className="text-gray-500 text-sm mt-2">词汇量</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Features */}
      <section
        ref={sectionRefs.upcoming}
        className={`py-20 px-4 bg-white transition-all duration-1000 ${isVisible.upcoming ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            即将上线
          </h2>
          <p className="text-xl text-gray-600 text-center mb-16">更多精选高质量听力材料，敬请期待</p>

          <div className="space-y-4">
            {upcomingFeatures.map((feature, index) => (
              <div
                key={feature.name}
                className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 p-6 rounded-xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: isVisible.upcoming ? 1 : 0,
                  transform: isVisible.upcoming ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 500ms ${index * 100}ms ease-out`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900">{feature.name}</h3>
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium">
                      {feature.type}
                    </span>
                  </div>
                  <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ml-4">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fixed Button - 当原始按钮不可见时显示 */}
      <div
        className={`fixed bottom-[60px] left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
          isButtonVisible ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 pointer-events-auto translate-y-0'
        }`}
      >
        <button
          onClick={handleExploreClick}
          className="text-lg px-16 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          开始学习
        </button>
      </div>

      {/* FAQ Section */}
      <section
        ref={sectionRefs.faq}
        className={`py-20 px-4 bg-white transition-all duration-1000 ${isVisible.faq ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:gap-16">
            {/* 左侧标题 */}
            <div className="lg:w-1/3 mb-10 lg:mb-0">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                常见问题
              </h2>
              <p className="text-gray-500 text-lg">获取常见问题的解答</p>
            </div>
            {/* 右侧问题列表 */}
            <div className="lg:w-2/3 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {faqItems.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-12 px-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
        <div className="max-w-6xl mx-auto text-center z-10">
          <GradientText
            colors={["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"]}
            animationSpeed={2}
            showBorder={false}
          >
            <h2 className="text-3xl font-bold mb-6">Listenly.cn</h2>
          </GradientText>
          <p className="text-gray-600 mb-8 font-medium">Listen Daily, Up Greatly</p>
          <div className="flex justify-center items-center gap-2 text-sm text-gray-500 pb-8">
            <p>Copyright© {new Date().getFullYear()} </p>
            <p>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                鄂ICP备2023019395号-2
              </a>
            </p>
          </div>
        </div>
        {/* <div className="bottom-block">
          <div className='h-full overflow-hidden mx-auto w-full max-w-[1600px] text-9xl font-extrabold'>
            <div className='bottom-block-content'>
              LISTENLY
            </div>
          </div>
        </div> */}
      </footer>

      <style jsx global>{`
        @keyframes fadeInText {
          0% { color: #6b7280; }
          100% { color: #ffffff; }
        }

        .animate-fade-in-text {
          animation: fadeInText 2s forwards;
        }

        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
