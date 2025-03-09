'use client';

import { useState } from 'react';

export default function SyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sync-words');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("同步失败:", error);
      setResult({
        success: false,
        message: "同步请求失败",
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">单词数据同步</h1>

      <div className="flex gap-4 mb-6">
        <button
          className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50"
          onClick={handleSync}
          disabled={loading}
        >
          {loading ? '同步中...' : '开始同步'}
        </button>
      </div>

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 rounded">
          <p>正在同步数据，请耐心等待...</p>
          <p className="text-sm text-gray-600 mt-2">
            处理大量数据可能需要几分钟时间
          </p>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <p>{result.message}</p>
          {result.error && (
            <p className="text-red-600 mt-2">错误详情: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
