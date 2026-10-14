/* ================= SIMULATION MODEL ================= */
/* Numbers below were checked against the Satisfactory Wiki (satisfactory.wiki.gg), Oct 2026. */
const BELT=[0,60,120,270,480,780,1200];          // conveyor belt Mk.1–Mk.6, items/min
const PIPE=[0,300,600];                           // pipeline Mk.1–Mk.2, m³/min
const CLOCK_EXP=1.321928;                         // power = base × (clock)^1.321928 (production buildings, extractors)
const SLOTS={Desc_SmelterMk1_C:1,Desc_ConstructorMk1_C:1,Desc_AssemblerMk1_C:2,Desc_FoundryMk1_C:2,Desc_OilRefinery_C:2,Desc_Converter_C:2,
  Desc_ManufacturerMk1_C:4,Desc_Blender_C:4,Desc_HadronCollider_C:4,Desc_QuantumEncoder_C:4};   // Somersloop slots (Packager: none)
const DIMS={ // [width, length, height] in metres (building infoboxes)
  Desc_SmelterMk1_C:[5,10,8.5],Desc_ConstructorMk1_C:[8,10,8.5],Desc_AssemblerMk1_C:[9,16,11],Desc_FoundryMk1_C:[10,10,9],
  Desc_ManufacturerMk1_C:[18,20,12],Desc_OilRefinery_C:[10,22,30],Desc_Packager_C:[8,8,12],Desc_Blender_C:[18,16,15],
  Desc_HadronCollider_C:[24,38,32],Desc_Converter_C:[16,16,18],Desc_QuantumEncoder_C:[22,50,18],
  Desc_GeneratorCoal_C:[10,26,36],Desc_GeneratorFuel_C:[20,20,27],Desc_GeneratorNuclear_C:[36,43,39],Desc_GeneratorBiomass_Automated_C:[8,8,10],
  Desc_MinerMk1_C:[6,14,18],Desc_MinerMk2_C:[6,14,18],Desc_MinerMk3_C:[6,14,18],Desc_OilPump_C:[8,14,20],Desc_WaterPump_C:[20,19.5,26]};
const MANIFOLD=4;                                 // splitter / merger footprint (4 m) → manifold lane width
const WASTE={Desc_NuclearFuelRod_C:['Desc_NuclearWaste_C',50],Desc_PlutoniumFuelRod_C:['Desc_PlutoniumWaste_C',10]}; // waste per rod
const GEN_ORDER=['Desc_GeneratorCoal_C','Desc_GeneratorFuel_C','Desc_GeneratorNuclear_C','Desc_GeneratorBiomass_Automated_C'];
const MCOL={Desc_SmelterMk1_C:'#E08A52',Desc_ConstructorMk1_C:'#9DB3C9',Desc_AssemblerMk1_C:'#EBC54E',Desc_FoundryMk1_C:'#D06B52',
  Desc_ManufacturerMk1_C:'#B08AF0',Desc_OilRefinery_C:'#78D0E2',Desc_Packager_C:'#A9B4C0',Desc_Blender_C:'#86D266',Desc_HadronCollider_C:'#EC96C6',
  Desc_Converter_C:'#F79A46',Desc_QuantumEncoder_C:'#5A9CF0',Desc_GeneratorCoal_C:'#8A949F',Desc_GeneratorFuel_C:'#DCD85E',Desc_GeneratorNuclear_C:'#86D266',
  Desc_GeneratorBiomass_Automated_C:'#86D266'};

function ensurePlan(P){
  if(!P||typeof P!=='object')P=DEF_PLAN();
  if(!Array.isArray(P.targets))P.targets=[];
  // drop anything a newer/older data set or a hand-edited backup might carry that this data set cannot use
  if(P.targets.some(x=>!x||!I[x.item]))P.targets=P.targets.filter(x=>x&&I[x.item]);
  for(const x of P.targets){const r=+x.rate;x.rate=Number.isFinite(r)&&r>=0?r:0;}
  for(const k of ['over','clk','amp','limits','pos'])if(!P[k]||typeof P[k]!=='object')P[k]={};
  for(const [it,rid] of Object.entries(P.over))if(!I[it]||(rid!==''&&!(R[rid]&&R[rid].o.some(([x])=>x===it))))delete P.over[it];
  if(!MN[P.miner])P.miner='Desc_MinerMk2_C';
  if(![0.5,1,2].includes(+P.purity))P.purity=1;else P.purity=+P.purity;
  if(P.expow===undefined)P.expow=true;
  if(!(P.belt>=1&&P.belt<=6))P.belt=5;
  if(!(P.pipe>=1&&P.pipe<=2))P.pipe=2;
  if(!P.power||typeof P.power!=='object')P.power={on:false};
  if(!G[P.power.gen]||!G[P.power.gen].f.includes(P.power.fuel)){P.power.gen='Desc_GeneratorFuel_C';P.power.fuel='Desc_LiquidTurboFuel_C';}
  if(!P.lay||typeof P.lay!=='object')P.lay={};
  if(!P.lay.blocks||typeof P.lay.blocks!=='object')P.lay.blocks={};
  if(!(P.lay.gap>=0))P.lay.gap=1;
  if(![0,1,8].includes(P.lay.snap))P.lay.snap=8;
  return P;
}
S.cur=ensurePlan(S.cur);
for(const k in S.plans)S.plans[k]=ensurePlan(S.plans[k]);

const slotsOf=rid=>rid&&R[rid]?(SLOTS[R[rid].m]||0):0;
const ampFactor=(P,it,rid)=>{const s=slotsOf(rid);return s?1+Math.min(+P.amp[it]||0,s)/s:1;};
const shardsFor=c=>c>1+1e-9?Math.min(3,Math.ceil((c-1)/0.5-1e-9)):0;
const clockPow=(base,c)=>base*Math.pow(Math.max(c,0),CLOCK_EXP);

/* one production line → physical machines, clocks, power */
function lineStats(res,P){
  const out=[];
  for(const [it,rid] of Object.entries(res.rec)){
    const x=res.x[rid];if(!(x>1e-9))continue;
    const r=R[rid],s=slotsOf(rid),f=s?Math.min(+P.amp[it]||0,s):0,A=s?1+f/s:1,pm=r.p*A*A;
    const fixed=+P.clk[it]>0?Math.min(250,Math.max(1,+P.clk[it]))/100:0;
    let n,c,cLast,power;
    if(fixed){c=fixed;n=Math.max(1,Math.ceil(x/c-1e-9));cLast=Math.max(0,x-(n-1)*c);power=(n-1)*clockPow(pm,c)+clockPow(pm,cLast);
      if(n===1)c=cLast;} // a single machine simply runs at whatever clock the demand needs
    else{n=Math.max(1,Math.ceil(x-1e-9));c=x/n;cLast=c;power=n*clockPow(pm,c);}
    const shards=(n-1)*shardsFor(c)+shardsFor(cLast);
    out.push({item:it,rid,m:r.m,x,n,c,cLast,fixed:!!fixed,clkSet:fixed||0,power,shards,sloops:n*f,slots:s,fill:f,A,outRate:perMin(r,r.o.find(([k])=>k===it)[1])*x*A});
  }
  out.sort((a,b)=>MACH_ORDER.indexOf(a.m)-MACH_ORDER.indexOf(b.m)||nm(a.item).localeCompare(nm(b.item),'ja'));
  return out;
}
function extraction(res,P){
  const minerRate=MN[P.miner].pm*P.purity,minerP=M[P.miner].p;let pow=0;const info={};
  for(const [it,a] of Object.entries(res.inputs)){if(!isRaw(it))continue;
    let n,mach,mid,p=0;
    if(it==='Desc_Water_C'){n=a/120;mid='Desc_WaterPump_C';p=n*20;}
    else if(it==='Desc_LiquidOil_C'){n=a/(120*P.purity);mid='Desc_OilPump_C';p=n*40;}
    else if(it==='Desc_NitrogenGas_C'){n=a/(60*P.purity);mid='Desc_FrackingExtractor_C';}
    else{n=a/minerRate;mid=P.miner;p=n*minerP;}
    mach=mn(mid);pow+=p;info[it]={n,mach,mid,p};}
  return {pow,info};
}
function beltNeed(item,rate,P){
  const fluid=!!(I[item]&&I[item].l),caps=fluid?PIPE:BELT,maxT=fluid?P.pipe:P.belt,cap=caps[maxT];
  let tier=0;for(let i=1;i<=maxT;i++)if(caps[i]>=rate-1e-9){tier=i;break;}
  const count=tier?1:Math.ceil(rate/cap-1e-9);
  return {fluid,tier:tier||maxT,count,over:count>1,label:(fluid?'パイプ':'')+'Mk'+(tier||maxT)+(count>1?' ×'+count:'')};
}

/* full simulation of a plan (fixed point when the factory powers itself) */
function simulate(P=S.cur){
  ensurePlan(P);
  const t={};for(const x of P.targets){if(!I[x.item])continue;const v=+x.rate;if(v>0)t[x.item]=(t[x.item]||0)+v;}
  const choose=it=>effRecipe(it,P.over);
  const ampOf=it=>{const rid=choose(it);return rid?ampFactor(P,it,rid):1;};
  let demand={},res,lines,ex,gen=null,prev=-1,diverge=false;
  for(let iter=0;iter<40;iter++){
    const tt={...t};for(const k in demand)tt[k]=(tt[k]||0)+demand[k];
    res=solve(tt,choose,ampOf);
    if(res.error)return {error:res.error,t,P,lines:[],power:0,machines:0,flow:{nodes:[],edges:[],byId:{}},warns:[]};
    lines=lineStats(res,P);ex=extraction(res,P);
    const need=lines.reduce((s,l)=>s+l.power,0)+(P.expow?ex.pow:0);
    if(!P.power.on){gen=null;break;}
    const g=G[P.power.gen],fuel=P.power.fuel,e=I[fuel].e;
    const n=need/g.p,fuelRate=n*g.p*60/e,water=g.w?n*g.p*g.w*60/1000:0;
    gen={id:P.power.gen,fuel,n,fuelRate,water,mw:need,waste:WASTE[fuel]?[WASTE[fuel][0],fuelRate*WASTE[fuel][1]]:null};
    if(Math.abs(fuelRate-prev)<1e-7*Math.max(1,fuelRate))break;
    if(iter===39||fuelRate>1e7){diverge=true;break;}
    prev=fuelRate;demand={[fuel]:fuelRate};if(water)demand.Desc_Water_C=(demand.Desc_Water_C||0)+water;
  }
  if(gen&&gen.waste){const [w,a]=gen.waste;res.surplus[w]=(res.surplus[w]||0)+a;}
  const lineBy={};lines.forEach(l=>lineBy[l.item]=l);
  const prodPow=lines.reduce((s,l)=>s+l.power,0),power=prodPow+(P.expow?ex.pow:0);
  const sc=resScore(res.inputs,false);
  const lim=Object.entries(P.limits).filter(([k,c])=>+c>0&&I[k]).map(([k,c])=>({item:k,cap:+c,need:res.inputs[k]||0,ratio:(res.inputs[k]||0)/+c}));
  const sim={P,t,res,lines,lineBy,ex,gen,demand,diverge,prodPow,power,
    machines:lines.reduce((s,l)=>s+l.n,0),shards:lines.reduce((s,l)=>s+l.shards,0),sloops:lines.reduce((s,l)=>s+l.sloops,0),
    score:sc.score,rawTotal:sc.total,lim};
  sim.flow=buildFlow(sim);
  sim.warns=collectWarnings(sim);
  return sim;
}

/* nodes and belts of the factory (shared by the canvas and the layout planner) */
function buildFlow(sim){
  const {res,t,gen,lineBy,P}=sim;
  const nodes=[],byId={},edges=[];
  const add=n=>{byId[n.id]=n;nodes.push(n);return n;};
  for(const [it,rid] of Object.entries(res.rec)){const x=res.x[rid];if(x>1e-9)add({id:'L:'+it,type:'line',item:it,rid,x,line:lineBy[it]});}
  for(const [it,a] of Object.entries(res.inputs))add({id:'I:'+it,type:'in',item:it,amt:a});
  const supply={};
  for(const n of nodes){
    if(n.type==='line'){const r=R[n.rid],A=n.line?n.line.A:1;for(const [k,a] of r.o)(supply[k]=supply[k]||[]).push({id:n.id,amt:perMin(r,a)*n.x*A});}
    else (supply[n.item]=supply[n.item]||[]).push({id:n.id,amt:n.amt});
  }
  const link=(k,need,to)=>{const sp=(supply[k]||[]).filter(s=>s.id!==to);const tot=sp.reduce((a,s)=>a+s.amt,0);if(!tot||!(need>1e-9))return;
    for(const s of sp){const r=need*s.amt/tot;if(r>1e-6)edges.push({from:s.id,to,item:k,rate:r});}};
  for(const n of nodes)if(n.type==='line')for(const [k,a] of R[n.rid].i)link(k,perMin(R[n.rid],a)*n.x,n.id);
  for(const [k,a] of Object.entries(t)){add({id:'O:'+k,type:'out',item:k,amt:a});link(k,a,'O:'+k);}
  if(gen){add({id:'G:power',type:'gen',item:gen.fuel,gen});link(gen.fuel,gen.fuelRate,'G:power');if(gen.water)link('Desc_Water_C',gen.water,'G:power');
    if(gen.waste)(supply[gen.waste[0]]=supply[gen.waste[0]]||[]).push({id:'G:power',amt:gen.waste[1]});}
  for(const [k,a] of Object.entries(res.surplus)){if(t[k])continue;add({id:'S:'+k,type:'sur',item:k,amt:a});link(k,a,'S:'+k);}
  for(const e of edges)e.belt=beltNeed(e.item,e.rate,P);
  // layers: longest path from the inputs (cycles capped)
  const inc={};edges.forEach(e=>(inc[e.to]=inc[e.to]||[]).push(e));
  const layer={};nodes.forEach(n=>layer[n.id]=0);
  for(let i=0;i<nodes.length+2;i++){let ch=false;
    for(const n of nodes){if(n.type==='in')continue;const v=Math.max(0,...(inc[n.id]||[]).map(e=>layer[e.from]+1));if(v!==layer[n.id]&&v<=nodes.length){layer[n.id]=v;ch=true;}}
    if(!ch)break;}
  const inner=nodes.filter(n=>!['out','sur','gen'].includes(n.type));
  const maxL=inner.length?Math.max(...inner.map(n=>layer[n.id])):0;
  nodes.forEach(n=>{if(['out','sur','gen'].includes(n.type))layer[n.id]=maxL+1;});
  return {nodes,edges,byId,layer,inc};
}
function collectWarnings(sim){
  const w=[];
  for(const e of sim.flow.edges)if(e.belt.over)w.push({kind:'belt',id:e.from,msg:`${nm(e.item)} ${fmt(e.rate,1)}/分: ${e.belt.fluid?'パイプ':'ベルト'} Mk${e.belt.tier} を ${e.belt.count} 本並べる必要があります`});
  for(const l of sim.lines)if(isLocked(l.rid))w.push({kind:'lock',id:'L:'+l.item,msg:`${nm(l.item)}: 未解禁の代替レシピ「${rn(l.rid)}」を使っています`});
  for(const [k,a] of Object.entries(sim.res.inputs))if(!isRaw(k))w.push({kind:'ext',id:'I:'+k,msg:`${nm(k)} ${fmt(a,1)}/分 を外部から搬入する前提です`});
  for(const l of sim.lim)if(l.ratio>1+1e-6)w.push({kind:'limit',id:'I:'+l.item,msg:`${nm(l.item)}: 上限 ${fmt(l.cap,0)}/分 に対して ${fmt(l.need,1)}/分 必要です`});
  if(sim.diverge)w.push({kind:'power',id:'G:power',msg:'この燃料では発電に使う燃料の生産だけで電力が足りません。別の燃料を選んでください'});
  return w;
}

/* scale every target so the plan fits the resource caps */
function maximizeToLimits(P){
  let sim=simulate(P);if(sim.error)return null;
  if(!sim.lim.some(l=>l.need>0))return null;
  for(let k=0;k<6;k++){
    const used=sim.lim.filter(l=>l.need>1e-9);if(!used.length)break;
    const s=Math.min(...used.map(l=>l.cap/l.need));if(Math.abs(s-1)<1e-5)break;
    P.targets.forEach(x=>x.rate=+((+x.rate)*s).toPrecision(5));sim=simulate(P);if(sim.error)break;
  }
  return sim;
}

/* greedy recipe search over the plan's own items */
const OBJECTIVES={score:'資源を最小',power:'電力を最小',machines:'装置を最小',balanced:'バランス'};
async function optimizePlan(P,objective,allowLocked,onProgress){
  const base=JSON.parse(JSON.stringify(P));
  const usable=rid=>!R[rid].a||allowLocked||!!S.unl[rid]||(R[rid].u&&R[rid].u[0]==='mam');
  let ref=null;
  const metrics=s=>({power:s.power,score:s.score,machines:s.machines,raw:s.rawTotal});
  const value=s=>{
    if(s.error)return Infinity;
    const m=metrics(s),ext=Object.keys(s.res.inputs).filter(k=>!isRaw(k)).length,lim=s.lim.reduce((a,l)=>a+Math.max(0,l.ratio-1),0);
    let v;
    if(objective==='power')v=m.power+m.score*1e-3;
    else if(objective==='machines')v=m.machines+m.power*1e-4;
    else if(objective==='score')v=m.score+m.power*1e-7;
    else v=m.score/Math.max(ref.score,1e-9)+m.power/Math.max(ref.power,1e-9)+m.machines/Math.max(ref.machines,1e-9);
    return v+ext*1e6+lim*1e5+(s.diverge?1e9:0);
  };
  const run=over=>{const Q=JSON.parse(JSON.stringify(base));Q.over=over;return simulate(Q);};
  let over={...base.over},cur=run(over);if(cur.error)return {error:cur.error};
  ref=metrics(cur);let best=value(cur),evals=0,t0=performance.now();
  for(let pass=0;pass<4;pass++){
    let improved=false;
    const items=[...new Set([...Object.keys(cur.res.rec),...Object.keys(cur.res.inputs).filter(k=>!isRaw(k)&&producible(k))])];
    for(const it of items){
      const cand=(producers[it]||[]).filter(r=>isPrimary(r,it)&&usable(r)&&!/^Unpackage/.test(R[r].n));
      const now=effRecipe(it,over);
      for(const rid of cand){
        if(rid===now)continue;
        const o2={...over,[it]:rid},s=run(o2),v=value(s);evals++;
        if(v<best-1e-9){best=v;over=o2;cur=s;improved=true;}
        if(performance.now()-t0>30){onProgress&&onProgress(evals,pass);await new Promise(r=>setTimeout(r,0));t0=performance.now();}
      }
    }
    if(!improved)break;
  }
  // drop overrides that equal the default choice
  for(const k of Object.keys(over))if(over[k]===effRecipe(k,{}))delete over[k];
  return {over,before:ref,after:metrics(cur),sim:cur,evals};
}

/* ---------- undo / redo for plan edits ---------- */
const HIST={past:[],future:[]};
function snapshot(){HIST.past.push(JSON.stringify(S.cur));if(HIST.past.length>100)HIST.past.shift();HIST.future=[];}
function mut(fn){snapshot();fn();ensurePlan(S.cur);save();planChanged();}
function undo(){if(!HIST.past.length){toast('これ以上は戻せません');return;}HIST.future.push(JSON.stringify(S.cur));S.cur=ensurePlan(JSON.parse(HIST.past.pop()));save();planChanged();toast('元に戻しました');}
function redo(){if(!HIST.future.length){toast('やり直せる操作はありません');return;}HIST.past.push(JSON.stringify(S.cur));S.cur=ensurePlan(JSON.parse(HIST.future.pop()));save();planChanged();toast('やり直しました');}
function planChanged(){
  if(S.tab==='plan')renderFactory();else if(S.tab==='layout')renderLayout();
  renderMeter(freshSim());
}
// the simulation the visible canvas just computed from S.cur (saves a second solve for the rail meter)
function freshSim(){return S.tab==='plan'&&FX.sim&&FX.sim.P===S.cur?FX.sim:S.tab==='layout'&&LX.sim&&LX.sim.P===S.cur?LX.sim:null;}
let _saveT=0;function saveSoon(){clearTimeout(_saveT);_saveT=setTimeout(save,400);}

/* rail meter */
function renderMeter(given){
  const sim=given||simulate(S.cur);
  $('#m-name').textContent=S.curName?`計画: ${S.curName}`:'現在の計画';
  if(sim.error){$('#m-pow').firstChild.nodeValue='—';return;}
  tween($('#m-pow'),sim.power,v=>fmt(v,0));
  $('#m-mc').textContent=fmt(sim.machines,0);$('#m-raw').textContent=fmt(sim.rawTotal,0);
  $('#m-gauge').innerHTML=gaugeSegs(sim);
}
function powerByMachine(sim){const by={};for(const l of sim.lines)by[l.m]=(by[l.m]||0)+l.power;if(sim.P.expow&&sim.ex.pow)by.__ex=sim.ex.pow;return by;}
function gaugeSegs(sim){
  const by=powerByMachine(sim),tot=Object.values(by).reduce((a,b)=>a+b,0)||1;
  return [...MACH_ORDER,'__ex'].filter(m=>by[m]).map(m=>`<i style="width:${by[m]/tot*100}%;background:${m==='__ex'?'var(--faint)':MCOL[m]}" title="${esc(m==='__ex'?'採掘':mn(m))} ${fmt(by[m],0)} MW"></i>`).join('');
}
