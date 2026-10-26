import { cn } from '@/lib/utils';

interface TrendBarsProps {
  data: { date: string; count: number }[];
  className?: string;
}

/** 近 7 日成功核销趋势（纯 CSS 柱状图，避免额外图表依赖） */
export function TrendBars({ data, className }: TrendBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={cn('space-y-4 px-5', className)}>
      <div className="flex h-40 items-end gap-2">
        {data.map((item) => {
          const height = Math.max(4, Math.round((item.count / max) * 100));
          return (
            <div key={item.date} className="group flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {item.count}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary/35 to-primary transition-all group-hover:from-primary/60"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{item.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        近 7 日成功核销 <span className="font-medium text-foreground">{total}</span> 次
      </p>
    </div>
  );
}
