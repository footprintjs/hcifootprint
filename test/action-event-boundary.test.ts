import {expect,it} from 'vitest';
import {connectAction,createActionRuntime,defineAction} from '../src/index.js';

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return{promise,resolve};}

it('retains the native occurrence immediately while handler and effect remain pending',async()=>{
 const gate=deferred<string>(),runtime=createActionRuntime();
 const action=defineAction('events.deferred',{does:'Complete on an actual handler event',invocation:'inputless',mutate:()=>gate.promise});
 const connection=connectAction(runtime,action,{node:'events'}),invocation=connection.invoke();
 const immediate=runtime.transitionFor(invocation.transition)!;
 expect(immediate.ref).toBe(invocation.transition);expect(immediate.invocationStatus).toBe('pending');expect(immediate.effectStatus).toBe('unverified');
 gate.resolve('actual result');await invocation.whenInvoked;
 expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe('performed');expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('unverified');
});

it('acceptance is not completion; a real later evidence report settles the same occurrence',async()=>{
 const runtime=createActionRuntime(),receipt={id:'job-1',status:'accepted'};
 const action=defineAction('events.accepted',{does:'Queue work with later evidence',invocation:'inputless',settle:{evidence:{kind:'events.receipt'}},mutate:()=>receipt});
 const connection=connectAction(runtime,action,{node:'events',coverage:'verifiable'}),invocation=connection.invoke();
 await invocation.whenInvoked;
 expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('unverified');
 const evidence={id:receipt.id,source:'actual-application-event'};
 connection.settle(invocation.transition,{status:'verified',evidence});
 const terminal=await invocation.whenEffectSettled;
 expect(terminal.transition).toBe(invocation.transition);expect(terminal.status).toBe('verified');expect(runtime.transitions()).toHaveLength(1);
});

it('an effect event may arrive before the handler finishes; neither rail invents the other',async()=>{
 const gate=deferred<string>(),runtime=createActionRuntime();
 const action=defineAction('events.effect-first',{does:'Report independent handler and effect events',invocation:'inputless',settle:{evidence:{kind:'events.receipt'}},mutate:()=>gate.promise});
 const connection=connectAction(runtime,action,{node:'events',coverage:'verifiable'}),invocation=connection.invoke();
 connection.settle(invocation.transition,{status:'verified',evidence:{source:'application-store'}});await invocation.whenEffectSettled;
 expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe('pending');expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('verified');
 gate.resolve('handler returned');await invocation.whenInvoked;
 expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe('performed');
});

it('synchronous progress is retained and replayed when the observer attaches after invocation',async()=>{
 const runtime=createActionRuntime();
 const action=defineAction('events.sync',{does:'Report actual synchronous stages',invocation:'inputless',settle:{progress:{stages:['started','stored']}},
  mutate:lifecycle=>{lifecycle?.reportProgress('started');lifecycle?.reportProgress('stored');return'actual result';},
 });
 const connection=connectAction(runtime,action,{node:'events'}),invocation=connection.invoke();await invocation.whenInvoked;
 const seen:string[]=[];invocation.progress?.subscribe(snapshot=>{seen.push(...snapshot.observed.map(row=>row.stage));});
 expect(seen).toEqual(['started','stored']);expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('unverified');
});

it('unsubscribing and disconnecting stop observation, not the action or later authoritative evidence',async()=>{
 const gate=deferred<string>(),runtime=createActionRuntime();let completeStage:(()=>void)|undefined;
 const action=defineAction('events.delivery-closed',{does:'Continue application work after observation closes',invocation:'inputless',settle:{progress:{stages:['started','finished']},evidence:{kind:'events.receipt'}},
  mutate:lifecycle=>{lifecycle?.reportProgress('started');completeStage=()=>lifecycle?.reportProgress('finished');return gate.promise;},
 });
 const connection=connectAction(runtime,action,{node:'events',coverage:'verifiable'}),invocation=connection.invoke();let publications=0;
 const unsubscribe=invocation.progress?.subscribe(()=>{publications++;});unsubscribe?.();connection.disconnect();const before=publications;
 expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('unverified');
 completeStage?.();gate.resolve('finished after disconnect');await invocation.whenInvoked;
 connection.settle(invocation.transition,{status:'verified',evidence:{source:'application-store'}});await invocation.whenEffectSettled;
 expect(publications).toBe(before);expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('verified');
 expect(runtime.transitionFor(invocation.transition)?.progress?.observed.map(row=>row.stage)).toEqual(['started','finished']);
});

it('history eviction means not retained while the existing handle still carries its real outcome',async()=>{
 const runtime=createActionRuntime({history:{keep:0}});
 const action=defineAction('events.evicted',{does:'Complete before retention release',invocation:'inputless',settle:{evidence:{kind:'events.receipt'},onReturn:()=>({status:'verified',evidence:{source:'application'}})},mutate:()=>({value:1})});
 const invocation=connectAction(runtime,action,{node:'events',coverage:'verifiable'}).invoke();
 const outcome=await invocation.whenInvoked,effect=await invocation.whenEffectSettled;
 expect(outcome.status).toBe('performed');expect(effect.status).toBe('verified');expect(runtime.transitionFor(invocation.transition)).toBeUndefined();
});
