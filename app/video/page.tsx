import { Clapperboard } from 'lucide-react'

export default function VideoPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] -mt-14">
            <Clapperboard className='text-indigo-600 w-20 h-20' />
            <p className="text-4xl text-slate-800 dark:text-slate-100 mt-8">看视频学英语，4月即将上线</p>
            <p className="text-4xl text-slate-800 mt-4 font-extralight">Coming Soon~</p>
        </div>
    )
}
