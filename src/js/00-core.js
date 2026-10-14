const D=JSON.parse(document.getElementById('gamedata').textContent);
const I=D.items,R=D.recipes,M=D.machines,G=D.generators,MN=D.miners;
const WORLD={Desc_OreIron_C:92100,Desc_OreCopper_C:36900,Desc_Stone_C:69900,Desc_Coal_C:42300,Desc_OreGold_C:15000,Desc_LiquidOil_C:12600,Desc_RawQuartz_C:13500,Desc_Sulfur_C:10800,Desc_OreBauxite_C:12300,Desc_OreUranium_C:2100,Desc_NitrogenGas_C:12000,Desc_SAM_C:10200};
const RAW_ORDER=['Desc_OreIron_C','Desc_OreCopper_C','Desc_Stone_C','Desc_Coal_C','Desc_OreGold_C','Desc_RawQuartz_C','Desc_Sulfur_C','Desc_OreBauxite_C','Desc_OreUranium_C','Desc_SAM_C','Desc_LiquidOil_C','Desc_NitrogenGas_C','Desc_Water_C'];
const RCOL={Desc_OreIron_C:'iron',Desc_OreCopper_C:'copper',Desc_Stone_C:'stone',Desc_Coal_C:'coal',Desc_OreGold_C:'gold',Desc_RawQuartz_C:'quartz',Desc_Sulfur_C:'sulfur',Desc_OreBauxite_C:'bauxite',Desc_OreUranium_C:'uranium',Desc_SAM_C:'sam',Desc_LiquidOil_C:'oil',Desc_NitrogenGas_C:'nitro',Desc_Water_C:'water'};
const MACH_ORDER=['Desc_SmelterMk1_C','Desc_ConstructorMk1_C','Desc_AssemblerMk1_C','Desc_FoundryMk1_C','Desc_ManufacturerMk1_C','Desc_OilRefinery_C','Desc_Packager_C','Desc_Blender_C','Desc_HadronCollider_C','Desc_Converter_C','Desc_QuantumEncoder_C'];
const QUICK=['Desc_IronIngot_C','Desc_CopperIngot_C','Desc_GoldIngot_C','Desc_SteelIngot_C','Desc_AluminumIngot_C','Desc_IronPlate_C','Desc_Wire_C','Desc_IronScrew_C','Desc_Cement_C','Desc_Plastic_C','Desc_Rubber_C','Desc_CircuitBoard_C','Desc_LiquidFuel_C'];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>{if(!isFinite(n))return '—';const a=Math.abs(n);if(a>0&&a<0.0001)return n.toExponential(1);if(a<0.1&&d<4)d=4;return n.toLocaleString('ja-JP',{maximumFractionDigits:a>=1000?0:d})};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
const KEY='ficsit-note-v1';
const DEF_PLAN=()=>({targets:[{item:'Desc_ModularFrameHeavy_C',rate:5},{item:'Desc_Computer_C',rate:2.5}],over:{},miner:'Desc_MinerMk2_C',purity:1,expow:true});
let S={lang:'ja',tab:'plan',unl:{},pref:{},plans:{},cur:DEF_PLAN(),curName:'',cItem:'Desc_IronIngot_C',cRate:60,cWater:false,cUnl:false,cGroup:true,icat:'all',afilter:'all'};
try{const t=JSON.parse(localStorage.getItem(KEY)||'null');if(t)S=Object.assign(S,t);}catch(e){}
if(!S.cur||!Array.isArray(S.cur.targets))S.cur=DEF_PLAN();
if(!S.cur.over)S.cur.over={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function toast(m,act){const t=$('#toast');t.innerHTML=`<span>${esc(m)}</span>`+(act?`<button type="button" class="tact">${esc(act.label)}</button>`:'');
  t.hidden=false;t.style.animation='none';void t.offsetWidth;t.style.animation='';clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,act?5000:2400);
  if(act)t.querySelector('.tact').onclick=()=>{t.hidden=true;act.fn();};}

/* ---------- names ---------- */
const nm=id=>I[id]?(S.lang==='ja'?I[id].j:I[id].n):id;
const nm2=id=>I[id]?(S.lang==='ja'?I[id].n:I[id].j):'';
const mn=id=>M[id]?(S.lang==='ja'?M[id].j:M[id].n):id;
function rn(rid){const r=R[rid];if(!r)return '';let n=r.n;
  if(!r.a&&S.lang==='ja'){const o=r.o.find(([x])=>I[x]&&I[x].n===n);if(o)return I[o[0]].j;}
  if(r.a){n=n.replace(/^Alternate:\s*/,'');return (S.lang==='ja'?'代替: ':'Alt: ')+n;}return n;}
const unit=id=>I[id]&&I[id].l?'m³':'個';
const isRaw=id=>!!(I[id]&&I[id].r);

/* ---------- recipe index ---------- */
const producers={},consumers={};
for(const [rid,r] of Object.entries(R)){
  r.o.forEach(([it])=>{(producers[it]=producers[it]||[]).push(rid);});
  r.i.forEach(([it])=>{(consumers[it]=consumers[it]||[]).push(rid);});
}
const isPrimary=(rid,it)=>R[rid].o[0][0]===it;
for(const it in producers){producers[it].sort((a,b)=>(isPrimary(b,it)-isPrimary(a,it))||(R[a].a-R[b].a)||R[a].n.localeCompare(R[b].n));}
const defaults={};
for(const it in I){
  if(isRaw(it)){defaults[it]=null;continue;}
  const c=(producers[it]||[]).filter(r=>isPrimary(r,it)&&!R[r].a&&R[r].m!=='Desc_Converter_C'&&!/^Unpackage|^Residual/.test(R[r].n));
  const prim=(producers[it]||[]).filter(r=>isPrimary(r,it)&&!/^Unpackage/.test(R[r].n));
  defaults[it]=c.find(r=>R[r].n===I[it].n)||c[0]||prim.find(r=>!R[r].a)||prim.find(r=>R[r].a&&R[r].u&&R[r].u[0]==='mam')||null;
}
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function effRecipe(it,over){
  if(over&&has(over,it))return over[it]||null;
  if(has(S.pref,it))return S.pref[it]||null;
  return defaults[it];
}
const perMin=(r,amt)=>amt*60/r.t;
function net(r,it){let n=0;for(const [x,a] of r.o)if(x===it)n+=a;for(const [x,a] of r.i)if(x===it)n-=a;return n*60/r.t;}
const unlocked=rid=>!R[rid].a||!!S.unl[rid];
const isLocked=rid=>R[rid].a&&!S.unl[rid]&&!(R[rid].u&&R[rid].u[0]==='mam');

/* ---------- solver ---------- */
// ampOf(item) -> output multiplier of that item's line (Somersloops: 1 + filled/total slots; inputs unchanged)
function netA(r,it,A){let n=0;for(const [x,a] of r.o)if(x===it)n+=a*A;for(const [x,a] of r.i)if(x===it)n-=a;return n*60/r.t;}
function solve(targets,choose,ampOf){
  const amp=it=>ampOf?ampOf(it):1;
  const rec={},order=[],used=new Set(),seen=new Set(),q=Object.keys(targets);
  while(q.length){const it=q.shift();if(seen.has(it))continue;seen.add(it);
    const r=choose(it);if(!r||!R[r]||used.has(r))continue;used.add(r);rec[it]=r;order.push(it);
    for(const [x] of R[r].i)q.push(x);}
  let ex=new Set(),x={},items=[];
  for(let iter=0;iter<30;iter++){
    items=order.filter(i=>!ex.has(i));
    const Af=items.map(j=>amp(j));
    const A=items.map(k=>items.map((j,jx)=>netA(R[rec[j]],k,Af[jx])));
    const b=items.map(k=>targets[k]||0);
    const sol=gauss(A,b);
    if(!sol)return {error:'このレシピの組み合わせでは計算できません。循環しているレシピのどれかを別のレシピか「外部から搬入する」に変えてください。'};
    const neg=items.filter((it,ix)=>sol[ix]<-1e-9);
    x={};items.forEach((it,ix)=>x[rec[it]]=Math.max(0,sol[ix]));
    if(!neg.length)break;neg.forEach(i=>ex.add(i));
  }
  const rec2={},ampBy={};for(const it of items){rec2[it]=rec[it];ampBy[rec[it]]=amp(it);}
  const prod={},cons={};
  for(const [rid,m] of Object.entries(x)){if(m<1e-12)continue;const r=R[rid],Am=ampBy[rid]||1;
    for(const [it,a] of r.o)prod[it]=(prod[it]||0)+perMin(r,a)*m*Am;
    for(const [it,a] of r.i)cons[it]=(cons[it]||0)+perMin(r,a)*m;}
  const all=new Set([...Object.keys(prod),...Object.keys(cons),...Object.keys(targets)]);
  const inputs={},surplus={};
  for(const it of all){const bal=(prod[it]||0)-(cons[it]||0)-(targets[it]||0);
    if(bal<-1e-7)inputs[it]=-bal;else if(bal>1e-7)surplus[it]=bal;}
  let power=0,mcount=0;for(const [rid,m] of Object.entries(x)){power+=R[rid].p*m;mcount+=m;}
  return {rec:rec2,x,prod,cons,inputs,surplus,power,mcount,items,ampBy};
}
function gauss(A,b){const n=b.length;const Mx=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(Mx[r][c])>Math.abs(Mx[p][c]))p=r;
    if(Math.abs(Mx[p][c])<1e-12)return null;[Mx[c],Mx[p]]=[Mx[p],Mx[c]];
    for(let r=0;r<n;r++){if(r===c)continue;const f=Mx[r][c]/Mx[c][c];if(f)for(let k=c;k<=n;k++)Mx[r][k]-=f*Mx[c][k];}}
  return Mx.map((r,i)=>r[n]/r[i]);}
function resScore(inputs,water){let s=0,t=0;for(const [it,a] of Object.entries(inputs)){if(!isRaw(it))continue;if(it==='Desc_Water_C'&&!water)continue;t+=a;if(WORLD[it])s+=a/WORLD[it]*100;}return {score:s,total:t};}

/* ---------- item colour = dominant ore of its default chain ---------- */
const ICOL={};
function itemColor(it){
  if(ICOL[it])return ICOL[it];
  let c='none';
  if(RCOL[it])c=RCOL[it];
  else if((producers[it]||[]).length){
    const r=solve({[it]:1},x=>effRecipe(x));
    if(!r.error){let best=0;for(const [k,a] of Object.entries(r.inputs)){if(!RCOL[k]||k==='Desc_Water_C')continue;const w=WORLD[k]?a/WORLD[k]:0;if(w>best){best=w;c=RCOL[k];}}
      if(c==='none'&&r.inputs.Desc_Water_C)c='water';}
  }
  return ICOL[it]='var(--r-'+c+')';
}
const glyph=(it,cls='')=>`<span class="gl ${cls}${isRaw(it)?' raw':''}" style="--c:${itemColor(it)}" aria-hidden="true">${esc((I[it]?(S.lang==='ja'?I[it].j:I[it].n):'?').replace(/^(包装済み|容器入り|空の)/,'').charAt(0))}</span>`;

/* ---------- shared bits ---------- */
const ilink=(id,txt)=>`<button type="button" class="ilink" data-item="${id}">${esc(txt||nm(id))}</button>`;
function flowList(arr,r,mult=1){return '<div class="flow">'+arr.map(([it,a])=>`<span><span class="num">${fmt(perMin(r,a)*mult)}</span> ${ilink(it)}</span>`).join('')+'</div>';}
function unlockPill(rid){const r=R[rid];if(!r.u)return '';const [t,tier]=r.u;
  if(t==='hdd')return `<span class="pill p-alt">ハードドライブ</span>`;
  if(t==='mam')return `<span class="pill p-acc">MAM</span>`;
  if(t==='tier')return `<span class="pill p-std">Tier ${tier}</span>`;
  return `<span class="pill p-std">AWESOMEショップ</span>`;}
function altPill(rid){return R[rid].a?(S.unl[rid]?'<span class="pill p-good">解禁済</span>':'<span class="pill p-alt">代替</span>'):'';}
const CATS=[['raw','天然資源',it=>isRaw(it)],['fluid','液体・気体',it=>I[it].l&&!isRaw(it)],['elev','軌道エレベーター部品',it=>/SpaceElevatorPart/.test(it)],
  ['fuel','燃料・原子力',it=>/Fuel|Nuclear|Uranium|Plutonium|Ficsonium|Waste|ControlRod|Biofuel|Compacted|Canister|GasTank|Packaged/.test(it)],
  ['gear','装備・弾薬',it=>/Rebar|Cartridge|Nobelisk|Gunpowder|Filter|Beacon|PortableMiner/.test(it)],
  ['bio','生物・エイリアン',it=>/Parts_C|Alien|Leaves|Mycelia|Flower|Wood|Biomass|Crystal_|CrystalShard/.test(it)],['part','部品・素材',()=>true]];
let _gcache=null,_glang=null;
function groupItems(){
  if(_gcache&&_glang===S.lang)return _gcache;
  const done=new Set();
  _gcache=CATS.map(([key,name,f])=>{const items=Object.keys(I).filter(it=>!done.has(it)&&f(it));items.forEach(i=>done.add(i));
    if(key==='raw')items.sort((a,b)=>RAW_ORDER.indexOf(a)-RAW_ORDER.indexOf(b));else items.sort((a,b)=>nm(a).localeCompare(nm(b),'ja'));return {key,name,items};});
  _glang=S.lang;return _gcache;
}
function itemOptions(sel,filter){
  return groupItems().filter(g=>g.items.some(filter)).map(g=>`<optgroup label="${esc(g.name)}">`+g.items.filter(filter).map(it=>`<option value="${it}"${it===sel?' selected':''}>${esc(nm(it))}</option>`).join('')+'</optgroup>').join('');}
const producible=it=>(producers[it]||[]).length>0;

/* number tween: answers a change the person just made */
function tween(el,to,f){
  const from=+el.dataset.v||0;el.dataset.v=to;
  if(reduceMotion||!isFinite(from)||Math.abs(to-from)<1e-9){el.firstChild.nodeValue=f(to);return;}
  const t0=performance.now(),dur=520;
  cancelAnimationFrame(el._raf);
  const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);el.firstChild.nodeValue=f(from+(to-from)*e);if(p<1)el._raf=requestAnimationFrame(step);};
  el._raf=requestAnimationFrame(step);
}

