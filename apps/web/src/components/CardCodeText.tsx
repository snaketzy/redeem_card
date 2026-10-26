import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** 等宽卡密文本，点击即可复制 */
export function CardCodeText({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('已复制卡密', { description: code });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('复制失败，请手动选择文本');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="点击复制"
      className={cn(
        'group/code inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[13px] font-medium tracking-tight transition-colors hover:bg-primary/8 hover:text-primary',
        className,
      )}
    >
      <span>{code}</span>
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 opacity-0 transition-opacity group-hover/code:opacity-60" />
      )}
    </button>
  );
}
