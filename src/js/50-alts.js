/* ================= ALTS ================= */
function renderAlts(){
  const q=$('#a-search').value.trim().toLowerCase(),f=S.afilter||'all';
  const altIds=Object.keys(R).filter(r=>R[r].a).sort((a,b)=>R[a].o[0][0].localeCompare(R[b].o[0][0]));
  const nOn=altIds.filter(r=>S.unl[r]).length;
  $('#a-count').innerHTML=`<span class="num" style="font-size:22px">${nOn}</span> <span class="muted" style="font-size:14px">/ ${altIds.length} 件を解禁済み</span>`;
  $('#a-prog').innerHTML=altIds.map(r=>`<i class="${S.unl[r]?'on':''}"></i>`).join('');
  $('#a-filter').innerHTML=[['all','すべて'],['unl','解禁済み'],['lock','未解禁']].map(([k,l])=>`<button type="button" class="chip plain" data-afilter="${k}" aria-pressed="${f===k}">${l}</button>`).join('');
  const items=Object.keys(producers).filter(it=>!isRaw(it)&&(producers[it].filter(r=>isPrimary(r,it)).length>1||producers[it].some(r=>R[r].a&&isPrimary(r,it))));
  const rows=[];
  groupItems().forEach(g=>g.items.forEach(it=>{if(!items.includes(it))return;
    const rids=producers[it].filter(r=>isPrimary(r,it));const alts=rids.filter(r=>R[r].a);
    const shown=alts.filter(r=>f==='all'||(f==='unl')===!!S.unl[r]);
    const match=!q||I[it].j.toLowerCase().includes(q)||I[it].n.toLowerCase().includes(q)||rids.some(r=>R[r].n.toLowerCase().includes(q));
    if(!match||(f!=='all'&&!shown.length))return;
    const cur=effRecipe(it);
    const opts=`<option value="__def"${!has(S.pref,it)?' selected':''}>標準（${esc(defaults[it]?rn(defaults[it]):'外部搬入')}）</option>`+
      producers[it].map(rid=>`<option value="${rid}"${has(S.pref,it)&&S.pref[it]===rid?' selected':''}>${esc(rn(rid))}（${esc(mn(R[rid].m))}）${isLocked(rid)?' 未解禁':''}</option>`).join('')+
      `<option value=""${S.pref[it]===''?' selected':''}>外部から搬入する</option>`;
    rows.push(`<div class="altrow"><div class="nm">${glyph(it)}<div style="min-width:0;display:grid;gap:6px">${ilink(it)}<select class="rsel" data-pref="${it}" aria-label="${esc(nm(it))}の既定レシピ">${opts}</select>${cur&&isLocked(cur)?'<span class="pill p-bad" style="justify-self:start">既定が未解禁です</span>':''}<button class="btn sm ghost" type="button" data-cmpitem="${it}" style="justify-self:start">比較する</button></div></div>
      <div class="alts">${(f==='all'?alts:shown).map(rid=>{const r=R[rid];return `<label class="altitem${S.unl[rid]?' on':''}"><span class="sw"><input type="checkbox" data-unl="${rid}"${S.unl[rid]?' checked':''} aria-label="${esc(rn(rid))}を解禁済みにする"></span><span><b>${esc(rn(rid).replace(/^代替: |^Alt: /,''))}</b><span>${esc(mn(r.m))} ・ ${r.i.map(([x,a])=>esc(nm(x))+' '+fmt(perMin(r,a))).join(' + ')} → ${r.o.map(([x,a])=>esc(nm(x))+' '+fmt(perMin(r,a))).join(' + ')}</span></span></label>`}).join('')||'<span class="muted small">代替レシピはありません。</span>'}</div></div>`);
  }));
  $('#a-list').innerHTML=rows.join('')||'<div class="empty">一致する項目がありません。</div>';
}

