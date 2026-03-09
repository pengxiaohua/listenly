'use client';

interface CountdownRingProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
}

export default function CountdownRing({ timeLeft, totalTime, size = 52 }: CountdownRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const dashOffset = circumference * (1 - progress);

  const isUrgent = timeLeft <= 3;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`transition-all duration-1000 ease-linear ${isUrgent ? 'stroke-rose-500' : 'stroke-indigo-500'}`}
        />
      </svg>
      <span
        className={`absolute text-sm font-semibold tabular-nums ${isUrgent ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}
      >
        {timeLeft}
      </span>
    </div>
  );
}
