import { useEffect, useMemo, useRef, useState } from 'react';
import type { Catalog } from '../data/catalog';
import { CITY_PROMOS, type CityPromo } from '../data/discover';
import { ATTRACTIONS, spotCount, type SpotEntry } from '../data/attractions';
import { TREASURES, TREASURE_CITIES, treasureCount } from '../data/treasures';
import SceneryArt from './SceneryArt';
import { IconArrow, IconSpark, IconX } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  catalog: Catalog;
  /** 选了一座城：把一句话需求交给主界面 */
  onPick: (prompt: string, name: string) => void;
}

interface CityStat {
  pois: number;
  rating: number | null;
  hotels: number;
  photo: string | null;
  credit: string | null;
}

/**
 * 「发现」：把 5 座经典城市做成宣传位。
 *
 * 页面上不放「推荐指数」这种编出来的分数，只放三样能查到来源的东西：
 * 实景图（高德抓的，标注来源）、抓到的景点数、真实评分均值。
 * 点一张卡片 = 把一句话填进输入框，用户还能改，不用被锁死在一个模板里。
 */
export default function DiscoverModal({ open, onClose, catalog, onPick }: Props) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'classic' | 'treasure'>('classic');
  const [prov, setProv] = useState('四川');
  const [query, setQuery] = useState('');
  const [tq, setTq] = useState('');
  const [shopCity, setShopCity] = useState('全部');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // onClose 每次父组件渲染都是新函数，放进依赖会让下面的副作用反复执行、把滚动位置拉回顶部。
  // 用 ref 存最新引用，副作用就只依赖 open 本身。
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 只在「打开」这一刻回到顶部
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const stats = useMemo(() => {
    const map = new Map<string, CityStat>();
    for (const promo of CITY_PROMOS) {
      let pois = 0;
      let sum = 0;
      let rated = 0;
      for (const [id, poi] of Object.entries(catalog.pois)) {
        if (!id.startsWith(promo.poiPrefix)) continue;
        pois += 1;
        const r = poi.rating?.v;
        if (typeof r === 'number') {
          sum += r;
          rated += 1;
        }
      }
      const cover = catalog.pois[promo.coverPoi];
      const firstPhoto = cover?.photos?.[0];
      const hotels = Object.entries(catalog.hotels).filter(([id]) => id.startsWith(`HT-${promo.poiPrefix}-`)).length;
      map.set(promo.code, {
        pois,
        rating: rated ? Math.round((sum / rated) * 10) / 10 : null,
        hotels,
        photo: firstPhoto?.url ?? null,
        credit: firstPhoto?.credit ?? (firstPhoto ? '实景图' : null),
      });
    }
    return map;
  }, [catalog]);

  // 宝藏店里有些就在已建城市包的范围内，同名即可对上真实评分（标「已核实」）
  const factByName = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const poi of Object.values(catalog.pois)) {
      m.set(poi.name, typeof poi.rating?.v === 'number' ? poi.rating.v : null);
    }
    return m;
  }, [catalog]);

  if (!open) return null;

  const hero = CITY_PROMOS.find((c) => c.hero) ?? CITY_PROMOS[0];
  const rest = CITY_PROMOS.filter((c) => c !== hero);

  const pick = (c: CityPromo) => {
    onPick(c.prompt, c.name);
    onClose();
  };

  /** 名录里的景点：城市还没有城市包也没关系，先按一句话需求走通流程 */
  const pickSpot = (spot: SpotEntry, city: string) => {
    onPick(`想去${city}玩3天，两个人，预算5000，一定要去${spot.n}`, city);
    onClose();
  };

  const queryTrim = query.trim();
  // 名录只有一百多条，直接算就行，不值得为它挂一个 hook（也不允许：上面已经 return 过了）
  let results: { spot: SpotEntry; city: string; prov: string }[] | null = null;
  if (queryTrim) {
    const out: { spot: SpotEntry; city: string; prov: string }[] = [];
    for (const pg of ATTRACTIONS) {
      for (const cg of pg.cities) {
        for (const s of cg.spots) {
          if (
            s.n.includes(queryTrim) ||
            cg.c.includes(queryTrim) ||
            pg.p.includes(queryTrim) ||
            s.d.includes(queryTrim)
          ) {
            out.push({ spot: s, city: cg.c, prov: pg.p });
          }
        }
      }
    }
    results = out.slice(0, 60);
  }

  const active = ATTRACTIONS.find((pg) => pg.p === prov) ?? ATTRACTIONS[0];

  const tqTrim = tq.trim();
  // 搜索时忽略城市筛选：用户输「咖啡」是想看所有城市的咖啡，
  // 而不是「长沙有没有咖啡」——那样只会得到一片空白。
  const shops = TREASURES.filter((t) => {
    if (tqTrim) {
      return (
        t.n.includes(tqTrim) || t.c.includes(tqTrim) || t.p.includes(tqTrim) || t.d.includes(tqTrim) || t.k.includes(tqTrim)
      );
    }
    return shopCity === '全部' || t.c === shopCity;
  });

  const pickShop = (t: (typeof TREASURES)[number]) => {
    onPick(`想去${t.c}玩3天，两个人，预算5000，想去${t.n}打卡`, t.c);
    onClose();
  };

  const photoOf = (c: CityPromo) => {
    const s = stats.get(c.code);
    return broken[c.code] ? null : s?.photo ?? null;
  };

  const metaLine = (c: CityPromo) => {
    const s = stats.get(c.code);
    if (!s) return '数据待抓取';
    const bits = [`${s.pois} 个景点`];
    if (s.rating != null) bits.push(`均分 ${s.rating}`);
    if (s.hotels) bits.push(`${s.hotels} 家酒店`);
    return bits.join(' · ');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal discover-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>灵感 · 去哪玩</h3>
            <p className="tiny muted">经典目的地 + 各地宝藏小店，选一个当起点，细节你还能改</p>
          </div>
          <button className="icon-btn" onClick={onClose} title="关闭">
            <IconX size={15} />
          </button>
        </div>

        <div className="modal-body discover-body" ref={scrollRef}>
          <div className="dv-tabs">
            <button className={`dv-tab ${tab === 'classic' ? 'on' : ''}`} onClick={() => setTab('classic')}>
              经典目的地
            </button>
            <button className={`dv-tab ${tab === 'treasure' ? 'on' : ''}`} onClick={() => setTab('treasure')}>
              宝藏小店<i>{treasureCount()}</i>
            </button>
          </div>

          {tab === 'classic' && (
          <>
          <button className="hero-card" onClick={() => pick(hero)} title={`用一句话规划${hero.name}`}>
            {photoOf(hero) ? (
              <img
                src={photoOf(hero) as string}
                alt={`${hero.name} ${catalog.pois[hero.coverPoi]?.name ?? ''}`}
                onError={() => setBroken((b) => ({ ...b, [hero.code]: true }))}
              />
            ) : (
              <SceneryArt seed={hero.code} category={hero.coverCategory} name={hero.name} height={286} />
            )}
            <span className="hero-shade" />
            <span className="hero-body">
              <span className="hero-eyebrow">
                <IconSpark size={12} /> 本周主推
              </span>
              <strong className="hero-name">{hero.name}</strong>
              <span className="hero-slogan">{hero.slogan}</span>
              <span className="hero-sub">{hero.sub}</span>
              <span className="hero-meta">
                {metaLine(hero)}
                {catalog.pois[hero.coverPoi]?.name ? ` · 封面：${catalog.pois[hero.coverPoi].name}` : ''}
              </span>
              <span className="hero-cta">
                从这里出发 <IconArrow size={13} />
              </span>
            </span>
            {photoOf(hero) && <span className="hero-credit">图 · {stats.get(hero.code)?.credit}</span>}
          </button>

          <div className="promo-grid">
            {rest.map((c) => (
              <button key={c.code} className="promo-card" onClick={() => pick(c)} title={`用一句话规划${c.name}`}>
                <span className="pc-photo">
                  {photoOf(c) ? (
                    <img
                      src={photoOf(c) as string}
                      alt={c.name}
                      loading="lazy"
                      onError={() => setBroken((b) => ({ ...b, [c.code]: true }))}
                    />
                  ) : (
                    <SceneryArt seed={c.code} category={c.coverCategory} name={c.name} height={150} />
                  )}
                  <span className="pc-tags">
                    {c.tags.slice(0, 2).map((t) => (
                      <i key={t}>{t}</i>
                    ))}
                  </span>
                </span>
                <span className="pc-txt">
                  <span className="pc-title">
                    <b>{c.name}</b>
                    <em>{c.slogan}</em>
                  </span>
                  <span className="pc-sub">{c.sub}</span>
                  <span className="pc-meta">{metaLine(c)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="atlas">
            <div className="atlas-head">
              <b>全国著名景点 · 按省市</b>
              <span className="tiny muted">
                共 {spotCount()} 处 · 覆盖 {ATTRACTIONS.length} 个省级行政区 · 点一处直接填入规划
              </span>
            </div>

            <input
              className="atlas-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜景点或城市，比如：黄山、大理、莫高窟"
              spellCheck={false}
            />

            {results ? (
              <div className="atlas-results">
                {results.map(({ spot, city, prov: pv }) => (
                  <button key={`${pv}-${city}-${spot.n}`} className="atlas-spot" onClick={() => pickSpot(spot, city)}>
                    <b>{spot.n}</b>
                    <span>
                      {pv} · {city} — {spot.d}
                    </span>
                  </button>
                ))}
                {results.length === 0 && (
                  <p className="tiny muted atlas-empty">没搜到，换个关键词试试（名录只收经典景点）</p>
                )}
              </div>
            ) : (
              <>
                <div className="atlas-provs">
                  {ATTRACTIONS.map((pg) => (
                    <button
                      key={pg.p}
                      className={`atlas-prov ${pg.p === active.p ? 'on' : ''}`}
                      onClick={() => setProv(pg.p)}
                    >
                      {pg.p}
                    </button>
                  ))}
                </div>
                <div className="atlas-cities">
                  {active.cities.map((cg) => (
                    <div key={cg.c} className="atlas-city">
                      <div className="atlas-city-name">
                        {cg.c}
                        <span>{cg.spots.length} 处</span>
                      </div>
                      <div className="atlas-spots">
                        {cg.spots.map((s) => (
                          <button key={s.n} className="atlas-spot" title={s.d} onClick={() => pickSpot(s, cg.c)}>
                            <b>{s.n}</b>
                            <span>{s.d}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          </>
          )}

          {tab === 'treasure' && (
          <div className="treasure">
            <div className="atlas-head">
              <b>宝藏小店 · 值得专门跑一趟</b>
              <span className="tiny muted">
                {treasureCount()} 家 · 覆盖 {TREASURE_CITIES.length} 座城市 · 店铺会搬会关，出发前在地图上确认营业
              </span>
            </div>

            <input
              className="atlas-search"
              value={tq}
              onChange={(e) => setTq(e.target.value)}
              placeholder="搜店名、城市或类型，比如：咖啡、面馆、长沙"
              spellCheck={false}
            />

            {!tqTrim && (
              <div className="atlas-provs">
                <button
                  className={`atlas-prov ${shopCity === '全部' ? 'on' : ''}`}
                  onClick={() => setShopCity('全部')}
                >
                  全部
                </button>
                {TREASURE_CITIES.map((c) => (
                  <button key={c} className={`atlas-prov ${shopCity === c ? 'on' : ''}`} onClick={() => setShopCity(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {tqTrim && (
              <p className="tiny muted shop-search-note">
                在全部 {TREASURE_CITIES.length} 座城市里匹配「{tqTrim}」，共 {shops.length} 家
              </p>
            )}

            <div className="shop-grid">
              {shops.map((t) => {
                const rate = factByName.get(t.n);
                return (
                  <button key={`${t.c}-${t.n}`} className="shop-card" onClick={() => pickShop(t)} title={t.d}>
                    <span className="shop-top">
                      <b>{t.n}</b>
                      <i className={`shop-kind k-${t.k}`}>{t.k}</i>
                    </span>
                    <span className="shop-note">{t.d}</span>
                    <span className="shop-meta">
                      {t.p} · {t.c}
                      {typeof rate === 'number' && <em>已核实 {rate} 分</em>}
                    </span>
                  </button>
                );
              })}
              {shops.length === 0 && <p className="tiny muted atlas-empty">这座城还没收录，先看看别的城市</p>}
            </div>
          </div>
          )}
        </div>

        <div className="modal-foot">
          <span className="tiny muted">
            点城市卡或名录里任意一处景点 = 自动填好一句话需求（景点会带上「一定要去」），改完再点「智能规划」；Esc 关闭
          </span>
        </div>
      </div>
    </div>
  );
}
