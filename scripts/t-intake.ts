import { intake } from '../src/agent/intake';
const r = intake('从宿迁去安顺玩5天，两个人，预算5000，一定要见龙宫');
console.log(JSON.stringify(r.meta));
console.log('missing=', r.missing.join(','));
