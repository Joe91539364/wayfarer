import type { Day, Meta } from '../domain/schema';
import { recomputeDaySummary } from '../domain/summary';
import { cnMoney } from '../domain/summary';

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
