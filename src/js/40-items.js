/* ================= ITEMS ================= */
function renderItems(){
  const q=$('#isearch').value.trim().toLowerCase();
  const groups=groupItems();
  $('#icats').innerHTML=`<button type="button" class="chip plain" data-icat="all" aria-pressed="${S.icat==='all'}">すべて</button>`+groups.map(g=>`<button type="button" class="chip plain" data-icat="${g.key}" aria-pressed="${S.icat===g.key}">${esc(g.name)} <span class="muted">${g.items.length}</span></button>`).join('');
  const html=groups.filter(g=>S.icat==='all'||g.key===S.icat).map(g=>{
    const its=g.items.filter(it=>!q||I[it].j.toLowerCase().includes(q)||I[it].n.toLowerCase().includes(q));
    if(!its.length)return '';
    return `<div class="cat">${esc(g.name)}<small>${its.length}</small></div><div class="igrid">`+its.map(it=>{
      const np=(producers[it]||[]).length,na=(producers[it]||[]).filter(r=>R[r].a).length;
      return `<button type="button" class="itile" data-item="${it}" style="--c:${itemColor(it)}">${glyph(it)}<div><b>${esc(nm(it))}</b><span>${esc(nm2(it))}</span><span>${isRaw(it)?'採掘'+(np?` ・ 変換 ${np}`:''):np?`レシピ ${np}`+(na?` ・ 代替 ${na}`:''):'採取'}</span></div></button>`}).join('')+'</div>';
  }).join('');
  $('#igrid').innerHTML=html||'<div class="empty">一致するアイテムがありません。別の言葉で探すか、カテゴリを「すべて」に戻してください。</div>';
}
function openDrawer(it){
  if(!I[it])return;
  const d=I[it],pr=producers[it]||[],co=[...new Set(consumers[it]||[])];
  const gens=Object.entries(G).filter(([,g])=>g.f.includes(it)).map(([gid])=>mn(gid));
  const rc=rid=>{const r=R[rid];return `<div class="rcard"><div class="top"><b>${esc(rn(rid))}</b><span style="display:flex;gap:4px;flex-wrap:wrap">${altPill(rid)}${unlockPill(rid)}<span class="pill p-std">${esc(mn(r.m))} ${fmt(r.p)} MW</span></span></div>
    <div class="io"><div>${flowList(r.i,r)}</div><span class="ar">→</span><div>${flowList(r.o,r)}</div></div></div>`;};
  $('#layer').innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(nm(it))}">
    <div class="dhead">${glyph(it,'l')}<div><h2>${esc(nm(it))}</h2><div class="muted">${esc(nm2(it))}</div></div><button class="btn ghost x" type="button" data-close aria-label="閉じる">閉じる</button></div>
    <div class="facts"><span>シンク<b>${fmt(d.s,0)} pt</b></span>${d.l?'<span>液体・気体</span>':`<span>スタック<b>${d.st}</b></span>`}${d.e?`<span>エネルギー<b>${fmt(d.e)} MJ</b></span>`:''}${gens.length?`<span>燃料: ${esc(gens.join('、'))}</span>`:''}${WORLD[it]?`<span>マップ最大<b>${fmt(WORLD[it],0)}/分</b></span>`:''}</div>
    ${producible(it)?`<div class="row" style="margin-bottom:16px"><button class="btn pri" type="button" data-dplan="${it}">計画に追加</button><button class="btn" type="button" data-totree="${it}" data-q="10">部材ツリー</button><button class="btn" type="button" data-cmpitem="${it}">レシピを比較</button></div>`:''}
    <h3 class="sec-t" style="margin:20px 0 0">作り方 <span class="muted small">${pr.length}</span></h3><div class="dlist">${pr.map(rc).join('')||'<div class="muted small">採掘・採取で入手します。</div>'}</div>
    <h3 class="sec-t" style="margin:22px 0 0">使い道 <span class="muted small">${co.length}</span></h3><div class="dlist">${co.map(rc).join('')||'<div class="muted small">使い道はありません。</div>'}</div></aside>`;
  $('#layer .drawer').focus?.();
  setTimeout(()=>$('#layer .x')&&$('#layer .x').focus(),30);
}
function closeLayer(){$('#layer').innerHTML='';}

/* ---------- command palette ---------- */
let palSel=0,palList=[],palMode='find';
function openPal(mode){
  palMode=mode==='add'?'add':'find';
  const add=palMode==='add';
  $('#layer').innerHTML=`<div class="scrim" data-close></div><div class="pal" role="dialog" aria-modal="true" aria-label="${add?'出荷に加えるアイテム':'アイテムを探す'}"><input id="pal-q" type="search" placeholder="${add?'出荷に加えるアイテム（日本語・英語）':'アイテム名（日本語・英語）'}" autocomplete="off" aria-controls="pal-l"><ul id="pal-l" role="listbox"></ul><div class="hint">${add?'<span>↑↓ 選ぶ</span><span>Enter 出荷に加える</span><span>Esc 閉じる</span>':'<span>↑↓ 選ぶ</span><span>Enter 詳細</span><span>Shift+Enter 計画に追加</span><span>Esc 閉じる</span>'}</div></div>`;
  const q=$('#pal-q');q.focus();palSel=0;palFill('');
  q.addEventListener('input',()=>{palSel=0;palFill(q.value);});
  q.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){palSel=Math.min(palList.length-1,palSel+1);palMark();e.preventDefault();}
    else if(e.key==='ArrowUp'){palSel=Math.max(0,palSel-1);palMark();e.preventDefault();}
    else if(e.key==='Enter'&&palList[palSel]){const it=palList[palSel];if((palMode==='add'||e.shiftKey)&&producible(it)){addTarget(it);}else openDrawer(it);e.preventDefault();}
  });
}
function palFill(q){q=q.trim().toLowerCase();
  const all=groupItems().flatMap(g=>g.items).filter(it=>palMode!=='add'||producible(it));
  palList=(q?all.filter(it=>I[it].j.toLowerCase().includes(q)||I[it].n.toLowerCase().includes(q)).sort((a,b)=>{const sa=(I[a].j.toLowerCase().startsWith(q)||I[a].n.toLowerCase().startsWith(q))?0:1,sb=(I[b].j.toLowerCase().startsWith(q)||I[b].n.toLowerCase().startsWith(q))?0:1;return sa-sb;}):all.filter(producible)).slice(0,40);
  $('#pal-l').innerHTML=palList.map((it,i)=>`<li role="option" data-pi="${i}" aria-selected="${i===palSel}">${glyph(it,'s')}<div class="t">${esc(nm(it))}<span>${esc(nm2(it))}</span></div>${palMode==='add'?'':producible(it)?`<div class="acts"><button class="btn sm ghost" type="button" data-cmpitem="${it}">比較</button><button class="btn sm" type="button" data-dplan="${it}">計画に追加</button></div>`:''}</li>`).join('')||'<li class="muted">見つかりません</li>';}
function palMark(){document.querySelectorAll('#pal-l li').forEach((li,i)=>li.setAttribute('aria-selected',String(i===palSel)));const el=document.querySelector(`#pal-l li[data-pi="${palSel}"]`);el&&el.scrollIntoView({block:'nearest'});}
function addTarget(it,rate){
  const r=rate||10;
  mut(()=>{const ex=S.cur.targets.find(x=>x.item===it);if(ex)ex.rate=+ex.rate+r;else S.cur.targets.push({item:it,rate:r});});
  closeLayer();FX.sel={type:'node',id:'O:'+it};FX.focusId='O:'+it;go('plan');toast(`${nm(it)} を出荷に加えました`);
}
