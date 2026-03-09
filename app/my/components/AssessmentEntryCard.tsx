'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, GraduationCap } from 'lucide-react'

const AssessmentEntryCard = () => {
  const router = useRouter()

  return (
    <div
      className="px-3 py-3 bg-card rounded-xl border border-border hover:shadow-md transition-all duration-200 cursor-pointer group hover:scale-[1.02]"
      onClick={() => router.push('/my/assessment')}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">词汇量测评</h3>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <p className="text-sm text-muted-foreground">
        50 道自适应测试题，精准评估你的英语词汇量
      </p>
      <div className="text-sm text-indigo-500 mt-2 w-full text-right cursor-pointer">
        开始测评
      </div>
    </div>
  )
}

export default AssessmentEntryCard
