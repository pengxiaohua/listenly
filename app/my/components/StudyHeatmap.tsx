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

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  useEffect(() => {
    fetchStudyData();
  }, []);

  const fetchStudyData = async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      console.log('跳过重复请求');
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

  // 获取最近半年的日期范围
  const endDate = dayjs().endOf('day').toDate();
  const startDate = dayjs().subtract(6, 'month').startOf('day').toDate();

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
    <div className="w-full space-y-4">

      <div className="inline-block p-4 bg-white rounded-lg border">
        <div className="flex items-center justify-start gap-2">
          <h3 className="text-lg font-semibold">学习热力图</h3>
          <div className="text-sm text-gray-500">
            (近半年学习记录)
          </div>
        </div>
        <div className="relative">
          <TooltipProvider>
            <HeatMap
              value={heatmapValues}
              width={600}
              height={160}
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

        <div className="flex items-center justify-end gap-4 text-sm text-gray-500 pt-4">
          <span>较少</span>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
          </div>
          <span>较多</span>
        </div>
      </div>

    </div>
  );
};

export default StudyHeatmap;
