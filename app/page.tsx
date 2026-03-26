"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import GradientText from '@/components/animation/GradientText';
import { Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { USER_REVIEWS, FAQ_LIST, FEATURE_LIST, FEATURE_CASE_LIST, VOICE_PREVIEWS } from '@/constants';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 px-6 text-left cursor-pointer hover:bg-slate-50 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-slate-900 pr-4">{question}</span>
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 ${isOpen ? 'bg-slate-900 text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'}`}>
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-6 py-5 text-slate-600 leading-relaxed text-sm sm:text-base">{answer}</p>
      </div>
    </div>
  );
};



/** MacBook 模具 + 屏幕内视频 */
const MacBookPreview = ({ video, alt }: { video: string; alt: string }) => (
  <div className="relative w-full mx-auto">
    {/* MacBook 模具 */}
    <Image
      src="/images/home/macbook-model-new.png"
      alt="MacBook"
      width={1200}
      height={750}
      className="w-full h-auto relative z-10"
      priority
    />
    {/* 屏幕内容视频 — 绝对定位贴合屏幕区域 */}
    <div className="absolute z-[5] overflow-hidden" style={{ top: '2%', left: '9.8%', width: '80%', height: '76%', borderRadius: '4px 4px 0 0' }}>
      <video
        src={video}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover object-top"
        aria-label={alt}
      />
    </div>
  </div>
);

const VoicePreviewCard = ({ image, title, description, audioSrc, playingTitle, onPlay, onStop }: {
  image: string; title: string; description: string; audioSrc: string;
  playingTitle: string | null; onPlay: (title: string, audio: HTMLAudioElement) => void; onStop: () => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlaying = playingTitle === title;

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.onended = () => onStop();
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      onStop();
    } else {
      onPlay(title, audioRef.current);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col items-center text-center">
      <img src={image} alt={title} className="w-20 h-20 rounded-full object-cover mb-4" />
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-5">{description}</p>
      <button
        onClick={togglePlay}
        className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
          isPlaying
            ? 'bg-slate-900 text-white'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
        }`}
      >
        {isPlaying ? '停止' : '试听'}
      </button>
    </div>
  );
};

const VoicePreviewSection = () => {
  const [playingTitle, setPlayingTitle] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (title: string, audio: HTMLAudioElement) => {
    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    currentAudioRef.current = audio;
    audio.currentTime = 0;
    audio.play();
    setPlayingTitle(title);
  };

  const handleStop = () => {
    setPlayingTitle(null);
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {VOICE_PREVIEWS.map((voice) => (
        <VoicePreviewCard key={voice.title} {...voice} playingTitle={playingTitle} onPlay={handlePlay} onStop={handleStop} />
      ))}
    </div>
  );
};

const CARD_GAP = 24; // gap-6 = 24px

const ReviewMarquee = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let raf: number;
    const speed = 0.8; // px per frame

    const step = () => {
      if (!pausedRef.current && container.firstElementChild) {
        offsetRef.current += speed;
        const firstChild = container.firstElementChild as HTMLElement;
        const firstWidth = firstChild.offsetWidth + CARD_GAP;

        if (offsetRef.current >= firstWidth) {
          offsetRef.current -= firstWidth;
          container.appendChild(firstChild);
        }

        container.style.transform = `translateX(${-offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={scrollRef} className="flex py-4" style={{ gap: `${CARD_GAP}px` }}>
        {/* 渲染足够多的卡片填满视口+缓冲 */}
        {[...USER_REVIEWS, ...USER_REVIEWS].map((review, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col justify-between"
          >
            <p className={`text-slate-700 text-sm sm:text-base whitespace-pre-line ${review.content.length > 100 ? 'mb-3 leading-snug' : 'mb-6 leading-relaxed'}`}>
              &ldquo;{review.content}&rdquo;
            </p>
            <div className={`flex items-center gap-3 ${review.content.length > 100 ? 'pt-3' : 'pt-4'} border-t border-dashed border-slate-200`}>
              <img
                src={review.avatar}
                alt={review.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">{review.name}</span>
                {review.role && <span className="text-xs text-slate-400">{review.role}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HomePage = () => {
  const router = useRouter();
  const isLogged = useAuthStore(state => state.isLogged);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog);

  const [isVisible, setIsVisible] = useState({
    hero: false,
    features: false,
    showcases: false,
    reviews: false,
    faq: false,
  });

  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isInitialized || isLogged || !buttonRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsButtonVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, [isInitialized, isLogged]);

  const heroRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const showcasesRef = useRef<HTMLElement | null>(null);
  const reviewsRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const sectionRefs = useMemo(() => ({
    hero: heroRef,
    features: featuresRef,
    showcases: showcasesRef,
    reviews: reviewsRef,
    faq: faqRef,
  }), []);

  useEffect(() => {
    if (isInitialized && isLogged) {
      router.push('/my');
    }
  }, [isInitialized, isLogged, router]);

  useEffect(() => {
    if (isInitialized && !isLogged) {
      setIsVisible(prev => ({ ...prev, hero: true }));
    }
  }, [isInitialized, isLogged]);

  useEffect(() => {
    if (isInitialized && !isLogged) {
      const observers: Record<string, IntersectionObserver> = {};

      Object.entries(sectionRefs).forEach(([key, ref]) => {
        observers[key] = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsVisible(prev => ({ ...prev, [key]: true }));
            }
          });
        }, { threshold: 0.2 });

        if (ref.current) observers[key].observe(ref.current);
      });

      return () => {
        Object.values(observers).forEach(observer => observer.disconnect());
      };
    }
  }, [sectionRefs, isInitialized, isLogged]);

  const handleExploreClick = () => {
    setShowLoginDialog(true);
  };

  if (isInitialized && isLogged) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-2xl font-bold">Loading...</div>
    </div>;
  }

  if (!isInitialized) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
      <div className="text-2xl font-bold">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 text-slate-900">
      {/* Hero Section */}
      <section
        ref={sectionRefs.hero}
        className={`min-h-screen flex flex-col justify-center items-center px-4 py-16 transition-opacity duration-1000 relative overflow-hidden ${isVisible.hero ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
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

          <p className="text-2xl sm:text-4xl md:text-6xl mb-8 font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text leading-20 text-transparent">
            Listen Daily, Up Greatly
          </p>

          <div className="space-y-6">
            <p className="text-xl sm:text-2xl text-slate-700 font-medium">
              踏上英语听力提升之旅的第一步
            </p>
            <button
              ref={buttonRef}
              onClick={handleExploreClick}
              className="text-lg inline-block mt-8 px-16 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              开始学习
            </button>
          </div>
        </div>
      </section>

      {/* Features Section - 三大核心功能卡片 */}
      <section
        id="features"
        ref={sectionRefs.features}
        className={`py-20 px-4 transition-all duration-1000 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            三大核心功能
          </h2>
          <p className="text-center text-slate-600 mb-16 text-lg">全面提升你的英语听力水平</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURE_LIST.map((feature, index) => (
              <div
                key={feature.id}
                className="bg-white px-4 py-6 rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-transparent hover:border-purple-300"
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
                  <span className="text-3xl font-bold text-slate-400">0{feature.id}</span>
                  <h3 className="text-2xl font-bold text-slate-900">{feature.title}</h3>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-slate-500 mb-2">适用场景：</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.targets.map((target, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 bg-gradient-to-r ${feature.color} bg-opacity-10 text-white rounded-full text-xs font-medium border border-slate-200`}
                      >
                        {target}
                      </span>
                    ))}
                  </div>
                  {feature.aiFeatures && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-slate-500 mb-2">AI评估维度：</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.aiFeatures.map((ai, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200"
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

      {/* Feature Showcases - MacBook 展示区 */}
      <section
        ref={sectionRefs.showcases}
        className={`py-20 px-4 bg-white transition-all duration-1000 ${isVisible.showcases ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="lg:max-w-7xl 2xl:max-w-[1536px] mx-auto space-y-32">
          {FEATURE_CASE_LIST.map((item, index) => (
            <div
              key={item.title}
              className={`flex flex-col py-12 ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}
              style={{
                opacity: isVisible.showcases ? 1 : 0,
                transform: isVisible.showcases ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 700ms ${index * 200}ms ease-out`
              }}
            >
              {/* 文字介绍 */}
              <div className="lg:w-1/3 text-center lg:text-left">
                <h3 className={`text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                  {item.title}
                </h3>
                <p className="text-xl text-slate-700 font-medium mb-4">{item.subtitle}</p>
                <p className="text-slate-500 leading-relaxed mb-6">{item.description}</p>
                <button
                  onClick={() => router.push(item.route)}
                  className={`px-8 py-3 bg-gradient-to-r ${item.color} text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer`}
                >
                  立即体验
                </button>
              </div>
              {/* MacBook 展示 */}
              <div className="lg:w-2/3">
                <MacBookPreview video={item.video} alt={item.title} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fixed Button */}
      <div
        className={`fixed bottom-[60px] left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
          isButtonVisible ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 pointer-events-auto translate-y-0'
        }`}
      >
        <button
          onClick={handleExploreClick}
          className="text-lg px-16 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          开始学习
        </button>
      </div>

      {/* Voice Preview Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            四种高品质发音
          </h2>
          <p className="text-center text-slate-600 mb-16 text-lg">美音 / 英音，男声 / 女声，随心切换</p>
          <VoicePreviewSection />
        </div>
      </section>

      {/* User Reviews Section */}
      <section
        ref={sectionRefs.reviews}
        className={`py-20 transition-all duration-1000 overflow-hidden ${isVisible.reviews ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            用户反馈
          </h2>
          <p className="text-center text-slate-600 mb-16 text-lg">来自真实用户的声音</p>
        </div>
        <div className="relative">
          <ReviewMarquee />
        </div>
      </section>

      {/* FAQ Section */}
      <section
        ref={sectionRefs.faq}
        className={`py-20 px-4 transition-all duration-1000 ${isVisible.faq ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:gap-16">
            <div className="lg:w-1/3 mb-10 lg:mb-0">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                常见问题
              </h2>
              <p className="text-slate-500 text-lg">获取常见问题的解答</p>
            </div>
            <div className="lg:w-2/3 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
              {FAQ_LIST.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-12 px-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
        <div className="max-w-6xl mx-auto text-center z-10">
          <GradientText
            colors={["#3b82f6", "#8b5cf6", "#ec4899", "#3b82f6"]}
            animationSpeed={2}
            showBorder={false}
          >
            <h2 className="text-3xl font-bold mb-6">Listenly.cn</h2>
          </GradientText>
          <p className="text-slate-600 mb-8 font-medium">Listen Daily, Up Greatly</p>
          <div className="flex justify-center items-center gap-2 text-sm text-slate-500 pb-8">
            <p>Copyright© {new Date().getFullYear()} </p>
            <p>
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 transition-colors"
              >
                鄂ICP备2023019395号-2
              </a>
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default HomePage;
