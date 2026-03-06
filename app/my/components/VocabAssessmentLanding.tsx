'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, TrendingUp, Calendar, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssessmentRecord {
  id: string;
  finalVocab: number;
  cefrLevel: string;
  phase2CorrectRate: number;
  phase3CorrectRate: number;
  createdAt: string;
}

const VocabAssessmentLanding = () => {
  const router = useRouter();
  const [latestRecord, setLatestRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestRecord = async () => {
      try {
        const res = await fetch('/api/vocab-assessment');
        const data = await res.json();
        
        if (data.records && data.records.length > 0) {
          setLatestRecord(data.records[0]);
        }
      } catch (error) {
        console.error('获取测评记录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestRecord();
  }, []);

  const handleStartTest = () => {
    router.push('/my/assessment');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!latestRecord) {
    // 首次测评
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <GraduationCap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">开始你的词汇量测评</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              通过 50 道自适应测试题，我们将精准评估你的英语词汇量水平，帮助你了解自己的真实水平。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">50</div>
                <div className="text-sm text-muted-foreground">测试题目</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">~10</div>
                <div className="text-sm text-muted-foreground">分钟完成</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">A1-C2</div>
                <div className="text-sm text-muted-foreground">CEFR 等级</div>
              </div>
            </div>
            <Button
              onClick={handleStartTest}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              开始测评
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 显示最新测评结果
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">你的词汇量</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(latestRecord.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-muted-foreground">词汇量</span>
            </div>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {latestRecord.finalVocab.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">个单词</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-muted-foreground">CEFR 等级</span>
            </div>
            <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
              {latestRecord.cefrLevel}
            </div>
            <div className="text-sm text-muted-foreground mt-1">欧洲语言标准</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="text-sm font-medium text-muted-foreground mb-4">测评准确率</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">本级正确率</span>
                <span className="font-medium text-foreground">
                  {(latestRecord.phase2CorrectRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${latestRecord.phase2CorrectRate * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">越级正确率</span>
                <span className="font-medium text-foreground">
                  {(latestRecord.phase3CorrectRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${latestRecord.phase3CorrectRate * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleStartTest}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          重新测试
        </Button>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <h4 className="font-semibold mb-3 text-foreground">关于 CEFR 等级</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">A1（入门）:</span> 0 - 1,500 词（相当于国内小学至初一水平，能进行最简单的日常问候与认读））</p>
          <p><span className="font-medium text-foreground">A2（初级）:</span> 1,500 - 3,000 词（相当于国内中考水平，能胜任基本的个人生活场景沟通）</p>
          <p><span className="font-medium text-foreground">B1（中级）:</span> 3,000 - 5,000 词（相当于国内高考或大学四级及格水平，能应对独立出国旅行）</p>
          <p><span className="font-medium text-foreground">B2（中高级）:</span> 5,000 - 8,000 词（大多数国内高考/四六级的高分区间，能顺畅表达个人观点）</p>
          <p><span className="font-medium text-foreground">C1（高级）:</span> 8,000 - 12,000 词（雅思 7.0+ 水平，能流利阅读英文外刊及专业文献）</p>
          <p><span className="font-medium text-foreground">C2（精通）:</span> 12,000 - 18,000+ 词（接近英语母语者水平，能几乎无障碍地进行深度沟通）</p>
        </div>
      </div>
    </div>
  );
};

export default VocabAssessmentLanding;
