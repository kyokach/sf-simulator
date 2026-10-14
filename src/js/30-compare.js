/* ================= COMPARE ================= */
let cSort={k:'power',dir:1},cHot=null;
function renderCompare(){
  $('#c-item').innerHTML=itemOptions(S.cItem,producible);
  $('#c-rate').value=S.cRate;$('#c-water').checked=S.cWater;$('#c-unl').checked=S.cUnl;$('#c-group').checked=S.cGroup!==false;
  const it=S.cItem,rate=+S.cRate||1;
  $('#c-quick').innerHTML=QUICK.map(q=>`<button type="button" class="chip" data-quick="${q}" aria-pressed="${q===it}">${glyph(q,'s')}${esc(nm(q))}</button>`).join('');
  let rids=(producers[it]||[]);if(S.cUnl)rids=rids.filter(unlocked);
  const rows=rids.map(rid=>{const r=R[rid];
    const res=solve({[it]:rate},x=>x===it?rid:effRecipe(x));
    if(res.error)return {rid,err:res.error};
    const sc=resScore(res.inputs,S.cWater);
    const by=Object.entries(res.surplus).filter(([k])=>k!==it);
    const ext=Object.keys(res.inputs).some(k=>!isRaw(k));
    return {rid,r,res,direct:rate/net(r,it),power:res.power,mc:res.mcount,raw:sc.total,score:sc.score,by,ext};
  });
  const ok=rows.filter(r=>!r.err);
  const pool=ok.filter(r=>!r.ext).length?ok.filter(r=>!r.ext):ok;
  const best=k=>Math.min(...pool.map(r=>r[k])),worst=k=>Math.max(...ok.map(r=>r[k]),1e-9);
  const B={power:best('power'),raw:best('raw'),score:best('score'),mc:best('mc')},W={power:worst('power'),raw:worst('raw'),score:worst('score'),mc:worst('mc')};
  const key={name:r=>rn(r.rid),direct:r=>r.direct,power:r=>r.power,mc:r=>r.mc,raw:r=>r.raw,score:r=>r.score};
  ok.sort((a,b)=>{const f=key[cSort.k];const va=f(a),vb=f(b);return (typeof va==='string'?va.localeCompare(vb):va-vb)*cSort.dir;});
  const grouped=S.cGroup!==false;
  if(grouped)ok.sort((a,b)=>MACH_ORDER.indexOf(a.r.m)-MACH_ORDER.indexOf(b.r.m));
  const defR=effRecipe(it),planR=effRecipe(it,S.cur.over);
  // machine summary
  const byM={};ok.forEach(o=>(byM[o.r.m]=byM[o.r.m]||[]).push(o));
  const mKeys=Object.keys(byM).sort((a,b)=>MACH_ORDER.indexOf(a)-MACH_ORDER.indexOf(b));
  $('#c-sum').innerHTML=mKeys.map(m=>{const g=byM[m];const bp=g.reduce((x,y)=>y.power<x.power?y:x),bs=g.reduce((x,y)=>y.score<x.score?y:x);
    return `<div class="mcard"><h3>${esc(mn(m))}<small>${g.length} レシピ</small></h3>
      <div class="w"><span>省電力</span><b>${esc(rn(bp.rid))}</b><span class="num">${fmt(bp.power,1)} MW</span></div>
      <div class="w"><span>省資源</span><b>${esc(rn(bs.rid))}</b><span class="num">${fmt(bs.score,3)}%</span></div></div>`}).join('');
  $('#c-plotcard').hidden=ok.length<2;
  if(ok.length>=2)$('#c-plot').innerHTML=scatter(ok);
  let lastM=null;
  const th=(k,l,n)=>`<th class="sort${n?' n':''}" data-sort="${k}" aria-sort="${cSort.k===k?(cSort.dir>0?'ascending':'descending'):'none'}">${l}${cSort.k===k?(cSort.dir>0?' ↑':' ↓'):''}</th>`;
  const LBL={power:'全工程の電力 MW',mc:'全工程の台数',raw:'原料 /分',score:'資源比率 %'};
  const cell=(o,k,d)=>{const isB=!o.ext&&Math.abs(o[k]-B[k])<1e-9;return `<td class="n" data-l="${LBL[k]}"><span class="num${isB?' best':''}">${fmt(o[k],d)}</span><span class="ibar${isB?' best':''}"><i style="width:${Math.max(3,o[k]/W[k]*100)}%"></i></span></td>`;};
  const rowHtml=o=>{const r=o.r;
    const raws=Object.entries(o.res.inputs).sort((a,b)=>RAW_ORDER.indexOf(a[0])-RAW_ORDER.indexOf(b[0]));
    const chain=Object.entries(o.res.rec).filter(([,rid])=>o.res.x[rid]>1e-9).sort((a,b)=>MACH_ORDER.indexOf(R[b[1]].m)-MACH_ORDER.indexOf(R[a[1]].m));
    let head='';
    if(grouped&&r.m!==lastM){lastM=r.m;head=`<tr class="grp"><td colspan="8"><b>${esc(mn(r.m))}</b> ${fmt(M[r.m].p||r.p)} MW/台</td></tr>`;}
    return head+`<tr id="cr-${o.rid}" class="${o.rid===planR?'inplan':''}${o.rid===cHot?' hot':''}"><td><b style="font-weight:600">${esc(rn(o.rid))}</b><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${altPill(o.rid)}${unlockPill(o.rid)}${o.ext?'<span class="pill p-acc">搬入品あり</span>':''}${o.rid===defR?'<span class="pill p-std">既定</span>':''}${o.rid===planR?'<span class="pill p-good">計画で使用中</span>':''}</div>
      <div class="row" style="margin-top:8px;gap:6px">${o.rid===planR?'':`<button class="btn sm" type="button" data-useplan="${o.rid}">計画で使う</button>`}${o.rid===defR?'':`<button class="btn sm ghost" type="button" data-usedef="${o.rid}">既定にする</button>`}</div></td>
      <td class="small" data-l="1台あたり /分"><div class="muted nw" style="margin-bottom:4px">${esc(mn(r.m))} ・ ${fmt(r.p)} MW</div>${flowList(r.i,r)}<div class="muted">↓</div>${flowList(r.o,r)}</td>
      <td class="n" data-l="直接の台数"><span class="num">${fmt(o.direct)}</span></td>${cell(o,'power',1)}${cell(o,'mc',1)}${cell(o,'raw',1)}${cell(o,'score',3)}
      <td class="small" data-l="原料の内訳 /分">${raws.map(([k,a])=>`<div class="nw">${glyph(k,'s')} <span class="num">${fmt(a,1)}</span> ${ilink(k)}${isRaw(k)?'':' <span class="pill p-acc">搬入</span>'}</div>`).join('')}
        ${o.by.length?`<div class="muted" style="margin-top:6px">副産物</div>`+o.by.map(([k,a])=>`<div class="nw"><span class="num">${fmt(a,1)}</span> ${ilink(k)}</div>`).join(''):''}
        <details style="margin-top:6px"><summary class="muted" style="cursor:pointer">工程 ${chain.length}</summary>${chain.map(([ci,cr])=>`<div class="nw"><span class="num">${fmt(o.res.x[cr])}</span> ${esc(mn(R[cr].m))}: ${esc(nm(ci))}${R[cr].a?' <span class="pill p-alt">代替</span>':''}</div>`).join('')}</details></td></tr>`};
  const msort=`<div class="msort chips"><span class="lbl">並べ替え</span>${[['power','電力'],['score','資源比率'],['raw','原料'],['mc','台数']].map(([k,l])=>`<button type="button" class="chip plain" data-sort="${k}" aria-pressed="${cSort.k===k}">${l}${cSort.k===k?(cSort.dir>0?' ↑':' ↓'):''}</button>`).join('')}</div>`;
  $('#c-out').innerHTML=msort+`<div class="tbl"><table><thead><tr>${th('name','レシピ')}<th>1台あたり /分</th>${th('direct','直接の台数',1)}${th('power','全工程の電力 MW',1)}${th('mc','全工程の台数',1)}${th('raw','原料 /分',1)}${th('score','資源比率 %',1)}<th>原料の内訳 /分</th></tr></thead><tbody>`+
    ok.map(rowHtml).join('')+rows.filter(r=>r.err).map(o=>`<tr><td>${esc(rn(o.rid))}</td><td colspan="7" class="muted">${esc(o.err)}</td></tr>`).join('')+
    `</tbody></table></div>`+(ok.length?'':'<div class="empty">表示できるレシピがありません。「解禁済みだけ」を外すと全レシピを表示します。</div>');
}
function scatter(ok){
  const Wd=980,Ht=330,ml=62,mr=190,mt=16,mb=42;
  const xs=ok.map(o=>o.power),ys=ok.map(o=>o.score);
  const xM=Math.max(...xs)*1.12||1,yM=Math.max(...ys)*1.15||1;
  const X=v=>ml+v/xM*(Wd-ml-mr),Y=v=>Ht-mb-v/yM*(Ht-mt-mb);
  const ticks=(m)=>{const raw=m/4,p=Math.pow(10,Math.floor(Math.log10(raw))),s=[1,2,2.5,5,10].map(k=>k*p).find(k=>k>=raw);const out=[];for(let v=0;v<=m+1e-12;v+=s)out.push(v);return out;};
  const xt=ticks(xM),yt=ticks(yM);
  const mx=Math.min(...xs),my=Math.min(...ys);
  let g='';
  g+=xt.map(v=>`<line class="gd" x1="${X(v)}" x2="${X(v)}" y1="${mt}" y2="${Ht-mb}"/><text x="${X(v)}" y="${Ht-mb+16}" text-anchor="middle">${fmt(v,1)}</text>`).join('');
  g+=yt.map(v=>`<line class="gd" x1="${ml}" x2="${Wd-mr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${ml-8}" y="${Y(v)+4}" text-anchor="end">${fmt(v,3)}</text>`).join('');
  g+=`<line class="ax" x1="${ml}" x2="${Wd-mr}" y1="${Ht-mb}" y2="${Ht-mb}"/><line class="ax" x1="${ml}" x2="${ml}" y1="${mt}" y2="${Ht-mb}"/>`;
  g+=`<text x="${(ml+Wd-mr)/2}" y="${Ht-6}" text-anchor="middle">全工程の電力 MW</text><text transform="translate(14 ${(mt+Ht-mb)/2}) rotate(-90)" text-anchor="middle">資源比率 %</text>`;
  const placed=[];
  g+=ok.map(o=>{const x=X(o.power),y=Y(o.score);let ly=y+4;while(placed.some(p=>Math.abs(p-ly)<14))ly+=14;placed.push(ly);
    const c=o.r.a?'var(--alt)':'var(--accent)';const label=rn(o.rid).replace(/^代替: |^Alt: /,'');
    return `<g class="pt${o.rid===cHot?' hot':''}" data-pt="${o.rid}" tabindex="0" role="button" aria-label="${esc(rn(o.rid))}"><circle cx="${x}" cy="${y}" r="7" fill="${c}"${o.ext?' fill-opacity=".45"':''}/><text class="lb" x="${x+12}" y="${ly}">${esc(label.length>22?label.slice(0,21)+'…':label)}</text></g>`;}).join('');
  return `<div style="overflow-x:auto"><svg class="scatter" viewBox="0 0 ${Wd} ${Ht}" style="width:100%;min-width:520px;height:auto" role="img" aria-label="レシピごとの電力と資源比率">${g}</svg></div>`;
}

