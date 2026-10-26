import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BenefitPeriod, BenefitType } from '@/types';

interface PointCardPreviewProps {
  code: string;
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  typeLabel: string;
  periodLabel: string;
  batchNo?: string;
  /** 权益期截止日：按所选权益周期计算，永久卡为 2099-12-31 */
  rightsUntil: string;
  className?: string;
}

/** 拟物化点卡预览：用于生成页确认卡面与卡密排版是否符合发放要求 */
export function PointCardPreview({
  code,
  benefitType,
  benefitPeriod,
  typeLabel,
  periodLabel,
  batchNo,
  rightsUntil,
  className,
}: PointCardPreviewProps) {
  const groups = code.split('-');

  return (
    <Card
      className={cn(
        'card-face relative aspect-[1.6/1] w-full max-w-sm gap-0 overflow-hidden border-0 py-0 text-white shadow-lg',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
        <div className="absolute -top-10 -right-8 size-40 rounded-full border border-white/60" />
        <div className="absolute -bottom-14 -left-6 size-48 rounded-full border border-white/40" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-white/55 uppercase">Redeem Card</p>
            <p className="mt-1 text-lg leading-tight font-semibold">{typeLabel}</p>
            <p className="text-xs text-white/70">{periodLabel}</p>
          </div>
          <span className="rounded-full bg-white/14 px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm">
            {benefitType === 'family' ? '4 人共享' : '单人专属'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {groups.map((group, index) => (
              <span
                key={`${group}-${index}`}
                className="rounded-md bg-white/10 py-2 text-center font-mono text-[13px] leading-none tracking-wider tabular-nums backdrop-blur-sm"
              >
                {group}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>{batchNo ? `批次 ${batchNo}` : '批次 —'}</span>
            <span>权益期至 {rightsUntil}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
