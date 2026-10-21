const test=require('node:test'),assert=require('node:assert/strict');
const {runAgent,intake,ItinerarySchema}=require('../plugin/business-runtime.cjs');
const request='北京三日游，2026-11-03到2026-11-05，两人预算5000元，喜欢历史和美食';
test('偏好解析连续运行结果一致',()=>{assert.deepEqual(intake(request).meta.interests,intake(request).meta.interests);});
test('三种方案各有七个可追溯真实阶段载荷',async()=>{for(const pace of ['relaxed','moderate','packed']){const events=[];const result=await runAgent(request,e=>events.push(e),{animate:false,metaOverride:{pace}});assert.equal(ItinerarySchema.safeParse(result.itinerary).success,true);const done=events.filter(e=>e.status==='done');assert.equal(done.length,7);assert.deepEqual(done.map(e=>e.stage),['intake','research','outline','schedule','verify','repair','render']);assert.ok(done.every(e=>e.payload&&typeof e.payload==='object'));assert.deepEqual(done.at(-1).payload.itinerary,result.itinerary);}});
test('缺少目的地停止运行而不会伪造输出',async()=>{const events=[];await assert.rejects(()=>runAgent('两天，预算300元',e=>events.push(e),{animate:false}),{name:'NeedsClarification'});assert.ok(!events.some(e=>e.stage==='render'));});
