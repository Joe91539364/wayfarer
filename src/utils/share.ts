import type { Itinerary } from '../domain/schema';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 把行程压进 URL hash：不上传任何数据，链接本身就是数据。 */
export async function encodeItinerary(itin: Itinerary): Promise<string> {
  const json = JSON.stringify(itin);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return `z${toBase64Url(new Uint8Array(buf))}`;
  }
  return `j${toBase64Url(bytes)}`;
}

export async function decodeItinerary(token: string): Promise<Itinerary | null> {
  try {
    const kind = token[0];
    const payload = fromBase64Url(token.slice(1));
    if (kind === 'z') {
      if (typeof DecompressionStream === 'undefined') return null;
      const copy = new Uint8Array(payload.length);
      copy.set(payload);
      const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const buf = await new Response(stream).arrayBuffer();
      return JSON.parse(new TextDecoder().decode(buf)) as Itinerary;
    }
    return JSON.parse(new TextDecoder().decode(payload)) as Itinerary;
  } catch {
    return null;
  }
}

export function itineraryToText(itin: Itinerary): string {
  const lines: string[] = [];
  lines.push(`# ${itin.meta.destination} · ${itin.days.length} 天行程`);
  lines.push(`${itin.meta.start_date} — ${itin.meta.end_date} · ${itin.meta.travelers.adults} 人 · 预算 ¥${itin.meta.budget.amount}`);
  if (itin.feasibility) {
    lines.push(`可行性：${itin.feasibility.summary.passed}/${itin.feasibility.summary.total} 项通过`);
  }
  for (const day of itin.days) {
    lines.push('');
    lines.push(`## 第 ${day.day_index} 天 · ${day.date}${day.base_area ? ` · ${day.base_area.name}` : ''}`);
    for (const item of day.items) {
      if (item.type === 'transit') continue;
      lines.push(`- ${item.start_time}–${item.end_time} ${item.name}${item.cost.amount > 0 ? `（¥${item.cost.amount}）` : ''}`);
      if (item.notes) lines.push(`  ${item.notes}`);
    }
  }
  if (itin.days[0]?.lodging) {
    lines.push('');
    lines.push(`住宿：${itin.days[0].lodging.name}（¥${itin.days[0].lodging.cost.amount}/晚）`);
  }
  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function icsStamp(iso: string) {
  return iso.replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

/** 生成带提醒的 ICS：Google 日历 / Apple 日历 / Outlook 都能直接导入。 */
export function buildIcs(itin: Itinerary): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wayfarer//Travel Planning Agent//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${itin.meta.destination} ${itin.days.length}天行程`,
  ];
  for (const day of itin.days) {
    const d = day.date.replace(/-/g, '');
    for (const item of day.items) {
      if (item.type === 'transit') continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.id}-${day.date}@wayfarer`,
        `DTSTAMP:${icsStamp(new Date().toISOString())}`,
        `DTSTART;TZID=Asia/Shanghai:${d}T${item.start_time.replace(':', '')}00`,
        `DTEND;TZID=Asia/Shanghai:${d}T${item.end_time.replace(':', '')}00`,
        `SUMMARY:${item.name}`,
        `LOCATION:${item.name}, ${itin.meta.destination}`,
        `DESCRIPTION:${(item.notes ?? '').replace(/\r?\n/g, ' ')} 费用:${item.cost.amount}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:30 分钟后开始：${item.name}`,
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
