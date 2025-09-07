'use client';

import { useState } from 'react';
import WordRecords from './WordRecords';
import SentenceRecords from './SentenceRecords';

const LearningRecords = () => {
  const [activeTab, setActiveTab] = useState<'spelling' | 'dictation'>('spelling');

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('spelling')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'spelling'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          单词拼写记录
        </button>
        <button
          onClick={() => setActiveTab('dictation')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'dictation'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          句子听写记录
        </button>
      </div>
      <div>
        {activeTab === 'spelling' ? <WordRecords /> : <SentenceRecords />}
      </div>
    </div>
  );
}

export default LearningRecords;
