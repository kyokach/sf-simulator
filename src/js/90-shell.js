/* ================= shell ================= */
const VIEWS=['plan','layout','tree','compare','items','alts','machines'];
const RENDER={plan:renderFactory,layout:renderLayout,tree:renderTree,compare:renderCompare,items:renderItems,alts:renderAlts,machines:renderMachines};
const CANVAS_VIEWS=['plan','layout'];
function syncChrome(){
  const top=matchMedia('(max-width:960px)').matches?$('.rail').offsetHeight:0,bot=matchMedia('(max-width:760px)').matches?$('#nav').offsetHeight:0;
  document.documentElement.style.setProperty('--chrome',(top+bot)+'px');
}
new ResizeObserver(syncChrome).observe(document.body);
function render(anim){
  document.querySelectorAll('#nav button').forEach(b=>{if(b.dataset.v===S.tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.body.classList.toggle('canvas-mode',CANVAS_VIEWS.includes(S.tab));syncChrome();
  if(S.tab!=='layout'&&typeof hide3D==='function'&&L3.r)hide3D();
  VIEWS.forEach(v=>{const el=$('#v-'+v);el.hidden=v!==S.tab;if(v===S.tab&&anim&&!CANVAS_VIEWS.includes(v)){el.classList.remove('enter');void el.offsetWidth;el.classList.add('enter');}});
  $('#lang-ja').setAttribute('aria-pressed',String(S.lang==='ja'));$('#lang-en').setAttribute('aria-pressed',String(S.lang==='en'));
  RENDER[S.tab]();
  renderMeter(freshSim());
  save();
}
function go(tab){if(S.tab!==tab){S.tab=tab;render(true);window.scrollTo({top:0});}else render();}
$('#cnt').textContent=`${Object.keys(I).length} アイテム ・ ${Object.keys(R).length} レシピ`;
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b)go(b.dataset.v);});
$('#meter').onclick=()=>go('plan');
$('#qs-open').onclick=openPal;
$('#lang-ja').onclick=()=>{S.lang='ja';render();};$('#lang-en').onclick=()=>{S.lang='en';render();};
$('#isearch').addEventListener('input',renderItems);
$('#a-search').addEventListener('input',renderAlts);
document.addEventListener('keydown',e=>{
  if((e.key==='k'&&(e.ctrlKey||e.metaKey))||(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))){e.preventDefault();openPal();}
  else if(e.key==='Escape'&&$('#layer').innerHTML){closeLayer();}
  else if(e.key==='Enter'&&e.target.closest&&e.target.closest('.pt')){e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  else if(CANVAS_VIEWS.includes(S.tab)&&!$('#layer').innerHTML&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}
    else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();}
    else if(e.ctrlKey||e.metaKey||e.altKey)return;
    else if(k==='f'){e.preventDefault();if(S.tab==='plan')fitView(true);else lxFit();}
    else if(k==='escape'){if(S.tab==='plan'){FX.sel=null;applySel();renderInspector();}else{LX.sel=null;lxApplySel();renderLxInspector();}}
    else if(S.tab==='layout'&&k==='r'&&LX.sel){e.preventDefault();lxRotate(LX.sel,e.shiftKey?-1:1);}
    else if(S.tab==='plan'&&(k==='delete'||k==='backspace')&&FX.sel&&FX.sel.type==='node'&&FX.sel.id.startsWith('O:')){e.preventDefault();const it=FX.sel.id.slice(2);mut(()=>{S.cur.targets=S.cur.targets.filter(x=>x.item!==it);});FX.sel=null;renderInspector();toast(`${nm(it)} を出荷から外しました`,{label:'元に戻す',fn:undo});}
    else if(k==='+'||k==='='){S.tab==='plan'?FX.vp.zoomBy(1.2):lxZoom(1.25);}
    else if(k==='-'){S.tab==='plan'?FX.vp.zoomBy(1/1.2):lxZoom(0.8);}
  }
});
document.addEventListener('click',e=>{
  const T=e.target;
  if(T.closest('[data-close]')){closeLayer();return;}
  const li=T.closest('#pal-l li[data-pi]');if(li&&!T.closest('button')){const it=palList[+li.dataset.pi];if(palMode==='add')addTarget(it);else openDrawer(it);return;}
  if(T.closest('#fx-svg,#lx-svg,#lx-3d'))return;
  const pt=T.closest('[data-pt]');if(pt){cHot=pt.dataset.pt;renderCompare();const row=document.getElementById('cr-'+cHot);row&&row.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});return;}
  const tt=T.closest('[data-totree]');if(tt){const X=TS();X.item=tt.dataset.totree;X.qty=+tt.dataset.q||10;X.col={};closeLayer();go('tree');return;}
  const tg=T.closest('[data-tg]');if(tg){const X=TS(),k=tg.dataset.tg;if(X.col[k])delete X.col[k];else X.col[k]=1;const open=!X.col[k];tg.setAttribute('aria-expanded',String(open));const kids=tg.closest('.tn').querySelector(':scope>.tkids');if(kids)kids.hidden=!open;save();return;}
  const dp=T.closest('[data-dplan]');if(dp){addTarget(dp.dataset.dplan);return;}
  const ci=T.closest('[data-cmpitem]');if(ci){S.cItem=ci.dataset.cmpitem;cHot=null;closeLayer();go('compare');return;}
  const il=T.closest('[data-item]');if(il&&!T.closest('select')&&!T.closest('.edge')){openDrawer(il.dataset.item);return;}
  const so=T.closest('[data-sort]');if(so){const k=so.dataset.sort;cSort=cSort.k===k?{k,dir:-cSort.dir}:{k,dir:1};renderCompare();return;}
  const qk=T.closest('[data-quick]');if(qk){S.cItem=qk.dataset.quick;cHot=null;renderCompare();save();return;}
  const ic=T.closest('[data-icat]');if(ic){S.icat=ic.dataset.icat;renderItems();save();return;}
  const af=T.closest('[data-afilter]');if(af){S.afilter=af.dataset.afilter;renderAlts();save();return;}
  const up=T.closest('[data-useplan]');if(up){const rid=up.dataset.useplan,it=S.cItem;
    snapshot();if(rid===effRecipe(it))delete S.cur.over[it];else S.cur.over[it]=rid;renderCompare();renderMeter();save();toast(`計画の${nm(it)}を「${rn(rid)}」に変更しました`,{label:'元に戻す',fn:()=>{undo();renderCompare();}});return;}
  const ud=T.closest('[data-usedef]');if(ud){const rid=ud.dataset.usedef,it=S.cItem;
    if(rid===defaults[it])delete S.pref[it];else S.pref[it]=rid;renderCompare();save();toast(`${nm(it)}の既定を「${rn(rid)}」にしました`);return;}
});
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='c-item'){S.cItem=t.value;cHot=null;renderCompare();save();}
  else if(t.id==='c-rate'){S.cRate=Math.max(0.01,+t.value||1);renderCompare();save();}
  else if(t.id==='c-water'){S.cWater=t.checked;renderCompare();save();}
  else if(t.id==='c-unl'){S.cUnl=t.checked;renderCompare();save();}
  else if(t.id==='c-group'){S.cGroup=t.checked;renderCompare();save();}
  else if(t.id==='t-item'){const X=TS();X.item=t.value;X.col={};renderTree();save();}
  else if(t.id==='t-qty'){TS().qty=Math.max(0.0001,+t.value||1);renderTree();save();}
  else if(t.id==='t-ceil'){TS().ceil=t.checked;renderTree();save();}
  else if(t.dataset.tov!==undefined){const X=TS(),it=t.dataset.tov;if(t.value===(effRecipe(it)||''))delete X.over[it];else X.over[it]=t.value;renderTree();save();
    const r=document.querySelector(`.trow[data-it="${CSS.escape(it)}"]`);if(r){r.classList.add('flash');}toast(`${nm(it)}のレシピを変更しました（ツリー全体に反映）`);}
  else if(t.dataset.stock!==undefined){const X=TS(),v=+t.value;if(v>0)X.stock[t.dataset.stock]=v;else delete X.stock[t.dataset.stock];renderTree();save();}
  else if(t.dataset.unl!==undefined){if(t.checked)S.unl[t.dataset.unl]=1;else delete S.unl[t.dataset.unl];renderAlts();save();}
  else if(t.dataset.pref!==undefined){const it=t.dataset.pref;if(t.value==='__def')delete S.pref[it];else S.pref[it]=t.value;for(const k in ICOL)delete ICOL[k];renderAlts();save();toast(`${nm(it)}の既定レシピを更新しました`);}
});
$('#t-open').onclick=()=>{TS().col={};renderTree();save();};
$('#t-close').onclick=()=>{const X=TS();X.col={};document.querySelectorAll('#t-tree .trow').forEach(r=>{const kids=r.parentElement.querySelector(':scope>.tkids');if(kids&&[...kids.children].every(c=>!c.querySelector('.tkids')))X.col[r.dataset.path]=1;});renderTree();save();};
$('#t-copy').onclick=()=>{const txt=treeText();const fb=()=>{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('コピーしました');}catch(e){toast('コピーできませんでした');}ta.remove();};
  try{navigator.clipboard.writeText(txt).then(()=>toast('ツリーをテキストでコピーしました'),fb);}catch(e){fb();}};
$('#t-ovreset').onclick=()=>{TS().over={};renderTree();save();toast('ツリーのレシピ変更をリセットしました');};
$('#t-ovdef').onclick=()=>{const X=TS(),n=Object.keys(X.over).length;if(!n){toast('ツリーで変更したレシピはありません');return;}
  for(const [it,rid] of Object.entries(X.over)){if(rid===defaults[it])delete S.pref[it];else S.pref[it]=rid;}X.over={};for(const k in ICOL)delete ICOL[k];renderTree();save();toast(`${n} 件を既定のレシピにしました`);};
$('#t-ovplan').onclick=()=>{const X=TS(),n=Object.keys(X.over).length;if(!n){toast('ツリーで変更したレシピはありません');return;}
  snapshot();Object.assign(S.cur.over,X.over);renderMeter();save();toast(`${n} 件のレシピを生産計画にも反映しました`);};
(function(){const hl=it=>{document.querySelectorAll('.trow.hl,.midrow.hl').forEach(e=>e.classList.remove('hl'));if(!it)return;document.querySelectorAll(`.trow[data-it="${CSS.escape(it)}"],.midrow[data-hl="${CSS.escape(it)}"]`).forEach(e=>e.classList.add('hl'));};
  const v=$('#v-tree');v.addEventListener('pointerover',e=>{if(e.target.closest('select,input'))return;const r=e.target.closest('.trow,.midrow');hl(r?(r.dataset.it||r.dataset.hl):null);});
  v.addEventListener('pointerleave',()=>hl(null));})();
$('#a-allon').onclick=()=>{Object.keys(R).forEach(r=>{if(R[r].a)S.unl[r]=1;});renderAlts();save();toast('すべての代替レシピを解禁済みにしました');};
$('#a-alloff').onclick=()=>{S.unl={};renderAlts();save();toast('すべての代替レシピを未解禁にしました');};
$('#a-reset').onclick=()=>{S.pref={};for(const k in ICOL)delete ICOL[k];renderAlts();save();toast('既定レシピを初期状態に戻しました');};
$('#x-export').onclick=()=>{const txt=JSON.stringify({v:1,unl:S.unl,pref:S.pref,plans:S.plans,cur:S.cur});const ta=$('#x-text');ta.value=txt;
  const fb=()=>{ta.focus();ta.select();toast('選択しました。コピーして保管してください');};
  try{navigator.clipboard.writeText(txt).then(()=>toast('コピーしました'),fb);}catch(e){fb();}};
$('#x-import').onclick=()=>{try{const o=JSON.parse($('#x-text').value);if(!o||typeof o!=='object')throw 0;
  if(o.unl)S.unl=o.unl;if(o.pref)S.pref=o.pref;if(o.plans){S.plans=o.plans;for(const k in S.plans)S.plans[k]=ensurePlan(S.plans[k]);}if(o.cur)S.cur=ensurePlan(o.cur);FX.fitted=false;FX.topo='';render();toast('読み込みました');}
  catch(e){toast('読み込めませんでした。書き出した文字列をそのまま貼り付けてください');}};
if(!VIEWS.includes(S.tab))S.tab='plan';
const h=location.hash.slice(1);if(VIEWS.includes(h))S.tab=h;
render(true);
