import {
  CreditCard,
  Database,
  Layers,
  LayoutDashboard,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useResetDemoDataMutation } from '@/store/cardApi';

const NAV_ITEMS = [
  { to: '/', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/generate', label: '生成点卡', icon: Sparkles },
  { to: '/cards', label: '卡密管理', icon: CreditCard },
  { to: '/batches', label: '批次管理', icon: Layers },
  { to: '/redeem', label: '核销中心', icon: ShieldCheck },
  { to: '/logs', label: '操作日志', icon: ScrollText },
];

export function AppShell() {
  const [resetDemoData, { isLoading }] = useResetDemoDataMutation();

  const handleReset = async () => {
    try {
      const result = await resetDemoData().unwrap();
      toast.success('演示数据已重置', { description: `${result.batches} 个批次 / ${result.cards} 张卡密` });
    } catch (error) {
      toast.error('重置失败', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground lg:flex">
        <div>
          <div className="flex items-center gap-2.5 px-5 py-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Ticket className="size-[18px]" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">点卡中心</p>
              <p className="text-[11px] text-sidebar-muted">Redeem Card</p>
            </div>
          </div>

          <nav className="mt-2 space-y-0.5 px-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent font-medium text-white'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-sidebar-border px-5 py-4">
          <div className="flex items-start gap-2 text-[11px] text-sidebar-muted">
            <Database className="mt-0.5 size-3.5 shrink-0" />
            <p>
              数据层：内存 Mock
              <br />
              重启进程即重置
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80"
            disabled={isLoading}
            onClick={handleReset}
          >
            <RefreshCcw className={cn('size-3.5', isLoading && 'animate-spin')} />
            重置演示数据
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/85 px-5 py-3 backdrop-blur lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="size-4" />
          </span>
          <span className="text-sm font-semibold">点卡中心</span>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2 py-1 text-xs whitespace-nowrap',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
