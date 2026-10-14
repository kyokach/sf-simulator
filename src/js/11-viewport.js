/* ================= PAN / ZOOM VIEWPORT (shared by the factory canvas and the layout planner) ================= */
/* World coordinates live inside <g world>; the viewport applies translate(x,y) scale(k).
   - drag on empty space pans, wheel/trackpad pans, ctrl+wheel or pinch zooms
   - opt.canPan(e) lets the owner claim pointerdowns on its own shapes (nodes, blocks) */
function makeViewport(svg,world,opt={}){
  const v={x:0,y:0,k:1},min=opt.min||0.1,max=opt.max||4;
  const pts=new Map();let pan=null,pinch=null;
  const apply=()=>{world.setAttribute('transform',`translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) scale(${v.k.toFixed(5)})`);opt.onChange&&opt.onChange(v);};
  const rect=()=>svg.getBoundingClientRect();
  const toWorld=(cx,cy)=>{const r=rect();return {x:(cx-r.left-v.x)/v.k,y:(cy-r.top-v.y)/v.k};};
  const clampK=k=>Math.min(max,Math.max(min,k));
  function zoomAt(cx,cy,f){const r=rect(),px=cx-r.left,py=cy-r.top,nk=clampK(v.k*f),s=nk/v.k;v.x=px-(px-v.x)*s;v.y=py-(py-v.y)*s;v.k=nk;apply();}
  function zoomBy(f){const r=rect();zoomAt(r.left+r.width/2,r.top+r.height/2,f);}
  function set(x,y,k){v.x=x;v.y=y;v.k=clampK(k);apply();}
  /* fit the box; with minK the zoom never drops below a readable scale — the box is then
     anchored at its top-left corner (where the flow starts) instead of being centred */
  function fit(b,pad=48,maxK=1.15,minK=0,animate=false){const r=rect();if(!b||!r.width||!r.height)return;
    const k=clampK(Math.min(maxK,(r.width-pad*2)/Math.max(b.w,1),(r.height-pad*2)/Math.max(b.h,1)));
    if(k>=minK){animTo(r.width/2-(b.x+b.w/2)*k,r.height/2-(b.y+b.h/2)*k,k,animate);return;}
    const kk=clampK(minK),fitsH=b.h*kk<=r.height-pad*2;
    animTo(pad-b.x*kk,fitsH?r.height/2-(b.y+b.h/2)*kk:pad-b.y*kk,kk,animate);}
  /* one camera animation at a time; any pointer or wheel input cancels it */
  let panRaf=0;
  function animTo(tx,ty,tk,animate){cancelAnimationFrame(panRaf);tk=clampK(tk);
    if(!animate||reduceMotion){v.x=tx;v.y=ty;v.k=tk;apply();return;}
    const x0=v.x,y0=v.y,k0=v.k,t0=performance.now();
    const step=t=>{const p=Math.min(1,(t-t0)/340),e=1-Math.pow(1-p,3);v.k=k0+(tk-k0)*e;v.x=x0+(tx-x0)*e;v.y=y0+(ty-y0)*e;apply();if(p<1)panRaf=requestAnimationFrame(step);};
    panRaf=requestAnimationFrame(step);}
  function panTo(tx,ty,animate){animTo(tx,ty,v.k,animate);}
  function center(wx,wy,animate){const r=rect();panTo(r.width/2-wx*v.k,r.height/2-wy*v.k,animate);}
  svg.addEventListener('pointerdown',e=>{
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY});cancelAnimationFrame(panRaf);
    if(pts.size===2){const [a,b]=[...pts.values()];
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,k:v.k,x:v.x,y:v.y};pan=null;svg.classList.remove('panning');opt.onPinch&&opt.onPinch();return;}
    if(opt.canPan&&!opt.canPan(e))return;
    if(e.pointerType==='mouse'&&e.button!==0&&e.button!==1)return;
    pan={x:e.clientX,y:e.clientY,vx:v.x,vy:v.y,moved:false,id:e.pointerId};
    try{svg.setPointerCapture(e.pointerId);}catch(_){}
  });
  svg.addEventListener('pointermove',e=>{
    if(pts.has(e.pointerId))pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pts.size>=2){const [a,b]=[...pts.values()],r=rect();
      const d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,nk=clampK(pinch.k*d/pinch.d);
      const wx=(pinch.cx-r.left-pinch.x)/pinch.k,wy=(pinch.cy-r.top-pinch.y)/pinch.k;
      v.k=nk;v.x=cx-r.left-wx*nk;v.y=cy-r.top-wy*nk;apply();return;}
    if(pan&&e.pointerId===pan.id){const dx=e.clientX-pan.x,dy=e.clientY-pan.y;
      if(!pan.moved&&Math.hypot(dx,dy)<4)return;
      if(!pan.moved){pan.moved=true;svg.classList.add('panning');}
      v.x=pan.vx+dx;v.y=pan.vy+dy;apply();}
  });
  const end=e=>{pts.delete(e.pointerId);if(pinch&&pts.size<2)pinch=null;
    if(pan&&e.pointerId===pan.id){const moved=pan.moved;pan=null;svg.classList.remove('panning');
      if(!moved&&e.type==='pointerup'&&opt.onTap)opt.onTap(e);}};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  svg.addEventListener('wheel',e=>{e.preventDefault();cancelAnimationFrame(panRaf);
    const mouseWheel=e.deltaMode===1||(e.deltaX===0&&Math.abs(e.deltaY)>=50&&Number.isInteger(e.deltaY));
    if(e.ctrlKey||e.metaKey||mouseWheel){const dy=e.deltaMode===1?e.deltaY*33:e.deltaY;zoomAt(e.clientX,e.clientY,Math.exp(-dy*(e.ctrlKey?0.012:0.0016)));}
    else{v.x-=e.deltaX;v.y-=e.deltaY;apply();}
  },{passive:false});
  return {v,apply,set,fit,center,panTo,animTo,zoomAt,zoomBy,toWorld,get multi(){return pts.size>1;}};
}
