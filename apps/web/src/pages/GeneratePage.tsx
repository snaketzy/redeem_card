import {
  Copy,
  Dices,
  Download,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CardCodeText } from '@/components/CardCodeText';
import { PageHeader } from '@/components/layout/PageHeader';
import { PointCardPreview } from '@/components/PointCardPreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import { formatDateTime, formatNumber, periodEndDate } from '@/lib/format';
import { exportCards, useGenerateCardsMutation } from '@/store/cardApi';
import type { BenefitPeriod, BenefitType, Card as RedeemCard, GenerateCardsResponse, ValidityMode } from '@/types';

const QUANTITY_PRESETS = [50, 100, 500, 1000, 5000];

interface FormState {
  benefitType: BenefitType;
  benefitPeriod: BenefitPeriod;
  quantity: number;
  batchName: string;
  validityMode: ValidityMode;
  validityDays: number;
  expiresAt: string;
  familyGroupSize: number;
  remark: string;
}

const INITIAL_FORM: FormState = {
  benefitType: 'personal',
  benefitPeriod: 'month',
  quantity: 100,
  batchName: '',
  validityMode: 'days',
  validityDays: 365,
  expiresAt: '',
  familyGroupSize: 4,
  remark: '',
};

export function GeneratePage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<GenerateCardsResponse | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [generateCards, { isLoading }] = useGenerateCardsMutation();
  const { meta, typeLabel, periodLabel, typeOptions, periodOptions, periodMonths, lifetimeRightsUntil } =
    useMetaLabels();

  const PREVIEW_PAGE_SIZE = 60;
  const previewCodes = useMemo(() => result?.preview ?? [], [result]);
  const previewPageCount = Math.max(1, Math.ceil(previewCodes.length / PREVIEW_PAGE_SIZE));
  const visibleCodes = previewCodes.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    try {
      const response = await generateCards({
        benefitType: form.benefitType,
        benefitPeriod: form.benefitPeriod,
        quantity: Number(form.quantity),
        batchName: form.batchName.trim() || undefined,
        validityMode: form.validityMode,
        validityDays: form.validityMode === 'days' ? Number(form.validityDays) : undefined,
        expiresAt: form.validityMode === 'date' ? new Date(form.expiresAt).toISOString() : undefined,
        remark: form.remark.trim() || undefined,
        groupSize: form.benefitType === 'family' ? Number(form.familyGroupSize) : undefined,
      }).unwrap();

      setResult(response);
      setPreviewPage(0);
      toast.success(`已生成 ${response.total} 张卡密`, { description: `批次号 ${response.batch.batchNo}` });
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message ?? '生成失败，请重试';
      toast.error('生成失败', { description: message });
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.preview.map((card) => card.displayCode).join('\n'));
    toast.success(`已复制 ${result.preview.length} 条卡密`);
  };

  const handleExport = async (format: 'csv' | 'txt') => {
    if (!result) return;
    try {
      await exportCards({ format, filters: { batchId: result.batch.id } });
      toast.success(`已导出本批次卡密（${format.toUpperCase()}）`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const sampleCard: RedeemCard | undefined = result?.preview[0];

  const isLifetime = form.benefitPeriod === 'lifetime';
  // 权益期至：按所选权益周期推算自然周期截止日；永久卡固定为 2099-12-31
  const periodMonthCount = periodMonths(form.benefitPeriod);
  const rightsUntil =
    periodMonthCount === null ? lifetimeRightsUntil : periodEndDate(periodMonthCount);

  return (
    <>
      <PageHeader
        title="生成点卡"
        description="使用密码学安全随机数批量生成卡密，不做自增序列，避免被穷举刷取"
        actions={
          <Button variant="outline" asChild>
            <Link to="/cards">查看卡密列表</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>卡密参数</CardTitle>
              <CardDescription>生成后参数写入批次，便于按批次导出、统计与批量作废</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="benefitType">权益类型 benefit_type</Label>
                  <Select
                    value={form.benefitType}
                    onValueChange={(value) => update('benefitType', value as BenefitType)}
                  >
                    <SelectTrigger id="benefitType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                          {option.value === 'family' ? '（最多 4 人共享）' : '（单人）'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefitPeriod">权益周期 benefit_period</Label>
                  <Select
                    value={form.benefitPeriod}
                    onValueChange={(value) => update('benefitPeriod', value as BenefitPeriod)}
                  >
                    <SelectTrigger id="benefitPeriod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">生成数量</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={20000}
                    className="w-[160px]"
                    value={form.quantity}
                    onChange={(event) => update('quantity', Number(event.target.value))}
                  />
                  {QUANTITY_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={form.quantity === preset ? 'default' : 'outline'}
                      onClick={() => update('quantity', preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                  <span className="text-xs text-muted-foreground">单批上限 20,000</span>
                </div>
              </div>

              {form.benefitType === 'family' && (
                <div className="space-y-2">
                  <Label htmlFor="familyGroupSize">家庭组成员上限</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="familyGroupSize"
                      type="number"
                      min={2}
                      max={10}
                      className="w-[160px]"
                      value={form.familyGroupSize}
                      onChange={(event) => update('familyGroupSize', Number(event.target.value))}
                    />
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      默认 4 人一组共享权益，允许分批加入
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>卡密有效期 expires_at</Label>
                <div className={isLifetime ? 'space-y-3 pointer-events-none opacity-50' : 'space-y-3'}>
                  <Tabs
                    value={form.validityMode}
                    onValueChange={(value) => update('validityMode', value as ValidityMode)}
                  >
                    <TabsList>
                      <TabsTrigger value="days" disabled={isLifetime}>
                        按天数
                      </TabsTrigger>
                      <TabsTrigger value="date" disabled={isLifetime}>
                        指定日期
                      </TabsTrigger>
                      <TabsTrigger value="never" disabled={isLifetime}>
                        永久有效
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {form.validityMode === 'days' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        className="w-[160px]"
                        value={form.validityDays}
                        disabled={isLifetime}
                        onChange={(event) => update('validityDays', Number(event.target.value))}
                      />
                      <span className="text-xs text-muted-foreground">天</span>
                      {[90, 180, 365, 730].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          size="sm"
                          variant={form.validityDays === days ? 'default' : 'outline'}
                          disabled={isLifetime}
                          onClick={() => update('validityDays', days)}
                        >
                          {days} 天
                        </Button>
                      ))}
                    </div>
                  )}

                  {form.validityMode === 'date' && (
                    <Input
                      type="date"
                      className="w-[220px]"
                      value={form.expiresAt}
                      disabled={isLifetime}
                      onChange={(event) => update('expiresAt', event.target.value)}
                    />
                  )}

                  {form.validityMode === 'never' && (
                    <p className="text-xs text-muted-foreground">永不失效，仅依赖 status 控制（冻结 / 作废）。</p>
                  )}
                </div>

                {isLifetime && (
                  <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    永久卡的权益期固定至 {lifetimeRightsUntil}，卡密有效期将直接落库为该日期，无需单独设置。
                  </p>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batchName">批次名称</Label>
                  <Input
                    id="batchName"
                    placeholder="留空自动按权益类型命名"
                    value={form.batchName}
                    onChange={(event) => update('batchName', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remark">批次备注</Label>
                  <Input
                    id="remark"
                    placeholder="渠道 / 用途说明"
                    value={form.remark}
                    onChange={(event) => update('remark', event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                  {isLoading ? '生成中…' : '生成卡密'}
                </Button>
                <Button variant="ghost" onClick={() => setForm(INITIAL_FORM)} disabled={isLoading}>
                  重置表单
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  批次 {result.batch.batchNo} · {result.batch.name} · 创建于 {formatDateTime(result.batch.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="success">共 {formatNumber(result.total)} 张</Badge>
                  <Badge variant="outline">去重重试 {result.retries} 次</Badge>
                  <Badge variant="outline">
                    {typeLabel(result.batch.benefitType)} · {periodLabel(result.batch.benefitPeriod)}
                  </Badge>
                  <Badge variant="outline">
                    {result.batch.expiresAt ? `有效期至 ${result.batch.expiresAt.slice(0, 10)}` : '永久有效'}
                  </Badge>
                </div>

                {result.total > result.preview.length && (
                  <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    界面仅展示前 {result.preview.length} 条，完整 {formatNumber(result.total)} 条请通过导出获取。
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAll}>
                    <Copy />
                    复制展示的卡密
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                    <Download />
                    导出 CSV（本批次）
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('txt')}>
                    <FileText />
                    导出 TXT（仅卡密）
                  </Button>
                </div>

                <div className="rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span>卡密预览（点击单条可复制）</span>
                    {previewPageCount > 1 && (
                      <span className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={previewPage <= 0}
                          onClick={() => setPreviewPage((page) => page - 1)}
                        >
                          上一页
                        </Button>
                        {previewPage + 1} / {previewPageCount}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={previewPage >= previewPageCount - 1}
                          onClick={() => setPreviewPage((page) => page + 1)}
                        >
                          下一页
                        </Button>
                      </span>
                    )}
                  </div>
                  <div className="grid gap-1 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleCodes.map((card) => (
                      <CardCodeText key={card.id} code={card.displayCode} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>卡面预览</CardTitle>
              <CardDescription>确认卡密排版与发放形态</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <PointCardPreview
                code={sampleCard?.displayCode ?? meta?.cardFormat.sample ?? 'ABCD-EFGH-JKMN-PQRS'}
                benefitType={form.benefitType}
                benefitPeriod={form.benefitPeriod}
                typeLabel={typeLabel(form.benefitType)}
                periodLabel={periodLabel(form.benefitPeriod)}
                batchNo={result?.batch.batchNo}
                rightsUntil={rightsUntil}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>生成规则</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                <p>
                  随机源为 <code className="rounded bg-muted px-1 py-0.5">crypto.randomBytes</code> + 拒绝采样，
                  无取模偏差；不使用自增 ID 或有规律序列。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Dices className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p>
                  字符集
                  <code className="mx-1 rounded bg-muted px-1 py-0.5">2-9 A-Z</code>
                  已剔除 0 / O 与 1 / I / L，共 {meta?.cardFormat.alphabet.length ?? 31} 个字符。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  {meta?.cardFormat.length ?? 16} 位 4×4 排版（{meta?.cardFormat.sample ?? 'ABCD-EFGH-JKMN-PQRS'}），
                  末位为加权校验位，手输错误可即时识别。
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 size-3.5 shrink-0" />
                <p>家庭卡一组 {meta?.cardFormat.familyGroupSize ?? 4} 人共享，成员可分批加入，同一账号重复提交幂等。</p>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>下一步</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link to="/cards">在卡密管理中筛选本批次</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/batches">查看批次统计</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
