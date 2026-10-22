import type { Candidate, Day, Itinerary, Meta } from '../domain/schema';
import { roadKm } from '../domain/geo';
import { recomputeDaySummary } from '../domain/summary';
import { cnMoney } from '../domain/summary';
import { insertCandidate, removeItem } from './repair';

export interface BudgetResult {
  days: Day[];
  /** 给流水线 / 用户看的说明：钱花在哪了 */
  notes: string[];
  spent: number;
  budget: number;
}

export function totalSpend(days: Day[]): { total: number; lodging: number; other: number } {
  let lodging = 0;
  let other = 0;
  for (const d of days) {
    lodging += d.lodging?.cost.amount ?? 0;
    for (const i of d.items) other += i.cost.amount;
  }
  return { total: lodging + other, lodging, other };
}

/**
 * 预算落地：排完行程后把没花出去的钱花掉 —— 顺序是先住宿后兜底说明。
 *
 * 用户给了 ¥6,000 就期望过 ¥6,000 的日子：数据里门票多为免费，光靠小交通
 * 和家常餐厅只花得掉 20-30%，剩下的一大部分应该升级住宿（更大的房间、
 * 更好的位置），而不是躺在「余 ¥4,554」上。
 *
 * 铁律：升级后绝不能超预算。升档前先算「除住宿外已花的钱」，住宿总价封顶在
 * 预算减去它的余额内。
 */
export function applyBudget(meta: Meta, days: Day[]): BudgetResult {
  const notes: string[] = [];
  const budget = meta.budget.amount;
  const nights = days.length;
  const rooms = Math.max(1, Math.ceil(meta.travelers.adults / 2));

  const upgradeLodging = () => {
    const { total, lodging, other } = totalSpend(days);
    const remaining = budget - total;
    if (remaining < budget * 0.2 || nights === 0) return;

    // 住宿总量封顶：预算 − 其他开销；单晚在当前价与 2.4 倍之间取能花掉的量
    const lodgingCap = budget - other;
    const want = lodging + remaining * 0.7;
    const capped = Math.min(want, lodgingCap, lodging * 4.0);
    const newPrice = Math.floor(capped / nights / rooms / 10) * 10;
    const curPrice = (days.find((d) => d.lodging)?.lodging?.cost.amount ?? 0) / rooms;
    if (newPrice <= curPrice) return;

    const oldLodging = days.find((d) => d.lodging)?.lodging;
    if (!oldLodging) return;
    const oldPrice = oldLodging.cost.amount / rooms;
    for (const d of days) {
      if (!d.lodging) continue;
      d.lodging = {
        ...d.lodging,
        name: /行政楼层/.test(d.lodging.name) ? d.lodging.name : `${d.lodging.name}（行政楼层）`,
        cost: { amount: newPrice * rooms, currency: 'CNY', type: 'lodging' },
      };
      recomputeDaySummary(d);
    }
    notes.push(`住宿升档 ${Math.round(oldPrice)} → ${newPrice}/晚，住得更好一点`);
  };

  upgradeLodging();

  const { total } = totalSpend(days);
  const remaining = budget - total;
  const usage = total / budget;
  if (usage >= 0.92) notes.push(`预算用了 ${Math.round(usage * 100)}%：${cnMoney(total)} / ${cnMoney(budget)}`);
  else notes.push(`已安排 ${cnMoney(total)} / ${cnMoney(budget)}，留 ${cnMoney(remaining)} 机动（购物、临时加项）`);

  return { days, notes, spent: total, budget };
}

/**
 * 手动改预算（右栏预算档位按钮）：改完立刻重新落地这笔钱。
 *
 * 升——多余的预算照 applyBudget 的规矩升档住宿；
 * 降——先让住宿把多出来的部分让出来（降档、摘掉「行政楼层」），
 *     其他开销（门票/餐厅）是既成事实不动；砍到连已花的都盖不住就明说超支。
 */
export function setBudget(meta: Meta, days: Day[], amount: number): BudgetResult {
  const notes: string[] = [];
  const old = meta.budget.amount;
  meta.budget = { ...meta.budget, amount };
  const rooms = Math.max(1, Math.ceil(meta.travelers.adults / 2));
  const nights = days.length;

  if (amount < old) {
    const { lodging, other } = totalSpend(days);
    if (other > amount) {
      notes.push(`光门票餐饮就要 ${cnMoney(other)}，${cnMoney(amount)} 盖不住 —— 试试「砍预算」推演删减`);
    } else if (nights > 0 && lodging > 0) {
      const targetLodging = amount - other;
      const perNight = Math.max(0, Math.floor(targetLodging / nights / rooms / 10) * 10);
      const cur = (days.find((d) => d.lodging)?.lodging?.cost.amount ?? 0) / rooms;
      if (perNight < cur) {
        for (const d of days) {
          if (!d.lodging) continue;
          d.lodging = {
            ...d.lodging,
            name: d.lodging.name.replace(/（行政楼层）$/, ''),
            cost: { amount: perNight * rooms, currency: 'CNY', type: 'lodging' },
          };
          recomputeDaySummary(d);
        }
        notes.push(`预算下调，住宿调到 ${cnMoney(perNight)}/晚`);
      }
    }
  }

  const res = applyBudget(meta, days);
  return { days, notes: [...notes, ...res.notes], spent: totalSpend(days).total, budget: amount };
}

export interface BudgetChange {
  itin: Itinerary;
  notes: string[];
}

/**
 * 改预算 = 重新决定「这几天怎么过」，不只是换个房型。
 *
 * 升：先拿增量的一小半加**付费体验**（演出、船游、门票型景点），剩下的再升住宿 ——
 *     否则预算翻倍只是住得更贵，白天还是一个样。
 * 降：先让住宿让钱，还不够就把最贵的非必去项退回候选池（饭一顿不动，饭是刚需）。
 */
export function changeBudget(itin: Itinerary, amount: number): BudgetChange {
  let next = JSON.parse(JSON.stringify(itin)) as Itinerary;
  const notes: string[] = [];
  const old = next.meta.budget.amount;
  if (!Number.isFinite(amount) || amount <= 0 || amount === old) return { itin: next, notes };
  notes.push(`预算 ${cnMoney(old)} → ${cnMoney(amount)}`);

  if (amount > old) next = addPaidExperiences(next, Math.round((amount - old) * 0.35), notes);

  const res = setBudget(next.meta, next.days, amount);
  notes.push(...res.notes);

  if (amount < old) next = dropExpensive(next, amount, notes);
  return { itin: next, notes };
}

/**
 * 升预算要真的改变行程，而不只是换个更贵的房。
 *
 * 两步：① 先想把钱花在体验上（门票/演出/船游），单价能吃掉增量一小半的优先；
 *      ② 数据里门票多为 0 时（门票免费的城市很常见），改成「多玩一个高分点」——
 *         预算宽裕的意义是「有时间也有钱多去一个地方」，不是把房费翻倍了事。
 */
function addPaidExperiences(itin: Itinerary, cap: number, notes: string[]): Itinerary {
  const adults = Math.max(1, itin.meta.travelers.adults);
  const usable = (c: Candidate) => c.category !== 'restaurant' && c.category !== 'cafe';

  const paid = itin.unscheduled
    .filter((c) => usable(c) && c.cost.amount > 0)
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.cost.amount - a.cost.amount);

  let spent = 0;
  for (const c of paid) {
    const cost = Math.round(c.cost.amount * adults);
    if (cost <= 0 || cost > cap - spent) continue;
    const spot = bestDayFor(itin, c);
    if (!spot) continue;
    itin = insertCandidate(itin, spot.day - 1, c, 99);
    spent += cost;
    notes.push(`D${spot.day} 加了「${c.name}」（${cnMoney(cost)}）`);
  }
  if (spent > 0) return itin;

  // 没有收费项：加一个高分点，最多补 2 个，一天一个
  const free = itin.unscheduled
    .filter((c) => usable(c) && (c.rating ?? 0) >= 4.4)
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  let added = 0;
  for (const c of free) {
    if (added >= 2) break;
    const spot = bestDayFor(itin, c, true);
    if (!spot) continue;
    itin = insertCandidate(itin, spot.day - 1, c, 99);
    added += 1;
    notes.push(`预算宽裕，D${spot.day} 多排了「${c.name}」（评分 ${(c.rating ?? 0).toFixed(1)}）`);
  }
  return itin;
}

/** 找一天塞这个点：离当天片区最近、当天还没排满；needRoom 时要求当天 <3 个点 */
function bestDayFor(itin: Itinerary, c: Candidate, needRoom = false): { day: number } | null {
  let best = -1;
  let bestKm = Infinity;
  for (const d of itin.days) {
    // 只数「景点」，饭不算 —— 一天两顿饭是底配，不该因为它就判定「这天排满了」
    const sights = d.items.filter((i) => i.type === 'activity');
    // 「有空位」= 景点不足 4 个（moderate 节奏的体力上限），饭不占这个名额
    if (sights.length >= (needRoom ? 4 : 5)) continue;
    const pts = d.items.filter((i) => i.lat != null && i.lng != null) as unknown as { lat: number; lng: number }[];
    const center = pts.length
      ? { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length }
      : d.lodging
        ? { lat: d.lodging.lat, lng: d.lodging.lng }
        : null;
    if (!center) continue;
    const km = roadKm(center, { lat: c.lat, lng: c.lng });
    if (km < bestKm) {
      bestKm = km;
      best = d.day_index;
    }
  }
  // 25km 内塞不进任何一天就算了，别为了改预算把人拉到郊区
  if (best < 0 || bestKm > 25) return null;
  return { day: best };
}

/** 降预算：先砍最贵的非必去项，回到预算内就停手 */
function dropExpensive(itin: Itinerary, amount: number, notes: string[]): Itinerary {
  let next = itin;
  for (let guard = 0; guard < 6; guard++) {
    if (totalSpend(next.days).total <= amount) break;
    const victims = next.days
      .flatMap((d) =>
        d.items.filter((i) => i.type !== 'meal' && i.type !== 'transit' && !i.locked && i.poi_id && i.cost.amount > 0),
      )
      .filter((i) => !next.meta.must_visit.some((m) => i.name.includes(m) || m.includes(i.name)))
      .sort((a, b) => b.cost.amount - a.cost.amount);
    const victim = victims[0];
    if (!victim) break;
    const res = removeItem(next, victim.id, '预算下调后放不下');
    if (!res.removed) break;
    next = res.itin;
    notes.push(`钱不够了，把「${victim.name}」（${cnMoney(victim.cost.amount)}）退回候选池`);
  }
  return next;
}
