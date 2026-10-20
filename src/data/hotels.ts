export interface HotelSeed {
  id: string;
  city: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  price: number;
  rating: number;
  tags: string[];
  blurb: string;
  roomsLeft: number;
  tier: 'budget' | 'comfort' | 'premium';
}

const H = (
  id: string,
  city: string,
  name: string,
  area: string,
  lat: number,
  lng: number,
  price: number,
  rating: number,
  tier: HotelSeed['tier'],
  tags: string[],
  blurb: string,
  roomsLeft: number,
): HotelSeed => ({ id, city, name, area, lat, lng, price, rating, tier, tags, blurb, roomsLeft });

export const HOTELS: HotelSeed[] = [
  H('HT-CD-1', 'chengdu', '春熙路 · 亚朵酒店', '春熙路', 30.6571, 104.0802, 420, 4.6, 'comfort', ['地铁 3 分钟', '含早', '24h 前台'], '下楼就是太古里，晚上回酒店不用打车', 4),
  H('HT-CD-2', 'chengdu', '宽窄巷子 · 花间堂', '宽窄巷子', 30.6682, 104.0541, 880, 4.7, 'premium', ['庭院', '含早', '茶室'], '老宅改造，院子里有棵百年银杏', 2),
  H('HT-CD-3', 'chengdu', '太古里 · 博舍', '太古里', 30.6541, 104.0828, 1680, 4.8, 'premium', ['设计酒店', '泳池', '管家'], '太古里里唯一的安静角落，价格也是', 1),
  H('HT-CD-4', 'chengdu', '春熙路 · 青旅床位', '春熙路', 30.6583, 104.0791, 95, 4.2, 'budget', ['床位', '公共厨房', '行李寄存'], '预算方案，八人间但很干净', 9),

  H('HT-XA-1', 'xian', '钟楼 · 美居酒店', '钟楼', 34.2605, 108.9448, 380, 4.5, 'comfort', ['地铁 2 分钟', '含早'], '走路十分钟到回民街，夜里回来也方便', 6),
  H('HT-XA-2', 'xian', '南门 · 城墙边民宿', '南门', 34.2508, 108.9463, 260, 4.4, 'comfort', ['城墙景', '自助入住'], '窗子正对永宁门，晚上亮灯很好看', 3),
  H('HT-XA-3', 'xian', '钟楼 · 青旅床位', '钟楼', 34.2612, 108.9435, 85, 4.1, 'budget', ['床位', '露台', '行李寄存'], '楼顶露台能看到钟楼夜景', 12),

  H('HT-XM-1', 'xiamen', '中山路 · 海景公寓', '中山路', 24.4562, 118.0836, 460, 4.5, 'comfort', ['海景', '洗衣机', '厨房'], '高层能看见演武大桥，适合住两晚以上', 2),
  H('HT-XM-2', 'xiamen', '鼓浪屿 · 老别墅民宿', '鼓浪屿', 24.4478, 118.0663, 620, 4.7, 'premium', ['岛上', '庭院', '含早'], '岛上没有车，晚上安静得只剩海浪', 2),
  H('HT-XM-3', 'xiamen', '中山路 · 青旅床位', '中山路', 24.4571, 118.0827, 105, 4.0, 'budget', ['床位', '公共区域', '寄存'], '位置极好，房间小但够睡', 8),

  H('HT-BJ-1', 'beijing', '王府井 · 全季酒店', '王府井', 39.9142, 116.4108, 520, 4.5, 'comfort', ['近地铁', '含早', '洗衣'], '去故宫步行二十分钟，性价比高', 5),
  H('HT-BJ-2', 'beijing', '什刹海 · 四合院客栈', '什刹海', 39.9394, 116.3892, 780, 4.6, 'premium', ['四合院', '含早', '茶室'], '院子不大但很有北京味道', 2),
  H('HT-BJ-3', 'beijing', '王府井 · 青旅床位', '王府井', 39.9161, 116.4115, 120, 4.1, 'budget', ['床位', '公共厨房'], '地铁口三十米，适合早出晚归', 10),

  H('HT-HZ-1', 'hangzhou', '湖滨 · 君悦酒店', '湖滨', 30.2551, 120.1602, 680, 4.7, 'comfort', ['湖景', '含早', '健身房'], '房间能看到西湖一角，出门就是湖滨步行街', 3),
  H('HT-HZ-2', 'hangzhou', '龙井 · 茶园民宿', '龙井', 30.2216, 120.1093, 560, 4.6, 'comfort', ['茶园', '含早', '安静'], '推开窗就是茶山，离市区二十分钟', 4),
  H('HT-HZ-3', 'hangzhou', '湖滨 · 青旅床位', '湖滨', 30.2546, 120.1648, 110, 3.9, 'budget', ['床位', '公共区域'], '就在湖滨银泰后面，位置没得挑', 7),
];

export function hotelsByCity(city: string): HotelSeed[] {
  return HOTELS.filter((h) => h.city === city);
}

export function hotelById(id: string): HotelSeed | undefined {
  return HOTELS.find((h) => h.id === id);
}

export function recommendHotels(city: string, budgetPerNight: number): HotelSeed[] {
  const all = hotelsByCity(city);
  const comfort = [...all].sort((a, b) => Math.abs(a.price - budgetPerNight) - Math.abs(b.price - budgetPerNight));
  return comfort;
}
