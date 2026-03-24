"use client";

export default function Empty({ text = '暂无数据', size = 'base' }: { text?: string, size?: 'base' | 'sm' }) {
  return (
    <div className={`text-center dark:text-slate-400 ${size === 'sm' ? 'mt-3' : 'mt-6'} flex flex-col justify-center items-center`}>
      <svg className={`${size === 'sm' ? 'w-28 h-28 md:w-32 md:h-32' : 'w-48 h-48 md:w-64 md:h-64' }`} viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="160" cy="160" r="110" fill="#EEF2FF" />
        <path d="M90 110C90 104.477 94.4772 100 100 100H140L155 115H220C225.523 115 230 119.477 230 125V210C230 215.523 225.523 220 220 220H100C94.4772 220 90 215.523 90 210V110Z" fill="#C7D2FE" stroke="#4F46E5" strokeWidth="10" strokeLinejoin="round" />
        <rect x="110" y="120" width="100" height="80" rx="4" fill="white" stroke="#4F46E5" strokeWidth="8" strokeLinejoin="round" />
        <path d="M130 150H190" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        <path d="M130 170H170" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 150C80 144.477 84.4772 140 90 140H230C235.523 140 240 144.477 240 150V210C240 215.523 235.523 220 230 220H90C84.4772 220 80 215.523 80 210V150Z" fill="white" stroke="#4F46E5" strokeWidth="10" strokeLinejoin="round" />
        <path d="M135 180 Q 140 175 145 180" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M175 180 Q 180 175 185 180" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="160" cy="192" r="4" fill="#F43F5E" />
        <path d="M210 90H225L210 105H225" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M235 70H245L235 80H245" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={`${size === 'sm' ? 'text-sm' : 'text-base ' } font-bold`}>{text}</div>
    </div>
  );
}
