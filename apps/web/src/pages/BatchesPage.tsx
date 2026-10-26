import { Download, Layers, Lock, MoreHorizontal, Unlock, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, PageHeader, TableSkeleton } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/Pagination';
import { BenefitPeriodBadge, BenefitTypeBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import { formatDate, formatNumber, percent } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';
import { patchFilters, resetFilters } from '@/store/cardFilterSlice';
import { exportCards, useListBatchesQuery, useUpdateBatchStatusMutation } from '@/store/cardApi';
import type { BatchWithStats } from '@/types';

export function BatchesPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { typeLabel, periodLabel } = useMetaLabels();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');

  const { data, isFetching } = useListBatchesQuery({ page, pageSize, keyword: keyword || undefined });
  const [updateBatchStatus, { isLoading: isUpdating }] = useUpdateBatchStatusMutation();

  const items = data?.items ?? [];

  const handleBatchStatus = async (batch: BatchWithStats, status: 0 | 2) => {
    const label = status === 2 ? '冻结' : '解冻';
    try {
      const result = await updateBatchStatus({ id: batch.id, status }).unwrap();
      toast.success(`批次已${label}`, {
        description: `${batch.batchNo} 共处理 ${result.changed} 张卡密${status === 2 ? '（默认只冻结未使用的卡）' : ''}`,
      });
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message ?? '操作失败';
      toast.error(`${label}失败`, { description: message });
    }
  };

  const handleExport = async (batch: BatchWithStats, format: 'csv' | 'txt') => {
    try {
      await exportCards({ format, filters: { batchId: batch.id } });
      toast.success(`已导出批次 ${batch.batchNo}（${format.toUpperCase()}）`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const viewCards = (batch: BatchWithStats) => {
    dispatch(resetFilters());
    dispatch(patchFilters({ batchId: batch.id, page: 1 }));
    navigate('/cards');
  };

  return (
    <>
      <PageHeader
        title="批次管理"
        description="按批次统计生成量、核销率与冻结情况，支持整批导出与作废"
        actions={
          <Button asChild>
            <Link to="/generate">新建批次</Link>
          </Button>
        }
      />

      <Card className="mb-4 py-4">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-sm space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="batch-search">
              搜索批次
            </label>
            <Input
              id="batch-search"
              placeholder="批次号 / 名称 / 备注"
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setKeyword(keywordDraft);
                  setPage(1);
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setKeyword(keywordDraft);
              setPage(1);
            }}
          >
            搜索
          </Button>
          {keyword && (
            <Button
              variant="ghost"
              onClick={() => {
                setKeyword('');
                setKeywordDraft('');
                setPage(1);
              }}
            >
              清除
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="gap-2 py-3">
        {isFetching && items.length === 0 ? (
          <TableSkeleton rows={5} columns={7} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Layers className="size-5" />}
            title="暂无批次"
            description="前往「生成点卡」创建第一个批次。"
            action={
              <Button asChild size="sm">
                <Link to="/generate">生成点卡</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>批次号</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>权益</TableHead>
                <TableHead>数量</TableHead>
                <TableHead className="w-[200px]">核销进度</TableHead>
                <TableHead>状态分布</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-mono text-xs font-medium">{batch.batchNo}</TableCell>
                  <TableCell>
                    <div className="max-w-[240px] leading-tight">
                      <p className="truncate text-sm font-medium">{batch.name}</p>
                      {batch.remark && <p className="truncate text-xs text-muted-foreground">{batch.remark}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BenefitTypeBadge type={batch.benefitType} label={typeLabel(batch.benefitType)} />
                      <BenefitPeriodBadge period={batch.benefitPeriod} label={periodLabel(batch.benefitPeriod)} />
                      {batch.benefitType === 'family' && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <Users className="size-3" />
                          {batch.groupSize} 人
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{formatNumber(batch.stats.total)}</TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Progress value={batch.stats.usedRate} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        已核销 {formatNumber(batch.stats.used)} · {percent(batch.stats.usedRate)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="success" className="bg-success/12 text-success">
                        未激活 {batch.stats.unused}
                      </Badge>
                      <Badge variant="muted">已使用 {batch.stats.used}</Badge>
                      <Badge variant="muted" className="bg-destructive/10 text-destructive">
                        冻结 {batch.stats.frozen}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="leading-tight">
                      <p>{formatDate(batch.createdAt)}</p>
                      <p>{batch.expiresAt ? `至 ${formatDate(batch.expiresAt)}` : '永久有效'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewCards(batch)}>查看该批次卡密</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport(batch, 'csv')}>
                          <Download />
                          导出 CSV（含状态）
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport(batch, 'txt')}>导出 TXT（仅卡密）</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={isUpdating} onClick={() => handleBatchStatus(batch, 2)}>
                          <Lock />
                          整批冻结（未使用的卡）
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={isUpdating} onClick={() => handleBatchStatus(batch, 0)}>
                          <Unlock />
                          整批解冻
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {items.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </Card>
    </>
  );
}
