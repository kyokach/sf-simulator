/* ================= MACHINES ================= */
function renderMachines(){
  const cnt={};for(const r of Object.values(R))cnt[r.m]=(cnt[r.m]||0)+1;
  const ranges=MACH_ORDER.map(m=>{const vr=Object.values(R).filter(r=>r.m===m&&r.pv);return vr.length?[Math.min(...vr.map(r=>r.pv[0])),Math.max(...vr.map(r=>r.pv[1]))]:[M[m].p,M[m].p];});
  const top=Math.max(...ranges.map(r=>r[1]));
  const sx=v=>Math.sqrt(v/top)*100;
  $('#m-prod').innerHTML=MACH_ORDER.map((m,i)=>{const [a,b]=ranges[i];const v=a!==b;
    return `<div class="mbar"><div><b style="font-weight:600">${esc(mn(m))}</b><span class="sub">${cnt[m]||0} レシピ</span></div><div class="tr"><i class="${v?'var':''}" style="left:${v?sx(a):0}%;width:${v?sx(b)-sx(a):sx(b)}%"></i></div><div class="v">${v?`${a}–${b}`:fmt(a)}<small class="muted" style="font-size:11px"> MW</small></div></div>`}).join('')+`<p class="note" style="margin-top:10px">棒の長さは平方根スケールです（4 MWと1,500 MWを同じ図に収めるため）。</p>`;
  const ext=[['Desc_MinerMk1_C',60],['Desc_MinerMk2_C',120],['Desc_MinerMk3_C',240],['Desc_OilPump_C',120],['Desc_FrackingExtractor_C',60]];
  $('#m-ext').innerHTML=`<table><thead><tr><th>装置</th><th class="n">不純 /分</th><th class="n">普通 /分</th><th class="n">純粋 /分</th><th class="n">消費電力 MW</th></tr></thead><tbody>`+ext.map(([m,b])=>`<tr><td>${esc(mn(m))}</td><td class="n num">${fmt(b/2)}</td><td class="n num">${fmt(b)}</td><td class="n num">${fmt(b*2)}</td><td class="n">${m==='Desc_FrackingExtractor_C'?'0<span class="sub">資源井加圧機 150 MW が別途必要</span>':fmt(M[m].p)}</td></tr>`).join('')+
  `<tr><td>${esc(mn('Desc_WaterPump_C'))}</td><td class="n muted" colspan="3">水面に設置 ・ 120 m³/分</td><td class="n">${fmt(M.Desc_WaterPump_C.p)}</td></tr></tbody></table>`;
  const gorder=['Desc_GeneratorBiomass_Automated_C','Desc_GeneratorCoal_C','Desc_GeneratorFuel_C','Desc_GeneratorNuclear_C'];
  $('#m-gen').innerHTML=`<table><thead><tr><th>発電機</th><th class="n">出力 MW</th><th>燃料</th><th class="n">燃料エネルギー</th><th class="n">燃料消費 /分</th><th class="n">水 m³/分</th></tr></thead><tbody>`+gorder.map(g=>{const gd=G[g];const fu=gd.f.filter(f=>I[f]&&I[f].e>0);
    return fu.map((f,ix)=>`<tr>${ix===0?`<td rowspan="${fu.length}"><b style="font-weight:600">${esc(mn(g))}</b></td><td class="n num" rowspan="${fu.length}">${gd.p}</td>`:''}<td class="nw">${glyph(f,'s')} ${ilink(f)}</td><td class="n">${fmt(I[f].e)} MJ${I[f].l?'/m³':''}</td><td class="n num">${fmt(gd.p*60/I[f].e,3)}</td><td class="n">${gd.w?fmt(gd.p*gd.w*60/1000):'—'}</td></tr>`).join('')}).join('')+
    `<tr><td><b style="font-weight:600">${esc(mn('Desc_GeneratorGeoThermal_C'))}</b></td><td class="n num">100–600</td><td colspan="4" class="small muted">間欠泉に設置。燃料不要。平均出力は純度で変わります（不純 100 / 普通 200 / 純粋 400 MW）。</td></tr></tbody></table>`;
}

