/* ================= FACTORY CANVAS (production plan as a direct-manipulation node editor) ================= */
const FX={vp:null,sim:null,sel:null,auto:{},topo:'',drag:null,raf:0,alt:{key:'',list:null},fitted:false,focusId:null,inspOpen:false,optObj:'balanced',optLocked:false,hover:null};
const NW={line:204,in:184,out:204,sur:184,gen:212},NH=64;
const ICON={
  undo:'<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  redo:'<svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
  arrange:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="3" y="15" width="6" height="5" rx="1"/><rect x="15" y="9.5" width="6" height="5" rx="1"/><path d="M9 6.5h2.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9M13 12h2"/></svg>',
  fit:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  power:'<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  layout:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  tree:'<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/></svg>',
  bars:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  box:'<svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};
const isMobile=()=>matchMedia('(max-width:760px)').matches;
function fitText(s,maxPx,size){let w=0,out='';for(const ch of String(s)){const cw=/[\u0000-ÿ]/.test(ch)?size*0.58:size*1.0;if(w+cw>maxPx)return out+'…';w+=cw;out+=ch;}return out;}
const textW=(s,size)=>[...String(s)].reduce((w,ch)=>w+(/[\u0000-ÿ]/.test(ch)?size*0.6:size*1.0),0);
const roundRate=v=>v>=100?Math.round(v):v>=10?Math.round(v*10)/10:Math.max(0.01,Math.round(v*100)/100);
function targetRate(it){return S.cur.targets.filter(x=>x.item===it).reduce((s,x)=>s+(+x.rate||0),0);}
function setTargetRate(it,v){const list=S.cur.targets.filter(x=>x.item===it);if(!list.length)return;list[0].rate=v;for(let i=1;i<list.length;i++)list[i].rate=0;S.cur.targets=S.cur.targets.filter((x,i)=>x.item!==it||x===list[0]||+x.rate>0);}

function initFactory(){
  if(FX.vp)return;
  const svg=$('#fx-svg'),world=$('#fx-world');
  FX.vp=makeViewport(svg,world,{min:0.12,max:2.6,
    canPan:e=>!e.target.closest('.gnode,.edge'),
    onTap:()=>{if(FX.sel){FX.sel=null;applySel();renderInspector();}if(isMobile()&&FX.inspOpen)setSheet($('#fx-insp'),'closed');},
    onChange:v=>{svg.classList.toggle('z-lo',v.k<0.5);svg.classList.toggle('z-hi',v.k>=1);$('#fx-zoomv').textContent=Math.round(v.k*100)+'%';drawMini();S.fxView=[v.x,v.y,v.k];saveSoon();}});
  if(Array.isArray(S.fxView)&&S.fxView.every(Number.isFinite)){FX.vp.set(...S.fxView);FX.fitted=true;}
  svg.addEventListener('pointerdown',fxDown);
  svg.addEventListener('pointermove',fxMove);
  svg.addEventListener('pointerup',fxUp);
  svg.addEventListener('pointercancel',fxUp);
  svg.addEventListener('pointerover',fxHover);
  svg.addEventListener('pointerout',e=>{if(e.target.closest('.gnode,.edge'))fxFocus(null);if(e.target.closest('.edge'))$('#fx-tip').hidden=true;});
  svg.addEventListener('dblclick',e=>{const g=e.target.closest('.gnode');if(g&&!e.target.closest('[data-scrub]'))openDrawer(g.dataset.item);});
  svg.addEventListener('keydown',e=>{const g=e.target.closest('.gnode');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select({type:'node',id:g.dataset.id});}});
  $('#fx').addEventListener('click',fxClick);
  $('#fx').addEventListener('change',fxChange);
  $('#fx').addEventListener('input',fxInput);
  $('#fx-mini').addEventListener('pointerdown',miniDown);
  new ResizeObserver(()=>drawMini()).observe($('#fx-stage'));
}

function renderFactory(){
  initFactory();ensurePlan(S.cur);
  FX.sim=simulate(S.cur);
  if(document.activeElement!==$('#fx-name'))$('#fx-name').value=S.curName||'';
  renderOrders();renderCanvas();renderInspector();renderStatus();renderTools();
  if(FX.focusId){const n=FX.sim.flow&&FX.sim.flow.byId[FX.focusId];if(n&&n.x!==undefined)requestAnimationFrame(()=>focusNode(n));FX.focusId=null;}
}
function renderLive(){ // cheap path while scrubbing a rate
  cancelAnimationFrame(FX.raf);
  FX.raf=requestAnimationFrame(()=>{FX.sim=simulate(S.cur);renderCanvas();renderStatus();
    S.cur.targets.forEach((x,i)=>{const el=document.querySelector(`[data-orate="${i}"]`);if(el&&document.activeElement!==el)el.value=+x.rate;});
    if(FX.sel&&FX.sel.type==='node'&&FX.sel.id.startsWith('O:'))renderInspector();});
}
function renderTools(){
  const p=$('[data-fx="power"]');if(p)p.setAttribute('aria-pressed',String(!!S.cur.power.on));
  const u=$('[data-fx="undo"]'),r=$('[data-fx="redo"]');if(u)u.disabled=!HIST.past.length;if(r)r.disabled=!HIST.future.length;
}

/* ---------- targets bar ---------- */
function renderOrders(){
  $('#fx-orders').innerHTML=S.cur.targets.map((x,i)=>`<div class="ochip${FX.sel&&FX.sel.id==='O:'+x.item?' on':''}">${glyph(x.item,'s')}<button type="button" class="oname" data-fxa="seltarget" data-id="O:${x.item}">${esc(nm(x.item))}</button><input type="number" min="0" step="any" value="${+x.rate}" data-orate="${i}" aria-label="${esc(nm(x.item))}（1分あたり）"><span class="u">${unit(x.item)}/分</span><button type="button" class="x" data-fxa="deltarget" data-i="${i}" aria-label="${esc(nm(x.item))}を出荷から外す">${ICON.close}</button></div>`).join('')
    +`<button type="button" class="oadd" data-fxa="addtarget">${ICON.plus}<span>出荷を追加</span></button>`;
  const box=$('#fx-orders'),on=box.querySelector('.ochip.on');
  if(on){const a=box.getBoundingClientRect(),c=on.getBoundingClientRect();if(c.right>a.right)box.scrollLeft+=c.right-a.right+12;else if(c.left<a.left)box.scrollLeft-=a.left-c.left+12;}
}

/* ---------- canvas ---------- */
function topoKey(flow){return flow.nodes.map(n=>n.id).sort().join('|')+'#'+flow.edges.map(e=>e.from+'>'+e.to).sort().join('|');}
function autoLayout(flow){
  const {nodes,layer,inc}=flow;const cols=[];
  nodes.forEach(n=>{(cols[layer[n.id]]=cols[layer[n.id]]||[]).push(n);});
  for(let c=0;c<cols.length;c++)if(!cols[c])cols[c]=[];
  const GX=128,GY=28,pos={},idx={},ord=n=>n.type==='gen'?2:n.type==='sur'?1:0;
  cols.forEach(col=>{col.sort((a,b)=>ord(a)-ord(b)||RAW_ORDER.indexOf(a.item)-RAW_ORDER.indexOf(b.item)||nm(a.item).localeCompare(nm(b.item),'ja'));col.forEach((n,i)=>idx[n.id]=i);});
  for(let pass=0;pass<5;pass++)for(let c=1;c<cols.length;c++){
    cols[c].forEach(n=>{const es=inc[n.id]||[],w=es.reduce((s,e)=>s+e.rate,0);n._bc=w?es.reduce((s,e)=>s+idx[e.from]*e.rate,0)/w:idx[n.id];});
    cols[c].sort((a,b)=>ord(a)-ord(b)||a._bc-b._bc);cols[c].forEach((n,i)=>idx[n.id]=i);}
  const colH=cols.map(col=>col.length*(NH+GY)-GY),H=Math.max(0,...colH);let x=0;
  cols.forEach((col,c)=>{const cw=Math.max(160,...col.map(n=>NW[n.type]));let y=(H-colH[c])/2;col.forEach(n=>{pos[n.id]=[x,Math.round(y/8)*8];y+=NH+GY;});x+=cw+GX;});
  return pos;
}
function placeNodes(flow){
  const key=topoKey(flow);if(key!==FX.topo){FX.auto=autoLayout(flow);FX.topo=key;}
  for(const n of flow.nodes){n.w=NW[n.type];n.h=NH;const p=S.cur.pos[n.id]||FX.auto[n.id]||[0,0];n.x=n.fx=p[0];n.y=n.fy=p[1];}
  const maxR=Math.max(1,...flow.edges.map(e=>e.rate));FX.wOf=r=>1.6+9*Math.sqrt(r/maxR);
  const outE={},inE={};flow.edges.forEach(e=>{(outE[e.from]=outE[e.from]||[]).push(e);(inE[e.to]=inE[e.to]||[]).push(e);});
  const spread=(list,src,node)=>{list.sort((a,b)=>{const A=flow.byId[src?a.to:a.from],B=flow.byId[src?b.to:b.from];return (A.y+A.h/2)-(B.y+B.h/2);});
    const tw=list.reduce((s,e)=>s+FX.wOf(e.rate),0),room=node.h-16,sc=Math.min(1,room/Math.max(tw,1));let y=node.h/2-Math.min(tw,room)/2;
    list.forEach(e=>{const w=FX.wOf(e.rate)*sc;if(src)e.o1=y+w/2;else e.o2=y+w/2;y+=w;});};
  for(const n of flow.nodes){if(outE[n.id])spread(outE[n.id],true,n);if(inE[n.id])spread(inE[n.id],false,n);}
}
function edgeGeom(e,flow){
  const a=flow.byId[e.from],b=flow.byId[e.to],x1=a.x+a.w,y1=a.y+e.o1,x2=b.x,y2=b.y+e.o2;
  if(x2>x1+24){const mx=Math.max(40,(x2-x1)*.5);return {d:`M${x1},${y1} C${x1+mx},${y1} ${x2-mx},${y2} ${x2},${y2}`,mx:(x1+x2)/2,my:(y1+y2)/2};}
  const dy=Math.max(a.y+a.h,b.y+b.h)+40;
  return {d:`M${x1},${y1} C${x1+80},${y1} ${x1+80},${dy} ${(x1+x2)/2},${dy} S${x2-80},${y2} ${x2},${y2}`,mx:(x1+x2)/2,my:dy};
}
function edgeSvg(e,i){
  const g=edgeGeom(e,FX.sim.flow),col=itemColor(e.item),w=FX.wOf(e.rate),dur=Math.max(.4,2.6-Math.log10(e.rate+1)*.75);
  const lab=`${e.belt.label} · ${fmt(e.rate,e.rate<10?1:0)}`,lw=textW(lab,10.5)+16;
  const sel=FX.sel&&FX.sel.type==='edge'&&FX.sel.f===e.from&&FX.sel.t===e.to&&FX.sel.item===e.item;
  return `<g class="edge${e.belt.over?' over':''}${sel?' sel':''}" data-e="${i}" data-f="${e.from}" data-t="${e.to}" data-item="${e.item}">`
    +`<path class="hit" d="${g.d}"/><path class="trk" d="${g.d}" stroke="${col}" stroke-width="${(w+3).toFixed(1)}"/>`
    +`<path class="itm" d="${g.d}" stroke="${col}" stroke-width="${Math.max(2.4,w*.7).toFixed(1)}" style="--d:${dur.toFixed(2)}s"/>`
    +`<g class="elabel" transform="translate(${g.mx.toFixed(1)} ${g.my.toFixed(1)})"><rect x="${(-lw/2).toFixed(1)}" y="-10" width="${lw.toFixed(1)}" height="20" rx="10"/><text text-anchor="middle" y="4">${esc(lab)}</text></g></g>`;
}
function nodeSvg(n,isNew){
  const sim=FX.sim,col=itemColor(n.item),w=n.w,h=n.h;
  const sel=FX.sel&&FX.sel.type==='node'&&FX.sel.id===n.id;
  let title=nm(n.item),sub='',big='',small='',cls='gnode t-'+n.type+(isNew?' enter':'');const badges=[];
  if(n.type==='line'){const l=n.line,r=R[n.rid];big='×'+l.n;sub=mn(r.m);small=fmt(l.outRate,l.outRate<10?2:1)+'/分';
    if(l.fixed||l.c>1+1e-9)badges.push(['clk',Math.round(l.c*100)+'%']);
    if(l.fill)badges.push(['amp','S'+l.fill]);
    if(r.a)badges.push([isLocked(n.rid)?'bad':'alt',isLocked(n.rid)?'未解禁':'代替']);}
  else if(n.type==='in'){const raw=isRaw(n.item),e=sim.ex.info[n.item],lim=sim.lim.find(x=>x.item===n.item);
    big=fmt(n.amt,n.amt<10?1:0);small=unit(n.item)+'/分';sub=raw?(e?`${e.mach} ×${Math.ceil(e.n-1e-9)}`:'採掘'):'外部から搬入';
    if(!raw)badges.push(['ext','搬入']);
    if(lim&&lim.ratio>1+1e-6){cls+=' bad';badges.push(['bad','上限超過']);}}
  else if(n.type==='out'){big=fmt(n.amt,n.amt<10?2:1);small=unit(n.item)+'/分';sub='出荷 ⇆ ドラッグで調整';}
  else if(n.type==='sur'){big=fmt(n.amt,n.amt<10?2:1);small=unit(n.item)+'/分';sub='余剰・副産物';}
  else if(n.type==='gen'){const g=n.gen;title='発電所';sub=`${mn(g.id)} ×${Math.ceil(g.n-1e-9)}`;big=fmt(g.mw,0);small='MW';}
  const smallW=textW(small,11),bigW=textW(big,20)*0.9;
  let bx=12;const bsvg=badges.map(([k,t])=>{const bw=textW(t,10)+12,s=`<g class="badge b-${k}" transform="translate(${bx} -9)"><rect width="${bw.toFixed(1)}" height="18" rx="9"/><text x="${(bw/2).toFixed(1)}" y="12.5" text-anchor="middle">${esc(t)}</text></g>`;bx+=bw+4;return s;}).join('');
  return `<g class="${cls}${sel?' sel':''}" data-id="${n.id}" data-item="${n.item}" transform="translate(${n.x} ${n.y})" tabindex="0" role="button" aria-label="${esc(title)} ${esc(sub)} ${esc(big)} ${esc(small)}">`
    +`<rect class="ring" x="-5" y="-5" width="${w+10}" height="${h+10}" rx="14"/><rect class="b" width="${w}" height="${h}" rx="10"/><rect class="strip" x="0" y="10" width="4" height="${h-20}" rx="2" fill="${col}"/>`
    +`<circle class="port" cx="0" cy="${h/2}" r="3.5"/><circle class="port" cx="${w}" cy="${h/2}" r="3.5"/>`
    +`<text class="t1" x="16" y="25">${esc(fitText(title,w-30-smallW,13))}</text><text class="t3" x="${w-14}" y="25" text-anchor="end">${esc(small)}</text>`
    +`<text class="t2" x="16" y="50">${esc(fitText(sub,w-34-bigW,11))}</text>`
    +(n.type==='out'?`<rect class="scrubhit" data-scrub="1" x="${w-bigW-26}" y="30" width="${bigW+20}" height="28" rx="6"/><path class="scrubline" d="M${(w-bigW-14).toFixed(1)},57 H${w-14}"/>`:'')
    +`<text class="big${n.type==='out'?' scrub':''}" x="${w-14}" y="52" text-anchor="end"${n.type==='out'?' data-scrub="1"':''}>${esc(big)}</text>${bsvg}</g>`;
}
function renderCanvas(){
  const sim=FX.sim,ne=$('#fx-nodes'),ee=$('#fx-edges'),empty=$('#fx-empty');
  if(sim.error){ee.innerHTML=ne.innerHTML='';empty.hidden=false;empty.innerHTML=`<b>計算できません</b><p>${esc(sim.error)}</p><button class="btn" type="button" data-fx="undo">元に戻す</button>`;drawMini();return;}
  const {nodes,edges}=sim.flow;
  if(!nodes.length){ee.innerHTML=ne.innerHTML='';empty.hidden=false;empty.innerHTML=`<b>何を作りますか？</b><p>出荷したいものと1分あたりの量を決めると、原料から出荷までの工場がここに組み上がります。</p><button class="btn pri" type="button" data-fxa="addtarget">${ICON.plus}出荷を追加</button>`;drawMini();return;}
  empty.hidden=true;
  stopGlide();const from=FX.vis||{},first=!FX.fitted||!Object.keys(from).length;
  placeNodes(sim.flow);
  ee.innerHTML=edges.map(edgeSvg).join('');
  ne.innerHTML=nodes.map(n=>nodeSvg(n,!first&&!from[n.id])).join('');
  FX.vis={};for(const n of nodes)FX.vis[n.id]=[n.x,n.y];
  if(!first)glide(from);
  // first view of a plan: fit right away (before the first paint) when the stage already has a size
  if(!FX.fitted){FX.fitted=true;const r=$('#fx-svg').getBoundingClientRect();if(r.width&&r.height)fitView(false,true);else requestAnimationFrame(()=>fitView(false,true));}
  drawMini();
}
/* nodes whose position changed (re-layout, undo of a drag, recipe swap) glide from where they were */
function glide(from){
  if(reduceMotion)return;
  const flow=FX.sim.flow,mv=flow.nodes.filter(n=>{const p=from[n.id];return p&&(Math.abs(p[0]-n.x)>0.5||Math.abs(p[1]-n.y)>0.5);});
  if(!mv.length)return;
  const fr=mv.map(n=>from[n.id]),to=mv.map(n=>[n.x,n.y]),els=mv.map(n=>document.querySelector(`#fx-nodes .gnode[data-id="${CSS.escape(n.id)}"]`));
  const edgeEls=[...document.querySelectorAll('#fx-edges .edge')],t0=performance.now(),D=420;
  const frame=t=>{const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,3);
    mv.forEach((n,i)=>{n.x=fr[i][0]+(to[i][0]-fr[i][0])*e;n.y=fr[i][1]+(to[i][1]-fr[i][1])*e;FX.vis[n.id]=[n.x,n.y];if(els[i])els[i].setAttribute('transform',`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);});
    for(const el of edgeEls){const ed=flow.edges[+el.dataset.e];if(!ed)continue;const g=edgeGeom(ed,flow);for(const pth of el.querySelectorAll('path'))pth.setAttribute('d',g.d);const lb=el.querySelector('.elabel');if(lb)lb.setAttribute('transform',`translate(${g.mx.toFixed(1)} ${g.my.toFixed(1)})`);}
    if(p<1)FX.glideRaf=requestAnimationFrame(frame);else{FX.glideRaf=0;FX.glideEnd=null;}};
  FX.glideEnd=()=>{cancelAnimationFrame(FX.glideRaf);frame(t0+D);};
  frame(t0);
}
function finishGlide(){if(FX.glideEnd)FX.glideEnd();} // snap to the end (before a drag starts)
function stopGlide(){cancelAnimationFrame(FX.glideRaf);FX.glideRaf=0;FX.glideEnd=null;} // freeze where it is (a new render takes over)
const NX=n=>n.fx??n.x,NY=n=>n.fy??n.y; // final (post-animation) position
function bboxOf(nodes){if(!nodes.length)return null;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const n of nodes){const x=NX(n),y=NY(n);x0=Math.min(x0,x);y0=Math.min(y0,y-12);x1=Math.max(x1,x+n.w);y1=Math.max(y1,y+n.h+40);}return {x:x0,y:y0,w:x1-x0,h:y1-y0};}
/* readable=true (first open of a plan) keeps text legible and starts at the raw-material end;
   the 全体 button / F key passes false and shows the whole factory however small it gets */
function fitView(anim,readable){const b=bboxOf(FX.sim&&FX.sim.flow?FX.sim.flow.nodes:[]);if(!b)return;
  FX.vp.fit(b,isMobile()?24:56,1.15,readable?(isMobile()?0.62:0.72):0,!!anim);}
/* ---------- phone bottom sheet (shared by the factory and the layout inspectors) ---------- */
const SHEET={half:0.56,peek:64,top:48,dragT:0};
function sheetH(box,state){const H=box.parentElement.clientHeight;return state==='full'?H-SHEET.top:state==='half'?H*SHEET.half:SHEET.peek;}
function sheetState(box){return !box.classList.contains('open')?'closed':box.classList.contains('full')?'full':'half';}
function setSheet(box,state){
  box.classList.toggle('open',state!=='closed');box.classList.toggle('full',state==='full');
  if(box.id==='fx-insp')FX.inspOpen=state!=='closed';else LX.inspOpen=state!=='closed';
  if(state==='closed')box.scrollTop=0;
}
function toggleSheet(box){if(performance.now()-SHEET.dragT<450)return;setSheet(box,sheetState(box)==='closed'?'half':'closed');}
document.addEventListener('pointerdown',e=>{
  const h=e.target.closest&&e.target.closest('.fx-handle');if(!h||!isMobile())return;
  const box=h.closest('.fx-insp'),par=box.parentElement,pr=par.getBoundingClientRect(),H=par.clientHeight;
  const d={id:e.pointerId,sy:e.clientY,h0:box.offsetHeight,moved:false,last:[[performance.now(),e.clientY]]};
  const mv=ev=>{if(ev.pointerId!==d.id)return;const dy=ev.clientY-d.sy;if(!d.moved&&Math.abs(dy)<6)return;
    if(!d.moved){d.moved=true;box.classList.add('dragging','open');}
    d.h=Math.max(SHEET.peek,Math.min(H-SHEET.top,d.h0-dy));box.style.height=d.h+'px';d.last.push([performance.now(),ev.clientY]);if(d.last.length>5)d.last.shift();};
  const up=ev=>{if(ev.pointerId!==d.id)return;document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
    if(!d.moved)return;SHEET.dragT=performance.now();box.classList.remove('dragging');box.style.height='';
    const [t0,y0]=d.last[0],vel=(ev.clientY-y0)/Math.max(16,performance.now()-t0),aim=d.h-vel*220; // flicks carry on
    const snaps=[[SHEET.peek,'closed'],[H*SHEET.half,'half'],[H-SHEET.top,'full']];
    setSheet(box,snaps.reduce((a,b)=>Math.abs(b[0]-aim)<Math.abs(a[0]-aim)?b:a)[1]);
    if(box.id==='fx-insp'&&FX.sel&&FX.sel.type==='node'){const n=FX.sim.flow.byId[FX.sel.id];if(n)setTimeout(()=>ensureVisible(n),300);}};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
});
/* the part of the stage not covered by floating chrome (toolbar, phone tool column, bottom sheet) */
function visRect(){
  const st=$('#fx-stage'),W=st.clientWidth,H=st.clientHeight,mob=isMobile();let bottom=H;
  if(mob){const ins=$('#fx-insp'),fr=$('#fx').getBoundingClientRect(),sr=st.getBoundingClientRect();bottom=Math.max(H*0.25,fr.bottom-sheetH(ins,sheetState(ins))-sr.top);}
  return {x0:12,y0:mob?12:64,x1:W-(mob?60:12),y1:bottom-12};
}
function focusNode(n,anim=true){const r=visRect(),k=FX.vp.v.k;FX.vp.panTo((r.x0+r.x1)/2-(NX(n)+n.w/2)*k,(r.y0+r.y1)/2-(NY(n)+n.h/2)*k,anim);}
function ensureVisible(n){
  const r=visRect(),v=FX.vp.v,k=v.k,sx=NX(n)*k+v.x,sy=NY(n)*k+v.y,sw=n.w*k,sh=n.h*k;
  if(sw>r.x1-r.x0||sh>r.y1-r.y0){focusNode(n);return;}
  const dx=sx<r.x0?r.x0-sx:sx+sw>r.x1?r.x1-(sx+sw):0,dy=sy<r.y0?r.y0-sy:sy+sh>r.y1?r.y1-(sy+sh):0;
  if(dx||dy)FX.vp.panTo(v.x+dx,v.y+dy,true);
}
function updateEdgesOf(id){
  const flow=FX.sim.flow;
  document.querySelectorAll(`#fx-edges .edge[data-f="${CSS.escape(id)}"],#fx-edges .edge[data-t="${CSS.escape(id)}"]`).forEach(el=>{
    const e=flow.edges[+el.dataset.e];if(!e)return;const g=edgeGeom(e,flow);
    el.querySelectorAll('path').forEach(p=>p.setAttribute('d',g.d));
    el.querySelector('.elabel').setAttribute('transform',`translate(${g.mx.toFixed(1)} ${g.my.toFixed(1)})`);});
}

/* ---------- pointer interactions: drag nodes, scrub rates, select ---------- */
function fxDown(e){
  if(FX.vp.multi){FX.drag=null;return;}
  const g=e.target.closest('.gnode');
  if(g){if(e.pointerType==='mouse'&&e.button!==0)return;
    finishGlide();const n=FX.sim.flow.byId[g.dataset.id];if(!n)return;
    const scrub=!!e.target.closest('[data-scrub]');
    FX.drag={id:n.id,n,sx:e.clientX,sy:e.clientY,x0:n.x,y0:n.y,moved:false,scrub,rate0:scrub?targetRate(n.item):0,pid:e.pointerId};
    try{$('#fx-svg').setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();return;}
  const ed=e.target.closest('.edge');
  if(ed)FX.edgeDown={f:ed.dataset.f,t:ed.dataset.t,item:ed.dataset.item,x:e.clientX,y:e.clientY};
}
function fxMove(e){
  const d=FX.drag;
  if(!d){fxTip(e);return;}
  if(e.pointerId!==d.pid)return;
  if(FX.vp.multi){FX.drag=null;return;}
  const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
  if(!d.moved&&Math.hypot(dx,dy)<4)return;
  if(!d.moved){d.moved=true;$('#fx-svg').classList.add('dragging');snapshot();fxFocus(null);
    if(d.scrub){FX.sel={type:'node',id:d.id};}}
  if(d.scrub){setTargetRate(d.n.item,roundRate(d.rate0*Math.exp(dx/(e.shiftKey?700:160))));renderLive();return;}
  const k=FX.vp.v.k;let nx=d.x0+dx/k,ny=d.y0+dy/k;if(!e.altKey){nx=Math.round(nx/8)*8;ny=Math.round(ny/8)*8;}
  const n=FX.sim.flow.byId[d.id];if(!n)return;n.x=n.fx=nx;n.y=n.fy=ny;if(FX.vis)FX.vis[d.id]=[nx,ny];
  const el=document.querySelector(`#fx-nodes .gnode[data-id="${CSS.escape(d.id)}"]`);if(el)el.setAttribute('transform',`translate(${nx} ${ny})`);
  updateEdgesOf(d.id);
}
function fxUp(e){
  const d=FX.drag;
  if(d&&e.pointerId===d.pid){FX.drag=null;$('#fx-svg').classList.remove('dragging');
    if(!d.moved){select({type:'node',id:d.id});return;}
    if(d.scrub){save();renderFactory();renderMeter(FX.sim);return;}
    const n=FX.sim.flow.byId[d.id];if(n){S.cur.pos[d.id]=[n.x,n.y];save();drawMini();renderTools();}
    return;}
  const ed=FX.edgeDown;FX.edgeDown=null;
  if(ed&&Math.hypot(e.clientX-ed.x,e.clientY-ed.y)<5)select({type:'edge',f:ed.f,t:ed.t,item:ed.item});
}
function select(sel,noScroll){
  FX.sel=sel;applySel();renderInspector();renderOrders();
  if(sel&&sheetState($('#fx-insp'))==='closed')setSheet($('#fx-insp'),'half');
  if(!noScroll&&sel&&sel.type==='node'){const n=FX.sim.flow.byId[sel.id];if(n&&n.x!==undefined)requestAnimationFrame(()=>ensureVisible(n));}
}
function applySel(){
  document.querySelectorAll('#fx-svg .sel').forEach(el=>el.classList.remove('sel'));
  const s=FX.sel;if(!s)return;
  if(s.type==='node'){const el=document.querySelector(`#fx-nodes .gnode[data-id="${CSS.escape(s.id)}"]`);if(el)el.classList.add('sel');}
  else document.querySelectorAll(`#fx-edges .edge[data-f="${CSS.escape(s.f)}"][data-t="${CSS.escape(s.t)}"]`).forEach(el=>{if(el.dataset.item===s.item)el.classList.add('sel');});
}
function fxFocus(id){
  const svg=$('#fx-svg');svg.querySelectorAll('.on').forEach(e=>e.classList.remove('on'));
  if(!id||FX.drag){svg.classList.remove('focus');return;}
  svg.classList.add('focus');
  const me=svg.querySelector(`.gnode[data-id="${CSS.escape(id)}"]`);if(me)me.classList.add('on');
  svg.querySelectorAll('.edge').forEach(el=>{if(el.dataset.f===id||el.dataset.t===id){el.classList.add('on');
    const o=svg.querySelector(`.gnode[data-id="${CSS.escape(el.dataset.f===id?el.dataset.t:el.dataset.f)}"]`);if(o)o.classList.add('on');}});
}
function fxHover(e){if(FX.drag)return;const g=e.target.closest('.gnode');if(g)fxFocus(g.dataset.id);}
function fxTip(e){
  const tip=$('#fx-tip'),ed=e.target.closest&&e.target.closest('.edge');
  if(!ed||e.pointerType==='touch'){tip.hidden=true;return;}
  const x=FX.sim.flow.edges[+ed.dataset.e];if(!x){tip.hidden=true;return;}
  tip.innerHTML=`${esc(nm(x.item))} <b>${fmt(x.rate,1)} ${unit(x.item)}/分</b> <span class="muted">${esc(x.belt.label)}</span>`;tip.hidden=false;
  const r=$('#fx-stage').getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+12)+'px';
}

/* ---------- mini map ---------- */
function drawMini(){
  const mm=$('#fx-mini');if(!mm||!FX.sim||!FX.sim.flow)return;
  const nodes=FX.sim.flow.nodes;if(!nodes.length||nodes.some(n=>n.x===undefined)){mm.innerHTML='';return;}
  const b=bboxOf(nodes),W=200,H=128,s=Math.min((W-16)/b.w,(H-16)/b.h),ox=(W-b.w*s)/2-b.x*s,oy=(H-b.h*s)/2-b.y*s;
  const r=$('#fx-stage').getBoundingClientRect(),v=FX.vp.v;
  const vx=(-v.x/v.k)*s+ox,vy=(-v.y/v.k)*s+oy,vw=r.width/v.k*s,vh=r.height/v.k*s;
  mm.setAttribute('viewBox',`0 0 ${W} ${H}`);
  /* dim what is off-screen and outline the visible window (clipped to the map) */
  const x0=Math.max(1,vx),y0=Math.max(1,vy),x1=Math.min(W-1,vx+vw),y1=Math.min(H-1,vy+vh),seen=x1>x0&&y1>y0;
  const all=seen&&x0<=1&&y0<=1&&x1>=W-1&&y1>=H-1;
  mm.innerHTML=nodes.map(n=>`<rect x="${(NX(n)*s+ox).toFixed(1)}" y="${(NY(n)*s+oy).toFixed(1)}" width="${Math.max(2,n.w*s).toFixed(1)}" height="${Math.max(2,n.h*s).toFixed(1)}" rx="1.5" fill="${itemColor(n.item)}"/>`).join('')
    +(all?'':`<path class="shade" fill-rule="evenodd" d="M0,0H${W}V${H}H0Z${seen?`M${x0.toFixed(1)},${y0.toFixed(1)}V${y1.toFixed(1)}H${x1.toFixed(1)}V${y0.toFixed(1)}Z`:''}"/>`)
    +(seen&&!all?`<rect class="vw" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1-x0).toFixed(1)}" height="${(y1-y0).toFixed(1)}" rx="3"/>`:'');
  FX.mini={s,ox,oy};
}
function miniDown(e){
  const mm=$('#fx-mini');const go=ev=>{const r=mm.getBoundingClientRect(),m=FX.mini;if(!m)return;const px=(ev.clientX-r.left)*200/r.width,py=(ev.clientY-r.top)*128/r.height;FX.vp.center((px-m.ox)/m.s,(py-m.oy)/m.s,false);};
  go(e);try{mm.setPointerCapture(e.pointerId);}catch(_){}
  const mv=ev=>go(ev),up=()=>{mm.removeEventListener('pointermove',mv);mm.removeEventListener('pointerup',up);};
  mm.addEventListener('pointermove',mv);mm.addEventListener('pointerup',up);
}

/* ---------- status bar ---------- */
function renderStatus(){
  const s=FX.sim,el=$('#fx-status');if(!el)return;
  if(s.error){el.innerHTML=`<span class="st-k">計算できません</span>`;return;}
  const g=s.gen;
  el.innerHTML=`<button type="button" class="st" data-fxa="desel"><span class="st-k">消費電力</span><b class="num">${fmt(s.power,0)}</b><small>MW</small><span class="gauge st-g">${gaugeSegs(s)}</span></button>`
    +(g?`<span class="st"><span class="st-k">発電</span><b class="num">${Math.ceil(g.n-1e-9)}</b><small>${esc(mn(g.id))}</small></span>`:'')
    +`<span class="st"><span class="st-k">装置</span><b class="num">${fmt(s.machines,0)}</b><small>台</small></span>`
    +`<span class="st"><span class="st-k">原料</span><b class="num">${fmt(s.rawTotal,0)}</b><small>/分</small></span>`
    +`<span class="st"><span class="st-k">資源比率</span><b class="num">${fmt(s.score,2)}</b><small>%</small></span>`
    +(s.shards?`<span class="st"><span class="st-k">シャード</span><b class="num">${s.shards}</b></span>`:'')
    +(s.sloops?`<span class="st"><span class="st-k">ソマーループ</span><b class="num">${s.sloops}</b></span>`:'')
    +(s.warns.length?`<button type="button" class="st warn" data-fxa="warns">${ICON.warn}<b>${s.warns.length}</b><small>件の注意</small></button>`:`<span class="st ok"><small>問題なし</small></span>`);
}

/* ---------- inspector ---------- */
function peek(){const s=FX.sim;if(!s||s.error)return '';return `<span class="num">${fmt(s.power,0)}</span> MW ・ 装置 <span class="num">${fmt(s.machines,0)}</span> 台 ・ 原料 <span class="num">${fmt(s.rawTotal,0)}</span>/分${s.warns.length?` ・ <span class="bad">注意 ${s.warns.length}</span>`:''}`;}
function renderInspector(){
  const box=$('#fx-insp'),s=FX.sim;if(!box)return;
  let body='',title='計画の概要';
  if(s.error)body=`<div class="ins-sec"><p class="bad">${esc(s.error)}</p><button class="btn" type="button" data-fx="undo">元に戻す</button></div>`;
  else if(FX.sel&&FX.sel.type==='edge'){const e=s.flow.edges.find(x=>x.from===FX.sel.f&&x.to===FX.sel.t&&x.item===FX.sel.item);if(e){title='ベルト';body=inspEdge(e,s);}else FX.sel=null;}
  else if(FX.sel&&FX.sel.type==='node'){const n=s.flow.byId[FX.sel.id];if(n){title=n.type==='gen'?'発電所':nm(n.item);body=({line:inspLine,in:inspIn,out:inspOut,sur:inspSur,gen:inspGen})[n.type](n,s);}else FX.sel=null;}
  if(!body)body=inspSummary(s);
  box.innerHTML=`<button class="fx-handle" type="button" data-fxa="sheet" aria-label="詳細パネルを開閉"><i></i><span class="pk-t">${esc(title)}</span><span class="pk-s">${peek()}</span></button><div class="ins-body">${body}</div>`;
  box.classList.toggle('open',FX.inspOpen);
}
const delta=(v,unitS,d=0,inv=false)=>{if(Math.abs(v)<Math.pow(10,-d)/2)return `<span class="dl z">±0${unitS}</span>`;const good=inv?v>0:v<0;return `<span class="dl ${good?'g':'b'}">${v>0?'+':'−'}${fmt(Math.abs(v),d)}${unitS}</span>`;};
function head(it,t,sub,extra=''){return `<div class="ins-head">${it?glyph(it,'l'):`<span class="gl l" style="--c:var(--r-sulfur)">${ICON.power}</span>`}<div class="ih-t"><h2>${esc(t)}</h2>${sub?`<p>${sub}</p>`:''}</div><button class="ibtn" type="button" data-fxa="desel" aria-label="選択を解除">${ICON.close}</button></div>${extra}`;}
function stats(cells){return `<div class="ins-stats">${cells.map(([k,v,u])=>`<div><span>${k}</span><b class="num">${v}</b>${u?`<small>${u}</small>`:''}</div>`).join('')}</div>`;}
function jump(it){return `<div class="ins-links">${producible(it)?`<button class="btn sm ghost" type="button" data-totree="${it}" data-q="${Math.max(1,Math.round(targetRate(it)||10))}">${ICON.tree}部材ツリー</button><button class="btn sm ghost" type="button" data-cmpitem="${it}">${ICON.bars}レシピ比較</button>`:''}<button class="btn sm ghost" type="button" data-item="${it}">${ICON.box}アイテム詳細</button></div>`;}

function inspSummary(s){
  const P=S.cur,g=s.gen,by=powerByMachine(s);
  const pw=`<section class="ins-sec"><h3>電力</h3><div class="ins-big"><b class="num">${fmt(s.power,0)}</b><small>MW</small></div><div class="gauge">${gaugeSegs(s)}</div>
    <ul class="legend-l">${[...MACH_ORDER,'__ex'].filter(m=>by[m]).map(m=>`<li><i style="background:${m==='__ex'?'var(--faint)':MCOL[m]}"></i>${esc(m==='__ex'?'採掘':mn(m))}<span class="num">${fmt(by[m],0)}</span></li>`).join('')}</ul>
    <label class="sw"><input type="checkbox" data-set="power"${P.power.on?' checked':''}> 発電所も計画に含める（電力を自給する）</label>
    ${P.power.on?`<div class="row" style="margin-top:8px"><div class="field" style="flex:1 1 140px"><label for="pw-gen">発電機</label><select id="pw-gen" data-set="gen">${GEN_ORDER.map(k=>`<option value="${k}"${k===P.power.gen?' selected':''}>${esc(mn(k))}</option>`).join('')}</select></div>
      <div class="field" style="flex:1 1 140px"><label for="pw-fuel">燃料</label><select id="pw-fuel" data-set="fuel">${G[P.power.gen].f.filter(f=>I[f]&&I[f].e>0).map(f=>`<option value="${f}"${f===P.power.fuel?' selected':''}>${esc(nm(f))}</option>`).join('')}</select></div></div>
      ${g?`<p class="note" style="margin-top:6px">${esc(mn(g.id))} <b>${Math.ceil(g.n-1e-9)}</b> 台（${fmt(g.n,2)} 台分）・ ${esc(nm(g.fuel))} ${fmt(g.fuelRate,2)} ${unit(g.fuel)}/分${g.water?` ・ 水 ${fmt(g.water,1)} m³/分`:''}${g.waste?` ・ ${esc(nm(g.waste[0]))} ${fmt(g.waste[1],2)}/分`:''}</p>`:''}`:''}</section>`;
  const raws=Object.entries(s.res.inputs).sort((a,b)=>(isRaw(b[0])-isRaw(a[0]))||RAW_ORDER.indexOf(a[0])-RAW_ORDER.indexOf(b[0]));
  const rw=`<section class="ins-sec"><h3>原料<small>上限を入れると、その範囲で作れる量を計算できます</small></h3><div class="lim-list">${raws.map(([it,a])=>{const cap=+P.limits[it]||0,ratio=cap?a/cap:0,e=s.ex.info[it];
    return `<div class="lim${ratio>1+1e-6?' over':''}"><div class="lim-h">${glyph(it,'s')}<button type="button" class="ilink" data-fxa="selnode" data-id="I:${it}">${esc(nm(it))}</button><b class="num">${fmt(a,1)}</b><small>${unit(it)}/分</small></div>
      ${isRaw(it)?`<div class="lim-r">${cap?`<span class="bar"><i style="width:${Math.min(100,ratio*100)}%;--c:${ratio>1+1e-6?'var(--bad)':itemColor(it)}"></i></span>`:'<span class="bar nolim"></span>'}<input type="number" min="0" step="any" placeholder="上限" value="${cap||''}" data-limit="${it}" aria-label="${esc(nm(it))}の上限（1分あたり）"></div>
      <small class="muted">${e?`${esc(e.mach)} ${fmt(Math.ceil(e.n-1e-9),0)} 台`:''}${cap?` ・ 上限の ${fmt(ratio*100,0)}%`:WORLD[it]?` ・ マップの ${fmt(a/WORLD[it]*100,2)}%`:''}</small>`:`<small class="muted">外部から搬入</small>`}</div>`;}).join('')}</div>
    ${s.lim.length?`<button class="btn sm pri" type="button" data-fxa="maximize">上限いっぱいまで生産量を合わせる</button>`:''}</section>`;
  const sur=Object.entries(s.res.surplus);
  const sp=sur.length?`<section class="ins-sec"><h3>余剰・副産物</h3>${sur.map(([it,a])=>`<div class="kv">${glyph(it,'s')}<button type="button" class="ilink" data-fxa="selnode" data-id="S:${it}">${esc(nm(it))}</button><span class="num">${fmt(a,2)}</span><small>${unit(it)}/分</small></div>`).join('')}</section>`:'';
  const wn=s.warns.length?`<section class="ins-sec" id="ins-warns"><h3>注意</h3><ul class="warns">${s.warns.map(w=>`<li><button type="button" data-fxa="selnode" data-id="${w.id}">${ICON.warn}<span>${esc(w.msg)}</span></button></li>`).join('')}</ul></section>`:'';
  const st=`<section class="ins-sec"><h3>条件</h3><div class="grid2">
    <div class="field"><label for="set-miner">採鉱機</label><select id="set-miner" data-set="miner">${['Desc_MinerMk1_C','Desc_MinerMk2_C','Desc_MinerMk3_C'].map(k=>`<option value="${k}"${k===P.miner?' selected':''}>${esc(mn(k))}</option>`).join('')}</select></div>
    <div class="field"><label for="set-pur">ノード純度</label><select id="set-pur" data-set="purity">${[[0.5,'不純'],[1,'普通'],[2,'純粋']].map(([v,l])=>`<option value="${v}"${+v===+P.purity?' selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="set-belt">使えるベルト</label><select id="set-belt" data-set="belt">${[1,2,3,4,5,6].map(i=>`<option value="${i}"${i===P.belt?' selected':''}>Mk.${i}（${BELT[i]}/分）</option>`).join('')}</select></div>
    <div class="field"><label for="set-pipe">使えるパイプ</label><select id="set-pipe" data-set="pipe">${[1,2].map(i=>`<option value="${i}"${i===P.pipe?' selected':''}>Mk.${i}（${PIPE[i]} m³/分）</option>`).join('')}</select></div></div>
    <label class="sw" style="margin-top:8px"><input type="checkbox" data-set="expow"${P.expow?' checked':''}> 採掘の電力を含める</label></section>`;
  const ln=`<section class="ins-sec"><details><summary>生産ラインの明細（${s.lines.length}）</summary><div class="tbl" style="margin-top:8px"><table><thead><tr><th>アイテム</th><th class="n">台数</th><th class="n">クロック</th><th class="n">MW</th></tr></thead><tbody>${s.lines.map(l=>`<tr><td><button type="button" class="ilink" data-fxa="selnode" data-id="L:${l.item}">${esc(nm(l.item))}</button><span class="sub">${esc(mn(l.m))}</span></td><td class="n num">${l.n}</td><td class="n">${Math.round(l.c*100)}%</td><td class="n">${fmt(l.power,1)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
  return `<div class="ins-head"><div class="ih-t"><h2>計画の概要</h2><p>ノードやベルトを選ぶと、ここで詳しく設定できます。</p></div></div>`
    +stats([['装置',fmt(s.machines,0),'台'],['原料',fmt(s.rawTotal,0),'/分'],['資源比率',fmt(s.score,2),'%'],['シャード / ソマーループ',`${s.shards} / ${s.sloops}`,'']])+wn+pw+rw+sp+st+ln;
}
function altOptions(it){
  const key=JSON.stringify(S.cur)+'|'+it+'|'+JSON.stringify(S.pref)+'|'+JSON.stringify(S.unl);
  if(FX.alt.key===key)return FX.alt.list;
  const base=FX.sim,cur=effRecipe(it,S.cur.over)||'',def=effRecipe(it,{})||'';
  const rids=[...(producers[it]||[]).filter(r=>!/^Unpackage/.test(R[r].n)),''];
  const list=rids.map(rid=>{
    const Q=JSON.parse(JSON.stringify(S.cur));if(rid===def)delete Q.over[it];else Q.over[it]=rid;
    const s=rid===cur?base:simulate(Q);if(s.error)return {rid,error:s.error,cur:rid===cur};
    const raws={};for(const k of new Set([...Object.keys(s.res.inputs),...Object.keys(base.res.inputs)]))if(isRaw(k)&&k!=='Desc_Water_C'){const dv=(s.res.inputs[k]||0)-(base.res.inputs[k]||0);if(Math.abs(dv)>0.05)raws[k]=dv;}
    const ext=Object.keys(s.res.inputs).filter(k=>!isRaw(k)).length;
    return {rid,cur:rid===cur,s,d:{power:s.power-base.power,score:s.score-base.score,machines:s.machines-base.machines},raws,ext};});
  FX.alt={key,list};return list;
}
function recipeCards(it){
  const list=altOptions(it);
  return `<div class="rc-list">${list.map(o=>{
    if(o.error)return `<div class="rc dis"><b>${o.rid?esc(rn(o.rid)):'外部から搬入する'}</b><small class="bad">この組み合わせでは計算できません</small></div>`;
    const r=o.rid?R[o.rid]:null,lock=o.rid&&isLocked(o.rid);
    const io=r?`<div class="rc-io">${r.i.map(([x,a])=>`${esc(nm(x))} ${fmt(perMin(r,a))}`).join(' + ')} → ${r.o.map(([x,a])=>`${esc(nm(x))} ${fmt(perMin(r,a))}`).join(' + ')}</div>`:'<div class="rc-io">別の工場から運び込む扱いにします</div>';
    const rd=Object.entries(o.raws).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,3).map(([k,v])=>`<span class="dl ${v<0?'g':'b'}">${esc(nm(k))} ${v>0?'+':'−'}${fmt(Math.abs(v),0)}</span>`).join('');
    return `<button type="button" class="rc${o.cur?' cur':''}${lock?' locked':''}" data-fxa="recipe" data-it="${it}" data-rid="${o.rid}"${o.cur?' aria-current="true"':''}>
      <span class="rc-t"><b>${o.rid?esc(rn(o.rid)):'外部から搬入する'}</b>${o.cur?'<span class="pill p-good">使用中</span>':''}${r&&r.a?(lock?'<span class="pill p-bad">未解禁</span>':'<span class="pill p-alt">代替</span>'):''}</span>
      ${r?`<span class="rc-m">${esc(mn(r.m))} ・ ${fmt(r.p)} MW/台</span>`:''}${io}
      ${o.cur?'':`<span class="rc-d">${delta(o.d.power,' MW')}${delta(o.d.score,'%',3)}${delta(o.d.machines,'台')}${rd}${o.ext>(Object.keys(FX.sim.res.inputs).filter(k=>!isRaw(k)).length)?'<span class="dl b">搬入品が増える</span>':''}</span>`}</button>`;}).join('')}</div>`;
}
function ioRows(sim,id){
  const ins=sim.flow.edges.filter(e=>e.to===id),outs=sim.flow.edges.filter(e=>e.from===id);
  const row=(e,other)=>`<button type="button" class="io-r" data-fxa="seledge" data-f="${e.from}" data-t="${e.to}" data-item="${e.item}">${glyph(e.item,'s')}<span class="io-n">${esc(nm(e.item))}<small>${esc(other)}</small></span><b class="num">${fmt(e.rate,e.rate<10?2:1)}</b><span class="pill ${e.belt.over?'p-bad':'p-std'}">${esc(e.belt.label)}</span></button>`;
  const name=nid=>{const n=sim.flow.byId[nid];if(!n)return '';return n.type==='in'?(isRaw(n.item)?'採掘':'搬入'):n.type==='out'?'出荷':n.type==='sur'?'余剰':n.type==='gen'?'発電所':nm(n.item)+'のライン';};
  return (ins.length?`<h4>入ってくるもの</h4>${ins.map(e=>row(e,'← '+name(e.from))).join('')}`:'')+(outs.length?`<h4>出ていくもの</h4>${outs.map(e=>row(e,'→ '+name(e.to))).join('')}`:'');
}
function inspLine(n,s){
  const l=n.line,r=R[n.rid],it=n.item,P=S.cur,fixed=l.fixed,setC=fixed?l.clkSet:l.c,clkV=Math.round(Math.max(setC,0.01)*1000)/10;
  const runs=l.n===1?`1 台を ${fmt(l.cLast*100,1)}%`:Math.abs(l.cLast-l.c)>1e-6?`${l.n} 台（${l.n-1} 台を ${fmt(l.c*100,1)}%、最後の1台を ${fmt(l.cLast*100,1)}%）`:`${l.n} 台をすべて ${fmt(l.c*100,1)}%`;
  const clk=`<section class="ins-sec"><h3>クロック</h3><div class="seg" role="group" aria-label="クロックの決め方"><button type="button" data-fxa="clkmode" data-m="auto" aria-pressed="${!fixed}">均等に下げる（自動）</button><button type="button" data-fxa="clkmode" data-m="fixed" aria-pressed="${fixed}">固定する</button></div>
    ${fixed?`<div class="clk"><input type="range" min="1" max="250" step="1" value="${Math.round(setC*100)}" data-clkr="${it}" aria-label="クロック（%）"><input type="number" min="1" max="250" step="0.1" value="${clkV}" data-clk="${it}" aria-label="クロック（%）"><span>%</span></div>
      <div class="chips">${[50,100,150,200,250].map(v=>`<button type="button" class="chip plain" data-fxa="clkset" data-v="${v}" aria-pressed="${Math.round(setC*100)===v}">${v}%</button>`).join('')}</div>`:''}
    <p class="note">${runs}で稼働。${fixed&&l.n===1&&l.cLast<setC-1e-6?`必要な量が少ないため、設定（${fmt(setC*100,1)}%）より低いクロックで足ります。`:''}${l.shards?`パワーシャード ${l.shards} 個が必要です。`:''}電力はクロックの1.32乗で変わります。</p></section>`;
  const amp=l.slots?`<section class="ins-sec"><h3>ソマーループ<small>1台あたりのスロット ${l.slots}</small></h3><div class="seg" role="group" aria-label="ソマーループの数">${Array.from({length:l.slots+1},(_,i)=>`<button type="button" data-fxa="amp" data-v="${i}" aria-pressed="${l.fill===i}">${i}</button>`).join('')}</div>
    <p class="note">${l.fill?`出力 ×${fmt(l.A,2)}（入力は変わりません）・ 電力 ×${fmt(l.A*l.A,2)} ・ 合計 ${l.sloops} 個`:'スロットを埋めると、同じ入力のまま出力が最大2倍になります。電力は (1+埋めた数/スロット数)² 倍です。'}</p></section>`:'';
  const fitc=`<section class="ins-sec"><h3>台数から逆算</h3><div class="row"><span class="small">このラインを</span><input type="number" min="1" step="1" value="${l.n}" id="fitn" aria-label="装置の台数" style="width:80px"><span class="small">台にしたら</span><button class="btn sm" type="button" data-fxa="fitcount" data-it="${it}">計画全体を合わせる</button></div><p class="note">出荷量をまとめて増減して、この装置が指定の台数で足りるようにします。</p></section>`;
  return head(it,nm(it),`${esc(rn(n.rid))} ・ ${esc(mn(r.m))}`)
    +stats([['台数','×'+l.n,`稼働換算 ${fmt(l.x,2)}`],['生産',fmt(l.outRate,l.outRate<10?2:1),unit(it)+'/分'],['電力',fmt(l.power,1),'MW'],['クロック',fmt(l.c*100,1),'%']])
    +`<section class="ins-sec"><h3>レシピ<small>選ぶと工場全体を計算し直します。数字は工場全体の増減</small></h3>${recipeCards(it)}</section>`
    +clk+amp+`<section class="ins-sec io">${ioRows(s,n.id)}</section>`+fitc+jump(it);
}
function inspIn(n,s){
  const it=n.item,raw=isRaw(it),e=s.ex.info[it],cap=+S.cur.limits[it]||0,ratio=cap?n.amt/cap:0;
  let body='';
  if(raw){body=`<section class="ins-sec"><h3>採掘</h3>${e?`<p>${esc(e.mach)} <b class="num">${Math.ceil(e.n-1e-9)}</b> 台（${fmt(e.n,2)} 台分）${e.p?` ・ ${fmt(e.p,1)} MW`:''}</p>`:''}
      ${WORLD[it]?`<p class="note">マップ全体の最大採掘量 ${fmt(WORLD[it],0)}/分 の ${fmt(n.amt/WORLD[it]*100,2)}% です。</p>`:''}
      <div class="field"><label for="lim-in">上限（1分あたり）</label><div class="row"><input type="number" id="lim-in" min="0" step="any" value="${cap||''}" placeholder="なし" data-limit="${it}" style="flex:1">${cap?`<span class="pill ${ratio>1?'p-bad':'p-good'}">${fmt(ratio*100,0)}%</span>`:''}</div></div>
      ${cap?`<button class="btn sm pri" type="button" data-fxa="maximize" style="margin-top:8px">上限いっぱいまで生産量を合わせる</button>`:''}</section>`;}
  else{body=`<section class="ins-sec"><h3>工場の中で作る</h3><p class="note">今は外部から運び込む扱いです。レシピを選ぶと、この工場で作るように変わります。</p>${recipeCards(it)}</section>`;}
  return head(it,nm(it),raw?'採掘する原料':'外部から搬入')+stats([['必要量',fmt(n.amt,n.amt<10?2:1),unit(it)+'/分'],[raw?'採掘装置':'搬入元',raw&&e?Math.ceil(e.n-1e-9):'—',raw&&e?'台':'']])+body+`<section class="ins-sec io">${ioRows(s,n.id)}</section>`+jump(it);
}
function inspOut(n,s){
  const it=n.item,v=targetRate(it);
  return head(it,nm(it),'出荷するもの')
    +`<section class="ins-sec"><h3>1分あたりの出荷量</h3><div class="rate-ed"><button type="button" class="ibtn" data-fxa="rate" data-it="${it}" data-f="0.5" aria-label="半分にする">÷2</button><button type="button" class="ibtn" data-fxa="rate" data-it="${it}" data-f="0.9" aria-label="10%減らす">${ICON.minus}</button>
      <input type="number" min="0" step="any" value="${v}" data-trate="${it}" aria-label="1分あたりの出荷量"><span class="u">${unit(it)}/分</span>
      <button type="button" class="ibtn" data-fxa="rate" data-it="${it}" data-f="1.1" aria-label="10%増やす">${ICON.plus}</button><button type="button" class="ibtn" data-fxa="rate" data-it="${it}" data-f="2" aria-label="2倍にする">×2</button></div>
      <p class="note">キャンバスの数字を左右にドラッグしても調整できます（Shiftで細かく）。</p></section>`
    +`<section class="ins-sec io">${ioRows(s,n.id)}</section>`
    +`<section class="ins-sec"><button class="btn sm" type="button" data-fxa="deltargetit" data-it="${it}">${ICON.close}出荷から外す</button></section>`+jump(it);
}
function inspSur(n,s){
  const it=n.item;
  return head(it,nm(it),'余剰・副産物')+stats([['余る量',fmt(n.amt,2),unit(it)+'/分'],['シンク',I[it].l?'—':fmt(n.amt*I[it].s,0),I[it].l?'':'pt/分']])
    +`<section class="ins-sec"><p class="note">${I[it].l?'液体はAWESOMEシンクに入れられません。別の用途か、液体を包装して処理する方法を考えましょう。':'AWESOMEシンクに送るとクーポンのポイントになります。'}</p><button class="btn sm" type="button" data-fxa="tosur" data-it="${it}" data-v="${n.amt}">出荷品として扱う</button></section>`
    +`<section class="ins-sec io">${ioRows(s,n.id)}</section>`+jump(it);
}
function inspGen(n,s){
  const g=n.gen,P=S.cur;
  return head(null,'発電所',`${esc(mn(g.id))} ・ ${esc(nm(g.fuel))}`)
    +stats([['発電機',Math.ceil(g.n-1e-9),`台（${fmt(g.n,2)} 台分）`],['発電',fmt(g.mw,0),'MW'],['燃料',fmt(g.fuelRate,2),unit(g.fuel)+'/分'],['水',g.water?fmt(g.water,1):'—',g.water?'m³/分':'']])
    +`<section class="ins-sec"><div class="grid2"><div class="field"><label for="g-gen">発電機</label><select id="g-gen" data-set="gen">${GEN_ORDER.map(k=>`<option value="${k}"${k===P.power.gen?' selected':''}>${esc(mn(k))}</option>`).join('')}</select></div>
      <div class="field"><label for="g-fuel">燃料</label><select id="g-fuel" data-set="fuel">${G[P.power.gen].f.filter(f=>I[f]&&I[f].e>0).map(f=>`<option value="${f}"${f===P.power.fuel?' selected':''}>${esc(nm(f))}</option>`).join('')}</select></div></div>
      <p class="note">工場の消費電力（採掘を含む）をすべてこの発電所でまかなう前提で、燃料の生産ラインまで含めて計算しています。発電機の出力と燃料消費はクロックに比例します。</p>
      ${g.waste?`<p class="note">${esc(nm(g.waste[0]))} が ${fmt(g.waste[1],2)}/分 出ます。</p>`:''}
      <button class="btn sm" type="button" data-fxa="poweroff">発電所を計画から外す</button></section>`+`<section class="ins-sec io">${ioRows(s,n.id)}</section>`;
}
function inspEdge(e,s){
  const rows=(e.belt.fluid?PIPE:BELT).map((c,i)=>i?`<tr${i===e.belt.tier&&!e.belt.over?' class="hl"':''}><td>${e.belt.fluid?'パイプ':'ベルト'} Mk.${i}</td><td class="n">${fmt(c,0)}</td><td class="n">${Math.ceil(e.rate/c-1e-9)} 本</td><td class="n">${fmt(Math.min(100,e.rate/c*100),0)}%</td></tr>`:'').join('');
  const nameOf=id=>{const n=s.flow.byId[id];if(!n)return '';return n.type==='gen'?'発電所':n.type==='in'?(isRaw(n.item)?nm(n.item)+'（採掘）':nm(n.item)+'（搬入）'):n.type==='out'?nm(n.item)+'（出荷）':n.type==='sur'?nm(n.item)+'（余剰）':nm(n.item)+'のライン';};
  return head(e.item,nm(e.item),`${esc(nameOf(e.from))} → ${esc(nameOf(e.to))}`)
    +stats([['流量',fmt(e.rate,e.rate<10?2:1),unit(e.item)+'/分'],['必要な'+(e.belt.fluid?'パイプ':'ベルト'),e.belt.label.replace('パイプ',''),e.belt.over?'上限を超えています':'']])
    +`<section class="ins-sec"><h3>${e.belt.fluid?'パイプ':'ベルト'}ごとの本数<small>使える上限: Mk.${e.belt.fluid?S.cur.pipe:S.cur.belt}</small></h3><div class="tbl"><table><thead><tr><th>種類</th><th class="n">上限/分</th><th class="n">本数</th><th class="n">使用率</th></tr></thead><tbody>${rows}</tbody></table></div></section>`
    +`<section class="ins-sec"><div class="row"><button class="btn sm" type="button" data-fxa="selnode" data-id="${e.from}">送る側を見る</button><button class="btn sm" type="button" data-fxa="selnode" data-id="${e.to}">受ける側を見る</button></div></section>`;
}

/* ---------- actions ---------- */
function setRecipe(it,rid){const def=effRecipe(it,{})||'';mut(()=>{if(rid===def)delete S.cur.over[it];else S.cur.over[it]=rid;});}
function fxClick(e){
  const b=e.target.closest('[data-fx],[data-fxa]');if(!b||b.disabled)return;
  const a=b.dataset.fx||b.dataset.fxa,it=b.dataset.it;
  switch(a){
    case 'undo':undo();break;
    case 'redo':redo();break;
    case 'arrange':mut(()=>{S.cur.pos={};});FX.topo='';requestAnimationFrame(()=>fitView(true));toast('ノードを自動で並べ直しました',{label:'元に戻す',fn:undo});break;
    case 'fit':fitView(true);break;
    case 'zin':FX.vp.zoomBy(1.25);break;
    case 'zout':FX.vp.zoomBy(0.8);break;
    case 'power':mut(()=>{S.cur.power.on=!S.cur.power.on;});toast(S.cur.power.on?'発電所を計画に含めました（燃料の生産まで計算します）':'発電所を計画から外しました');if(S.cur.power.on)select({type:'node',id:'G:power'});break;
    case 'poweroff':mut(()=>{S.cur.power.on=false;});FX.sel=null;renderInspector();break;
    case 'opt':openOptimizer();break;
    case 'layout':go('layout');break;
    case 'addtarget':openPal('add');break;
    case 'deltarget':{const i=+b.dataset.i,x=S.cur.targets[i];if(!x)break;mut(()=>S.cur.targets.splice(i,1));if(FX.sel&&FX.sel.id==='O:'+x.item){FX.sel=null;renderInspector();}toast(`${nm(x.item)} を出荷から外しました`,{label:'元に戻す',fn:undo});break;}
    case 'deltargetit':{mut(()=>{S.cur.targets=S.cur.targets.filter(x=>x.item!==it);});FX.sel=null;renderInspector();toast(`${nm(it)} を出荷から外しました`,{label:'元に戻す',fn:undo});break;}
    case 'seltarget':case 'selnode':{const id=b.dataset.id;select({type:'node',id},true);const n=FX.sim.flow.byId[id];if(n&&n.x!==undefined)requestAnimationFrame(()=>focusNode(n));break;}
    case 'seledge':select({type:'edge',f:b.dataset.f,t:b.dataset.t,item:b.dataset.item});break;
    case 'desel':FX.sel=null;applySel();renderInspector();renderOrders();break;
    case 'sheet':toggleSheet($('#fx-insp'));break;
    case 'warns':FX.sel=null;FX.inspOpen=true;applySel();renderInspector();setTimeout(()=>{const w=$('#ins-warns');w&&w.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});},30);break;
    case 'recipe':{const rid=b.dataset.rid,cur=effRecipe(it,S.cur.over)||'';if(rid===cur)break;setRecipe(it,rid);toast(`${nm(it)}を「${rid?rn(rid):'外部から搬入'}」に変えました`,{label:'元に戻す',fn:undo});
      if(!rid)FX.sel={type:'node',id:'I:'+it};else if(FX.sel&&FX.sel.id==='I:'+it)FX.sel={type:'node',id:'L:'+it};renderInspector();applySel();break;}
    case 'clkmode':{const l=FX.sim.lineBy[FX.sel&&FX.sel.id.slice(2)];if(!l)break;mut(()=>{if(b.dataset.m==='auto')delete S.cur.clk[l.item];else S.cur.clk[l.item]=Math.min(250,Math.max(1,Math.round(l.c*1000)/10||100));});break;}
    case 'clkset':{const l=FX.sim.lineBy[FX.sel&&FX.sel.id.slice(2)];if(!l)break;mut(()=>{S.cur.clk[l.item]=+b.dataset.v;});break;}
    case 'amp':{const l=FX.sim.lineBy[FX.sel&&FX.sel.id.slice(2)];if(!l)break;const v=+b.dataset.v;mut(()=>{if(v)S.cur.amp[l.item]=v;else delete S.cur.amp[l.item];});break;}
    case 'rate':{const v=roundRate(targetRate(it)*+b.dataset.f);mut(()=>setTargetRate(it,v));break;}
    case 'tosur':{const v=roundRate(+b.dataset.v);mut(()=>{S.cur.targets.push({item:it,rate:v});});FX.sel={type:'node',id:'O:'+it};renderFactory();toast(`${nm(it)} を出荷品に加えました`,{label:'元に戻す',fn:undo});break;}
    case 'maximize':{let ok=false;mut(()=>{ok=!!maximizeToLimits(S.cur);});toast(ok?'原料の上限に合わせて出荷量を調整しました':'上限のある原料が使われていません',ok?{label:'元に戻す',fn:undo}:null);break;}
    case 'fitcount':{const want=Math.round(+(($('#fitn')||{}).value));if(!FX.sim.lineBy[it]||!(want>0))break;
      mut(()=>{for(let k=0;k<5;k++){const sim=simulate(S.cur),l2=sim.lineBy&&sim.lineBy[it];if(!l2)break;const s=want*(l2.fixed?l2.clkSet:1)/l2.x;if(Math.abs(s-1)<1e-7)break;S.cur.targets.forEach(x=>x.rate=+((+x.rate)*s).toPrecision(7));}});
      toast(`${nm(it)}のラインが ${want} 台になるように出荷量を調整しました`,{label:'元に戻す',fn:undo});break;}
    case 'plans':openPlans();break;
    case 'save':savePlanAs($('#fx-name').value.trim());break;
  }
}
function fxChange(e){
  const t=e.target;
  if(t.dataset.orate!==undefined){const i=+t.dataset.orate,v=Math.max(0,+t.value||0);mut(()=>{if(S.cur.targets[i])S.cur.targets[i].rate=v;});}
  else if(t.dataset.trate!==undefined){const v=Math.max(0,+t.value||0);mut(()=>setTargetRate(t.dataset.trate,v));}
  else if(t.dataset.limit!==undefined){const v=+t.value;mut(()=>{if(v>0)S.cur.limits[t.dataset.limit]=v;else delete S.cur.limits[t.dataset.limit];});}
  else if(t.dataset.clk!==undefined||t.dataset.clkr!==undefined){const it=t.dataset.clk||t.dataset.clkr,v=Math.min(250,Math.max(1,+t.value||100));mut(()=>{S.cur.clk[it]=v;});}
  else if(t.dataset.set){const k=t.dataset.set;mut(()=>{
    if(k==='power')S.cur.power.on=t.checked;
    else if(k==='expow')S.cur.expow=t.checked;
    else if(k==='gen'){S.cur.power.gen=t.value;const f=G[t.value].f.filter(f=>I[f]&&I[f].e>0);if(!f.includes(S.cur.power.fuel))S.cur.power.fuel=f[0];}
    else if(k==='fuel')S.cur.power.fuel=t.value;
    else if(k==='miner')S.cur.miner=t.value;
    else if(k==='purity')S.cur.purity=+t.value;
    else if(k==='belt')S.cur.belt=+t.value;
    else if(k==='pipe')S.cur.pipe=+t.value;});}
  else if(t.id==='fx-name'){S.curName=t.value.trim();save();renderMeter();}
}
function fxInput(e){const t=e.target;if(t.dataset.clkr!==undefined){const n=t.parentElement.querySelector('[data-clk]');if(n)n.value=t.value;}}

/* ---------- plans ---------- */
function savePlanAs(n){if(!n){toast('計画名を入力してください');$('#fx-name').focus();return;}S.plans[n]=JSON.parse(JSON.stringify(S.cur));S.curName=n;save();renderMeter();toast(`「${n}」を保存しました`);}
function openPlans(){
  const names=Object.keys(S.plans);
  $('#layer').innerHTML=`<div class="scrim" data-close></div><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="pl-h"><div class="dlg-h"><h2 id="pl-h">計画</h2><button class="ibtn" type="button" data-close aria-label="閉じる">${ICON.close}</button></div>
    <div class="row"><input type="text" id="pl-name" value="${esc(S.curName||'')}" placeholder="計画名" aria-label="計画名" style="flex:1"><button class="btn pri" type="button" data-pl="save">今の計画を保存</button></div>
    <div class="saved">${names.length?names.map(n=>{const s=simulate(JSON.parse(JSON.stringify(S.plans[n])));return `<div><span>${esc(n)}<span class="sub">${s.error?'—':fmt(s.power,0)+' MW ・ '+S.plans[n].targets.map(x=>nm(x.item)).join('、')}</span></span><button class="btn sm" type="button" data-pl="open" data-n="${esc(n)}">開く</button><button class="btn sm ghost" type="button" data-pl="del" data-n="${esc(n)}">削除</button></div>`;}).join(''):'<p class="note">保存した計画はまだありません。</p>'}</div>
    <div class="row" style="margin-top:12px"><button class="btn" type="button" data-pl="new">${ICON.plus}新しい計画</button></div></div>`;
  $('#layer .dlg').addEventListener('click',ev=>{const b=ev.target.closest('[data-pl]');if(!b)return;const n=b.dataset.n;
    if(b.dataset.pl==='save'){savePlanAs($('#pl-name').value.trim());openPlans();}
    else if(b.dataset.pl==='open'){mut(()=>{S.cur=ensurePlan(JSON.parse(JSON.stringify(S.plans[n])));});S.curName=n;FX.sel=null;FX.fitted=false;FX.topo='';closeLayer();renderFactory();renderMeter();toast(`「${n}」を開きました`,{label:'元に戻す',fn:undo});}
    else if(b.dataset.pl==='del'){if(b.dataset.ok){delete S.plans[n];if(S.curName===n)S.curName='';save();openPlans();toast(`「${n}」を削除しました`);}else{b.dataset.ok='1';b.textContent='もう一度押して削除';b.classList.remove('ghost');}}
    else if(b.dataset.pl==='new'){mut(()=>{S.cur=ensurePlan({targets:[]});});S.curName='';FX.sel=null;FX.fitted=false;FX.topo='';closeLayer();renderFactory();toast('新しい計画を始めました',{label:'元に戻す',fn:undo});}});
}

/* ---------- optimizer ---------- */
function openOptimizer(){
  $('#layer').innerHTML=`<div class="scrim" data-close></div><div class="dlg wide" role="dialog" aria-modal="true" aria-labelledby="opt-h"><div class="dlg-h"><h2 id="opt-h">おまかせ最適化</h2><button class="ibtn" type="button" data-close aria-label="閉じる">${ICON.close}</button></div>
    <p class="note">この計画で作る中間素材ごとにレシピを入れ替えて、目的にいちばん合う組み合わせを探します。出荷量・クロック・ソマーループはそのままです。</p>
    <div class="chips" style="margin:12px 0">${Object.entries(OBJECTIVES).map(([k,l])=>`<button type="button" class="chip plain" data-obj="${k}" aria-pressed="${k===FX.optObj}">${l}</button>`).join('')}</div>
    <label class="sw"><input type="checkbox" id="opt-locked"${FX.optLocked?' checked':''}> まだ解禁していない代替レシピも使う</label>
    <div id="opt-body" class="opt-body"></div>
    <div class="row dlg-a"><button class="btn pri" type="button" id="opt-run">${ICON.spark}組み合わせを探す</button><button class="btn ghost" type="button" data-close>閉じる</button></div></div>`;
  const dlg=$('#layer .dlg');
  dlg.addEventListener('click',ev=>{const c=ev.target.closest('[data-obj]');if(c){FX.optObj=c.dataset.obj;dlg.querySelectorAll('[data-obj]').forEach(x=>x.setAttribute('aria-pressed',String(x===c)));}});
  $('#opt-locked').onchange=ev=>{FX.optLocked=ev.target.checked;};
  $('#opt-run').onclick=async()=>{
    const body=$('#opt-body'),btn=$('#opt-run');btn.disabled=true;body.innerHTML='<div class="opt-prog"><span class="spin"></span><span id="opt-n">組み合わせを試しています…</span></div>';
    const old=$('#opt-apply');if(old)old.remove();btn.classList.add('pri');
    const res=await optimizePlan(S.cur,FX.optObj,FX.optLocked,(n)=>{const el=$('#opt-n');if(el)el.textContent=`${n} 通りの組み合わせを試しました…`;});
    btn.disabled=false;if(!$('#opt-body'))return;
    if(res.error){body.innerHTML=`<p class="bad">${esc(res.error)}</p>`;return;}
    const ch=new Set([...Object.keys(res.over),...Object.keys(S.cur.over)]);
    const changes=[...ch].filter(k=>(res.over[k]??null)!==(S.cur.over[k]??null)&&(effRecipe(k,res.over)||'')!==(effRecipe(k,S.cur.over)||''));
    const m=(k,l,u,d)=>`<tr><td>${l}</td><td class="n">${fmt(res.before[k],d)}${u}</td><td class="n"><b>${fmt(res.after[k],d)}${u}</b></td><td class="n">${delta(res.after[k]-res.before[k],u,d)}</td></tr>`;
    body.innerHTML=changes.length?`<div class="tbl"><table><thead><tr><th></th><th class="n">今</th><th class="n">最適化後</th><th class="n">差</th></tr></thead><tbody>${m('power','消費電力',' MW',0)}${m('score','資源比率','%',3)}${m('machines','装置','台',0)}${m('raw','原料','/分',0)}</tbody></table></div>
      <h3 class="sec-t" style="margin:14px 0 6px">入れ替えるレシピ（${changes.length}）</h3><ul class="chg">${changes.map(k=>{
        const rname=over=>{const rid=effRecipe(k,over);return !rid?'外部から搬入':rn(rid)===nm(k)?'標準レシピ':rn(rid);};
        return `<li>${glyph(k,'s')}<b>${esc(nm(k))}</b><span>${esc(rname(S.cur.over))}</span><i>→</i><span class="to">${esc(rname(res.over))}</span></li>`;}).join('')}</ul>
      <p class="note">${res.evals} 通りを試しました。</p>`
      :`<p class="note">今の組み合わせがすでに一番よい結果でした（${res.evals} 通りを試しました）。${FX.optLocked?'':'未解禁の代替レシピも含めると、もっとよい組み合わせが見つかるかもしれません。'}</p>`;
    if(changes.length){btn.classList.remove('pri');btn.insertAdjacentHTML('beforebegin',`<button class="btn pri" type="button" id="opt-apply">${ICON.check}この組み合わせを計画に使う</button>`);
      $('#opt-apply').onclick=()=>{mut(()=>{S.cur.over=res.over;});closeLayer();toast(`${changes.length} 件のレシピを入れ替えました`,{label:'元に戻す',fn:undo});};}
  };
}
