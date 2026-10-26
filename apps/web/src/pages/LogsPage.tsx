import { ScrollText, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, PageHeader, TableSkeleton } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import { formatDateTime } from '@/lib/format';
import { useListLogsQuery } from '@/store/cardApi';

const ALL = '__all__';

export function LogsPage() {
  const { actionLabel, logActionOptions } = useMetaLabels();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string>(ALL);
  const [success, setSuccess] = useState<string>(ALL);
  const [keyword, setKeyword] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');

  const { data, isFetching } = useListLogsQuery({
    page,
    pageSize,
    action: action === ALL ? undefined : action,
    success: success === ALL ? undefined : (success as 'true' | 'false'),
    cardCode: keyword || undefined,
  });

  const items = data?.items ?? [];
  const hasFilter = action !== ALL || success !== ALL || Boolean(keyword);

  return (
    <>
      <PageHeader title="操作日志" description="生成、校验、核销、冻结等动作的全量留痕，可用于纠纷回溯与风控" />

      <Card className="mb-4 py-4">
        <CardContent className="grid gap-3 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs text-muted-foreground">卡密 / 账号</Label>
            <div className="flex gap-2">
              <Input
                placeholder="输入卡密或使用者账号"
                value={keywordDraft}
                onChange={(event) => setKeywordDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setKeyword(keywordDraft);
                    setPage(1);
                  }
                }}
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  setKeyword(keywordDraft);
                  setPage(1);
                }}
              >
                <Search />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">动作类型</Label>
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部动作</SelectItem>
                {logActionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">执行结果</Label>
            <Select
              value={success}
              onValueChange={(value) => {
                setSuccess(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部结果</SelectItem>
                <SelectItem value="true">成功</SelectItem>
                <SelectItem value="false">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilter && (
            <div className="lg:col-span-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAction(ALL);
                  setSuccess(ALL);
                  setKeyword('');
                  setKeywordDraft('');
                  setPage(1);
                }}
              >
                清除筛选
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-2 py-3">
        {isFetching && items.length === 0 ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={<ScrollText className="size-5" />} title="暂无日志记录" description="执行核销或冻结操作后会在这里留痕。" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[168px]">时间</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>卡密</TableHead>
                <TableHead>使用者</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {actionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="muted"
                      className={log.success ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive'}
                    >
                      {log.success ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.displayCode === '-' ? '—' : log.displayCode}</TableCell>
                  <TableCell className="text-xs">
                    <div className="leading-tight">
                      <p>{log.account ?? '—'}</p>
                      <p className="text-muted-foreground">{log.userId ?? ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip ?? '—'}</TableCell>
                  <TableCell className="max-w-[360px] text-xs text-muted-foreground">{log.message}</TableCell>
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
