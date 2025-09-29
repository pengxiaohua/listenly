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

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  useEffect(() => {
    fetchStudyData();

    // 检测是否为移动端
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const fetchStudyData = async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

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

  // 转换数据格式为热力图需要的格式
  const heatmapValues: HeatmapValue[] = studyData.map(item => ({
    date: item.date,
    count: item.minutes, // 使用分钟数作为热力图的数值
    content: item.minutes > 0 ? `${item.date} 学习 ${item.minutes} 分钟` : undefined
  }));

  // 根据设备类型获取不同的日期范围
  const endDate = dayjs().endOf('day').toDate();
  const startDate = isMobile
    ? dayjs().subtract(3, 'month').startOf('day').toDate()  // 移动端显示3个月
    : dayjs().subtract(6, 'month').startOf('day').toDate(); // 桌面端显示6个月

  if (loading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
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
          {isMobile ? '(近3个月学习记录)' : '(近半年学习记录)'}
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <TooltipProvider>
          <HeatMap
            value={heatmapValues}
            width={isMobile ? 300 : 600}
            height={isMobile ? 120 : 160}
            startDate={startDate}
            endDate={endDate}
            legendCellSize={0}
            // 单个块的尺寸
            rectSize={18}
            rectProps={{
              rx: 10,
            }}
            panelColors={{
              0: '#ebedf0',    // 未学习
              1: '#c6e48b',    // 1-10分钟
              10: '#7bc96f',   // 10-20分钟
              20: '#239a3b',   // 20-40分钟
              40: '#196127',   // 40分钟以上
            }}
            weekLabels={['日', '一', '二', '三', '四', '五', '六']}
            monthLabels={[
              '一月', '二月', '三月', '四月', '五月', '六月',
              '七月', '八月', '九月', '十月', '十一月', '十二月'
            ]}
            rectRender={(props, data) => {
              // 使用dayjs统一日期格式为YYYY-MM-DD
              const formattedDate = dayjs(data.date).format('YYYY-MM-DD');
              const studyInfo = studyData.find(item => item.date === formattedDate);
              const minutes = studyInfo?.minutes || 0;
              const tooltipText = minutes > 0
                ? `${dayjs(data.date).format('YYYY年MM月DD日')} 学习 ${minutes} 分钟`
                : `${dayjs(data.date).format('YYYY年MM月DD日')} 未学习`;

              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <rect {...props} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }}
          />
        </TooltipProvider>
      </div>

      <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground pt-4">
        <span>较少</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-muted rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 dark:bg-green-800 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-800 dark:bg-green-400 rounded-sm"></div>
        </div>
        <span>较多</span>
      </div>
    </div>
  );
};

export default StudyHeatmap;
