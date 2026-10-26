import { AlertTriangle, BadgeCheck, ScanLine, ShieldCheck, Sparkles, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { BenefitPeriodBadge, BenefitTypeBadge, StatusBadge } from '@/components/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaLabels } from '@/hooks/useMetaLabels';
import { daysLeft, formatDateTime } from '@/lib/format';
import { useRedeemCardMutation, useVerifyCardMutation } from '@/store/cardApi';
import type { RedeemResponse, VerifyResponse } from '@/types';

/** 逐字符格式化：大写 + 过滤非法字符 + 每 4 位插入分隔符 */
function formatCardInput(value: string, maxLength = 16): string {
  const compact = value
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, maxLength);
  return compact.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

export function RedeemPage() {
  const { statusLabel, typeLabel, periodLabel, meta } = useMetaLabels();

  const [cardCode, setCardCode] = useState('');
  const [userId, setUserId] = useState('');
  const [account, setAccount] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyCard, { isLoading: isVerifying }] = useVerifyCardMutation();
  const [redeemCard, { isLoading: isRedeeming }] = useRedeemCardMutation();

  const compactCode = cardCode.replace(/-/g, '');
  const confusable = Array.from(new Set(compactCode.split('').filter((char) => '01ILO'.includes(char))));

  const reset = () => {
    setVerifyResult(null);
    setRedeemResult(null);
    setErrorMessage(null);
  };

  const handleVerify = async () => {
    reset();
    if (!compactCode) {
      toast.warning('请输入卡密');
      return;
    }
    try {
      const result = await verifyCard({ cardCode: compactCode, account: account || undefined }).unwrap();
      setVerifyResult(result);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message ?? '校验失败';
      setErrorMessage(message);
      toast.error('校验失败', { description: message });
    }
  };

  const handleRedeem = async () => {
    reset();
    if (!compactCode) {
      toast.warning('请输入卡密');
      return;
    }
    if (!userId.trim() || !account.trim()) {
      toast.warning('核销必须同时提供使用者用户 ID 与登录账号');
      return;
    }
    try {
      const result = await redeemCard({ cardCode: compactCode, userId: userId.trim(), account: account.trim() }).unwrap();
      setRedeemResult(result);
      toast.success(result.message, { description: `权益：${result.benefit}` });
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message ?? '核销失败';
      setErrorMessage(message);
      toast.error('核销失败', { description: message });
    }
  };

  const card = redeemResult?.card ?? verifyResult?.card;

  return (
    <>
      <PageHeader
        title="核销中心"
        description="模拟业务系统调用核销接口：校验卡密、开通权益、家庭卡成员加入"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader>
            <CardTitle>输入卡密</CardTitle>
            <CardDescription>
              卡密自动大写并按 4×4 分隔符排版，非法字符会被自动忽略
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cardCode">卡密</Label>
              <Input
                id="cardCode"
                value={cardCode}
                onChange={(event) => {
                  setCardCode(formatCardInput(event.target.value));
                  setVerifyResult(null);
                  setRedeemResult(null);
                  setErrorMessage(null);
                }}
                placeholder={meta?.cardFormat.sample ?? 'ABCD-EFGH-JKMN-PQRS'}
                className="h-12 font-mono text-base tracking-[0.18em]"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {compactCode.length} / {meta?.cardFormat.length ?? 16} 位
                </span>
                {confusable.length > 0 && (
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="size-3" />
                    含易混淆字符 {confusable.join(' ')}
                  </Badge>
                )}
                <span className="hidden sm:inline">字符集：2-9 A-Z（不含 0 O 1 I L）</span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="userId">使用者用户 ID (used_by_user_id)</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="如 U100231"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">使用者登录账号 (used_by_user_account)</Label>
                <Input
                  id="account"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="如 jerry.chen@ruizhi.com"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleVerify} disabled={isVerifying || isRedeeming}>
                <ScanLine />
                {isVerifying ? '校验中…' : '仅校验（不核销）'}
              </Button>
              <Button onClick={handleRedeem} disabled={isRedeeming || isVerifying}>
                <Sparkles />
                {isRedeeming ? '核销中…' : '立即核销'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCardCode('');
                  reset();
                }}
              >
                清空
              </Button>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <XCircle />
                <AlertTitle>操作未通过</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {(isVerifying || isRedeeming) && <Skeleton className="h-24 w-full" />}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {redeemResult && (
            <Card className="border-success/35">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <BadgeCheck className="size-4" />
                  {redeemResult.outcome === 'already-member' ? '已在权益组内' : '核销成功'}
                </CardTitle>
                <CardDescription>{redeemResult.message}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="权益" value={redeemResult.benefit} />
                <Row label="核销时间" value={formatDateTime(redeemResult.usedAtDate)} />
                {redeemResult.card.benefitType === 'family' && (
                  <Row label="剩余名额" value={`${redeemResult.remainingSeats} / ${redeemResult.card.groupSize}`} />
                )}
              </CardContent>
            </Card>
          )}

          {verifyResult && !redeemResult && (
            <Card className={verifyResult.usable ? 'border-primary/30' : 'border-warning/40'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verifyResult.usable ? (
                    <ShieldCheck className="size-4 text-success" />
                  ) : (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                  {verifyResult.usable ? '卡密可用' : '卡密不可用'}
                </CardTitle>
                <CardDescription>{verifyResult.reason}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="权益" value={verifyResult.benefit} />
                {verifyResult.card.benefitType === 'family' && (
                  <Row label="剩余名额" value={`${verifyResult.remainingSeats} / ${verifyResult.card.groupSize}`} />
                )}
              </CardContent>
            </Card>
          )}

          {card && (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-base">{card.displayCode}</CardTitle>
                <CardDescription>卡密状态详情</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={card.status} label={statusLabel(card.status)} />
                  <BenefitTypeBadge type={card.benefitType} label={typeLabel(card.benefitType)} />
                  <BenefitPeriodBadge period={card.benefitPeriod} label={periodLabel(card.benefitPeriod)} />
                </div>

                <div className="space-y-3 text-sm">
                  <Row label="创建时间" value={formatDateTime(card.createdAt)} />
                  <Row
                    label="有效期"
                    value={
                      card.expiresAt
                        ? `${formatDateTime(card.expiresAt)}（剩余 ${daysLeft(card.expiresAt)} 天）`
                        : '永久有效'
                    }
                  />
                  <Row label="使用者用户 ID" value={card.usedByUserId ?? '—'} />
                  <Row label="使用者登录账号" value={card.usedByUserAccount ?? '—'} />
                  <Row label="核销使用时间" value={formatDateTime(card.usedAtDate)} />
                </div>

                {card.benefitType === 'family' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Users className="size-3.5" />
                      家庭组成员 {card.members.length}/{card.groupSize}
                    </p>
                    {card.members.length === 0 ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        暂无人加入，可依次为最多 {card.groupSize} 个账号开通
                      </p>
                    ) : (
                      card.members.map((member, index) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                        >
                          <span className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {index + 1}
                            </span>
                            <span className="font-medium">{member.account}</span>
                          </span>
                          <span className="font-mono text-muted-foreground">{member.userId}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!card && !errorMessage && (
            <Card>
              <CardHeader>
                <CardTitle>核销规则</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>· 卡密格式错误会在查库前直接返回，并提示具体是哪一位字符有问题。</p>
                <p>· 已冻结（status=2）或已过期的卡密不允许核销。</p>
                <p>· 个人卡只能核销一次，重复提交返回 409 并带出原使用账号与时间。</p>
                <p>· 家庭卡按 4 人一组共享，同一账号重复提交为幂等操作，不会占额。</p>
                <p>· 所有校验与核销动作都会写入操作日志，可通过 IP + 账号回溯。</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm break-all">{value}</span>
    </div>
  );
}
