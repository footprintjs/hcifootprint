import {expect,it} from 'vitest';
import {beginWalk,connectAction,createActionRuntime,defineAction} from '../src/index.js';

const receipt=(id:string,value:object)=>defineAction(id,{
 does:id,invocation:'inputless',produces:{kind:'history.application-value'},
 settle:{evidence:{kind:'history.receipt'},onReturn:outcome=>outcome.status==='performed'
  ?{status:'verified',evidence:{returned:true}}:{status:'refused',reason:outcome.error}},
 mutate:()=>value,
});

it.each([0,1])('history keep:%s cannot stop a performed plan or erase its carried application value',async keep=>{
 const runtime=createActionRuntime({history:{keep}}),original={nested:{value:1}};
 const first=receipt('history.first',original),middle=receipt('history.middle',{});
 let received:unknown;
 const consume=defineAction('history.consume',{does:'Use the original application value',invocation:'scalar',
  inputSchema:{safeParse:(value:unknown)=>({success:true as const,data:value})},
  mutate:(value:unknown)=>{received=value;},
 });
 for(const action of [first,middle,consume])connectAction(runtime,action,{node:'history',coverage:'verifiable'});
 const plan=await beginWalk(runtime,'agent').run([{action:first},{action:middle},{action:consume,carry:{from:0}}]);
 expect(plan.completed).toBe(true);expect(plan.counts.ran).toBe(3);expect(received).toBe(original);
});

it('forgetting a settled row from onRow cannot change the next step or completed verdict',async()=>{
 const runtime=createActionRuntime(),original={key:'application'},first=receipt('history.forget-first',original);
 let received:unknown;
 const consume=defineAction('history.after-forget',{does:'Use an execution value after history release',invocation:'scalar',
  inputSchema:{safeParse:(value:unknown)=>({success:true as const,data:value})},mutate:(value:unknown)=>{received=value;},
 });
 connectAction(runtime,first,{node:'history',coverage:'verifiable'});connectAction(runtime,consume,{node:'history'});
 const plan=await beginWalk(runtime,'agent').run([{action:first},{action:consume,carry:{from:0}}],{onRow:row=>{
  if(row.step===0&&row.transition)expect(runtime.forgetTransition(row.transition)).toBe(true);
 }});
 expect(plan.completed).toBe(true);expect(received).toBe(original);expect(runtime.transitionFor(plan.rows[0]!.transition!)).toBeUndefined();
});

it('carrying preserves the raw object identity while ordinary recorded data stays historical',async()=>{
 const runtime=createActionRuntime(),original={nested:{value:1}},first=receipt('history.capture-first',original);
 let oldRecord:unknown;
 const consume=defineAction('history.mutate-carried',{does:'Mutate the actual application value',invocation:'scalar',
  inputSchema:{safeParse:(value:unknown)=>({success:true as const,data:value})},
  mutate:(value:typeof original)=>{expect(value).toBe(original);value.nested.value=2;},
 });
 connectAction(runtime,first,{node:'history',coverage:'verifiable'});connectAction(runtime,consume,{node:'history'});
 const plan=await beginWalk(runtime,'agent').run([{action:first},{action:consume,carry:{from:0}}],{onRow:row=>{
  if(row.step===0&&row.transition)oldRecord=runtime.transitionFor(row.transition)?.produced;
 }});
 expect(plan.completed).toBe(true);expect(original.nested.value).toBe(2);
 expect(oldRecord).toEqual({nested:{value:1}});expect(oldRecord).not.toBe(original);
 expect(runtime.transitionFor(plan.rows[0]!.transition!)?.produced).toEqual({nested:{value:1}});
});

it('an actual failed invocation still stops after its history was released',async()=>{
 const runtime=createActionRuntime({history:{keep:0}});let later=0;
 const first=defineAction('history.failed',{does:'Actually fail',invocation:'inputless',
  settle:{onReturn:()=>({status:'refused',reason:'handler failed'})},mutate:()=>{throw new Error('Actual failure');},
 });
 const second=defineAction('history.unreached',{does:'Must not run',invocation:'inputless',mutate:()=>{later++;}});
 connectAction(runtime,first,{node:'history'});connectAction(runtime,second,{node:'history'});
 const plan=await beginWalk(runtime,'agent').run([{action:first},{action:second}]);
 expect(plan.completed).toBe(false);expect(plan.rows.map(row=>row.status)).toEqual(['ran','never-reached']);expect(later).toBe(0);
});

it('performed is an invocation fact, even when the separate effect was refused and history evicted',async()=>{
 const runtime=createActionRuntime({history:{keep:0}});
 const action=defineAction('history.effect-refused',{does:'Return a business refusal',invocation:'inputless',
  settle:{onReturn:()=>({status:'refused',reason:'Business rule refused the effect'})},mutate:()=>({accepted:false}),
 });
 connectAction(runtime,action,{node:'history'});
 const plan=await beginWalk(runtime,'agent').run([{action}]);
 expect(plan.completed).toBe(true);expect(plan.rows[0]!.status).toBe('ran');expect(runtime.transitions()).toEqual([]);
});
