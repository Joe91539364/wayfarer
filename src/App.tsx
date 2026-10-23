import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Candidate, Itinerary, Meta } from './domain/schema';
import { CATEGORY_CN, INTEREST_CN, PACES } from './domain/schema';
import { reflowDay } from './agent/reflow';
import { resolveDayEdits, type EditFix } from './agent/conflict';
import { insertCandidate, removeItem, type RepairResult } from './agent/repair';
import { buildContext, NeedsClarification, revalidate, runAgent, type StageEvent } from './agent/orchestrator';
import { whatIf, type WhatIfKind, type WhatIfResult } from './agent/whatif';
import { changeBudget } from './agent/budget';
import { importFromText, type ImportResult } from './agent/importer';
import { DEFAULT_LLM, loadLlmConfig, saveLlmConfig, type LlmConfig } from './agent/llm';
import { describeMeta, intake, type IntakeResult } from './agent/intake';
import { addDays, clockInTz, diffDays } from './domain/time';
import { inheritParsed } from './domain/replan';
import { ensureCityPack } from './data/citypack';
import { cityByCode, findCity } from './data/pois';
import RequirementsCard from './components/RequirementsCard';
import IntercityCard from './components/IntercityCard';
import NextStopAlert from './components/NextStopAlert';
import ExpressionWarnBar from './components/ExpressionWarnBar';
import FloatingDock from './components/FloatingDock';
import LiveClock from './components/LiveClock';
import InstallBanner from './components/InstallBanner';
import { understandExpression, type ExprCheck } from './agent/understand';
import { cnMoney } from './domain/summary';
import { verify } from './verifier';
import IntakeConsole from './components/IntakeConsole';
import HeroScene from './components/HeroScene';
import Timeline from './components/Timeline';
import RightRail from './components/RightRail';
import ImportModal from './components/ImportModal';
import PoiDetail from './components/PoiDetail';
import SyncModal from './components/SyncModal';
import HotelModal from './components/HotelModal';
import EditReportBar from './components/EditReportBar';
import AddPlaceModal from './components/AddPlaceModal';
import RouteRibbon, { clockFromSlider } from './components/RouteRibbon';
import LoginModal from './components/LoginModal';
import DataSourcesModal from './components/DataSourcesModal';
import DiscoverModal from './components/DiscoverModal';
import MomentsWall from './components/MomentsWall';
import { fetchMoments } from './data/moments';
import type { Moment } from './domain/moments';
import WeatherAlertBar from './components/WeatherAlertBar';
import TaxiSheet from './components/TaxiSheet';
import ReviewBoard from './components/ReviewBoard';
import { useCatalog } from './hooks/useCatalog';
import { useNow } from './hooks/useNow';
import { fmtCountdown, fmtUptime, useResident } from './hooks/useResident';
import { buildAlerts, shouldNotify, todayISO } from './domain/alerts';
import BindingsModal from './components/BindingsModal';
import { useOfficialFeed } from './hooks/useOfficialFeed';
import { loadUser, logout, maskPhone, type User } from './auth';
import { loadBindings, type Binding } from './data/bindings';
import { replanStep } from './agent/replanStep';
import { buildIcs, decodeItinerary, downloadFile } from './utils/share';
import type { HotelSeed } from './data/hotels';
import { IconAlert, IconArrow, IconDownload, IconLink, IconRefresh, IconSpark, IconUpload, IconX } from './components/icons';

const EXAMPLES = [
  '五一想去成都玩4天，两个人，预算6000，喜欢吃的和自然风光，不想太赶',
  '西安3天，一个人，预算3000，历史控，能暴走',
  '厦门3天，两个人，预算5000，海边放松，不想走路',
  '北京5天，带父母，预算10000，节奏慢一点',
  '杭州2天，情侣，4000块，主要想拍照',
];

const STORAGE_KEY = 'wayfarer.itinerary.v3';

export default function App() {
  const [request, setRequest] = useState(EXAMPLES[0]);
  /** 当前这份行程是用哪句话规划的 —— 用来判断侧栏里的需求有没有被改过 */
  const [plannedRequest, setPlannedRequest] = useState('');
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [iti, setIti] = useState<Itinerary | null>(null);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [busyWhatIf, setBusyWhatIf] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<Meta | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [packState, setPackState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'fail';
    name?: string;
    message?: string;
  }>({ status: 'idle' });
  const [originPoint, setOriginPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [exprWarn, setExprWarn] = useState<ExprCheck | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [llmOpen, setLlmOpen] = useState(false);
  const [llmCfg, setLlmCfg] = useState<LlmConfig>(() => loadLlmConfig() ?? DEFAULT_LLM);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [hotelDay, setHotelDay] = useState<number | null>(null);
  /** 「自己加点」弹窗：哪一天、哪个空档（slot 为空表示从右栏搜） */
  const [addPlace, setAddPlace] = useState<{ dayIndex: number; slot: import('./domain/gaps').DaySlot | null } | null>(null);
  /** 手动改完行程后的「刚才自动做了什么」+ 一步撤销 */
  const [editReport, setEditReport] = useState<{ title: string; fixes: EditFix[] } | null>(null);
  const undoRef = useRef<Itinerary | null>(null);
  const { now, driftMs, synced } = useNow();
  const [followReal, setFollowReal] = useState(true);
  const [seek, setSeek] = useState(0);
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [loginOpen, setLoginOpen] = useState(false);
  const [bindingsOpen, setBindingsOpen] = useState(false);
  const [bindings, setBindings] = useState<Record<string, Binding>>(() => loadBindings());
  const [menuOpen, setMenuOpen] = useState(false);
  const official = useOfficialFeed();
  const resident = useResident();
  const { catalog, report, mode: catalogMode, crawling, error: catalogError, keys, gates, refresh: refreshCatalog, crawlNow, saveKeys } =
    useCatalog();
  const [dsOpen, setDsOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [momentsOpen, setMomentsOpen] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [taxiFor, setTaxiFor] = useState<string | null>(null);
  const [notifyState, setNotifyState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /** 幸福时刻存在服务端，进页面先拉一次；Dock 上的数字也靠它 */
  const reloadMoments = useCallback(() => {
    void fetchMoments().then(setMoments);
  }, []);

  useEffect(() => {
    reloadMoments();
  }, [reloadMoments]);

  /** 只算当前这趟行程的照片 —— 换了目的地不该把上一趟的翻出来 */
  const tripMoments = useMemo(
    () => (iti ? moments.filter((m) => m.trip_id === iti.id) : []),
    [moments, iti],
  );

  /** 每个点位挂了几张，给时间轴上的相机角标用 */
  const momentByPoi = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of tripMoments) {
      if (!x.poi_id) continue;
      m.set(x.poi_id, (m.get(x.poi_id) ?? 0) + 1);
    }
    return m;
  }, [tripMoments]);

  useEffect(() => {
    const hash = location.hash;
    if (hash.startsWith('#plan=')) {
      void decodeItinerary(hash.slice(6)).then((shared) => {
        if (shared?.days?.length) {
          setIti(shared);
          setActiveDay(shared.days[0].day_index);
          setRequest(`${shared.meta.destination} ${shared.days.length} 天（来自分享链接）`);
          notify('已从分享链接载入行程');
        }
      });
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Itinerary;
      if (parsed?.days?.length) {
        setIti(parsed);
        setActiveDay(parsed.days[0].day_index);
      }
    } catch {
      /* ignore */
    }
  }, [notify]);

  useEffect(() => {
    if (!iti) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(iti));
    } catch {
      /* quota */
    }
  }, [iti]);

  const commit = useCallback((next: Itinerary) => {
    const ctx = buildContext(next.meta);
    setIti(revalidate(next, ctx));
    setWhatIfResult(null);
  }, []);

  /**
   * 手动改完行程的统一出口：记快照（可一键撤销）→ 让 conflict.ts 收拾冲突
   * （撞闭园、收工太晚、饭点被挤掉）→ 整体重新校验。
   */
  function commitManual(title: string, next: Itinerary, dayIndex?: number) {
    undoRef.current = iti ? (JSON.parse(JSON.stringify(iti)) as Itinerary) : null;
    let result = next;
    let fixes: EditFix[] = [];
    if (dayIndex != null) {
      const r = resolveDayEdits(result, dayIndex);
      result = r.itin;
      fixes = r.fixes;
    }
    commit(result);
    setEditReport(fixes.length ? { title, fixes } : null);
    return { itin: result, fixes };
  }

  function undoEdit() {
    if (!undoRef.current) return;
    setIti(undoRef.current);
    undoRef.current = null;
    setEditReport(null);
    notify('已撤销这次改动');
  }

  /**
   * 就地改需求的字段继承（规则在 domain/replan.ts，可单测）：
   * 天数/日期/目的地没重说就沿用；出发地只在「没换目的地」时沿用。
   */
  function inheritFromCurrent(parsed: IntakeResult) {
    inheritParsed(parsed, iti);
  }

  /** 解析 → 需要确认就弹确认卡，不需要就直接排 */
  async function run(textOverride?: string) {
    const text = (textOverride ?? request).trim();
    if (!text) return;
    if (running) return;

    const parsed = intake(text);
    inheritFromCurrent(parsed);
    setDraft(parsed.meta);
    setMissing(parsed.missing);
    setPackState({ status: 'idle' });
    setExprWarn(null);

    // 表达推算：预算量级/指代不明用确定性规则，地名混淆交给大模型。
    // 不阻塞规划（可能没配 Key，也可能根本没问题），有问题就挂提醒。
    void understandExpression(text, parsed.meta as unknown as Record<string, unknown>).then((c) => {
      if (c.checked && c.affected) {
        setExprWarn(c);
        notify('表达推算：你这句话有歧义，看一眼提醒');
      }
    });

    // 目的地 / 出发地 / 出发日期，只要有一个是靠推算的，就先让用户看一眼。
    // 不再默认「深圳出发」「两周后」，那是替用户做决定。
    const mustConfirm = ['destination', 'origin', 'start_date'].some((k) => parsed.missing.includes(k));
    if (mustConfirm) {
      notify('先把出发地和日期确认一下 —— 我不替你猜');
      return;
    }
    await execPlan(parsed.meta);
  }

  /** 真正开始规划：先确保城市包，再跑 Agent */
  async function execPlan(meta: Meta) {
    if (running) return;
    setRunning(true);
    setPlannedRequest(request.trim());
    setStages([]);
    setIti(null);
    setWhatIfResult(null);
    setRepairResult(null);
    setOriginPoint(null);

    let plan = { ...meta };

    // 内置没有这个城市 → 用高德现场建包
    const known = findCity(plan.destination);
    if (!known) {
      setPackState({ status: 'loading', name: plan.destination });
      const pack = await ensureCityPack(plan.destination);
      if (!pack.ok) {
        setPackState({ status: 'fail', name: plan.destination, message: pack.error });
        setRunning(false);
        notify('城市包没建成，换个城市名试试');
        return;
      }
      setPackState({ status: 'ok', name: pack.pack.city.name, message: pack.pack.note });
      plan = { ...plan, destination: pack.pack.city.name, city_code: pack.pack.city.code };
      notify(`${pack.pack.city.name}：${pack.pack.note}`);
    } else {
      plan = { ...plan, destination: known.name, city_code: known.code };
    }

    // 出发地坐标：城际交通要用
    if (plan.origin_city) {
      try {
        const geo = await fetch(`/api/geocode?name=${encodeURIComponent(plan.origin_city)}`).then((r) =>
          r.ok ? (r.json() as Promise<{ lat: number; lng: number }>) : null,
        );
        if (geo) setOriginPoint({ lat: geo.lat, lng: geo.lng });
      } catch {
        /* 城际卡片会显示「坐标缺失」 */
      }
    }

    try {
      const result = await runAgent(request, (e) => setStages((prev) => [...prev, e]), {
        metaOverride: plan,
      });
      setIti(result.itinerary);
      setRepairResult(result.repairResult);
      setActiveDay(result.itinerary.days[0]?.day_index ?? 1);
      setDraft(null);
      notify(
        result.itinerary.feasibility
          ? `生成完成：可行性 ${result.itinerary.feasibility.summary.passed}/${result.itinerary.feasibility.summary.total}`
          : '生成完成',
      );
    } catch (e) {
      if (e instanceof NeedsClarification) {
        notify(`还差信息：${e.missing.join('、')}`);
        const re = intake(request);
        inheritFromCurrent(re);
        setDraft(re.meta);
        // 两份 missing 取交集：继承已经补上的字段不该再标「待补」
        setMissing(e.missing.filter((k) => re.missing.includes(k)));
      } else {
        notify('生成失败，请重试');
      }
    } finally {
      setRunning(false);
    }
  }

  function confirmRequirements() {
    if (!draft) return;
    void execPlan(draft);
  }

  function toggleLock(itemId: string) {
    if (!iti) return;
    const next: Itinerary = JSON.parse(JSON.stringify(iti));
    for (const day of next.days) {
      const item = day.items.find((i) => i.id === itemId);
      if (item) item.locked = !item.locked;
    }
    commit(next);
    const locked = next.days.some((d) => d.items.some((i) => i.id === itemId && i.locked));
    notify(locked ? '已锁定：后续重排不会动这一项' : '已解锁');
  }

  function remove(id: string) {
    if (!iti) return;
    const day = iti.days.find((d) => d.items.some((i) => i.id === id));
    const res = removeItem(iti, id, '手动移入候选池');
    if (!res.removed) {
      notify('这一项已锁定，先解锁再删除');
      return;
    }
    const { fixes } = commitManual('已把这一项移入候选池', res.itin, day?.day_index);
    const auto = fixes.filter((f) => f.auto).length;
    notify(auto > 0 ? `已移入候选池，顺手补了 ${auto} 处` : '已移入候选池');
  }

  function move(dayIndex: number, fromId: string, toId: string) {
    if (!iti) return;
    const next: Itinerary = JSON.parse(JSON.stringify(iti));
    const day = next.days.find((d) => d.day_index === dayIndex);
    if (!day) return;
    const acts = day.items.filter((i) => i.type !== 'transit');
    const from = acts.findIndex((a) => a.id === fromId);
    const to = acts.findIndex((a) => a.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = acts.splice(from, 1);
    acts.splice(to, 0, moved);
    const lodging = day.lodging ?? { name: '住宿', lat: 30.657, lng: 104.066 };
    next.days = next.days.map((d) =>
      d.day_index === dayIndex ? reflowDay({ ...d, items: acts }, { startClock: dayIndex === 1 ? '09:30' : '08:30', lodging }) : d,
    );
    const { fixes } = commitManual('已重排这一天', next, dayIndex);
    const auto = fixes.filter((f) => f.auto).length;
    notify(auto > 0 ? `已重排，顺手处理 ${auto} 处冲突` : '已重排，通勤与时间已重算');
  }

  function addCandidate(c: Candidate) {
    if (!iti) return;
    const next = insertCandidate(iti, activeDay - 1, c, 99);
    commit(next);
    notify(`已把「${c.name}」插入第 ${activeDay} 天并重新校验`);
  }

  /**
   * 手动改预算：不只是换房型 —— 升预算会加付费体验，降预算会把最贵的非必去项退回候选池，
   * 游玩地跟着一起变，改完立刻重算并给出说明。
   */
  function setBudgetTo(amount: number) {
    if (!iti || !Number.isFinite(amount) || amount <= 0) return;
    undoRef.current = JSON.parse(JSON.stringify(iti)) as Itinerary;
    const res = changeBudget(iti, amount);
    commit(res.itin);
    setEditReport({
      title: `预算改到 ${cnMoney(amount)}`,
      fixes: res.notes.map((text) => ({ code: 'budget' as const, text, auto: true })),
    });
    notify(res.notes.length > 1 ? `预算已改，动了 ${res.notes.length - 2 + 1} 处安排` : `预算已改为 ${cnMoney(amount)}`);
  }

  /** 自己加点：插到指定天的空档里，然后重排这一天，再整体重新校验 */
  function addPlaceTo(c: Candidate, dayIndex: number) {
    if (!iti) return;
    const day = iti.days.find((d) => d.day_index === dayIndex);
    if (!day) return;
    const slot = addPlace?.dayIndex === dayIndex ? addPlace.slot : null;
    // 空档在中间就插在那个位置（补缝隙），收工后的空档直接排到末尾
    let position = 99;
    if (slot && slot.kind !== 'evening') {
      const acts = day.items.filter((i) => i.type !== 'transit');
      const at = acts.findIndex((i) => i.start_time === slot.end);
      if (at >= 0) position = at;
    }
    const inserted = insertCandidate(iti, dayIndex - 1, c, position);
    const { itin } = commitManual(`已把「${c.name}」加进第 ${dayIndex} 天`, inserted, dayIndex);
    const after = itin.days.find((d) => d.day_index === dayIndex);
    const placed = after?.items.filter((i) => i.type !== 'transit').find((i) => i.name === c.name);
    notify(
      placed
        ? `已把「${c.name}」加进第 ${dayIndex} 天，${placed.start_time}-${placed.end_time}`
        : `已把「${c.name}」加进第 ${dayIndex} 天`,
    );
  }

  function pickReplacement(c: Candidate) {
    if (!iti || !swapFor) return;
    const day = iti.days.find((d) => d.items.some((i) => i.id === swapFor));
    if (!day) return;
    const acts = day.items.filter((i) => i.type !== 'transit');
    const pos = acts.findIndex((a) => a.id === swapFor);
    const res = removeItem(iti, swapFor, '被替换');
    const next = insertCandidate(res.itin, day.day_index - 1, c, Math.max(0, pos));
    commitManual(`已换成「${c.name}」`, next, day.day_index);
    setSwapFor(null);
    notify(`已换成「${c.name}」`);
  }

  function applyWhatIf() {
    if (!whatIfResult) return;
    setIti(whatIfResult.itinerary);
    setWhatIfResult(null);
    notify('已采用这个分支，可继续编辑');
  }

  function runWhatIf(kind: WhatIfKind, payload?: { budget?: number; dayIndex?: number }) {
    if (!iti) return;
    setBusyWhatIf(true);
    const ctx = buildContext(iti.meta);
    try {
      const result = whatIf(iti, kind, ctx, payload);
      setWhatIfResult(result);
      notify(
        result.satisfied
          ? `分支已算完：${result.changed} 处变化，约束满足`
          : `分支已算完：${result.changed} 处变化，仍有未满足的约束`,
      );
    } catch (e) {
      notify('推演失败，请重试');
    } finally {
      setBusyWhatIf(false);
    }
  }

  function doImport(text: string) {
    if (!iti) return;
    const result = importFromText(text, iti.meta, (x) => verify(x, buildContext(x.meta)));
    setImportResult(result);
    notify(`导入解析完成：${result.report.matched}/${result.report.total} 条匹配`);
  }

  function adoptImport() {
    if (!importResult) return;
    const ctx = buildContext(importResult.itinerary.meta);
    setIti(revalidate(importResult.itinerary, ctx));
    setRepairResult(null);
    setActiveDay(1);
    setImportOpen(false);
    setImportResult(null);
    notify('已载入导入的行程，可继续修复或编辑');
  }

  function saveItem(itemId: string, patch: { duration_min?: number; notes?: string; locked?: boolean }) {
    if (!iti) return;
    const next: Itinerary = JSON.parse(JSON.stringify(iti));
    const day = next.days.find((d) => d.items.some((i) => i.id === itemId));
    if (!day) return;
    const item = day.items.find((i) => i.id === itemId)!;
    if (patch.duration_min != null) item.duration_min = Math.max(15, Math.min(300, patch.duration_min));
    if (patch.notes != null) item.notes = patch.notes;
    if (patch.locked != null) item.locked = patch.locked;
    const lodging = day.lodging ?? { name: '住宿', lat: 30.657, lng: 104.066 };
    const reflowed = reflowDay(day, { startClock: day.day_index === 1 ? '09:30' : '08:30', lodging });
    next.days = next.days.map((d) => (d.day_index === day.day_index ? reflowed : d));
    commit(next);
    notify('已保存，这一天的时间与通勤重新算过了');
  }

  function askStep(itemId: string, text: string) {
    if (!iti) return { reply: '还没有行程。', changed: false, itemId };
    const result = replanStep(iti, itemId, text, buildContext(iti.meta));
    if (result.changed) {
      setIti(result.itinerary);
      setWhatIfResult(null);
      setRepairResult(null);
    }
    return { reply: result.reply, changed: result.changed, itemId: result.itemId };
  }

  function changeHotel(hotel: HotelSeed) {
    if (!iti) return;
    const next: Itinerary = JSON.parse(JSON.stringify(iti));
    next.days = next.days.map((d) => {
      if (!d.lodging) return d;
      const reflowed = reflowDay(
        { ...d, lodging: { name: hotel.name, lat: hotel.lat, lng: hotel.lng, cost: { amount: hotel.price, currency: 'CNY', type: 'lodging' } } },
        { startClock: d.day_index === 1 ? '09:30' : '08:30', lodging: { name: hotel.name, lat: hotel.lat, lng: hotel.lng } },
      );
      return reflowed;
    });
    commit(next);
    notify(`住宿换成「${hotel.name}」，房费与次日出发时间已重算`);
  }

  // 打开就在行程期内的话，直接停到今天 —— 现实时间对齐，不用手动翻
  // 只跟着行程版本走，不跟秒走，免得每秒抢用户的选择
  useEffect(() => {
    if (!iti) return;
    const today = clockInTz(new Date(), iti.meta.timezone).date;
    const hit = iti.days.find((d) => d.date === today);
    if (hit) setActiveDay(hit.day_index);
  }, [iti?.id]);

  const clock = useMemo(() => {
    if (!iti) return now;
    if (followReal) return now;
    return clockFromSlider(iti, seek);
  }, [iti, now, followReal, seek]);

  // 行程里的「现在」按目的地当地时间算（跨时区时和本机钟不是一回事）
  const nowLocal = useMemo(() => clockInTz(now, iti?.meta.timezone ?? 'Asia/Shanghai'), [now, iti?.meta.timezone]);

  const cityWeather = iti ? catalog.weather[iti.meta.city_code] : undefined;
  const alerts = useMemo(
    () => (iti ? buildAlerts({ itinerary: iti, weather: cityWeather, now: clock }) : []),
    [iti, cityWeather, clock],
  );

  function taxiPoints(itemId: string) {
    if (!iti) return null;
    for (const day of iti.days) {
      const idx = day.items.findIndex((i) => i.id === itemId);
      if (idx < 0) continue;
      const target = day.items[idx];
      const prev = [...day.items.slice(0, idx)].reverse().find((i) => i.type !== 'transit');
      const from = prev?.lat != null && prev.lng != null
        ? { lat: prev.lat, lng: prev.lng, name: prev.name }
        : day.lodging
          ? { lat: day.lodging.lat, lng: day.lodging.lng, name: day.lodging.name }
          : null;
      const to = target.lat != null && target.lng != null
        ? { lat: target.lat, lng: target.lng, name: target.name }
        : null;
      if (!from || !to) return null;
      const km = Math.hypot((to.lat - from.lat) * 111, (to.lng - from.lng) * 111 * Math.cos((to.lat * Math.PI) / 180));
      return { from, to, distanceKm: km };
    }
    return null;
  }

  const firedAlerts = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (notifyState !== 'granted' || !iti) return;
    for (const a of alerts) {
      if (!shouldNotify(a, clock) || firedAlerts.current.has(a.id)) continue;
      firedAlerts.current.add(a.id);
      try {
        new Notification(`行迹 · ${a.title}`, { body: a.detail, tag: a.id });
      } catch {
        /* 某些浏览器禁止构造 Notification，忽略 */
      }
    }
  }, [alerts, clock, iti, notifyState]);


  function seekTo(value: number) {
    setFollowReal(false);
    setSeek(value);
  }

  /** Dock：给「即将到达的下一站」叫车；没有行程时不可用 */
  function dockTaxi() {
    if (!iti) return;
    const hhmm = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`;
    let pick: { day: number; id: string } | null = null;
    let fallback: { day: number; id: string } | null = null;
    for (const day of iti.days) {
      for (const item of day.items) {
        if (item.type === 'transit' || item.lat == null || item.lng == null) continue;
        if (!fallback) fallback = { day: day.day_index, id: item.id };
        if (item.end_time >= hhmm) {
          pick = { day: day.day_index, id: item.id };
          break;
        }
      }
      if (pick) break;
    }
    const target = pick ?? fallback;
    if (!target) {
      notify('这趟行程没有可叫车的地点');
      return;
    }
    setActiveDay(target.day);
    setTaxiFor(target.id);
  }

  /** Dock：滚动到出发提醒条；没有就告知 */
  function dockAlert() {
    if (!iti) {
      notify('先规划一趟行程，才会在这里提醒你出发');
      return;
    }
    const el = document.querySelector('.dep-bar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      window.setTimeout(() => el.classList.remove('flash'), 1400);
    } else {
      notify('近期 30 分钟内没有要出发的行程，拖动旅程时钟可以预演');
    }
  }

  /** 发现页选了城市：把一句话填进输入框，用户还能改 */
  function pickPromo(prompt: string, name: string) {
    setRequest(prompt);
    notify(`已填入「${name}」的一句话需求，改完点「智能规划」`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      const ta = document.querySelector('textarea');
      ta?.focus();
      ta?.setSelectionRange(ta.value.length, ta.value.length);
    }, 320);
  }

  /** Dock：滚到需求框就地改（有行程时改的是侧栏那份，不用新建） */
  function dockPlan() {
    const el = document.querySelector('#req-input') ?? document.querySelector('textarea');
    (el as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => (el as HTMLElement | null)?.focus(), 350);
  }

  function toggleFollow() {
    if (!iti) return;
    if (followReal) {
      const start = new Date(`${iti.meta.start_date}T08:00:00`).getTime();
      const total = Math.max(1, iti.days.length) * 15 * 60 * 60000;
      setSeek(Math.min(1, Math.max(0, (now.getTime() - start) / total)));
      setFollowReal(false);
    } else {
      setFollowReal(true);
    }
  }

  function openItem(itemId: string) {
    setDetailItemId(itemId);
    const day = iti?.days.find((d) => d.items.some((i) => i.id === itemId));
    if (day) setActiveDay(day.day_index);
    window.setTimeout(() => {
      document.getElementById(`item-${itemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  const progress = useMemo(() => {
    const done = STAGE_KEYS.filter((k) => stages.some((s) => s.stage === k && s.status === 'done')).length;
    return Math.max(4, (done / STAGE_KEYS.length) * 100);
  }, [stages]);

  const swapCandidates = useMemo(() => {
    if (!iti || !swapFor) return [];
    const target = iti.days.flatMap((d) => d.items).find((i) => i.id === swapFor);
    if (!target) return [];
    const sameCat = iti.unscheduled.filter((c) => c.category === target.category);
    const others = iti.unscheduled.filter((c) => c.category !== target.category && c.category !== 'restaurant');
    return [...sameCat, ...others].slice(0, 12);
  }, [iti, swapFor]);

  return (
    <div className={`shell ${iti ? 'shell-fixed' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">行</div>
          <div className="brand-txt">
            <h1>行迹 Wayfarer</h1>
            <p>可验证的行程规划 Agent</p>
            {resident.online && (
              <span
                className={`resident-pill ${resident.lastOk === false ? 'bad' : ''}`}
                title={`本地服务已常驻 ${fmtUptime(resident.uptimeSec)}；每 ${resident.everyMin ?? 30} 分钟自动刷新一轮数据${
                  resident.catalogAgeMin != null ? `；当前数据 ${resident.catalogAgeMin} 分钟前更新` : ''
                }`}
              >
                <span className="rp-dot" />
                {resident.running ? '刷新中…' : fmtCountdown(resident.nextRunAt)}
              </span>
            )}
          </div>
        </div>
        <div className="topbar-actions">
          <LiveClock now={now} itinerary={iti} synced={synced} driftMs={driftMs} />
          <button className="btn btn-ghost" onClick={() => setBindingsOpen(true)} title="绑定行程软件">
            <IconLink size={13} /> 绑定
          </button>
          <button
            className={`btn btn-ghost ds-entry ${catalogMode === 'server' ? 'on' : ''}`}
            onClick={() => setDsOpen(true)}
            title="数据源与爬虫状态"
          >
            <span className={`ds-dot-live ${catalog.mode}`} />
            数据源
            <span className="tiny muted">{catalog.sources.filter((r) => r.status === 'ok').length}/{catalog.sources.length || 0}</span>
          </button>
          {iti && (
            <>
              <button className="btn btn-sm" onClick={() => setImportOpen(true)}>
                <IconUpload size={13} /> 导入
              </button>
              <button className="btn btn-sm btn-accent" onClick={() => setSyncOpen(true)}>
                <IconDownload size={13} /> 同步
              </button>
              <button
                className="btn btn-sm"
                onClick={() =>
                  downloadFile(`${iti.meta.destination}-行程.ics`, buildIcs(iti), 'text/calendar')
                }
                title="下载 .ics 日历文件"
              >
                ICS
              </button>
              <button
                className="btn btn-sm"
                onClick={() => downloadFile(`${iti.meta.destination}-itinerary.json`, JSON.stringify(iti, null, 2), 'application/json')}
              >
                JSON
              </button>
              <button className="btn btn-sm" onClick={() => { setIti(null); setStages([]); setRepairResult(null); }}>
                <IconRefresh size={13} /> 新建
              </button>
            </>
          )}

          <div className="account">
            {user ? (
              <button className="account-btn" onClick={() => setMenuOpen((v) => !v)}>
                <span className="account-avatar">{user.name.slice(0, 1)}</span>
                <span className="account-name">{user.name}</span>
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => setLoginOpen(true)}>
                登录
              </button>
            )}

            {menuOpen && user && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="account-menu">
                  <div className="account-menu-head">
                    <span className="account-avatar lg">{user.name.slice(0, 1)}</span>
                    <div>
                      <b>{user.name}</b>
                      <span>{user.guest ? '本机访客 · 数据不上传' : maskPhone(user.phone)}</span>
                    </div>
                  </div>
                  <button
                    className="account-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setBindingsOpen(true);
                    }}
                  >
                    绑定行程软件
                    <span className="tiny muted">{Object.keys(bindings).length} 个</span>
                  </button>
                  <button
                    className="account-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setLlmOpen(true);
                    }}
                  >
                    模型设置
                    <span className="tiny muted">{llmCfg.apiKey ? '已接入' : '未接入'}</span>
                  </button>
                  <button
                    className="account-item danger"
                    onClick={() => {
                      logout();
                      setUser(null);
                      setMenuOpen(false);
                      notify('已退出登录');
                    }}
                  >
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {running && <div className="loading-bar" style={{ width: `${progress}%` }} />}

      <HeroScene active={!iti && !running} />

      {!iti && !running && (
        <main className="hero landing-hero">
          <div className="hero-inner">
            <div className="scene-lede">
            <span className="eyebrow">
              <span className="dot" />
              Travel Planning Agent · verified itineraries
            </span>
            <h1>
              豆包给你一份看起来合理的行程，
              <br />
              <em>我们给你一份可以证明合理的行程。</em>
            </h1>
            <p className="hero-sub">
              行程是<b>结构化数据</b>而不是一段文本：每个点都有 POI 编号、坐标、营业时间和预算。
              时间由程序累加，然后跑 <b>8 条硬规则</b>（时间连续 / 营业时间 / 地理跨度 / 预算 / 体力 / 预约 / 天气 / 交通可达），
              报错就定向修复，最多 3 轮，最后产出一份可展开验算的<b>可行性证明</b>。
            </p>
            </div>

            <div className="scene-beat">
              <p>
                一份行程里有几十个数字，
                <br />
                每一个都算得出来。
              </p>
            </div>

            <div className="composer">
              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
                }}
                placeholder="比如：五一想去成都玩 4 天，两个人，预算 6000，喜欢吃的和自然风光，不想太赶"
                spellCheck={false}
              />
              <div className="composer-foot">
                <span className="composer-hint">
                  <IconSpark size={12} /> 模型只负责理解与取舍，时间和距离全部由程序计算
                </span>
                <button className="btn btn-accent" onClick={() => run()} disabled={!request.trim()}>
                  开始规划 <IconArrow size={13} />
                </button>
              </div>
            </div>

            {draft && !iti && !running && (
              <RequirementsCard
                draft={draft}
                missing={missing}
                packState={packState}
                exprWarn={exprWarn}
                onPatch={(patch) => {
                  setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
                  setMissing((prev) => prev.filter((k) => !(k in patch)));
                }}
                onConfirm={confirmRequirements}
                onCancel={() => {
                  setDraft(null);
                  setMissing([]);
                }}
              />
            )}

            {!resident.online && (
              <div className="server-warn">
                <IconAlert size={12} />
                <span>
                  本地服务没连上（127.0.0.1:8787）—— 实时抓取、陌生城市、天气都不可用。
                  双击项目文件夹里的 <b>start.cmd</b> 启动，然后刷新本页。
                </span>
              </div>
            )}

            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button className="example" key={ex} onClick={() => setRequest(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </main>
      )}

      {running && (
        <main className="hero">
          <div className="hero-inner" style={{ maxWidth: 720 }}>
            <span className="eyebrow">
              <span className="dot" />
              Agent running
            </span>
            <h1 style={{ fontSize: 30 }}>正在跑状态机…</h1>
            <div className="panel" style={{ marginTop: 20 }}>
              <div className="panel-body">
                <IntakeConsole request={request} stages={stages} itinerary={null} repair={null} running />
              </div>
            </div>
          </div>
        </main>
      )}

      {iti && !running && (
        <div className="workspace">
          {/* 就地改需求时如果缺关键信息（出发地/日期），弹确认卡，而不是把现有行程清掉 */}
          {draft && (
            <div className="overlay" onClick={() => { setDraft(null); setMissing([]); }}>
              <div className="modal req-modal" onClick={(e) => e.stopPropagation()}>
                <RequirementsCard
                  draft={draft}
                  missing={missing}
                  packState={packState}
                  exprWarn={exprWarn}
                  onPatch={(patch) => {
                    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
                    setMissing((prev) => prev.filter((k) => !(k in patch)));
                  }}
                  onConfirm={confirmRequirements}
                  onCancel={() => {
                    setDraft(null);
                    setMissing([]);
                  }}
                />
              </div>
            </div>
          )}
          <aside className="col col-left">
            <IntakeConsole
              request={request}
              stages={stages}
              itinerary={iti}
              repair={repairResult}
              running={running}
              editable
              dirty={request.trim() !== plannedRequest.trim()}
              onRequestChange={setRequest}
              onRerun={() => run()}
            />
            <div className="panel">
              <div className="panel-body">
                <div className="tiny muted" style={{ lineHeight: 1.7 }}>
                  这份行程的每一项改动都会重新跑一遍 8 条规则。
                  锁定某项后，重排与修复都不会动它。
                </div>
                <div className="divider" />
                <div className="tiny muted mono">{describeMeta(iti.meta)}</div>
              </div>
            </div>
          </aside>

          <main className="col col-main">
            <NextStopAlert
              itinerary={iti}
              clock={clock}
              realTime={followReal}
              notifyState={notifyState}
              onOpenItem={openItem}
              onTaxi={setTaxiFor}
            />
            {exprWarn?.checked && exprWarn.affected && (
              <ExpressionWarnBar
                check={exprWarn}
                onDismiss={() => setExprWarn(null)}
                onRewrite={() => {
                  setExprWarn(null);
                  setIti(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  document.querySelector('textarea')?.focus();
                }}
              />
            )}
            <IntercityCard
              origin={iti.meta.origin_city}
              originPoint={originPoint}
              destName={iti.meta.destination}
              destPoint={cityByCode(iti.meta.city_code)?.center ?? null}
              startDate={iti.meta.start_date}
              travelers={iti.meta.travelers.adults}
              onToast={notify}
            />
            <WeatherAlertBar
              cityName={iti.meta.destination}
              weather={cityWeather}
              alerts={alerts}
              tripDates={iti.days.map((d) => d.date)}
              notifyState={notifyState}
              onEnableNotify={() => {
                if (typeof Notification === 'undefined') {
                  setNotifyState('unsupported');
                  notify('这个浏览器不支持系统通知');
                  return;
                }
                void Notification.requestPermission().then((p) => {
                  setNotifyState(p);
                  notify(p === 'granted' ? '已开启：下雨前会弹提醒' : '没有授权通知');
                });
              }}
              onFixItem={(id) => {
                const res = askStep(id, '换成室内的');
                notify(res.reply);
              }}
              onOpenItem={openItem}
              onRefresh={() => void refreshCatalog()}
              loading={crawling}
            />
            <RouteRibbon
              itinerary={iti}
              clock={clock}
              onSeek={seekTo}
              followReal={followReal}
              onToggleFollow={toggleFollow}
              onOpenItem={openItem}
            />
            {editReport && (
              <EditReportBar
                title={editReport.title}
                fixes={editReport.fixes}
                onUndo={undoEdit}
                onDismiss={() => setEditReport(null)}
              />
            )}
            <Timeline
              itinerary={iti}
              activeDay={activeDay}
              onSelectDay={setActiveDay}
              warnings={iti.warnings}
              onToggleLock={toggleLock}
              onSwap={(id) => setSwapFor(id)}
              onDelete={remove}
              onMove={move}
              onOpenDetail={openItem}
              momentByPoi={momentByPoi}
              nowInfo={{ date: nowLocal.date, hhmm: nowLocal.hhmm }}
              tzOffsetMin={nowLocal.offsetMin}
              onAddPlace={(d, slot) => {
                setActiveDay(d);
                setAddPlace({ dayIndex: d, slot });
              }}
            />
          </main>

          <aside className="col col-right">
            <RightRail
              itinerary={iti}
              activeDay={activeDay}
              clock={clock}
              onOpenHotel={(d) => setHotelDay(d)}
              onSelectDay={setActiveDay}
              onAddCandidate={addCandidate}
              onOpenAddPlace={() => setAddPlace({ dayIndex: activeDay, slot: null })}
              onSetBudget={setBudgetTo}
              onWhatIf={runWhatIf}
              onApply={applyWhatIf}
              onDiscard={() => setWhatIfResult(null)}
              whatIfResult={whatIfResult}
              busy={busyWhatIf}
            />
          </aside>
        </div>
      )}

      <FloatingDock
        hasIti={Boolean(iti)}
        alertCount={alerts.filter((a) => a.level !== 'info').length}
        momentCount={tripMoments.length}
        sourceOk={catalog.sources.filter((r) => r.status === 'ok').length}
        sourceTotal={catalog.sources.length}
        onPlan={dockPlan}
        onAlert={dockAlert}
        onTaxi={dockTaxi}
        onSources={() => setDsOpen(true)}
        onDiscover={() => setDiscoverOpen(true)}
        onMoments={() => setMomentsOpen(true)}
      />

      <MomentsWall
        open={momentsOpen}
        onClose={() => setMomentsOpen(false)}
        itinerary={iti}
        activeDay={activeDay}
        moments={moments}
        onChanged={reloadMoments}
        onToast={notify}
      />

      <InstallBanner />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={doImport}
        result={importResult}
        onAdopt={adoptImport}
      />

      <DiscoverModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        catalog={catalog}
        onPick={pickPromo}
      />

      <DataSourcesModal
        open={dsOpen}
        onClose={() => setDsOpen(false)}
        catalog={catalog}
        report={report}
        mode={catalogMode}
        crawling={crawling}
        error={catalogError}
        keys={keys}
        gates={gates}
        onCrawl={() => {
          void crawlNow().then((r) => {
            if (r) notify(`抓取完成：${r.mode} · ${r.stats.photos} 张图 · ${(r.ms / 1000).toFixed(1)}s`);
          });
        }}
        onSaveKeys={saveKeys}
        onToast={notify}
      />

      {(() => {
        const pts = taxiFor ? taxiPoints(taxiFor) : null;
        if (!pts) return null;
        return (
          <TaxiSheet
            open
            onClose={() => setTaxiFor(null)}
            from={pts.from}
            to={pts.to}
            distanceKm={pts.distanceKm}
            onToast={notify}
          />
        );
      })()}

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={setUser}
        onToast={notify}
      />

      <BindingsModal
        open={bindingsOpen}
        onClose={() => setBindingsOpen(false)}
        bindings={bindings}
        onChange={setBindings}
        user={user}
        onToast={notify}
      />

      {iti && syncOpen && (
        <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} itinerary={iti} onToast={notify} />
      )}

      {iti && addPlace && (
        <AddPlaceModal
          itinerary={iti}
          dayIndex={addPlace.dayIndex}
          slot={addPlace.slot}
          onClose={() => setAddPlace(null)}
          onAdd={(c, dayIndex) => {
            addPlaceTo(c, dayIndex);
            setAddPlace(null);
          }}
        />
      )}

      {iti && hotelDay != null && (
        <HotelModal
          itinerary={iti}
          dayIndex={hotelDay}
          clock={clock}
          onClose={() => setHotelDay(null)}
          onChange={changeHotel}
        />
      )}

      {iti && detailItemId && (
        <PoiDetail
          itinerary={iti}
          itemId={detailItemId}
          clock={clock}
          onClose={() => setDetailItemId(null)}
          onSave={saveItem}
          onAsk={askStep}
          onOpenItem={setDetailItemId}
          onShowOnMap={(d) => {
            setActiveDay(d);
            setDetailItemId(null);
          }}
          onTaxi={setTaxiFor}
          catalog={catalog}
          gates={catalog.gates}
          official={{
            items: official.snapshot.items,
            mode: official.mode,
            lastAt: official.lastAt,
            nextIn: official.nextIn,
            refreshing: official.refreshing,
            onRefresh: official.refresh,
          }}
        />
      )}

      {swapFor && iti && (
        <div className="overlay" onClick={() => setSwapFor(null)}>
          <div className="modal" style={{ width: 'min(560px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>换一个</h3>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  从候选池里选一个同类项，替换后会自动重算时间并重跑校验
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSwapFor(null)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="pool" style={{ maxHeight: 380 }}>
                {swapCandidates.length === 0 && <div className="tiny muted">候选池里没有可替换的项</div>}
                {swapCandidates.map((c) => (
                  <div className="pool-card" key={c.poi_id}>
                    <div>
                      <div className="pool-name">{c.name}</div>
                      <div className="pool-reason">
                        {CATEGORY_CN[c.category as never] ?? c.category} · {c.reason} · {c.cost.amount > 0 ? cnMoney(c.cost.amount) : '免费'}
                      </div>
                    </div>
                    <button className="btn btn-sm" onClick={() => pickReplacement(c)}>
                      选它
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {llmOpen && (
        <div className="overlay" onClick={() => setLlmOpen(false)}>
          <div className="modal" style={{ width: 'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>接入 GLM（可选）</h3>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  不填也能用：所有规则与排程都在本地跑
                </div>
              </div>
              <button className="icon-btn" onClick={() => setLlmOpen(false)}>
                <IconX size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <div>
                <div className="tiny muted" style={{ marginBottom: 5 }}>API Key（只存在本机 localStorage）</div>
                <input
                  value={llmCfg.apiKey}
                  onChange={(e) => setLlmCfg({ ...llmCfg, apiKey: e.target.value.trim() })}
                  placeholder="智谱 API Key"
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', outline: 'none', background: '#fff', fontSize: 12.5 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="tiny muted" style={{ marginBottom: 5 }}>Base URL</div>
                  <input
                    value={llmCfg.baseUrl}
                    onChange={(e) => setLlmCfg({ ...llmCfg, baseUrl: e.target.value.trim() })}
                    style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', outline: 'none', background: '#fff', fontSize: 12 }}
                  />
                </div>
                <div>
                  <div className="tiny muted" style={{ marginBottom: 5 }}>模型</div>
                  <input
                    value={llmCfg.model}
                    onChange={(e) => setLlmCfg({ ...llmCfg, model: e.target.value.trim() })}
                    style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', outline: 'none', background: '#fff', fontSize: 12 }}
                  />
                </div>
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.7 }}>
                接入后只有 <b>INTAKE</b> 阶段走模型（把口语需求抽成 meta）。时间、距离、预算、校验全部在代码里算 ——
                这份规划的核心主张就是「模型不碰数字」。如果请求失败（例如浏览器跨域被拦），会自动回退到规则解析。
              </div>
            </div>
            <div className="modal-foot">
              <button
                className="btn btn-primary"
                onClick={() => {
                  saveLlmConfig(llmCfg.apiKey ? llmCfg : null);
                  setLlmOpen(false);
                  notify(llmCfg.apiKey ? '已保存模型配置' : '已清除模型配置，使用本地规则');
                }}
              >
                保存
              </button>
              <button
                className="btn"
                onClick={() => {
                  setLlmCfg(DEFAULT_LLM);
                  saveLlmConfig(null);
                  notify('已清除模型配置');
                }}
              >
                清除
              </button>
              <span className="tiny muted" style={{ marginLeft: 'auto' }}>
                当前节奏档位：{PACES[iti?.meta.pace ?? 'moderate'].label}
              </span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const STAGE_KEYS = ['intake', 'research', 'outline', 'schedule', 'verify', 'repair', 'render'];
