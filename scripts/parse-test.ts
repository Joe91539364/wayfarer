import { intake } from '../src/agent/intake';
const cases = [
  '十月二十五号我一个人从江苏宿迁出发 去江西景德镇玩三天 预算七千 主要去吃美食',
  '下周去成都玩3天，两个人，预算6000',
  '从杭州出发，11月8号到厦门，四天，一个人',
];
for (const c of cases) {
  const r = intake(c);
  console.log('IN :', c);
  console.log('OUT:', {
    dest: r.meta.destination,
    code: r.meta.city_code,
    origin: r.meta.origin_city,
    start: r.meta.start_date,
    end: r.meta.end_date,
    ppl: r.meta.travelers.adults,
    budget: r.meta.budget.amount,
    interests: r.meta.interests,
    missing: r.missing,
  });
  console.log('');
}
