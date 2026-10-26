import { AlertTriangle, CreditCard, Layers, Lock, ShieldCheck, TicketCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TrendBars } from '@/components/TrendBars';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatNumber, percent } from '@/lib/format';
import { useGetOverviewQuery } from '@/store/cardApi';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import type { BenefitPeriod, BenefitType, CardStatus } from '@/types';

export function DashboardPage() {
  const { data, isLoading, isError } = useGetOverviewQuery();
  const { statusLabel, typeLabel, periodLabel, actionLabel } = useMetaLabels();

  const total = data?.total ?? 0;

  const distribution = [
    ...(data
      ? (Object.entries(data.byBenefitType) as [BenefitType, number][]).map(([key, value]) => ({
          key: `type-${key}`,
          label: typeLabel(key),
          value,
          total,
        }))
      : []),
    ...(data
      ? (Object.entries(data.byBenefitPeriod) as [BenefitPeriod, number][]).map(([key, value]) => ({
          key: `period-${key}`,
          label: periodLabel(key),
          value,
          total,
        }))
      : []),
  ];

  return (
    <>
      <PageHeader
        title="总览"
        description="点卡生成、发放与核销的整体运行情况"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/cards">
                <CreditCard />
                卡密管理
              </Link>
            </Button>
            <Button asChild>
              <Link to="/generate">生成点卡</Link>
            </Button>
          </>
        }
      />

      {isError && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            统计数据加载失败，请确认后端服务已启动（默认 http://localhost:8787）。
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[104px] rounded-xl" />)
          : (
            <>
              <StatCard
                label="卡密总量"
                value={formatNumber(data.total)}
                hint={`${data.batchCount} 个批次`}
                icon={CreditCard}
                tone="primary"
              />
              <StatCard
                label="未激活"
                value={formatNumber(data.byStatus[0])}
                hint={`占总量的 ${percent(total ? (data.byStatus[0] / total) * 100 : 0)}`}
                icon={TicketCheck}
                tone="success"
              />
              <StatCard
                label="已使用"
                value={formatNumber(data.byStatus[1])}
                hint={`核销率 ${percent(data.usedRate)}`}
                icon={ShieldCheck}
                tone="default"
              />
              <StatCard
                label="已冻结 / 作废"
                value={formatNumber(data.byStatus[2])}
                hint={`7 天内到期 ${data.expiringIn7Days} 张`}
                icon={Lock}
                tone="destructive"
              />
            </>
          )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>核销趋势</CardTitle>
            <CardDescription>近 7 日成功核销次数（含家庭卡成员加入）</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading || !data ? <Skeleton className="h-40 w-full" /> : <TrendBars data={data.redeemTrend} className="px-0" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权益分布</CardTitle>
            <CardDescription>按权益类型与周期统计卡密数量</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-1">
            {isLoading || !data
              ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)
              : distribution.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium tabular-nums">{formatNumber(item.value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${item.total ? Math.max(2, (item.value / item.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
            {data && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  家庭卡席位已占用
                  <span className="font-medium tabular-nums text-foreground">
                    {data.familySeats.used} / {data.familySeats.total}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>最近核销</CardTitle>
          <CardDescription>最新 5 条核销 / 家庭卡加入记录</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/logs">查看全部</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading || !data ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
          ) : data.recentRedemptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无核销记录</p>
          ) : (
            data.recentRedemptions.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/25 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-card px-2 py-1 font-mono text-[12px] shadow-xs">{log.displayCode}</span>
                  <StatusBadge
                    status={log.success ? 1 : 2}
                    label={actionLabel(log.action)}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{log.account ?? '—'}</span>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="批次数量"
          value={formatNumber(data?.batchCount ?? 0)}
          hint="按批次可整批导出或作废"
          icon={Layers}
          tone="default"
        />
        <StatCard
          label="状态口径"
          value={`${statusLabel(0 as CardStatus)} / ${statusLabel(1 as CardStatus)} / ${statusLabel(2 as CardStatus)}`}
          hint="status：0 未激活、1 已使用、2 已冻结"
          icon={Lock}
          tone="default"
        />
      </div>
    </>
  );
}
