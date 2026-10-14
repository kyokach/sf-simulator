/* ================= LAYOUT SIMULATOR (blueprint of the plan with real building footprints) ================= */
/* World units are metres. Each production line becomes a bank of machines with an input manifold on one side
   and an output manifold on the other (lane width = splitter size). Belts are routed orthogonally between banks. */
const LX={vp:null,sel:null,model:null,sim:null,drag:null,fitted:false,mode:'2d'};
const CORRIDOR=16,BLOCK_GAP=8,ROW_GAP=2,DOCK=6,FOUND=8;
const DIRV={L:[-1,0],R:[1,0],T:[0,-1],B:[0,1]};
const ROT_SIDES={0:['T','B'],90:['L','R'],180:['B','T'],270:['R','L']};   // [input side, output side]

function autoPer(n){return n<=8?Math.max(1,n):Math.ceil(n/Math.ceil(n/8));}
function blockGeom(b,gap){
  const [sin,sout]=ROT_SIDES[b.rot];b.din=sin;b.dout=sout;
  if(b.kind==='dock'){b.w=b.h=DOCK;b.machines=[];b.lanes=[];b.din='L';b.dout='R';return;}
  const [W,Lm]=b.dim,per=Math.max(1,Math.min(b.n,b.per)),rows=Math.ceil(b.n/per),RH=Lm+2*MANIFOLD;
  b.per=per;b.rows=rows;b.machines=[];b.lanes=[];
  const horiz=b.rot===90||b.rot===270;
  if(horiz){b.w=rows*RH+(rows-1)*ROW_GAP;b.h=per*W+(per-1)*gap;}else{b.w=per*W+(per-1)*gap;b.h=rows*RH+(rows-1)*ROW_GAP;}
  for(let r=0;r<rows;r++){
    const o=r*(RH+ROW_GAP),cnt=Math.min(per,b.n-r*per);
    // lanes along the row; "in" lane first in flow direction
    let laneIn,laneOut;
    if(horiz){laneIn={x:o,y:0,w:MANIFOLD,h:b.h};laneOut={x:o+MANIFOLD+Lm,y:0,w:MANIFOLD,h:b.h};}
    else{laneIn={x:0,y:o,w:b.w,h:MANIFOLD};laneOut={x:0,y:o+MANIFOLD+Lm,w:b.w,h:MANIFOLD};}
    b.lanes.push({...laneIn,io:'in'},{...laneOut,io:'out'});
    for(let c=0;c<cnt;c++)b.machines.push(horiz?{x:o+MANIFOLD,y:c*(W+gap),w:Lm,h:W}:{x:c*(W+gap),y:o+MANIFOLD,w:W,h:Lm});
  }
  if(b.rot===270||b.rot===180){ // mirror so the flow runs the other way
    const mx=b.rot===270,flip=r=>mx?{...r,x:b.w-r.x-r.w}:{...r,y:b.h-r.y-r.h};
    b.lanes=b.lanes.map(flip);b.machines=b.machines.map(flip);
  }
}
function buildLayout(sim){
  const P=sim.P,lay=P.lay,blocks=[],byKey={},L=sim.flow.layer;
  for(const l of sim.lines)blocks.push({key:'L:'+l.item,kind:'line',item:l.item,m:l.m,n:l.n,dim:DIMS[l.m]||[10,10,10],layer:L['L:'+l.item]||1,line:l});
  if(sim.gen)blocks.push({key:'G:power',kind:'gen',item:sim.gen.fuel,m:sim.gen.id,n:Math.max(1,Math.ceil(sim.gen.n-1e-9)),dim:DIMS[sim.gen.id]||[20,20,20],layer:L['G:power']});
  for(const n of sim.flow.nodes)if(n.type==='in'||n.type==='out'||n.type==='sur')blocks.push({key:n.id,kind:'dock',io:n.type,item:n.item,amt:n.amt,n:0,dim:[DOCK,DOCK,3],layer:L[n.id]||0});
  for(const b of blocks){const st=lay.blocks[b.key]||{};b.rot=[0,90,180,270].includes(st.rot)?st.rot:90;b.per=st.per||autoPer(b.n||1);blockGeom(b,lay.gap);byKey[b.key]=b;}
  const auto=autoArrangeLayout(blocks);
  for(const b of blocks){const st=lay.blocks[b.key];if(st&&Number.isFinite(st.x)&&Number.isFinite(st.y)){b.x=st.x;b.y=st.y;b.placed=true;}else{[b.x,b.y]=auto[b.key];}}
  const conns=routeAll(sim.flow.edges,byKey);
  const tiles=foundationTiles(blocks,conns),clash=findClashes(blocks),bb=layoutBBox(blocks,conns);
  return {blocks,byKey,conns,tiles,clash,bb};
}
function autoArrangeLayout(blocks){
  const cols=[];blocks.forEach(b=>{(cols[b.layer]=cols[b.layer]||[]).push(b);});
  const pos={};let x=0;
  const colsF=cols.filter(Boolean);
  const order=b=>b.kind==='dock'?(b.io==='sur'?2:0):b.kind==='gen'?1:0;
  const hs=colsF.map(col=>col.reduce((s,b)=>s+b.h+BLOCK_GAP,0)-BLOCK_GAP),H=Math.max(0,...hs);
  colsF.forEach((col,ci)=>{
    col.sort((a,b)=>order(a)-order(b)||RAW_ORDER.indexOf(a.item)-RAW_ORDER.indexOf(b.item)||(b.h-a.h));
    const cw=Math.max(...col.map(b=>b.w));let y=Math.round((H-hs[ci])/2/FOUND)*FOUND;
    for(const b of col){pos[b.key]=[Math.round((x+(cw-b.w)/2)/FOUND)*FOUND,y];y+=Math.ceil((b.h+BLOCK_GAP)/FOUND)*FOUND;}
    x+=Math.ceil((cw+CORRIDOR)/FOUND)*FOUND;});
  return pos;
}
function portAt(b,io,idx,count){
  const side=io==='out'?b.dout:b.din,span=(side==='L'||side==='R')?b.h:b.w;
  let off=span/2+(idx-(count-1)/2)*3;off=Math.max(1.5,Math.min(span-1.5,off));
  const p=side==='L'?[b.x,b.y+off]:side==='R'?[b.x+b.w,b.y+off]:side==='T'?[b.x+off,b.y]:[b.x+off,b.y+b.h];
  return {p,side};
}
function routeAll(edges,byKey){
  const outs={},ins={};
  const list=edges.filter(e=>byKey[e.from]&&byKey[e.to]).map((e,k)=>({...e,k}));
  list.forEach(c=>{(outs[c.from]=outs[c.from]||[]).push(c);(ins[c.to]=ins[c.to]||[]).push(c);});
  const sortBy=(arr,key,axis)=>arr.sort((a,b)=>{const A=byKey[a[key]],B=byKey[b[key]];return axis==='y'?(A.y+A.h/2)-(B.y+B.h/2):(A.x+A.w/2)-(B.x+B.w/2);});
  for(const [id,arr] of Object.entries(outs)){const b=byKey[id];sortBy(arr,'to',(b.dout==='L'||b.dout==='R')?'y':'x');arr.forEach((c,i)=>c.a=portAt(b,'out',i,arr.length));}
  for(const [id,arr] of Object.entries(ins)){const b=byKey[id];sortBy(arr,'from',(b.din==='L'||b.din==='R')?'y':'x');arr.forEach((c,i)=>c.b=portAt(b,'in',i,arr.length));}
  for(const c of list){
    const A=byKey[c.from],B=byKey[c.to],p1=c.a.p,p2=c.b.p,d1=DIRV[c.a.side],d2=DIRV[c.b.side],st=3+(c.k%4)*1.5;
    const a=[p1[0]+d1[0]*st,p1[1]+d1[1]*st],b=[p2[0]+d2[0]*st,p2[1]+d2[1]*st];
    const pts=[p1,a],jit=((c.k%5)-2)*2.4;
    const below=Math.max(A.y+A.h,B.y+B.h)+6+(c.k%6)*2.5,right=Math.max(A.x+A.w,B.x+B.w)+6+(c.k%6)*2.5;
    if(d1[0]!==0&&d2[0]!==0){
      const fwd=(d1[0]>0&&a[0]<=b[0])||(d1[0]<0&&a[0]>=b[0]);
      if(fwd){const mx=(a[0]+b[0])/2+jit;pts.push([mx,a[1]],[mx,b[1]]);}else pts.push([a[0],below],[b[0],below]);
    }else if(d1[1]!==0&&d2[1]!==0){
      const fwd=(d1[1]>0&&a[1]<=b[1])||(d1[1]<0&&a[1]>=b[1]);
      if(fwd){const my=(a[1]+b[1])/2+jit;pts.push([a[0],my],[b[0],my]);}else pts.push([right,a[1]],[right,b[1]]);
    }else if(d1[0]!==0)pts.push([b[0],a[1]]);
    else pts.push([a[0],b[1]]);
    pts.push(b,p2);
    c.pts=simplifyPts(pts);c.len=c.pts.reduce((s,p,i)=>i?s+Math.abs(p[0]-c.pts[i-1][0])+Math.abs(p[1]-c.pts[i-1][1]):0,0);
  }
  return list;
}
function simplifyPts(pts){const o=[];for(const p of pts){const q=[Math.round(p[0]*100)/100,Math.round(p[1]*100)/100];const l=o[o.length-1];if(l&&l[0]===q[0]&&l[1]===q[1])continue;
  if(o.length>=2){const a=o[o.length-2];if((a[0]===l[0]&&l[0]===q[0])||(a[1]===l[1]&&l[1]===q[1])){o[o.length-1]=q;continue;}}o.push(q);}return o;}
function foundationTiles(blocks,conns){
  const set=new Set();
  const mark=(x0,y0,x1,y1)=>{for(let i=Math.floor(x0/FOUND);i<=Math.floor((x1-1e-6)/FOUND);i++)for(let j=Math.floor(y0/FOUND);j<=Math.floor((y1-1e-6)/FOUND);j++)set.add(i+','+j);};
  for(const b of blocks)mark(b.x,b.y,b.x+b.w,b.y+b.h);
  for(const c of conns)for(let i=1;i<c.pts.length;i++){const [x0,y0]=c.pts[i-1],[x1,y1]=c.pts[i];mark(Math.min(x0,x1)-1,Math.min(y0,y1)-1,Math.max(x0,x1)+1,Math.max(y0,y1)+1);}
  return set;
}
function findClashes(blocks){
  const keys=new Set(),pairs=[];
  for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const a=blocks[i],b=blocks[j];
    const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    if(ox>0.05&&oy>0.05){keys.add(a.key);keys.add(b.key);pairs.push([a.key,b.key]);}}
  return {keys,pairs};
}
function layoutBBox(blocks,conns){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const inc=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);};
  for(const b of blocks){inc(b.x,b.y-6);inc(b.x+b.w,b.y+b.h);}for(const c of conns)for(const p of c.pts)inc(p[0],p[1]);
  return Number.isFinite(x0)?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null;}
function manifoldNeeds(sim,key){
  const ins={},outs={};for(const e of sim.flow.edges){if(e.to===key)ins[e.item]=(ins[e.item]||0)+e.rate;if(e.from===key)outs[e.item]=(outs[e.item]||0)+e.rate;}
  const P=sim.P,f=o=>Object.entries(o).map(([it,r])=>({item:it,rate:r,belt:beltNeed(it,r,P)}));
  return {ins:f(ins),outs:f(outs)};
}
const blockName=b=>b.kind==='gen'?'発電所':b.kind==='dock'?(b.io==='in'?(isRaw(b.item)?'搬入口（採掘）':'搬入口'):b.io==='out'?'出荷口':'余剰の出口'):nm(b.item);

/* ---------- view ---------- */
function initLayout(){
  if(LX.vp)return;
  const svg=$('#lx-svg'),world=$('#lx-world');
  LX.vp=makeViewport(svg,world,{min:0.3,max:40,
    canPan:e=>!e.target.closest('.lblock'),
    onTap:()=>{if(LX.sel){LX.sel=null;lxApplySel();renderLxInspector();}if(isMobile()&&LX.inspOpen)setSheet($('#lx-insp'),'closed');},
    onChange:v=>{svg.classList.toggle('z-lo',v.k<2.2);svg.classList.toggle('z-hi',v.k>=6);if(LX.mode!=='3d')$('#lx-zoomv').textContent=`${fmt(v.k,1)} px/m`;
      if(LX.labK!==v.k){const sw=(1/v.k).toFixed(4);document.querySelectorAll('#lx-svg .gl8').forEach(p=>p.setAttribute('stroke-width',sw));lxLabels();}
      S.lxView=[v.x,v.y,v.k];saveSoon();}});
  if(Array.isArray(S.lxView)&&S.lxView.every(Number.isFinite)){LX.vp.set(...S.lxView);LX.fitted=true;}
  svg.addEventListener('pointerdown',lxDown);svg.addEventListener('pointermove',lxMove);svg.addEventListener('pointerup',lxUp);svg.addEventListener('pointercancel',lxUp);
  $('#lx').addEventListener('click',lxClick);$('#lx').addEventListener('change',lxChange);
}
function renderLayout(){
  initLayout();ensurePlan(S.cur);
  LX.sim=simulate(S.cur);
  const empty=$('#lx-empty');
  if(LX.sim.error||!LX.sim.lines.length){LX.model=null;$('#lx-blocks').innerHTML=$('#lx-belts').innerHTML=$('#lx-tiles').innerHTML='';empty.hidden=false;
    empty.innerHTML=LX.sim.error?`<b>計算できません</b><p>${esc(LX.sim.error)}</p>`:`<b>配置するラインがありません</b><p>生産計画で出荷するものを決めると、必要な装置がここに並びます。</p><button class="btn pri" type="button" data-lx="toplan">生産計画へ</button>`;
    renderLxInspector();renderLxStatus();return;}
  empty.hidden=true;
  LX.model=buildLayout(LX.sim);
  drawLayout();renderLxInspector();renderLxStatus();
  $('[data-lx="mode"]').setAttribute('aria-pressed',String(LX.mode==='3d'));
  if(!LX.fitted){LX.fitted=true;const fit=()=>{const b=LX.model&&LX.model.bb;if(b)LX.vp.fit(b,isMobile()?20:48,12);};
    const r=$('#lx-svg').getBoundingClientRect();if(r.width&&r.height)fit();else requestAnimationFrame(fit);} // labels follow via onChange
  if(LX.mode==='3d')show3D(LX.model,LX.sim);
}
function lxFit(anim=true){if(LX.mode==='3d'&&L3.fit){L3.fit();return;}const b=LX.model&&LX.model.bb;if(b)LX.vp.fit(b,isMobile()?20:48,12,0,anim);}
function lxZoom(f){if(LX.mode==='3d'&&L3.dolly)L3.dolly(1/f);else LX.vp.zoomBy(f);}
/* Labels live in screen pixels (group scale 1/k) like map labels: always legible, and they drop out
   when the thing they describe is too small on screen to carry them */
const LBL={t1:12.5,t2:11,belt:10.5};
const blockTitle=b=>b.kind==='gen'?`発電所 ・ ${mn(b.m)} ×${b.n}`:`${nm(b.item)} ・ ${mn(b.m)} ×${b.n}`;
function blockLabel(b,k){
  const W=b.w*k;if(W<40)return '';
  const room=W+18; // labels may overhang into the corridor a little
  const full=blockTitle(b),short=b.kind==='gen'?`発電所 ×${b.n}`:`${nm(b.item)} ×${b.n}`,bare=b.kind==='gen'?'発電所':nm(b.item);
  const dims=`${fmt(b.w,0)}×${fmt(b.h,0)} m`,dw=textW(dims,LBL.t2)+14,y=(-5-0.6*k).toFixed(1);
  const fits=s=>textW(s,LBL.t1)<=room;
  let title,showD=false;
  if(textW(full,LBL.t1)+dw<=room){title=full;showD=true;}
  else title=fits(full)?full:fits(short)?short:fitText(bare,room,LBL.t1);
  return `<text class="blab1" y="${y}">${esc(title)}</text>${showD?`<text class="blab2" x="${W.toFixed(1)}" y="${y}" text-anchor="end">${dims}</text>`:''}`;
}
function lxLabels(){
  const m=LX.model;if(!m)return;const k=LX.vp.v.k,inv=`scale(${(1/k).toFixed(5)})`;LX.labK=k;
  document.querySelectorAll('#lx-blocks .lblock').forEach(g=>{const b=m.byKey[g.dataset.key],l=g.querySelector('.lbl');if(!b||!l)return;l.setAttribute('transform',inv);if(b.kind!=='dock')l.innerHTML=blockLabel(b,k);});
  document.querySelectorAll('#lx-belts .blab').forEach(l=>{l.setAttribute('transform',`translate(${l.dataset.x} ${l.dataset.y}) ${inv}`);l.style.display=(+l.dataset.ll*k>=+l.dataset.lw+16)?'':'none';});
}
function drawLayout(){
  const m=LX.model,k=LX.vp.v.k,inv=`scale(${(1/k).toFixed(5)})`;
  $('#lx-tiles').innerHTML=[...m.tiles].map(s=>{const [i,j]=s.split(',').map(Number);return `<rect x="${i*FOUND}" y="${j*FOUND}" width="${FOUND}" height="${FOUND}"/>`;}).join('');
  $('#lx-belts').innerHTML=m.conns.map(c=>{const d='M'+c.pts.map(p=>p.join(',')).join(' L'),col=itemColor(c.item);
    let li=1,ll=0;for(let i=1;i<c.pts.length;i++){const l=Math.abs(c.pts[i][0]-c.pts[i-1][0])+Math.abs(c.pts[i][1]-c.pts[i-1][1]);if(l>ll){ll=l;li=i;}}
    const mx=((c.pts[li][0]+c.pts[li-1][0])/2).toFixed(2),my=((c.pts[li][1]+c.pts[li-1][1])/2).toFixed(2),lab=`${c.belt.label} · ${fmt(c.rate,c.rate<10?1:0)}`,lw=textW(lab,LBL.belt)+14;
    return `<g class="lbelt${c.belt.over?' over':''}" data-f="${c.from}" data-t="${c.to}"><path class="bb" d="${d}"/><path class="bc" d="${d}" stroke="${col}"/><path class="bm" d="${d}"/>`
      +`<g class="blab" data-x="${mx}" data-y="${my}" data-ll="${ll.toFixed(1)}" data-lw="${lw.toFixed(0)}" transform="translate(${mx} ${my}) ${inv}"${ll*k>=lw+16?'':' style="display:none"'}><rect x="${(-lw/2).toFixed(1)}" y="-9" width="${lw.toFixed(1)}" height="18" rx="9"/><text y="3.8" text-anchor="middle">${esc(lab)}</text></g></g>`;}).join('');
  $('#lx-blocks').innerHTML=m.blocks.map(b=>blockSvg(b,k)).join('');
  LX.labK=k;lxApplySel();
}
function blockSvg(b,k){
  const clash=LX.model.clash.keys.has(b.key),sel=LX.sel===b.key,inv=`scale(${(1/k).toFixed(5)})`;
  if(b.kind==='dock'){const col=itemColor(b.item),ch=(nm(b.item).replace(/^(包装済み|容器入り|空の)/,'')[0]||'?');
    return `<g class="lblock dock${clash?' clash':''}${sel?' sel':''}" data-key="${b.key}" transform="translate(${b.x} ${b.y})" tabindex="0" role="button" aria-label="${esc(blockName(b))} ${esc(nm(b.item))}">
      <rect class="db" width="${DOCK}" height="${DOCK}" rx="1" style="--c:${col}"/><g transform="scale(.1)"><text class="dch" x="${DOCK*5}" y="${DOCK*5+11}" text-anchor="middle" fill="${col}">${esc(ch)}</text></g>
      <g transform="translate(${DOCK/2} ${DOCK+0.4})"><g class="lbl" transform="${inv}"><text class="dlab" y="12" text-anchor="middle">${esc(fitText(nm(b.item),120,11))}</text><text class="dlab s" y="25" text-anchor="middle">${b.io==='in'?'入':'出'} ${fmt(b.amt,b.amt<10?1:0)}/分</text></g></g></g>`;}
  const mc=MCOL[b.m]||'#9DB3C9';
  return `<g class="lblock${clash?' clash':''}${sel?' sel':''}" data-key="${b.key}" transform="translate(${b.x} ${b.y})" tabindex="0" role="button" aria-label="${esc(blockTitle(b))}" style="--mc:${mc}">
    <rect class="bo" x="-0.6" y="-0.6" width="${b.w+1.2}" height="${b.h+1.2}" rx="1.2"/>
    ${b.lanes.map(l=>`<rect class="lane ${l.io}" x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}"/>`).join('')}
    ${b.machines.map(r=>`<rect class="mach" x="${r.x+0.2}" y="${r.y+0.2}" width="${(r.w-0.4).toFixed(2)}" height="${(r.h-0.4).toFixed(2)}" rx="0.6"/>`).join('')}
    <g class="lbl" transform="${inv}">${blockLabel(b,k)}</g></g>`;
}
function lxApplySel(){document.querySelectorAll('#lx-blocks .lblock').forEach(g=>g.classList.toggle('sel',g.dataset.key===LX.sel));
  document.querySelectorAll('#lx-belts .lbelt').forEach(g=>g.classList.toggle('on',!!LX.sel&&(g.dataset.f===LX.sel||g.dataset.t===LX.sel)));
  if(LX.mode==='3d'&&L3.select)L3.select(LX.sel);}

/* ---------- interactions ---------- */
function lxDown(e){
  if(LX.vp.multi){LX.drag=null;return;}
  const g=e.target.closest('.lblock');if(!g||(e.pointerType==='mouse'&&e.button!==0))return;
  const b=LX.model.byKey[g.dataset.key];if(!b)return;
  LX.drag={key:b.key,b,g,sx:e.clientX,sy:e.clientY,x0:b.x,y0:b.y,moved:false,pid:e.pointerId};
  try{$('#lx-svg').setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
}
function lxMove(e){
  const d=LX.drag;if(!d||e.pointerId!==d.pid)return;if(LX.vp.multi){LX.drag=null;return;}
  const dx=e.clientX-d.sx,dy=e.clientY-d.sy;if(!d.moved&&Math.hypot(dx,dy)<4)return;
  if(!d.moved){d.moved=true;snapshot();$('#lx-svg').classList.add('dragging');}
  const k=LX.vp.v.k,snap=e.altKey?0:S.cur.lay.snap;let nx=d.x0+dx/k,ny=d.y0+dy/k;
  if(snap){nx=Math.round(nx/snap)*snap;ny=Math.round(ny/snap)*snap;}
  d.b.x=nx;d.b.y=ny;const g=document.querySelector(`#lx-blocks .lblock[data-key="${CSS.escape(d.key)}"]`);if(g)g.setAttribute('transform',`translate(${nx} ${ny})`);
  cancelAnimationFrame(LX.raf);LX.raf=requestAnimationFrame(()=>{const m=LX.model;m.conns=routeAll(LX.sim.flow.edges,m.byKey);m.tiles=foundationTiles(m.blocks,m.conns);m.clash=findClashes(m.blocks);m.bb=layoutBBox(m.blocks,m.conns);
    drawLayout();renderLxStatus();});
}
function lxUp(e){
  const d=LX.drag;if(!d||e.pointerId!==d.pid)return;LX.drag=null;$('#lx-svg').classList.remove('dragging');
  if(!d.moved){lxSelect(d.key);return;}
  const st=S.cur.lay.blocks[d.key]=S.cur.lay.blocks[d.key]||{};st.x=d.b.x;st.y=d.b.y;save();renderLayout();
}
function lxSelect(key){LX.sel=key;lxApplySel();renderLxInspector();if(key&&sheetState($('#lx-insp'))==='closed')setSheet($('#lx-insp'),'half');}
function lxSet(key,patch){mut(()=>{const b=LX.model&&LX.model.byKey[key];const st=S.cur.lay.blocks[key]=S.cur.lay.blocks[key]||{};
  if(b&&!Number.isFinite(st.x)){st.x=b.x;st.y=b.y;}Object.assign(st,patch);});}
// rot follows ROT_SIDES (0 ↓, 90 →, 180 ↑, 270 ←), so a clockwise turn on screen subtracts 90°
function lxRotate(key,dir){const b=LX.model&&LX.model.byKey[key];if(!b||b.kind==='dock')return;const rots=[0,90,180,270],i=rots.indexOf(b.rot);
  const nr=rots[(i-(dir||1)+4)%4],cx=b.x+b.w/2,cy=b.y+b.h/2;
  const nb={...b,rot:nr};blockGeom(nb,S.cur.lay.gap);const snap=S.cur.lay.snap||1;
  lxSet(key,{rot:nr,x:Math.round((cx-nb.w/2)/snap)*snap,y:Math.round((cy-nb.h/2)/snap)*snap});}
function lxClick(e){
  const f=e.target.closest('[data-fx]');if(f&&!f.disabled){if(f.dataset.fx==='undo')undo();else if(f.dataset.fx==='redo')redo();return;}
  const b=e.target.closest('[data-lx]');if(!b||b.disabled)return;const a=b.dataset.lx,key=b.dataset.key||LX.sel;
  switch(a){
    case 'auto':mut(()=>{S.cur.lay.blocks={};});LX.fitted=false;LX.sel=null;renderLayout();toast('自動で並べ直しました',{label:'元に戻す',fn:undo});break;
    case 'fit':lxFit();break;
    case 'zin':lxZoom(1.3);break;
    case 'zout':lxZoom(1/1.3);break;
    case 'mode':LX.mode=LX.mode==='3d'?'2d':'3d';b.setAttribute('aria-pressed',String(LX.mode==='3d'));if(LX.mode==='3d')show3D(LX.model,LX.sim);else hide3D();renderLxInspector();break;
    case 'rot':lxRotate(key,+b.dataset.d||1);break;
    case 'per':{const bl=LX.model.byKey[key];if(!bl)break;const v=Math.max(1,Math.min(bl.n,bl.per+(+b.dataset.d)));if(v!==bl.per)lxSet(key,{per:v});break;}
    case 'snap':mut(()=>{S.cur.lay.snap=+b.dataset.v;});break;
    case 'desel':LX.sel=null;lxApplySel();renderLxInspector();break;
    case 'sel':lxSelect(b.dataset.key);{const bl=LX.model.byKey[b.dataset.key];if(bl){if(LX.mode==='3d'&&L3.focus)L3.focus(bl);else LX.vp.center(bl.x+bl.w/2,bl.y+bl.h/2,true);}}break;
    case 'toplan':go('plan');break;
    case 'openfx':FX.sel={type:'node',id:key};FX.focusId=key;go('plan');break;
    case 'sheet':toggleSheet($('#lx-insp'));break;
  }
}
function lxChange(e){const t=e.target;
  if(t.id==='lx-gap'){const v=Math.max(0,Math.min(20,+t.value||0));mut(()=>{S.cur.lay.gap=v;});}
  else if(t.dataset.lxper){const bl=LX.model.byKey[t.dataset.lxper];const v=Math.max(1,Math.min(bl?bl.n:1,Math.round(+t.value)||1));lxSet(t.dataset.lxper,{per:v});}}

/* ---------- inspector & status ---------- */
function renderLxStatus(){
  const el=$('#lx-status'),m=LX.model;if(!el)return;
  if(!m){el.innerHTML='';return;}
  const area=m.tiles.size*FOUND*FOUND,mach=m.blocks.reduce((s,b)=>s+(b.kind==='dock'?0:b.n),0),over=m.conns.filter(c=>c.belt.over).length;
  el.innerHTML=`<span class="st"><span class="st-k">敷地</span><b class="num">${fmt(m.bb.w,0)}×${fmt(m.bb.h,0)}</b><small>m</small></span>`
    +`<span class="st"><span class="st-k">基礎</span><b class="num">${fmt(m.tiles.size,0)}</b><small>枚（${fmt(area,0)} m²）</small></span>`
    +`<span class="st"><span class="st-k">装置</span><b class="num">${fmt(mach,0)}</b><small>台</small></span>`
    +`<span class="st"><span class="st-k">ベルト</span><b class="num">${m.conns.length}</b><small>本 ・ 約 ${fmt(m.conns.reduce((s,c)=>s+c.len,0),0)} m</small></span>`
    +(m.clash.pairs.length?`<button type="button" class="st warn" data-lx="desel">${ICON.warn}<b>${m.clash.pairs.length}</b><small>か所の重なり</small></button>`:'')
    +(over?`<button type="button" class="st warn" data-lx="desel">${ICON.warn}<b>${over}</b><small>本が容量超過</small></button>`:'')
    +(!m.clash.pairs.length&&!over?`<span class="st ok"><small>重なりなし</small></span>`:'');
}
function renderLxInspector(){
  const box=$('#lx-insp');if(!box)return;const m=LX.model;let title='配置の概要',body='';
  if(!m)body=`<div class="ins-sec"><p class="note">生産計画で出荷するものを決めると、ここに配置の情報が出ます。</p></div>`;
  else if(LX.sel&&m.byKey[LX.sel]){const b=m.byKey[LX.sel];title=blockName(b);body=lxBlockInsp(b,m);}
  else{LX.sel=null;body=lxSummary(m);}
  const pk=m?`敷地 <span class="num">${fmt(m.bb.w,0)}×${fmt(m.bb.h,0)}</span> m ・ 基礎 <span class="num">${fmt(m.tiles.size,0)}</span> 枚${m.clash.pairs.length?` ・ <span class="bad">重なり ${m.clash.pairs.length}</span>`:''}`:'';
  box.innerHTML=`<button class="fx-handle" type="button" data-lx="sheet" aria-label="詳細パネルを開閉"><i></i><span class="pk-t">${esc(title)}</span><span class="pk-s">${pk}</span></button><div class="ins-body">${body}</div>`;
  box.classList.toggle('open',!!LX.inspOpen);
}
function lxSummary(m){
  const area=m.tiles.size*FOUND*FOUND,over=m.conns.filter(c=>c.belt.over);
  const byM={};for(const b of m.blocks)if(b.kind!=='dock')byM[b.m]=(byM[b.m]||0)+b.n;
  return `<div class="ins-head"><div class="ih-t"><h2>配置の概要</h2><p>ラインをドラッグで動かせます。選ぶと向きや1列の台数を変えられます。</p></div></div>`
    +stats([['敷地',`${fmt(m.bb.w,0)}×${fmt(m.bb.h,0)}`,'m'],['基礎 8×8m',fmt(m.tiles.size,0),'枚'],['床面積',fmt(area,0),'m²'],['ライン',m.blocks.filter(b=>b.kind!=='dock').length,'']])
    +(m.clash.pairs.length?`<section class="ins-sec"><h3>重なっているライン</h3><ul class="warns">${m.clash.pairs.map(([a,b])=>`<li><button type="button" data-lx="sel" data-key="${a}">${ICON.warn}<span>${esc(blockName(m.byKey[a]))} と ${esc(blockName(m.byKey[b]))}</span></button></li>`).join('')}</ul></section>`:'')
    +(over.length?`<section class="ins-sec"><h3>容量を超えるベルト</h3><ul class="warns">${over.map(c=>`<li><button type="button" data-lx="sel" data-key="${c.to}">${ICON.warn}<span>${esc(nm(c.item))} ${fmt(c.rate,0)}/分 → ${esc(c.belt.label)} が必要</span></button></li>`).join('')}</ul></section>`:'')
    +`<section class="ins-sec"><h3>装置の内訳</h3>${Object.entries(byM).sort((a,b)=>MACH_ORDER.indexOf(a[0])-MACH_ORDER.indexOf(b[0])).map(([k,n])=>`<div class="kv"><i class="sw-c" style="background:${MCOL[k]||'#9DB3C9'}"></i><span>${esc(mn(k))}</span><span class="num">${n}</span><small>台 ・ ${(DIMS[k]||[0,0])[0]}×${(DIMS[k]||[0,0])[1]} m</small></div>`).join('')}</section>`
    +`<section class="ins-sec"><h3>並べ方</h3><div class="field"><label>ドラッグ時の吸着</label><div class="seg">${[[8,'基礎 8m'],[1,'1m'],[0,'なし']].map(([v,l])=>`<button type="button" data-lx="snap" data-v="${v}" aria-pressed="${S.cur.lay.snap===v}">${l}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:10px"><label for="lx-gap">装置どうしの間隔（m）</label><input type="number" id="lx-gap" min="0" max="20" step="0.5" value="${S.cur.lay.gap}"></div>
      <div class="row" style="margin-top:12px"><button class="btn sm" type="button" data-lx="auto">自動で並べ直す</button><button class="btn sm" type="button" data-lx="mode">${LX.mode==='3d'?'2Dに戻す':'3Dで見る'}</button></div></section>`
    +`<section class="ins-sec"><p class="note">装置の大きさはWikiの寸法（幅×奥行）です。各ラインの入力側と出力側に、分配器・合流器のための幅4mのレーンを取っています。電柱や階段、通路は含まないので、実際はもう少し広めに見てください。</p></section>`;
}
function lxBlockInsp(b,m){
  const sim=LX.sim;
  if(b.kind==='dock')return `<div class="ins-head">${glyph(b.item,'l')}<div class="ih-t"><h2>${esc(nm(b.item))}</h2><p>${esc(blockName(b))}</p></div><button class="ibtn" type="button" data-lx="desel" aria-label="選択を解除">${ICON.close}</button></div>`
    +stats([['流量',fmt(b.amt,b.amt<10?2:1),unit(b.item)+'/分'],['必要な'+(I[b.item].l?'パイプ':'ベルト'),beltNeed(b.item,b.amt,sim.P).label.replace('パイプ',''),'']]);
  const nd=manifoldNeeds(sim,b.key),mc=MCOL[b.m]||'#9DB3C9',[W,Lm,H]=b.dim;
  const mf=(arr,lab)=>arr.length?`<h4>${lab}</h4>${arr.map(x=>`<div class="io-r">${glyph(x.item,'s')}<span class="io-n">${esc(nm(x.item))}</span><b class="num">${fmt(x.rate,x.rate<10?2:1)}</b><span class="pill ${x.belt.over?'p-bad':'p-std'}">${esc(x.belt.label)}</span></div>`).join('')}`:'';
  const dirL={0:'上から下',90:'左から右',180:'下から上',270:'右から左'};
  return `<div class="ins-head">${b.kind==='gen'?`<span class="gl l" style="--c:${mc}">${ICON.power}</span>`:glyph(b.item,'l')}<div class="ih-t"><h2>${esc(b.kind==='gen'?'発電所':nm(b.item))}</h2><p>${esc(mn(b.m))} ×${b.n}</p></div><button class="ibtn" type="button" data-lx="desel" aria-label="選択を解除">${ICON.close}</button></div>`
    +stats([['ラインの大きさ',`${fmt(b.w,1)}×${fmt(b.h,1)}`,'m'],['基礎',fmt(Math.ceil(b.w/FOUND)*Math.ceil(b.h/FOUND),0),'枚ぶん'],['装置1台',`${W}×${Lm}`,`m ・ 高さ ${H} m`],['並び',`${b.rows}列 × ${b.per}台`,'']])
    +(m.clash.keys.has(b.key)?`<section class="ins-sec"><p class="bad">${ICON.warn} ほかのラインと重なっています。ドラッグでずらしてください。</p></section>`:'')
    +`<section class="ins-sec"><h3>向きと並び方</h3><div class="row"><span class="small">流れる向き: <b>${dirL[b.rot]}</b></span><button class="btn sm" type="button" data-lx="rot" data-d="-1">左に回す</button><button class="btn sm" type="button" data-lx="rot" data-d="1">右に回す</button></div>
      <div class="field" style="margin-top:10px"><label>1列に並べる台数</label><div class="row"><button class="ibtn" type="button" data-lx="per" data-d="-1" aria-label="減らす">${ICON.minus}</button><input type="number" min="1" max="${b.n}" step="1" value="${b.per}" data-lxper="${b.key}" style="width:76px" aria-label="1列の台数"><button class="ibtn" type="button" data-lx="per" data-d="1" aria-label="増やす">${ICON.plus}</button><span class="small muted">全 ${b.n} 台</span></div></div></section>`
    +`<section class="ins-sec io"><h3>マニホールド<small>このラインに出入りする合計の流量</small></h3>${mf(nd.ins,'入力側')}${mf(nd.outs,'出力側')}</section>`
    +`<section class="ins-sec"><button class="btn sm" type="button" data-lx="openfx" data-key="${b.key}">${ICON.arrange}工場キャンバスで開く</button></section>`;
}
