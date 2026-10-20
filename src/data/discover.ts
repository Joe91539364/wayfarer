/**
 * 「发现」页的城市宣传数据。
 *
 * 为什么单独放一份而不是全从 catalog 推：
 *   宣传语、一句话推荐、封面选哪张照片，这些是编辑判断，不是抓取结果。
 *   抓取只负责给事实（有几个景点、评分多少、照片 URL 是什么），
 *   这里负责「一眼看上去想不想去」。
 */

export interface CityPromo {
  code: string;
  name: string;
  /** catalog 里 poi id 的城市前缀，用来统计这座城抓了多少景点 */
  poiPrefix: string;
  /** 官方宣传语（各城市文旅在用的说法） */
  slogan: string;
  /** 一句话推荐，说清这座城市凭什么值得去 */
  sub: string;
  /** 封面用哪个 POI 的照片（catalog 里的 id） */
  coverPoi: string;
  /** 封面兜底：没有照片时用程序化风景图 */
  coverCategory: string;
  tags: string[];
  /** 点击卡片时填进输入框的第一句话 */
  prompt: string;
  /** 主推 */
  hero?: boolean;
}

export const CITY_PROMOS: CityPromo[] = [
  {
    code: 'chengdu',
    poiPrefix: 'CD',
    name: '成都',
    slogan: '雪山下的公园城市 · 烟火里的幸福成都',
    sub: '上午看熊猫，下午泡茶馆，晚上钻进巷子吃火锅',
    coverPoi: 'CD17',
    coverCategory: 'nature',
    tags: ['美食', '自然', '慢节奏'],
    prompt: '想去成都玩4天，两个人，预算6000，喜欢吃的和自然风光，不想太赶',
    hero: true,
  },
  {
    code: 'xian',
    poiPrefix: 'XA',
    name: '西安',
    slogan: '千年古都 · 常来长安',
    sub: '城墙上骑车看落日，兵马俑前站一会儿不说话',
    coverPoi: 'XA01',
    coverCategory: 'history',
    tags: ['历史', '博物馆', '面食'],
    prompt: '想去西安玩3天，一个人，预算3000，喜欢历史古迹和美食，能暴走',
  },
  {
    code: 'xiamen',
    poiPrefix: 'XM',
    name: '厦门',
    slogan: '海上花园 · 诗意厦门',
    sub: '鼓浪屿的琴声、环岛路的海风，和一碗热沙茶面',
    coverPoi: 'XM01',
    coverCategory: 'water',
    tags: ['海边', '拍照', '小吃'],
    prompt: '想去厦门玩3天，两个人，预算4500，喜欢海边和拍照，节奏轻松',
  },
  {
    code: 'beijing',
    poiPrefix: 'BJ',
    name: '北京',
    slogan: '魅力北京 · 古今辉映',
    sub: '故宫的红墙、长城的雄奇，还有胡同里的京腔',
    coverPoi: 'BJ01',
    coverCategory: 'oldtown',
    tags: ['历史', '国博', '烤鸭'],
    prompt: '想去北京玩4天，两个人，预算7000，喜欢历史和博物馆，一定要去故宫',
  },
  {
    code: 'hangzhou',
    poiPrefix: 'HZ',
    name: '杭州',
    slogan: '最忆是杭州',
    sub: '西湖边走一整天也不腻，龙井茶山上什么也不想',
    coverPoi: 'HZ01',
    coverCategory: 'water',
    tags: ['自然', '茶', '人文'],
    prompt: '想去杭州玩3天，两个人，预算5000，喜欢自然风光和喝茶，不想太赶',
  },
];

export const promoByCode = (code: string): CityPromo | undefined =>
  CITY_PROMOS.find((c) => c.code === code);
