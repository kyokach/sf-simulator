/* ================= TREE (bill of materials) ================= */
const TS=()=>{if(!S.tree||typeof S.tree!=='object')S.tree={};const T=S.tree;
  if(!I[T.item])T.item='Desc_ModularFrameHeavy_C';if(!(+T.qty>0))T.qty=10;T.over=T.over||{};T.stock=T.stock||{};T.col=T.col||{};return T;};
const tChoose=it=>effRecipe(it,S.tree.over);
const outAmt=(r,it)=>r.o.reduce((s,[x,a])=>s+(x===it?a:0),0);
const dur=s=>{s=Math.round(s);if(s<60)return `${s}秒`;const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return h?`${h}時間${m}分`:`${m}分${sec?sec+'秒':''}`;};
const qf=v=>Math.abs(v-Math.round(v))<1e-6?fmt(Math.round(v),0):fmt(v,2);
let tCount=0;
function tBuild(it,q,anc,path){
  const n={it,q,path,kids:[]};tCount++;
  if(isRaw(it)){n.leaf='raw';return n;}
  if(anc.has(it)){n.leaf='cyc';return n;}
  const rid=tChoose(it);
  if(!rid||tCount>4000){n.leaf='ext';return n;}
  const r=R[rid],out=outAmt(r,it);let c=q/out;if(S.tree.ceil)c=Math.ceil(c-1e-9);
  Object.assign(n,{rid,crafts:c,time:c*r.t,energy:c*r.t*r.p,over:c*out-q,by:r.o.filter(([x])=>x!==it).map(([x,a])=>[x,a*c])});
  const a2=new Set(anc);a2.add(it);
  r.i.forEach(([x,a],ix)=>n.kids.push(tBuild(x,a*c,a2,path+'.'+ix)));
  return n;
}
// aggregated requirements with stock deducted (top-down in dependency order)
function tAggregate(root,qty){
  const order=[],vis={},onStack={};
  const visit=it=>{if(vis[it]||onStack[it])return;onStack[it]=1;const rid=!isRaw(it)&&tChoose(it);if(rid)R[rid].i.forEach(([x])=>visit(x));onStack[it]=0;vis[it]=1;order.push(it);};
  visit(root);order.reverse();
  const Dm={[root]:qty},info={},by={},done=new Set();let energy=0,crafts=0;const mtime={};
  for(const it of order){done.add(it);const d=Dm[it]||0;if(d<=1e-12)continue;
    const st=Math.max(0,+S.tree.stock[it]||0),need=Math.max(0,d-st);
    const inf=info[it]={gross:d,stock:Math.min(st,d),need};
    if(isRaw(it))continue;const rid=tChoose(it);if(!rid){inf.ext=true;continue;}
    const r=R[rid],out=outAmt(r,it);let c=need/out;if(S.tree.ceil)c=Math.ceil(c-1e-9);
    Object.assign(inf,{rid,crafts:c,time:c*r.t});energy+=c*r.t*r.p;crafts+=c;mtime[r.m]=(mtime[r.m]||0)+c*r.t;
    r.o.forEach(([x,a])=>{if(x!==it)by[x]=(by[x]||0)+a*c;});
    if(S.tree.ceil&&c*out>need+1e-9)by[it]=(by[it]||0)+c*out-need;
    r.i.forEach(([x,a])=>{if(done.has(x)){(info[x]=info[x]||{gross:0,stock:0,need:0}).cyc=(info[x].cyc||0)+a*c;}else Dm[x]=(Dm[x]||0)+a*c;});
  }
  return {info,by,energy,crafts,mtime,order};
}
function renderTree(){
  const T=TS();
  $('#t-item').innerHTML=itemOptions(T.item,producible);$('#t-qty').value=T.qty;$('#t-unit').textContent=unit(T.item);$('#t-ceil').checked=!!T.ceil;
  $('#t-gl').innerHTML=glyph(T.item);
  tCount=0;const root=tBuild(T.item,+T.qty,new Set(),'r');
  const ag=tAggregate(T.item,+T.qty);
  // readout
  const raws=Object.entries(ag.info).filter(([k,v])=>isRaw(k)&&v.need>1e-9);
  const rawTot=raws.filter(([k])=>k!=='Desc_Water_C').reduce((s,[,v])=>s+v.need,0);
  const mids=ag.order.filter(k=>!isRaw(k)&&k!==T.item&&ag.info[k]);
  const longest=Object.entries(ag.mtime).sort((a,b)=>b[1]-a[1])[0];
  const statDefs=[
    ['te','必要なエネルギー',ag.energy/1000,v=>fmt(v,v<10?2:1),'GJ',`燃料式発電機1台を ${dur(ag.energy/250)} 動かす量`],
    ['tc','製作の回数',ag.crafts,v=>fmt(v,0),'回',`${Object.keys(ag.mtime).length} 種類の装置を使用`],
    ['tr','原料の合計',rawTot,v=>fmt(v,0),'個',`${raws.filter(([k])=>k!=='Desc_Water_C').length} 種類（水を除く）`],
    ['tm','中間素材',mids.length,v=>fmt(v,0),'種類',longest?`いちばん時間がかかる: ${mn(longest[0])} 1台で ${dur(longest[1])}`:'']];
  const box=$('#t-stats');
  if(!box.children.length)box.innerHTML=statDefs.map(d=>`<div><div class="k">${d[1]}</div><div class="v" id="st-${d[0]}">0<small>${d[4]}</small></div><div class="s" id="ss-${d[0]}"></div></div>`).join('');
  statDefs.forEach(d=>{tween($('#st-'+d[0]),d[2],d[3]);$('#ss-'+d[0]).textContent=d[5];});
  // tree
  const chev='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"/></svg>';
  const recOpts=(it,cur)=>(producers[it]||[]).map(rid=>`<option value="${rid}"${rid===cur?' selected':''}>${esc(rn(rid))}（${esc(mn(R[rid].m))}）${isLocked(rid)?' 未解禁':''}</option>`).join('')+`<option value=""${!cur?' selected':''}>手持ち・外部から搬入</option>`;
  const rowHtml=(n,depth)=>{
    const open=!T.col[n.path];const col=itemColor(n.it);const ch=has(T.over,n.it);
    let sub='';
    if(n.leaf==='raw')sub=`<span>採掘する原料</span>`;
    else if(n.leaf==='ext')sub=`<span class="tleaf-ext">手持ち・外部から搬入</span>`;
    else if(n.leaf==='cyc')sub=`<span class="tleaf-ext">上の段と循環するため、ここで止めています</span>`;
    else sub=`${esc(mn(R[n.rid].m))}で <b class="num">${qf(n.crafts)}</b> 回 ・ 1台なら ${dur(n.time)}${R[n.rid].a?' ・ <span style="color:var(--alt)">代替</span>':''}${n.by.length?` ・ 副産物 ${n.by.map(([x,a])=>esc(nm(x))+' '+qf(a)).join('、')}`:''}${S.tree.ceil&&n.over>1e-6?` ・ 余り ${qf(n.over)}`:''}`;
    const kids=n.kids.length?`<div class="tkids" style="--pc:${col}"${open?'':' hidden'}>${n.kids.map(k=>rowHtml(k,depth+1)).join('')}</div>`:'';
    return `<div class="tn"><div class="trow${depth===0?' root':''}${n.kids.length?'':' leaf'}" data-it="${n.it}" data-path="${n.path}">
      ${n.kids.length?`<button class="tg" type="button" data-tg="${n.path}" aria-expanded="${open}" aria-label="${open?'たたむ':'開く'}">${chev}</button>`:'<span></span>'}
      ${glyph(n.it,depth?'s':'')}
      <div class="tmain"><div class="nmx"><b>${ilink(n.it)}</b>${ch?'<span class="pill p-good">変更</span>':''}</div><span class="sub">${sub}</span></div>
      ${isRaw(n.it)?'<span></span>':`<select class="tsel" data-tov="${n.it}" aria-label="${esc(nm(n.it))}のレシピ">${recOpts(n.it,n.rid||null)}</select>`}
      <div class="tq"><b>${qf(n.q)}</b><span>${unit(n.it)}</span></div></div>${kids}</div>`;
  };
  $('#t-tree').innerHTML=rowHtml(root,0)+(tCount>4000?'<p class="note">ツリーが大きすぎるため途中で省略しました。</p>':'');
  // raw totals
  const maxA=Math.max(1,...raws.filter(([k])=>k!=='Desc_Water_C').map(([,v])=>v.need));
  raws.sort((a,b)=>RAW_ORDER.indexOf(a[0])-RAW_ORDER.indexOf(b[0]));
  $('#t-rawnote').textContent=`${fmt(+T.qty,2)} ${unit(T.item)}の${nm(T.item)}に必要`;
  $('#t-raw').innerHTML=raws.length?raws.map(([it,v])=>`<div class="resrow" data-hl="${it}"><span class="nm">${glyph(it,'s')}${ilink(it)}</span><span class="amt">${qf(v.need)}<small class="muted" style="font-size:12px;font-weight:500"> ${unit(it)}</small></span><span class="bar"><i style="width:${it==='Desc_Water_C'?100:Math.min(100,v.need/maxA*100)}%;--c:${itemColor(it)}"></i></span>${WORLD[it]&&!I[it].l?`<span class="meta">採鉱機Mk.2・普通ノードで ${dur(v.need/(MN.Desc_MinerMk2_C?MN.Desc_MinerMk2_C.pm:120)*60)}ぶん</span>`:''}</div>`).join(''):'<div class="muted small">原料は不要です（すべて手持ちでまかなえます）。</div>';
  // intermediates with stock
  const midList=ag.order.filter(k=>!isRaw(k)&&ag.info[k]);
  $('#t-mid').innerHTML=midList.length?midList.map(it=>{const v=ag.info[it];const st=S.tree.stock[it];
    return `<div class="midrow${v.need<1e-9?' done':''}" data-hl="${it}"><div class="nm">${glyph(it,'s')}<div>${ilink(it)}<span class="sub">${v.ext?'搬入':v.rid?`${esc(mn(R[v.rid].m))} ${qf(v.crafts)}回`:''}${v.stock>0?` ・ 必要 ${qf(v.gross)} − 手持ち ${qf(v.stock)}`:''}${v.cyc?` ・ 循環分 ${qf(v.cyc)}`:''}</span></div></div>
      <div class="q"><b>${qf(v.need)}</b><span class="sub">${v.need<1e-9?'手持ちで足りる':'作る量'}</span></div>
      <input type="number" min="0" step="any" placeholder="手持ち" value="${st?esc(st):''}" data-stock="${it}" aria-label="${esc(nm(it))}の手持ち"></div>`}).join(''):'<div class="muted small">中間素材はありません。</div>';
  const by=Object.entries(ag.by).filter(([,a])=>a>1e-9);
  $('#t-bycard').hidden=!by.length;
  $('#t-by').innerHTML=`<div class="res">`+by.map(([it,a])=>`<div class="resrow"><span class="nm">${glyph(it,'s')}${ilink(it)}</span><span class="amt">${qf(a)}<small class="muted" style="font-size:12px;font-weight:500"> ${unit(it)}</small></span>${it===T.item?'<span class="meta">切り上げで余る分</span>':''}</div>`).join('')+'</div>';
}
function treeText(){
  const T=TS();tCount=0;const root=tBuild(T.item,+T.qty,new Set(),'r');const lines=[];
  const walk=(n,pre,last,top)=>{const head=top?'':pre+(last?'└ ':'├ ');
    lines.push(`${head}${nm(n.it)} ×${qf(n.q)}${n.rid?`（${mn(R[n.rid].m)} ${qf(n.crafts)}回${R[n.rid].a?'・'+rn(n.rid):''}）`:n.leaf==='raw'?'［採掘］':n.leaf?'［搬入］':''}`);
    n.kids.forEach((k,i)=>walk(k,top?'':pre+(last?'　 ':'│ '),i===n.kids.length-1,false));};
  walk(root,'',true,true);
  const ag=tAggregate(T.item,+T.qty);
  lines.push('','■ 原料の合計');Object.entries(ag.info).filter(([k,v])=>isRaw(k)&&v.need>1e-9).forEach(([k,v])=>lines.push(`・${nm(k)} ${qf(v.need)}${unit(k)==='m³'?' m³':''}`));
  return lines.join('\n');
}

