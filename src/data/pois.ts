import type { Category, DataConfidence, Interest } from '../domain/schema';

export interface PoiSeed {
  poi_id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  area: string;
  category: Category;
  tags: Interest[];
  duration_min: number;
  price: number;
  open: string;
  close: string;
  closed_days: number[];
  hours_confidence: DataConfidence;
  rating: number;
  indoor: boolean;
  booking_required: boolean;
  blurb: string;
}

export interface CitySeed {
  code: string;
  name: string;
  center: { lat: number; lng: number };
  lodging: { name: string; lat: number; lng: number; price: number; area: string };
  aliases: string[];
}

export const CITIES: CitySeed[] = [
  {
    code: 'chengdu',
    name: '成都',
    center: { lat: 30.657, lng: 104.066 },
    lodging: { name: '春熙路 · 亚朵酒店', lat: 30.6571, lng: 104.0802, price: 420, area: '春熙路' },
    aliases: ['成都', '蓉城', '锦官城'],
  },
  {
    code: 'xian',
    name: '西安',
    center: { lat: 34.245, lng: 108.955 },
    lodging: { name: '钟楼 · 美居酒店', lat: 34.2605, lng: 108.9448, price: 380, area: '钟楼' },
    aliases: ['西安', '长安'],
  },
  {
    code: 'xiamen',
    name: '厦门',
    center: { lat: 24.445, lng: 118.09 },
    lodging: { name: '中山路 · 海景公寓', lat: 24.4562, lng: 118.0836, price: 460, area: '中山路' },
    aliases: ['厦门', '鹭岛'],
  },
  {
    code: 'beijing',
    name: '北京',
    center: { lat: 39.93, lng: 116.4 },
    lodging: { name: '王府井 · 全季酒店', lat: 39.9142, lng: 116.4108, price: 520, area: '王府井' },
    aliases: ['北京', '京城', '帝都'],
  },
  {
    code: 'hangzhou',
    name: '杭州',
    center: { lat: 30.25, lng: 120.15 },
    lodging: { name: '湖滨 · 君悦酒店', lat: 30.2551, lng: 120.1602, price: 680, area: '湖滨' },
    aliases: ['杭州', '临安', '杭城'],
  },
];

const P = (
  poi_id: string,
  name: string,
  city: string,
  lat: number,
  lng: number,
  area: string,
  category: Category,
  tags: Interest[],
  duration_min: number,
  price: number,
  open: string,
  close: string,
  closed_days: number[],
  hours_confidence: DataConfidence,
  rating: number,
  indoor: boolean,
  booking_required: boolean,
  blurb: string,
): PoiSeed => ({
  poi_id,
  name,
  city,
  lat,
  lng,
  area,
  category,
  tags,
  duration_min,
  price,
  open,
  close,
  closed_days,
  hours_confidence,
  rating,
  indoor,
  booking_required,
  blurb,
});

export const POIS: PoiSeed[] = [
  // ---------------- 成都 ----------------
  P('CD01', '宽窄巷子', 'chengdu', 30.669, 104.0533, '宽窄巷子', 'sight', ['local_life', 'photography', 'food'], 120, 0, '00:00', '23:59', [], 'verified', 4.5, false, false, '三条清代老巷，青砖灰瓦，早上九点前几乎没人'),
  P('CD02', '武侯祠', 'chengdu', 30.645, 104.045, '武侯祠', 'sight', ['history'], 90, 50, '08:00', '18:30', [], 'verified', 4.6, false, false, '三国主题祠庙，红墙竹影是成都最出片的机位'),
  P('CD03', '锦里古街', 'chengdu', 30.6445, 104.047, '武侯祠', 'sight', ['local_life', 'food', 'photography'], 90, 0, '10:00', '23:00', [], 'verified', 4.2, false, false, '紧邻武侯祠，晚上灯笼亮起来才好看'),
  P('CD04', '杜甫草堂', 'chengdu', 30.662, 104.03, '浣花溪', 'sight', ['history', 'nature'], 120, 50, '09:00', '18:00', [], 'verified', 4.6, false, false, '园林式纪念馆，竹林和水景适合慢慢走'),
  P('CD05', '成都博物馆', 'chengdu', 30.6575, 104.0635, '天府广场', 'museum', ['museum', 'history'], 120, 0, '09:00', '17:00', [1], 'verified', 4.7, true, true, '免费但需预约，负一层自然厅适合雨天'),
  P('CD06', '春熙路', 'chengdu', 30.657, 104.081, '春熙路', 'shopping', ['shopping', 'local_life'], 90, 0, '10:00', '22:00', [], 'verified', 4.1, false, false, '成都最热闹的商业街，晚上有街头表演'),
  P('CD07', '太古里', 'chengdu', 30.654, 104.083, '春熙路', 'shopping', ['shopping', 'art', 'photography'], 90, 0, '10:00', '22:00', [], 'verified', 4.5, false, false, '低层街区式商业，大慈寺就在中间'),
  P('CD08', '人民公园', 'chengdu', 30.657, 104.063, '天府广场', 'sight', ['local_life', 'nature'], 60, 0, '06:00', '22:00', [], 'verified', 4.4, false, false, '鹤鸣茶社喝盖碗茶、掏耳朵，成都生活样本'),
  P('CD09', '大熊猫繁育研究基地', 'chengdu', 30.735, 104.145, '北郊', 'nature', ['nature', 'photography'], 180, 55, '07:30', '18:00', [], 'verified', 4.8, false, true, '必须早去，10 点后熊猫就回去睡觉了'),
  P('CD10', '文殊院', 'chengdu', 30.678, 104.07, '文殊院', 'sight', ['history', 'local_life'], 60, 0, '08:00', '17:00', [], 'verified', 4.4, false, false, '香火清净，门口的甜水面值得一试'),
  P('CD11', '金沙遗址博物馆', 'chengdu', 30.681, 104.013, '金沙', 'museum', ['museum', 'history'], 120, 70, '08:00', '18:00', [1], 'verified', 4.6, true, false, '太阳神鸟出土地，展厅灯光做得很好'),
  P('CD12', '四川博物院', 'chengdu', 30.657, 104.033, '浣花溪', 'museum', ['museum', 'art'], 120, 0, '09:00', '17:00', [1], 'verified', 4.5, true, true, '张大千书画馆是重点，免费需预约'),
  P('CD13', '东郊记忆', 'chengdu', 30.665, 104.13, '建设路', 'sight', ['art', 'photography', 'nightlife'], 90, 0, '10:00', '22:00', [], 'estimated', 4.3, false, false, '老厂房改的文创园，工业风拍照点密集'),
  P('CD14', '九眼桥', 'chengdu', 30.64, 104.09, '九眼桥', 'nightlife', ['nightlife'], 90, 0, '18:00', '02:00', [], 'estimated', 4.0, false, false, '府南河边酒吧一条街，夜里最有烟火气'),
  P('CD15', '玉林路小酒馆', 'chengdu', 30.63, 104.06, '玉林', 'nightlife', ['nightlife', 'local_life'], 90, 80, '19:00', '02:00', [], 'estimated', 4.2, true, true, '《成都》唱的那家，周末要排队'),
  P('CD16', '建设路小吃街', 'chengdu', 30.665, 104.115, '建设路', 'restaurant', ['food', 'local_life'], 60, 50, '17:00', '23:00', [], 'estimated', 4.4, false, false, '钵钵鸡、蛋烘糕、烤脑花，边走边吃'),
  P('CD17', '青城山', 'chengdu', 30.9, 103.57, '都江堰', 'hiking', ['hiking', 'nature', 'history'], 240, 80, '08:00', '17:00', [], 'verified', 4.7, false, false, '前山道观多、后山溪谷多，单程约 1.5 小时'),
  P('CD18', '都江堰景区', 'chengdu', 31.0, 103.6, '都江堰', 'sight', ['history', 'nature'], 180, 80, '08:00', '18:00', [], 'verified', 4.6, false, false, '两千年还在用的水利工程，鱼嘴值得走一遍'),
  P('CD19', '陈麻婆豆腐（骡马市）', 'chengdu', 30.67, 104.07, '骡马市', 'restaurant', ['food'], 60, 70, '11:00', '21:00', [], 'verified', 4.3, true, false, '百年老店的麻婆豆腐，配米饭'),
  P('CD20', '马旺子川菜馆', 'chengdu', 30.656, 104.08, '春熙路', 'restaurant', ['food'], 75, 120, '11:00', '21:00', [], 'estimated', 4.6, true, true, '本地人请客常去，豆瓣鱼和甜皮鸭'),
  P('CD21', '甘记肥肠粉', 'chengdu', 30.66, 104.075, '骡马市', 'restaurant', ['food', 'local_life'], 45, 35, '07:00', '21:00', [], 'verified', 4.4, true, false, '一碗肥肠粉加一个锅盔，成都人的早饭'),
  P('CD22', '玉林串串香', 'chengdu', 30.632, 104.062, '玉林', 'restaurant', ['food', 'nightlife'], 75, 90, '17:00', '02:00', [], 'estimated', 4.3, true, false, '老牌串串，牛肉和藕片必点'),
  P('CD23', '鹤鸣茶社', 'chengdu', 30.6572, 104.0631, '人民公园', 'cafe', ['local_life', 'food'], 60, 40, '08:00', '20:00', [], 'verified', 4.5, false, false, '竹椅盖碗茶，可以坐一下午'),

  // ---------------- 西安 ----------------
  P('XA01', '秦始皇兵马俑博物馆', 'xian', 34.3841, 109.2785, '临潼', 'museum', ['history', 'museum'], 180, 120, '08:30', '17:00', [], 'verified', 4.8, true, true, '一号坑最震撼，建议请讲解或租讲解器'),
  P('XA02', '大雁塔', 'xian', 34.2186, 108.964, '大雁塔', 'sight', ['history', 'photography'], 90, 50, '08:00', '18:30', [], 'verified', 4.5, false, false, '大慈恩寺内，北广场晚上有音乐喷泉'),
  P('XA03', '陕西历史博物馆', 'xian', 34.2225, 108.948, '小寨', 'museum', ['museum', 'history'], 150, 0, '08:30', '18:00', [1], 'verified', 4.8, true, true, '必须提前预约，何家村窖藏是压箱底的'),
  P('XA04', '西安城墙（永宁门）', 'xian', 34.252, 108.946, '南门', 'sight', ['history', 'photography'], 120, 54, '08:00', '22:00', [], 'verified', 4.6, false, false, '租自行车环城 13.7 公里，日落时分最好'),
  P('XA05', '回民街', 'xian', 34.265, 108.943, '钟楼', 'restaurant', ['food', 'local_life'], 90, 80, '10:00', '23:00', [], 'verified', 4.0, false, false, '游客多但确实好吃，往北走大皮院更本地'),
  P('XA06', '钟楼', 'xian', 34.261, 108.945, '钟楼', 'landmark', ['history', 'photography'], 45, 30, '08:30', '21:30', [], 'verified', 4.4, true, false, '夜里亮灯后是西安最经典的一张照片'),
  P('XA07', '鼓楼', 'xian', 34.263, 108.942, '钟楼', 'landmark', ['history'], 40, 30, '08:30', '21:00', [], 'verified', 4.2, true, false, '和钟楼联票，上面有鼓乐表演'),
  P('XA08', '大唐不夜城', 'xian', 34.214, 108.964, '大雁塔', 'nightlife', ['nightlife', 'photography', 'local_life'], 120, 0, '18:00', '00:00', [], 'verified', 4.7, false, false, '整条街都是灯光和不倒翁小姐姐，晚上才开'),
  P('XA09', '华清宫', 'xian', 34.362, 109.215, '临潼', 'sight', ['history', 'nature'], 150, 120, '07:00', '19:00', [], 'verified', 4.3, false, false, '和兵马俑同方向，可以拼一天'),
  P('XA10', '碑林博物馆', 'xian', 34.254, 108.952, '书院门', 'museum', ['museum', 'art', 'history'], 90, 65, '08:00', '18:00', [], 'verified', 4.5, true, false, '书法爱好者的圣地，颜真卿柳公权都在'),
  P('XA11', '小雁塔（西安博物院）', 'xian', 34.24, 108.945, '小雁塔', 'sight', ['history', 'museum'], 90, 0, '09:00', '17:00', [2], 'verified', 4.4, false, true, '人少清净，博物院免费但要预约'),
  P('XA12', '大唐芙蓉园', 'xian', 34.213, 108.97, '大雁塔', 'theme_park', ['theme_park', 'photography', 'nightlife'], 150, 120, '09:00', '22:00', [], 'verified', 4.2, false, false, '仿唐园林，晚上的水幕电影值得留时间'),
  P('XA13', '老孙家泡馍', 'xian', 34.265, 108.944, '钟楼', 'restaurant', ['food'], 60, 50, '10:00', '21:00', [], 'estimated', 4.1, true, false, '自己掰馍才有灵魂，掰成黄豆大小'),
  P('XA14', '贾三灌汤包', 'xian', 34.266, 108.942, '钟楼', 'restaurant', ['food'], 60, 55, '09:00', '22:00', [], 'estimated', 4.0, true, true, '回民街老店，皮薄汁多'),
  P('XA15', '长安大牌档', 'xian', 34.22, 108.96, '大雁塔', 'restaurant', ['food', 'local_life'], 75, 90, '11:00', '22:00', [], 'verified', 4.4, true, true, '陕菜集合店，葫芦鸡和毛笔酥'),
  P('XA16', '永兴坊', 'xian', 34.27, 108.96, '中山门', 'restaurant', ['food', 'local_life'], 75, 60, '10:00', '22:00', [], 'estimated', 4.2, false, false, '摔碗酒和陕西各地小吃聚集地'),

  // ---------------- 厦门 ----------------
  P('XM01', '鼓浪屿', 'xiamen', 24.447, 118.067, '鼓浪屿', 'sight', ['photography', 'history', 'local_life'], 240, 100, '07:00', '22:00', [], 'verified', 4.6, false, true, '轮渡票要提前买，岛上不能走机动车'),
  P('XM02', '厦门大学（思明校区）', 'xiamen', 24.438, 118.096, '厦大', 'sight', ['photography', 'local_life'], 90, 0, '12:00', '22:00', [], 'verified', 4.5, false, true, '需提前在公众号预约，芙蓉隧道是重点'),
  P('XM03', '南普陀寺', 'xiamen', 24.442, 118.098, '厦大', 'sight', ['history', 'nature'], 60, 0, '04:00', '18:00', [], 'verified', 4.6, false, false, '免费素斋，后山可以爬到五老峰'),
  P('XM04', '曾厝垵', 'xiamen', 24.43, 118.11, '曾厝垵', 'sight', ['local_life', 'food', 'nightlife'], 120, 60, '10:00', '23:00', [], 'verified', 4.0, false, false, '文艺渔村改造，晚上小吃摊全开'),
  P('XM05', '环岛路', 'xiamen', 24.43, 118.14, '环岛路', 'nature', ['nature', 'photography'], 120, 0, '00:00', '23:59', [], 'verified', 4.7, false, false, '沿海骑行道，退潮时沙滩很宽'),
  P('XM06', '中山路步行街', 'xiamen', 24.457, 118.082, '中山路', 'shopping', ['shopping', 'food', 'local_life'], 120, 0, '09:00', '22:00', [], 'verified', 4.2, false, false, '骑楼老街，两侧巷子里的沙茶面更地道'),
  P('XM07', '胡里山炮台', 'xiamen', 24.433, 118.105, '胡里山', 'sight', ['history', 'nature'], 75, 25, '07:30', '18:00', [], 'verified', 4.1, false, false, '克虏伯大炮，海景视野好'),
  P('XM08', '集美学村', 'xiamen', 24.57, 118.1, '集美', 'sight', ['history', 'art'], 120, 0, '08:00', '18:00', [], 'verified', 4.4, false, false, '嘉庚建筑群，红砖白石很上镜，离岛内约 20km'),
  P('XM09', '厦门园林植物园', 'xiamen', 24.452, 118.1, '万石山', 'nature', ['nature', 'photography'], 150, 30, '06:30', '18:00', [], 'verified', 4.6, false, false, '雨林喷雾区是拍照重点，早上光线好'),
  P('XM10', '沙坡尾艺术西区', 'xiamen', 24.443, 118.087, '沙坡尾', 'sight', ['art', 'local_life', 'photography'], 90, 0, '10:00', '22:00', [], 'estimated', 4.2, false, false, '老避风坞改造，咖啡馆和小店密集'),
  P('XM11', '演武大桥观景台', 'xiamen', 24.435, 118.092, '厦大', 'landmark', ['photography', 'nature'], 45, 0, '00:00', '23:59', [], 'verified', 4.5, false, false, '看演武大桥和日落，风很大'),
  P('XM12', '局口街沙茶面', 'xiamen', 24.457, 118.083, '中山路', 'restaurant', ['food', 'local_life'], 45, 25, '07:00', '21:00', [], 'verified', 4.4, true, false, '沙茶汤头浓，加猪肝和豆干'),
  P('XM13', '阿杰五香', 'xiamen', 24.456, 118.084, '中山路', 'restaurant', ['food'], 45, 30, '08:00', '20:00', [], 'estimated', 4.2, true, false, '现炸五香卷，配甜辣酱'),
  P('XM14', '赵小姐的店', 'xiamen', 24.4471, 118.0672, '鼓浪屿', 'cafe', ['food', 'photography'], 45, 45, '09:00', '22:00', [], 'estimated', 4.0, true, false, '岛上的老别墅咖啡馆，歇脚用'),
  P('XM15', '八市海鲜大排档', 'xiamen', 24.459, 118.079, '八市', 'restaurant', ['food', 'local_life'], 90, 130, '16:00', '23:00', [], 'estimated', 4.5, false, false, '菜市场里现买现做，价格透明'),

  // ---------------- 北京 ----------------
  P('BJ01', '故宫博物院', 'beijing', 39.9163, 116.3972, '天安门', 'museum', ['history', 'museum', 'photography'], 210, 60, '08:30', '17:00', [1], 'verified', 4.9, false, true, '必须提前 7 天预约，从午门进神武门出'),
  P('BJ02', '天安门广场', 'beijing', 39.9087, 116.3975, '天安门', 'landmark', ['history', 'photography'], 60, 0, '05:00', '22:00', [], 'verified', 4.4, false, true, '需实名预约，看升旗要凌晨到'),
  P('BJ03', '景山公园', 'beijing', 39.928, 116.396, '景山', 'nature', ['nature', 'photography', 'history'], 60, 2, '06:00', '21:00', [], 'verified', 4.7, false, false, '万春亭看故宫全景，日落前上去'),
  P('BJ04', '北海公园', 'beijing', 39.925, 116.389, '什刹海', 'nature', ['nature', 'history'], 90, 10, '06:30', '20:00', [], 'verified', 4.6, false, false, '白塔和荷花，划船很舒服'),
  P('BJ05', '颐和园', 'beijing', 39.999, 116.275, '颐和园', 'nature', ['nature', 'history'], 180, 30, '06:30', '18:00', [], 'verified', 4.8, false, false, '从北宫门进人少，长廊和昆明湖'),
  P('BJ06', '天坛公园', 'beijing', 39.8822, 116.4066, '天坛', 'sight', ['history', 'nature'], 120, 34, '06:00', '22:00', [], 'verified', 4.7, false, false, '祈年殿，早上去能看到本地人晨练'),
  P('BJ07', '798 艺术区', 'beijing', 39.984, 116.495, '798', 'sight', ['art', 'photography'], 120, 0, '10:00', '18:00', [], 'verified', 4.3, true, false, '工厂改造的画廊区，周一很多馆闭门'),
  P('BJ08', '南锣鼓巷', 'beijing', 39.937, 116.403, '南锣鼓巷', 'sight', ['local_life', 'food'], 90, 0, '10:00', '22:00', [], 'verified', 4.0, false, false, '主街商业化，往两侧胡同走更好'),
  P('BJ09', '什刹海', 'beijing', 39.94, 116.386, '什刹海', 'sight', ['local_life', 'nightlife', 'nature'], 90, 0, '00:00', '23:59', [], 'verified', 4.4, false, false, '后海酒吧街，冬天可以滑冰'),
  P('BJ10', '中国国家博物馆', 'beijing', 39.9042, 116.401, '天安门', 'museum', ['museum', 'history', 'art'], 180, 0, '09:00', '17:00', [1], 'verified', 4.8, true, true, '免费但要抢票，古代中国陈列至少留 3 小时'),
  P('BJ11', '雍和宫', 'beijing', 39.947, 116.417, '雍和宫', 'sight', ['history'], 75, 25, '09:00', '16:30', [], 'verified', 4.6, false, false, '藏传佛教寺院，香火极旺'),
  P('BJ12', '八达岭长城', 'beijing', 40.358, 116.017, '延庆', 'hiking', ['hiking', 'history', 'nature'], 210, 40, '07:00', '17:30', [], 'verified', 4.7, false, true, '单程约 1.5 小时，建议早班车去'),
  P('BJ13', '四季民福烤鸭店（故宫店）', 'beijing', 39.916, 116.41, '王府井', 'restaurant', ['food'], 90, 160, '10:30', '22:00', [], 'verified', 4.6, true, true, '能看到角楼的座位要排队，烤鸭皮蘸糖'),
  P('BJ14', '姚记炒肝', 'beijing', 39.939, 116.402, '鼓楼', 'restaurant', ['food', 'local_life'], 50, 35, '06:00', '21:00', [], 'estimated', 4.1, true, false, '炒肝配包子，老北京早饭'),
  P('BJ15', '护国寺小吃', 'beijing', 39.937, 116.383, '护国寺', 'restaurant', ['food', 'local_life'], 50, 30, '06:00', '21:00', [], 'estimated', 4.2, true, false, '豆汁焦圈豌豆黄，一次尝遍'),
  P('BJ16', 'Arabica 咖啡（三里屯）', 'beijing', 39.934, 116.455, '三里屯', 'cafe', ['food', 'photography'], 40, 40, '08:00', '22:00', [], 'estimated', 4.3, true, false, '白墙极简，拍照打卡点'),

  // ---------------- 杭州 ----------------
  P('HZ01', '西湖（断桥·白堤）', 'hangzhou', 30.259, 120.148, '西湖', 'nature', ['nature', 'photography', 'history'], 180, 0, '00:00', '23:59', [], 'verified', 4.8, false, false, '环湖骑行或步行，清晨雾最好看'),
  P('HZ02', '灵隐寺', 'hangzhou', 30.24, 120.1, '灵隐', 'sight', ['history', 'nature'], 120, 75, '07:00', '17:30', [], 'verified', 4.7, false, false, '飞来峰造像和寺内素面，需两道门票'),
  P('HZ03', '雷峰塔', 'hangzhou', 30.232, 120.148, '西湖', 'sight', ['history', 'photography'], 75, 40, '08:00', '20:00', [], 'verified', 4.3, true, false, '塔上看西湖全景，傍晚有夕照'),
  P('HZ04', '河坊街', 'hangzhou', 30.24, 120.17, '清河坊', 'sight', ['local_life', 'food', 'shopping'], 90, 0, '09:00', '22:00', [], 'verified', 4.0, false, false, '老字号一条街，胡庆余堂在里面'),
  P('HZ05', '西溪湿地', 'hangzhou', 30.27, 120.07, '西溪', 'nature', ['nature', 'photography'], 180, 80, '07:30', '17:30', [], 'verified', 4.5, false, false, '坐摇橹船进水巷，秋天芦花最好'),
  P('HZ06', '浙江省博物馆（孤山馆）', 'hangzhou', 30.253, 120.14, '西湖', 'museum', ['museum', 'art', 'history'], 120, 0, '09:00', '17:00', [1], 'verified', 4.5, true, true, '孤山脚下，看完可以接着走白堤'),
  P('HZ07', '宋城', 'hangzhou', 30.19, 120.1, '之江', 'theme_park', ['theme_park', 'history'], 180, 320, '09:00', '21:00', [], 'verified', 4.3, false, true, '《宋城千古情》演出是核心，票价含演出'),
  P('HZ08', '龙井村', 'hangzhou', 30.22, 120.11, '龙井', 'nature', ['nature', 'local_life'], 120, 0, '08:00', '18:00', [], 'estimated', 4.4, false, false, '茶园梯田，可以在农家喝一杯明前'),
  P('HZ09', '中国美院象山校区', 'hangzhou', 30.16, 120.09, '转塘', 'sight', ['art', 'photography'], 90, 0, '09:00', '17:00', [], 'estimated', 4.5, false, false, '王澍设计的校园，建筑本身就是展品'),
  P('HZ10', '武林夜市', 'hangzhou', 30.272, 120.165, '武林', 'shopping', ['nightlife', 'food', 'local_life'], 90, 0, '18:00', '23:59', [], 'estimated', 4.1, false, false, '市中心夜市，小吃和小商品'),
  P('HZ11', '外婆家（湖滨店）', 'hangzhou', 30.256, 120.164, '湖滨', 'restaurant', ['food'], 75, 80, '10:30', '21:00', [], 'verified', 4.2, true, true, '杭帮菜连锁，饭点要取号'),
  P('HZ12', '知味观（仁和路）', 'hangzhou', 30.245, 120.16, '湖滨', 'restaurant', ['food', 'local_life'], 75, 90, '10:00', '21:00', [], 'verified', 4.1, true, false, '虾爆鳝面和猫耳朵，老字号'),
  P('HZ13', '龙井草堂', 'hangzhou', 30.225, 120.108, '龙井', 'restaurant', ['food', 'nature'], 120, 400, '11:00', '21:00', [], 'estimated', 4.7, true, true, '茶园里的私房菜，人均高但环境极好'),
  P('HZ14', '青藤茶馆', 'hangzhou', 30.252, 120.15, '西湖', 'cafe', ['food', 'local_life'], 90, 120, '09:00', '23:00', [], 'estimated', 4.4, true, false, '自助茶点，坐一下午看湖'),
];

/* ------------------------------------------------------------------
 * 动态城市包
 *
 * 内置只有 5 个城市。用户说「去景德镇」时，服务端用高德现场抓一批 POI 回来，
 * 注册进这里，后面的 research / outline / schedule 就能当普通城市用。
 * 只存在内存里：刷新后用缓存重新注册，不污染内置数据。
 * ------------------------------------------------------------------ */

const EXTRA_CITIES: CitySeed[] = [];
const EXTRA_POIS: PoiSeed[] = [];

export function registerCityPack(city: CitySeed, pois: PoiSeed[]): void {
  const ci = EXTRA_CITIES.findIndex((c) => c.code === city.code);
  if (ci >= 0) EXTRA_CITIES[ci] = city;
  else EXTRA_CITIES.push(city);

  for (const p of pois) {
    const pi = EXTRA_POIS.findIndex((x) => x.poi_id === p.poi_id);
    if (pi >= 0) EXTRA_POIS[pi] = p;
    else EXTRA_POIS.push(p);
  }
}

export function hasCityPack(code: string): boolean {
  return EXTRA_CITIES.some((c) => c.code === code);
}

export function allCities(): CitySeed[] {
  return [...CITIES, ...EXTRA_CITIES];
}

export function cityByCode(code: string): CitySeed | undefined {
  return CITIES.find((c) => c.code === code) ?? EXTRA_CITIES.find((c) => c.code === code);
}

export function poisByCity(city: string): PoiSeed[] {
  return [...POIS.filter((p) => p.city === city), ...EXTRA_POIS.filter((p) => p.city === city)];
}

const CATEGORY_WORD: Record<string, string> = {
  sight: '景点 风景 打卡',
  museum: '博物馆 展馆 美术馆',
  nature: '公园 山 湖 自然',
  restaurant: '餐厅 吃 美食 火锅 小吃',
  cafe: '咖啡 下午茶',
  shopping: '购物 商场 逛街',
  nightlife: '酒吧 夜生活 夜市',
  theme_park: '乐园 游乐场',
  hiking: '徒步 爬山',
  hot_spring: '温泉',
  landmark: '地标 观景',
};

/**
 * 「自己想加点什么」的搜索。
 *
 * 城市包有 200 个点，用户心里想的那家店未必在候选池里 —— 候选池只放
 * 「评分够但没排进去」的，这里要能翻遍整座城市。匹配名字、区域、类型词，
 * 空关键字时按评分给一份「值得去」的清单；给了 near（当天片区）就惩罚 10km
 * 以外的点 —— 搜「公园」不该把 250km 外的郊区公园顶到最前面。
 */
export function searchPois(city: string, keyword: string, limit = 30, near?: { lat: number; lng: number }): PoiSeed[] {
  const kw = keyword.trim().toLowerCase();
  const all = poisByCity(city);
  const distOf = (p: PoiSeed) =>
    near ? Math.hypot(p.lat - near.lat, p.lng - near.lng) * 111 : 0;

  const rank = (a: PoiSeed, b: PoiSeed) => {
    if (distOf(a) > 15 && distOf(b) <= 15) return 1;
    if (distOf(b) > 15 && distOf(a) <= 15) return -1;
    return b.rating - a.rating;
  };

  if (!kw) {
    return [...all].sort(rank).slice(0, limit);
  }
  const scored: { p: PoiSeed; s: number }[] = [];
  for (const p of all) {
    const name = p.name.toLowerCase();
    const area = (p.area ?? '').toLowerCase();
    const words = `${CATEGORY_WORD[p.category] ?? ''} ${(p.tags ?? []).join(' ')} ${p.blurb ?? ''}`.toLowerCase();
    let s = 0;
    if (name === kw) s = 100;
    else if (name.includes(kw)) s = 80 - Math.min(20, name.length - kw.length);
    else if (area.includes(kw)) s = 40;
    else if (words.includes(kw)) s = 30;
    if (s <= 0) continue;
    s += Math.min(12, p.rating * 2);
    // 词表/区域这种弱匹配，10km 外就明显降权；名字直击的不惩罚（用户点名要它）
    if (s < 45 && distOf(p) > 10) s -= Math.min(25, (distOf(p) - 10) * 2);
    scored.push({ p, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
}


/** 预算降档时使用的备选住宿（真实个人项目里应来自酒店 API）。 */
export const HOSTELS: Record<string, { name: string; price: number }> = {
  chengdu: { name: '春熙路 · 青旅床位', price: 95 },
  xian: { name: '钟楼 · 青旅床位', price: 85 },
  xiamen: { name: '中山路 · 青旅床位', price: 105 },
  beijing: { name: '王府井 · 青旅床位', price: 120 },
  hangzhou: { name: '湖滨 · 青旅床位', price: 110 },
};

export function findCity(input: string): CitySeed | null {
  const text = input.trim();
  for (const c of allCities()) {
    if (c.code === text || c.name === text) return c;
    if (c.aliases.some((a) => text.includes(a))) return c;
  }
  return null;
}
