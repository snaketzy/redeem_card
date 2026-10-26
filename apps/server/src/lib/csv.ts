import {
  BENEFIT_PERIOD_LABEL,
  BENEFIT_TYPE_LABEL,
  CARD_STATUS_LABEL,
  type Card,
} from '../domain/types.js';

const CSV_HEADERS = [
  '卡密',
  '状态',
  '权益类型',
  '权益周期',
  '批次号',
  '创建时间',
  '有效截止时间',
  '使用人ID',
  '使用人账号',
  '核销时间',
  '家庭组人数',
];

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function iso(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 19).replace('T', ' ');
}

/** 生成 CSV 内容，带 BOM 以便 Excel 正确识别 UTF-8 中文 */
export function buildCardsCsv(cards: Card[], batchNoById: Map<string, string>): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const card of cards) {
    lines.push(
      [
        card.displayCode,
        CARD_STATUS_LABEL[card.status],
        BENEFIT_TYPE_LABEL[card.benefitType],
        BENEFIT_PERIOD_LABEL[card.benefitPeriod],
        batchNoById.get(card.batchId) ?? '',
        iso(card.createdAt),
        iso(card.expiresAt),
        card.usedByUserId ?? '',
        card.usedByUserAccount ?? '',
        iso(card.usedAtDate),
        card.benefitType === 'family' ? `${card.members.length}/${card.groupSize}` : '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

/** 导出为纯卡密文本，一行一个，便于直接导入其他系统 */
export function buildCardsTxt(cards: Card[]): string {
  return cards.map((c) => c.displayCode).join('\r\n');
}
