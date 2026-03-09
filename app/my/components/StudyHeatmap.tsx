'use client';

import React, { useEffect, useState, useRef } from 'react';
import HeatMap from '@uiw/react-heat-map';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import dayjs from 'dayjs';

interface StudyData {
  date: string;
  count: number;
  minutes: number;
}

interface HeatmapValue {
  date: string;
  count: number;
  content?: string;
}

const StudyHeatmap: React.FC = () => {
  const [studyData, setStudyData] = useState<StudyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  useEffect(() => {
    fetchStudyData();

    // 检测是否为移动端
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 数据加载完成后滚动到最右侧（当前月份）
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      // 等待 SVG 渲染完成后再滚动
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
      });
    }
  }, [loading, isMobile]);

  const fetchStudyData = async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;

    try {
      const response = await fetch('/api/user/study-heatmap');
      const result = await response.json();

      if (result.success) {
        setStudyData(result.data);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取学习热力图数据失败:', err);
      setError('获取数据失败');
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  };

  const heatmapValues: HeatmapValue[] = studyData.map(item => ({
    date: item.date,
    count: item.minutes,
    content: item.minutes > 0 ? `${item.date} 学习 ${item.minutes} 分钟` : undefined
  }));

  const endDate = dayjs().endOf('day').toDate();
  const startDate = isMobile
    ? dayjs().subtract(6, 'month').startOf('day').toDate()  // 移动端显示近半年
    : dayjs().subtract(12, 'month').startOf('day').toDate(); // 桌面端显示近一年

  // rectSize 和 space
  const rectSize = isMobile ? 12 : 14;
  const space = 2;

  // 根据日期范围计算需要的列数（周数），再算出 SVG 宽度
  const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day');
  const totalWeeks = Math.ceil(totalDays / 7) + 1;
  const leftPad = 28; // weekLabels 占位
  const heatmapWidth = leftPad + totalWeeks * (rectSize + space);

  if (loading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="text-rose-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-start gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">学习热力图</h3>
        <div className="text-sm text-muted-foreground">
          {isMobile ? '(近半年学习记录)' : '(近一年学习记录)'}
        </div>
      </div>

      {/* 可左右滚动，默认滚到最右侧（当前月份） */}
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <TooltipProvider>
          <HeatMap
            value={heatmapValues}
            width={heatmapWidth}
            startDate={startDate}
            endDate={endDate}
            legendCellSize={0}
            rectSize={rectSize}
            space={space}
            rectProps={{ rx: rectSize / 2 }}
            panelColors={{
              0: '#ebedf0',
              1: '#c6e48b',
              10: '#7bc96f',
              20: '#239a3b',
              40: '#196127',
            }}
            weekLabels={['日', '一', '二', '三', '四', '五', '六']}
            monthLabels={['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']}
            rectRender={(props, data) => {
              const formattedDate = dayjs(data.date).format('YYYY-MM-DD');
              const studyInfo = studyData.find(item => item.date === formattedDate);
              const minutes = studyInfo?.minutes || 0;
              const tooltipText = minutes > 0
                ? `${dayjs(data.date).format('YYYY年MM月DD日')} \n 学习 ${minutes} 分钟`
                : `${dayjs(data.date).format('YYYY年MM月DD日')} \n 未学习`;

              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <rect {...props} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="whitespace-pre-line text-xs">{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }}
          />
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
        <span>较少</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-muted rounded-sm"></div>
          <div className="w-3 h-3 bg-emerald-200 dark:bg-emerald-800 rounded-sm"></div>
          <div className="w-3 h-3 bg-emerald-400 dark:bg-emerald-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-emerald-600 dark:bg-emerald-500 rounded-sm"></div>
          <div className="w-3 h-3 bg-emerald-800 dark:bg-emerald-400 rounded-sm"></div>
        </div>
        <span>较多</span>
      </div>
    </div>
  );
};

export default StudyHeatmap;
