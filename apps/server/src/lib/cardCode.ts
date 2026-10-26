import { randomBytes } from 'node:crypto';

/**
 * 卡密生成器
 *
 * 设计要点：
 * 1. 字符集剔除易混淆字符：0 / O、1 / I / L 全部移除，避免用户手输时看错字形。
 *    → 最终字符集 31 个字符：2-9 (8) + A-Z 去掉 I/L/O (23)。
 * 2. 使用 crypto.randomBytes 做密码学安全随机，并采用「拒绝采样」消除取模偏差
 *    （256 % 31 !== 0，直接取模会让前 8 个字符出现概率偏高）。
 * 3. 4x4 排版：15 位随机 + 1 位校验位 = 16 位，展示为 ABCD-EFGH-JKMN-PQRS，
 *    熵约 31^15 ≈ 2^74，且不属于自增/有规律序列，无法被穷举刷取。
 * 4. 校验位用加权和 mod 31（权重为位置序号 1..15），可发现任意单字符错误
 *    与相邻字符互换错误，用于前端手输预校验。
 */

/** 卡密字符集（31 字符，已剔除 0 1 I L O） */
export const CARD_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CARD_ALPHABET_SET = new Set(CARD_ALPHABET.split(''));
const ALPHABET_LENGTH = CARD_ALPHABET.length; // 31

/** 对外展示格式：4 组 x 每组 4 位 */
export const CARD_GROUPS = 4;
export const CARD_GROUP_SIZE = 4;
export const CARD_LENGTH = CARD_GROUPS * CARD_GROUP_SIZE; // 16
/** 随机位数：最后一位是校验位 */
export const CARD_PAYLOAD_LENGTH = CARD_LENGTH - 1; // 15
/** 展示用分隔符 */
export const CARD_SEPARATOR = '-';

/** 会被用户误输入的易混淆字符 */
const CONFUSABLE_CHARS = '01ILO';

/** 拒绝采样阈值：248 = 256 - (256 % 31)，>= 248 的字节直接丢弃 */
const REJECT_THRESHOLD = 256 - (256 % ALPHABET_LENGTH);

/** 批量生成时使用的去重上限 */
export const MAX_BATCH_QUANTITY = 20000;

function randomChars(length: number): string {
  const out: string[] = [];
  while (out.length < length) {
    const buf = randomBytes(Math.max(32, length * 2));
    for (let i = 0; i < buf.length; i++) {
      const byte = buf[i];
      if (byte >= REJECT_THRESHOLD) continue; // 拒绝采样，保证均匀分布
      out.push(CARD_ALPHABET[byte % ALPHABET_LENGTH]);
      if (out.length === length) break;
    }
  }
  return out.join('');
}

/** 加权和 mod 31 校验位；权重取位置序号，可同时发现单字符错误与相邻换位错误 */
export function checksumChar(payload: string): string {
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const value = CARD_ALPHABET.indexOf(payload[i]);
    sum += value * (i + 1);
  }
  return CARD_ALPHABET[sum % ALPHABET_LENGTH];
}

/** 生成一个未经格式化的卡密（16 位，含校验位） */
export function generateRawCode(): string {
  const payload = randomChars(CARD_PAYLOAD_LENGTH);
  return payload + checksumChar(payload);
}

/** 把 16 位卡密格式化为 ABCD-EFGH-JKMN-PQRS */
export function formatCardCode(raw: string): string {
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += CARD_GROUP_SIZE) {
    groups.push(raw.slice(i, i + CARD_GROUP_SIZE));
  }
  return groups.join(CARD_SEPARATOR);
}

export interface ParsedCardCode {
  ok: boolean;
  /** 去分隔符、统一大写后的卡密 */
  raw: string;
  /** 格式化后的卡密（长度不足时按实际位数分组） */
  formatted: string;
  /** 校验失败原因，直接可展示给用户 */
  reason?: string;
}

/**
 * 解析并校验用户输入的卡密。
 * 会给出精确的失败原因（长度不对 / 含易混淆字符 / 校验位不匹配），
 * 而不是笼统的「卡密无效」，显著改善手动输入体验。
 */
export function parseCardCode(input: string): ParsedCardCode {
  const raw = (input ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const formatted = formatCardCode(raw);

  if (raw.length === 0) {
    return { ok: false, raw, formatted, reason: '请输入卡密' };
  }

  const invalid = Array.from(new Set(raw.split('').filter((c) => !CARD_ALPHABET_SET.has(c))));
  if (invalid.length > 0) {
    const confusable = invalid.filter((c) => CONFUSABLE_CHARS.includes(c));
    return {
      ok: false,
      raw,
      formatted,
      reason:
        confusable.length > 0
          ? `卡密含易混淆字符 ${confusable.join(' ')}，卡密字符集中不存在 0 / O / 1 / I / L，请核对`
          : `卡密含非法字符 ${invalid.join(' ')}`,
    };
  }

  if (raw.length !== CARD_LENGTH) {
    return {
      ok: false,
      raw,
      formatted,
      reason: `卡密应为 ${CARD_LENGTH} 位（当前 ${raw.length} 位），标准格式 ${'ABCD-EFGH-JKMN-PQRS'}`,
    };
  }

  const payload = raw.slice(0, CARD_PAYLOAD_LENGTH);
  const expected = checksumChar(payload);
  if (expected !== raw[CARD_PAYLOAD_LENGTH]) {
    return { ok: false, raw, formatted, reason: '卡密校验位不匹配，请检查是否有字符输入错误' };
  }

  return { ok: true, raw, formatted };
}
