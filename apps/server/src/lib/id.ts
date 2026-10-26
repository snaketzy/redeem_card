import { randomBytes } from 'node:crypto';
import { CARD_ALPHABET } from './cardCode.js';

/**
 * 生成非自增的随机业务 ID（cuid 风格）。
 * 主键必须不可预测，避免攻击者通过穷举自增 ID 遍历点卡。
 */
export function createId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(8).toString('hex');
  return `${prefix}_${time}${rand}`;
}

function randomAlphabetChars(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CARD_ALPHABET[bytes[i] % CARD_ALPHABET.length];
  }
  return out;
}

/** 批次号：B + yyyyMMdd + 4 位随机字符，便于人工识别与按批检索 */
export function createBatchNo(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `B${y}${m}${d}-${randomAlphabetChars(4)}`;
}

/** 生成形如 RC-xxxx 的演示用户 ID */
export function createDemoUserId(): string {
  return `U${randomBytes(4).toString('hex').toUpperCase()}`;
}
