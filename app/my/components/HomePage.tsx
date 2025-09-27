'use client'

import StudyHeatmap from "./StudyHeatmap"
import { } from 'lucide-react'

const HomePage = () => {

  return (
    <div>
      <div className="flex">
        <div className="flex-1 h-[258px] flex flex-col gap-4 mr-6">
          <div className="p-4 bg-white rounded-lg border h-[50%]">
            <h3 className="text-lg font-semibold">生词本</h3>
            <div className="flex justify-between">
              <div>
                单词xx个
              </div>
              <div>
                句子xx个
              </div>
            </div>

          </div>
          <div className="p-4 bg-white rounded-lg border  h-[50%]">
            <h3 className="text-lg font-semibold">错词本</h3>
            <div className="flex justify-between">
              <div>
                单词xx个
              </div>
              <div>
                句子xx个
              </div>
            </div>
          </div>
        </div>
        <StudyHeatmap />
      </div>
      <div className="flex w-full gap-4">
        <div className="flex-1 p-4 bg-white rounded-lg border h-[50%] mt-4">
          <h3 className="text-lg font-semibold">学习记录</h3>
          <div className="flex justify-between">
            <div>
              单词拼写xx个
            </div>
            <div>
              句子听写xx个
            </div>
          </div>
        </div>
        <div className="w-[300px] p-4 bg-white rounded-lg border h-[50%] mt-4">
          <h3 className="text-lg font-semibold">最近学习</h3>
          <div className="flex justify-between">
            <div>
              单词xx个
            </div>
            <div>
              句子xx个
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
