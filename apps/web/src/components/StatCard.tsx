import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/16 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', className }: StatCardProps) {
  return (
    <Card className={cn('gap-3 py-4', className)}>
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
    </Card>
  );
}
