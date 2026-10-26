import { createApp } from './app.js';
import { store } from './store/memoryStore.js';
import { seedDemoData } from './store/seed.js';

const PORT = Number(process.env.PORT ?? 8787);

// Mock 阶段：进程启动时若无数据则灌入种子数据（重启即重置）
if (store.overview().total === 0) {
  const summary = seedDemoData();
  console.log(`[seed] 已灌入演示数据：${summary.batches} 个批次 / ${summary.cards} 张卡密`);
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`[server] API 已启动：http://localhost:${PORT}/api/health`);
  console.log('[server] 数据层：内存 Mock（切换 MySQL 时替换 src/store/memoryStore.ts 的实现）');
});
