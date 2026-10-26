import { Ban, Download, Filter, Lock, RotateCcw, Search, Snowflake, Unlock, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CardCodeText } from '@/components/CardCodeText';
import { EmptyState, PageHeader, TableSkeleton } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/Pagination';
import { BenefitPeriodBadge, BenefitTypeBadge, StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import { daysLeft, formatDate, formatDateTime, toDateInputValue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { patchFilters, resetFilters } from '@/store/cardFilterSlice';
import { exportCards, useListBatchesQuery, useListCardsQuery, useUpdateCardsStatusMutation } from '@/store/cardApi';
import type { BenefitPeriod, BenefitType, Card as RedeemCard, CardStatus } from '@/types';

const ALL = '__all__';

export function CardsPage() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.cardFilter);
  const { statusLabel, typeLabel, periodLabel, statusOptions, typeOptions, periodOptions } = useMetaLabels();

  const [keywordDraft, setKeywordDraft] = useState(filters.keyword ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailCard, setDetailCard] = useState<RedeemCard | null>(null);

  const { data, isFetching, isError } = useListCardsQuery(filters);
  const { data: batchPage } = useListBatchesQuery({ pageSize: 200 });
  const [updateStatus, { isLoading: isUpdating }] = useUpdateCardsStatusMutation();

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((card) => selectedIds.includes(card.id));
  const someSelected = items.some((card) => selectedIds.includes(card.id));

  const batchOptions = useMemo(() => batchPage?.items ?? [], [batchPage]);
  const activeFilterCount = useMemo(
    () =>
      [
        filters.keyword,
        filters.status?.length ? filters.status : undefined,
        filters.benefitType,
        filters.benefitPeriod,
        filters.batchId,
        filters.createdFrom,
        filters.createdTo,
      ].filter(Boolean).length,
    [filters],
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !items.some((card) => card.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...items.map((card) => card.id)])));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleStatusChange = async (status: CardStatus, label: string) => {
    if (selectedIds.length === 0) {
      toast.warning('请先勾选需要操作的卡密');
      return;
    }
    try {
      const result = await updateStatus({ ids: selectedIds, status }).unwrap();
      toast.success(`${label}完成`, { description: `成功处理 ${result.changed} 张（提交 ${result.requested} 张）` });
      setSelectedIds([]);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message ?? '操作失败';
      toast.error(`${label}失败`, { description: message });
    }
  };

  const handleExport = async (format: 'csv' | 'txt') => {
    try {
      await exportCards({ format, ids: selectedIds.length ? selectedIds : undefined, filters });
      toast.success(selectedIds.length ? `已导出选中的 ${selectedIds.length} 张卡密` : '已按当前筛选条件导出');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  return (
    <>
      <PageHeader
        title="卡密管理"
        description="按批次、状态、权益与使用者检索卡密，支持批量冻结、解冻与导出"
        actions={
          <>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download />
              导出 CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('txt')}>
              <Download />
              导出 TXT
            </Button>
          </>
        }
      />

      <Card className="mb-4 gap-4 py-4">
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs text-muted-foreground">关键词</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="卡密 / 使用者账号 / 用户 ID / 批次号"
                  value={keywordDraft}
                  onChange={(event) => setKeywordDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') dispatch(patchFilters({ keyword: keywordDraft, page: 1 }));
                  }}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => dispatch(patchFilters({ keyword: keywordDraft, page: 1 }))}
                >
                  <Search />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">状态 status</Label>
              <Select
                value={filters.status?.length === 1 ? String(filters.status[0]) : ALL}
                onValueChange={(value) =>
                  dispatch(patchFilters({ status: value === ALL ? [] : [Number(value) as CardStatus], page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部状态</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">权益类型</Label>
              <Select
                value={filters.benefitType ?? ALL}
                onValueChange={(value) =>
                  dispatch(patchFilters({ benefitType: value === ALL ? undefined : (value as BenefitType), page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部类型</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">权益周期</Label>
              <Select
                value={filters.benefitPeriod ?? ALL}
                onValueChange={(value) =>
                  dispatch(patchFilters({ benefitPeriod: value === ALL ? undefined : (value as BenefitPeriod), page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部周期</SelectItem>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">所属批次</Label>
              <Select
                value={filters.batchId ?? ALL}
                onValueChange={(value) => dispatch(patchFilters({ batchId: value === ALL ? undefined : value, page: 1 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>全部批次</SelectItem>
                  {batchOptions.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchNo} · {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">创建时间起</Label>
              <Input
                type="date"
                value={toDateInputValue(filters.createdFrom)}
                onChange={(event) =>
                  dispatch(
                    patchFilters({
                      createdFrom: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined,
                      page: 1,
                    }),
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">创建时间止</Label>
              <Input
                type="date"
                value={toDateInputValue(filters.createdTo)}
                onChange={(event) =>
                  dispatch(
                    patchFilters({
                      createdTo: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
                      page: 1,
                    }),
                  )
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="size-3.5" />
              已启用 {activeFilterCount} 个筛选条件
            </span>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <span className="text-xs text-muted-foreground">
              已选 <span className="font-medium text-foreground">{selectedIds.length}</span> 张
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isUpdating || selectedIds.length === 0}
                onClick={() => handleStatusChange(2, '冻结')}
              >
                <Lock />
                批量冻结
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isUpdating || selectedIds.length === 0}
                onClick={() => handleStatusChange(0, '解冻')}
              >
                <Unlock />
                批量解冻
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedIds.length === 0}
                onClick={() => setSelectedIds([])}
              >
                <RotateCcw />
                清除选择
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  dispatch(resetFilters());
                  setKeywordDraft('');
                  setSelectedIds([]);
                }}
              >
                重置筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-2 py-3">
        {isError ? (
          <EmptyState
            icon={<Ban className="size-5" />}
            title="卡密列表加载失败"
            description="请确认后端服务已启动（默认 http://localhost:8787）。"
          />
        ) : isFetching && items.length === 0 ? (
          <TableSkeleton rows={8} columns={8} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="没有匹配的卡密"
            description="调整筛选条件，或前往「生成点卡」创建新的卡密批次。"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>卡密</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>权益</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>使用者</TableHead>
                <TableHead>核销时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((card) => {
                const left = daysLeft(card.expiresAt);
                const selected = selectedIds.includes(card.id);
                return (
                  <TableRow
                    key={card.id}
                    data-state={selected ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => setDetailCard(card)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox checked={selected} onCheckedChange={() => toggleOne(card.id)} />
                    </TableCell>
                    <TableCell>
                      <CardCodeText code={card.displayCode} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={card.status} label={statusLabel(card.status)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BenefitTypeBadge type={card.benefitType} label={typeLabel(card.benefitType)} />
                        <BenefitPeriodBadge period={card.benefitPeriod} label={periodLabel(card.benefitPeriod)} />
                        {card.benefitType === 'family' && (
                          <Badge variant="outline" className="gap-1 font-normal">
                            <Users className="size-3" />
                            {card.members.length}/{card.groupSize}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {data?.batchNos[card.batchId] ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(card.createdAt)}</TableCell>
                    <TableCell className="text-xs">
                      {card.expiresAt ? (
                        <span
                          className={cn(
                            'text-muted-foreground',
                            left !== null && left >= 0 && left <= 7 && 'font-medium text-warning',
                            left !== null && left < 0 && 'font-medium text-destructive',
                          )}
                        >
                          {formatDate(card.expiresAt)}
                          {left !== null && left < 0 && ' · 已过期'}
                          {left !== null && left >= 0 && left <= 7 && ` · 剩 ${left} 天`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">永久</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {card.usedByUserAccount ? (
                        <div className="leading-tight">
                          <p className="font-medium">{card.usedByUserAccount}</p>
                          <p className="text-muted-foreground">{card.usedByUserId}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {card.usedAtDate ? formatDateTime(card.usedAtDate) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {items.length > 0 && (
          <Pagination
            page={filters.page ?? 1}
            pageSize={filters.pageSize ?? 20}
            total={data?.total ?? 0}
            onPageChange={(page) => dispatch(patchFilters({ page }))}
            onPageSizeChange={(pageSize) => dispatch(patchFilters({ pageSize, page: 1 }))}
          />
        )}
      </Card>

      <Dialog open={Boolean(detailCard)} onOpenChange={(open) => !open && setDetailCard(null)}>
        <DialogContent className="sm:max-w-xl">
          {detailCard && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{detailCard.displayCode}</DialogTitle>
                <DialogDescription>
                  {typeLabel(detailCard.benefitType)} · {periodLabel(detailCard.benefitPeriod)} ·{' '}
                  {statusLabel(detailCard.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailItem label="卡密主键 ID" value={detailCard.id} mono />
                <DetailItem label="批次 ID" value={detailCard.batchId} mono />
                <DetailItem label="创建时间" value={formatDateTime(detailCard.createdAt)} />
                <DetailItem
                  label="有效截止时间"
                  value={detailCard.expiresAt ? formatDateTime(detailCard.expiresAt) : '永久有效'}
                />
                <DetailItem label="使用人用户 ID" value={detailCard.usedByUserId ?? '—'} mono />
                <DetailItem label="使用人登录账号" value={detailCard.usedByUserAccount ?? '—'} />
                <DetailItem label="核销使用时间" value={formatDateTime(detailCard.usedAtDate)} />
                <DetailItem
                  label="共享名额"
                  value={`${detailCard.members.length} / ${detailCard.groupSize}`}
                />
              </div>

              {detailCard.benefitType === 'family' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">家庭组成员（{detailCard.groupSize} 人上限）</p>
                  <div className="space-y-1.5">
                    {detailCard.members.length === 0 && (
                      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">暂无成员加入</p>
                    )}
                    {detailCard.members.map((member, index) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {index + 1}
                          </span>
                          <span className="font-medium">{member.account}</span>
                          <span className="font-mono text-muted-foreground">{member.userId}</span>
                        </span>
                        <span className="text-muted-foreground">{formatDateTime(member.joinedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(detailCard.displayCode);
                    toast.success('已复制卡密');
                  }}
                >
                  复制卡密
                </Button>
                <Badge variant="outline" className="gap-1 font-normal">
                  <Snowflake className="size-3" />
                  冻结 / 解冻请在列表中勾选后操作
                </Badge>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm break-all', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}
