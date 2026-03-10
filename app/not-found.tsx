import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="h-[calc(100vh-65px)] bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <svg className="w-64 h-64 md:w-80 md:h-80 mb-8" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="160" y="220" fontSize="180" fontWeight="900" fill="#E0E7FF" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="-0.05em">404</text>
                <path d="M90 170V120C90 81.3401 121.34 50 160 50C198.66 50 230 81.3401 230 120V170" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" />
                <rect x="74" y="150" width="32" height="64" rx="16" fill="#4F46E5" />
                <rect x="214" y="150" width="32" height="64" rx="16" fill="#4F46E5" />
                <rect x="106" y="166" width="8" height="32" rx="4" fill="#C7D2FE" />
                <rect x="206" y="166" width="8" height="32" rx="4" fill="#C7D2FE" />
                <path d="M90 214C90 250 110 270 140 270" stroke="#4F46E5" strokeWidth="10" strokeLinecap="round" />
                <path d="M230 214C230 240 210 260 180 265" stroke="#4F46E5" strokeWidth="10" strokeLinecap="round" />
                <path d="M150 260L155 250M165 260L160 250M155 275L165 265" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
                <circle cx="160" cy="110" r="24" fill="#F43F5E" />
                <path d="M155 100C155 95 165 95 165 100C165 105 160 108 160 113" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="160" cy="122" r="2.5" fill="white" />
            </svg>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 text-center tracking-tight">
                哎呀，页面走丢了
            </h1>
            <Link
                href="/"
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
            >
                <Home size={20} />
                返回首页
            </Link>
        </div>
    );
}
