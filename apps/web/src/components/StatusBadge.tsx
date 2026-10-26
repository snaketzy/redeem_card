import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BenefitPeriod, BenefitType, CardStatus } from '@/types';

const STATUS_STYLE: Record<CardStatus, { variant: 'success' | 'muted' | 'destructive'; className?: string }> = {
  0: { variant: 'muted', className: 'bg-success/12 text-success' },
  1: { variant: 'muted', className: 'bg-muted text-muted-foreground' },
  2: { variant: 'muted', className: 'bg-destructive/10 text-destructive' },
};

export function StatusBadge({ status, label }: { status: CardStatus; label: string }) {
  const style = STATUS_STYLE[status];
  return (
    <Badge variant="muted" className={cn('font-medium', style.className)}>
      {label}
    </Badge>
  );
}

export function BenefitTypeBadge({ type, label }: { type: BenefitType; label: string }) {
  return (
    <Badge
      variant="muted"
      className={cn(
        'font-medium',
        type === 'family' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground',
      )}
    >
      {label}
    </Badge>
  );
}

export function BenefitPeriodBadge({ period, label }: { period: BenefitPeriod; label: string }) {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {label}
    </Badge>
  );
}
