/* ================= 3D VIEW OF THE LAYOUT (three.js, loaded on demand) ================= */
const L3={THREE:null,loading:null,r:null,scene:null,cam:null,raf:0,ro:null,stripe:null,orbit:null,picks:[],last:0,host:null,key:''};
function loadThree(){
  if(window.THREE)return Promise.resolve(window.THREE);
  if(L3.loading)return L3.loading;
  L3.loading=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.async=true;
    s.onload=()=>window.THREE?res(window.THREE):rej(new Error('three.js'));s.onerror=()=>{L3.loading=null;rej(new Error('three.js'));};document.head.appendChild(s);});
  return L3.loading;
}
const cssVar=(name,fb)=>{const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return v||fb;};
const resolveColor=c=>{const m=/^var\((--[\w-]+)\)$/.exec(c);return m?cssVar(m[1],'#9DB3C9'):c;};
function hide3D(){
  cancelAnimationFrame(L3.raf);L3.raf=0;L3.select=L3.fit=L3.dolly=L3.focus=null;L3.labels=[];
  const host=$('#lx-3d');if(host)host.hidden=true;$('#lx-svg').style.visibility='';if(LX.vp)LX.vp.apply();
  if(L3.r){L3.r.dispose();L3.r.domElement.remove();L3.r=null;}
  if(L3.scene){L3.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map&&m.map!==L3.stripe)m.map.dispose();m.dispose();});}});L3.scene=null;}
  if(L3.ro){L3.ro.disconnect();L3.ro=null;}
}
async function show3D(model,sim){
  const host=$('#lx-3d');if(!host||!model)return;
  host.hidden=false;$('#lx-svg').style.visibility='hidden';
  if(!window.THREE)host.innerHTML='<div class="l3-msg"><span class="spin"></span>3D表示を準備しています…</div>';
  let THREE;try{THREE=await loadThree();}catch(e){host.innerHTML='<div class="l3-msg">3D表示の部品を読み込めませんでした。ネットワークにつながっているか確かめて、もう一度お試しください。</div>';return;}
  if(LX.mode!=='3d')return;
  const keep=L3.orbit?{...L3.orbit}:null;
  hide3D();host.hidden=false;$('#lx-svg').style.visibility='hidden';host.innerHTML='';
  const bgc=new THREE.Color(cssVar('--bg','#111821')),dark=(0.2126*bgc.r+0.7152*bgc.g+0.0722*bgc.b)<0.5;
  const W=host.clientWidth||800,H=host.clientHeight||500,mobile=isMobile();
  const r=new THREE.WebGLRenderer({antialias:!mobile,alpha:false});r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));r.setSize(W,H);
  r.shadowMap.enabled=!mobile;r.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(r.domElement);L3.r=r;
  const bgCol=new THREE.Color(cssVar('--bg','#111821'));r.setClearColor(bgCol);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(bgCol,600,2200);L3.scene=scene;
  const bb=model.bb,cx=bb.x+bb.w/2,cz=bb.y+bb.h/2,span=Math.max(bb.w,bb.h,60),rad=Math.max(40,0.5*Math.hypot(bb.w,bb.h));
  const FOV=42,tanH=Math.tan(FOV*Math.PI/360);
  const cam=new THREE.PerspectiveCamera(FOV,W/H,1,8000);L3.cam=cam;
  // distance at which the whole site (its bounding circle) fits the narrower side of the view
  // smallest orbit radius at which every corner of the site (ground and roof height) lands inside the frame
  const fitR=(th,ph,tx,tz)=>{const a=(host.clientWidth||W)/(host.clientHeight||H);cam.aspect=a;cam.updateProjectionMatrix();
    const pts=[];for(const b of model.blocks){const hy=b.kind==='dock'?4:(DIMS[b.m]||[0,0,10])[2];
      for(const y of [0,hy])for(const [x,z] of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]])pts.push(new THREE.Vector3(x,y,z));}
    const v=new THREE.Vector3();let lo=10,hi=rad*12;
    for(let i=0;i<28;i++){const m=(lo+hi)/2;cam.position.set(tx+m*Math.sin(ph)*Math.cos(th),m*Math.cos(ph),tz+m*Math.sin(ph)*Math.sin(th));cam.lookAt(tx,0,tz);cam.updateMatrixWorld();
      const ok=pts.every(p=>{v.copy(p).project(cam);return v.z<1&&Math.abs(v.x)<=0.9&&Math.abs(v.y)<=0.86;});if(ok)hi=m;else lo=m;}
    return hi;};
  // lights
  scene.add(new THREE.HemisphereLight(0xdfe8f2,dark?0x1a2430:0x8899aa,dark?0.75:0.9));
  const sun=new THREE.DirectionalLight(0xffffff,dark?0.85:0.95);sun.position.set(cx-span*0.6,span*1.1,cz-span*0.35);sun.target.position.set(cx,0,cz);
  sun.castShadow=!mobile;const sc=sun.shadow.camera;sc.left=-span*0.8;sc.right=span*0.8;sc.top=span*0.8;sc.bottom=-span*0.8;sc.near=1;sc.far=span*4;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0006;
  scene.add(sun,sun.target);
  // ground + foundations
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(span*8,span*8),new THREE.MeshStandardMaterial({color:new THREE.Color(cssVar('--sunk','#141D27')),roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.set(cx,-1.02,cz);ground.receiveShadow=true;scene.add(ground);
  const tc=document.createElement('canvas');tc.width=tc.height=128;const tx=tc.getContext('2d');
  tx.fillStyle=dark?'#3a4757':'#c9d2dc';tx.fillRect(0,0,128,128);tx.strokeStyle=dark?'#526174':'#aab6c3';tx.lineWidth=4;tx.strokeRect(2,2,124,124);
  tx.strokeStyle=dark?'#46546560':'#b9c3ce80';tx.lineWidth=2;[32,64,96].forEach(p=>{tx.beginPath();tx.moveTo(p,0);tx.lineTo(p,128);tx.moveTo(0,p);tx.lineTo(128,p);tx.stroke();});
  const ftex=new THREE.CanvasTexture(tc);
  const fgeo=new THREE.BoxGeometry(FOUND,1,FOUND),fmat=new THREE.MeshStandardMaterial({map:ftex,roughness:0.9,metalness:0.05});
  const tiles=[...model.tiles],fm=new THREE.InstancedMesh(fgeo,fmat,Math.max(1,tiles.length));fm.receiveShadow=true;
  const mtx=new THREE.Matrix4();tiles.forEach((s,i)=>{const [a,b]=s.split(',').map(Number);mtx.makeTranslation(a*FOUND+FOUND/2,-0.5,b*FOUND+FOUND/2);fm.setMatrixAt(i,mtx);});
  fm.count=tiles.length;scene.add(fm);
  // machines (instanced per building type) + crisp outlines
  const unit=new THREE.BoxGeometry(1,1,1),groups={},edgePos=[];L3.picks=[];
  for(const b of model.blocks){if(b.kind==='dock')continue;const H=(DIMS[b.m]||[0,0,10])[2];
    for(const m of b.machines){(groups[b.m]=groups[b.m]||[]).push({x:b.x+m.x,z:b.y+m.y,w:m.w,d:m.h,h:H,key:b.key});}}
  const q=new THREE.Quaternion(),pv=new THREE.Vector3(),sv=new THREE.Vector3();
  for(const [mid,arr] of Object.entries(groups)){
    const col=new THREE.Color(MCOL[mid]||'#9DB3C9'),mat=new THREE.MeshStandardMaterial({color:col,roughness:0.55,metalness:0.25});
    const im=new THREE.InstancedMesh(unit,mat,arr.length);im.castShadow=im.receiveShadow=true;
    arr.forEach((o,i)=>{pv.set(o.x+o.w/2,o.h/2,o.z+o.d/2);sv.set(o.w-0.3,o.h,o.d-0.3);mtx.compose(pv,q,sv);im.setMatrixAt(i,mtx);
      const x0=o.x+0.15,x1=o.x+o.w-0.15,z0=o.z+0.15,z1=o.z+o.d-0.15,y1=o.h;
      const c=[[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b2])=>edgePos.push(...c[a],...c[b2]));});
    im.userData.keys=arr.map(o=>o.key);scene.add(im);L3.picks.push(im);}
  const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(edgePos,3));
  scene.add(new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:dark?0x0b1118:0x2a3644,transparent:true,opacity:dark?0.55:0.35})));
  // manifold lanes (flat strips)
  const laneGeo=[],lanePos=[];for(const b of model.blocks)for(const l of (b.lanes||[]))laneGeo.push({x:b.x+l.x,z:b.y+l.y,w:l.w,d:l.h});
  const lg=new THREE.BoxGeometry(1,1,1),lmat=new THREE.MeshStandardMaterial({color:new THREE.Color(dark?'#2a3644':'#9aa7b5'),roughness:0.8});
  const lm=new THREE.InstancedMesh(lg,lmat,Math.max(1,laneGeo.length));laneGeo.forEach((o,i)=>{pv.set(o.x+o.w/2,0.25,o.z+o.d/2);sv.set(o.w-0.4,0.5,o.d-0.4);mtx.compose(pv,q,sv);lm.setMatrixAt(i,mtx);});lm.count=laneGeo.length;lm.receiveShadow=true;scene.add(lm);
  // belts: ribbons with a scrolling chevron texture (u runs along the flow)
  const sc2=document.createElement('canvas');sc2.width=64;sc2.height=32;const s2=sc2.getContext('2d');s2.fillStyle='#ffffff';s2.fillRect(0,0,64,32);
  s2.fillStyle='rgba(0,0,0,0.38)';s2.beginPath();s2.moveTo(8,4);s2.lineTo(30,16);s2.lineTo(8,28);s2.lineTo(16,28);s2.lineTo(38,16);s2.lineTo(16,4);s2.closePath();s2.fill();
  const stripe=new THREE.CanvasTexture(sc2);stripe.wrapS=stripe.wrapT=THREE.RepeatWrapping;L3.stripe=stripe;
  const byItem={};
  for(const c of model.conns){const arr=byItem[c.item]=byItem[c.item]||{pos:[],uv:[],idx:[],base:[]};
    let u=0;for(let i=1;i<c.pts.length;i++){const [x0,z0]=c.pts[i-1],[x1,z1]=c.pts[i],len=Math.hypot(x1-x0,z1-z0);if(len<1e-3)continue;
      const dx=(x1-x0)/len,dz=(z1-z0)/len,nx=-dz*0.95,nz=dx*0.95,y=0.85,o=arr.pos.length/3;
      arr.pos.push(x0+nx,y,z0+nz,x0-nx,y,z0-nz,x1+nx,y,z1+nz,x1-nx,y,z1-nz);
      arr.uv.push(u/2.4,1,u/2.4,0,(u+len)/2.4,1,(u+len)/2.4,0);arr.idx.push(o,o+2,o+1,o+1,o+2,o+3);u+=len;
      arr.base.push({x:(x0+x1)/2,z:(z0+z1)/2,lx:Math.abs(x1-x0)+2,lz:Math.abs(z1-z0)+2});}}
  const bmat=new THREE.MeshStandardMaterial({color:new THREE.Color(dark?'#1d2733':'#6d7b8a'),roughness:0.7});
  const allBase=Object.values(byItem).flatMap(a=>a.base),bm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),bmat,Math.max(1,allBase.length));
  allBase.forEach((o,i)=>{pv.set(o.x,0.4,o.z);sv.set(o.lx,0.8,o.lz);mtx.compose(pv,q,sv);bm.setMatrixAt(i,mtx);});bm.count=allBase.length;bm.castShadow=true;bm.receiveShadow=true;scene.add(bm);
  for(const [it,a] of Object.entries(byItem)){if(!a.pos.length)continue;const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(a.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(a.uv,2));g.setIndex(a.idx);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:new THREE.Color(resolveColor(itemColor(it))),map:stripe,roughness:0.6,side:THREE.DoubleSide}));mesh.receiveShadow=true;scene.add(mesh);}
  // docks
  for(const b of model.blocks)if(b.kind==='dock'){const col=new THREE.Color(resolveColor(itemColor(b.item)));
    const m=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.6,4,20),new THREE.MeshStandardMaterial({color:col,roughness:0.5,metalness:0.2}));
    m.position.set(b.x+DOCK/2,2,b.y+DOCK/2);m.castShadow=true;m.userData.key=b.key;scene.add(m);L3.picks.push(m);}
  // labels: fixed pixel size on screen (sizeAttenuation off); hidden while their block is tiny on screen
  L3.labels=[];
  for(const b of model.blocks){if(b.kind==='dock'&&b.amt<1e-9)continue;
    const txt=b.kind==='dock'?`${nm(b.item)} ${fmt(b.amt,b.amt<10?1:0)}/分`:blockTitle(b);
    const cv=document.createElement('canvas'),ctx=cv.getContext('2d'),F='600 40px "IBM Plex Sans JP","Hiragino Sans",sans-serif';ctx.font=F;
    const tw=Math.ceil(Math.min(1400,ctx.measureText(txt).width+48));cv.width=tw;cv.height=72;ctx.font=F;
    ctx.fillStyle=dark?'rgba(24,34,46,0.88)':'rgba(255,255,255,0.92)';const rr=18;ctx.beginPath();ctx.moveTo(rr,0);ctx.arcTo(tw,0,tw,72,rr);ctx.arcTo(tw,72,0,72,rr);ctx.arcTo(0,72,0,0,rr);ctx.arcTo(0,0,tw,0,rr);ctx.fill();
    ctx.fillStyle=dark?'#E4EBF2':'#17212C';ctx.textBaseline='middle';ctx.fillText(txt,24,38);
    const tex=new THREE.CanvasTexture(cv);tex.minFilter=THREE.LinearFilter;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true,sizeAttenuation:false}));
    const top=b.kind==='dock'?6:((DIMS[b.m]||[0,0,10])[2]+3);sp.center.set(0.5,0);sp.position.set(b.x+b.w/2,top,b.y+b.h/2);sp.renderOrder=10;scene.add(sp);
    L3.labels.push({sp,asp:tw/72,px:(b.kind==='dock'?18:22)*(mobile?0.8:1),size:b.kind==='dock'?DOCK*3:Math.max(b.w,b.h),key:b.key});}
  const sizeLabels=()=>{const Hh=host.clientHeight||H;for(const l of L3.labels){const s=2*l.px*tanH/Hh;l.sp.scale.set(s*l.asp,s,1);}};sizeLabels();
  // selection: a glowing outline and a tinted footprint, drawn through everything
  const acc=new THREE.Color(cssVar('--accent','#F59E0B'));
  const selBox=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:acc,transparent:true,depthTest:false}));
  const selFloor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:acc,transparent:true,opacity:dark?0.22:0.28,depthWrite:false}));
  selFloor.rotation.x=-Math.PI/2;selBox.renderOrder=9;selBox.visible=selFloor.visible=false;scene.add(selBox,selFloor);
  L3.select=key=>{const b=key&&model.byKey[key];if(!b){selBox.visible=selFloor.visible=false;return;}
    const h=b.kind==='dock'?5:((DIMS[b.m]||[0,0,10])[2]+1.5);selBox.scale.set(b.w+2,h,b.h+2);selBox.position.set(b.x+b.w/2,h/2,b.y+b.h/2);
    selFloor.scale.set(b.w+5,b.h+5,1);selFloor.position.set(b.x+b.w/2,0.08,b.y+b.h/2);selBox.visible=selFloor.visible=true;};
  L3.select(LX.sel);
  // orbit camera: start south of the site looking north, so left→right flow reads left→right like the 2D plan
  const home=()=>{const th=Math.PI/2-0.32,ph=0.86;return {tx:cx,ty:0,tz:cz,r:fitR(th,ph,cx,cz),th,ph};};
  const o=L3.orbit=keep&&L3.key===LX.sim.P.targets.map(t=>t.item).join()?keep:home();
  L3.key=LX.sim.P.targets.map(t=>t.item).join();
  const place=()=>{o.ph=Math.max(0.12,Math.min(1.45,o.ph));o.r=Math.max(15,Math.min(rad*8,o.r));
    cam.position.set(o.tx+o.r*Math.sin(o.ph)*Math.cos(o.th),o.ty+o.r*Math.cos(o.ph),o.tz+o.r*Math.sin(o.ph)*Math.sin(o.th));cam.lookAt(o.tx,o.ty,o.tz);
    scene.fog.near=o.r*1.15;scene.fog.far=o.r*1.15+rad*4;};
  place();
  let tw8=0;const animTo=(to)=>{cancelAnimationFrame(tw8);const fr={...o},t0=performance.now();
    const st=t=>{const p=reduceMotion?1:Math.min(1,(t-t0)/450),e=1-Math.pow(1-p,3);for(const k of ['tx','ty','tz','r','th','ph'])if(to[k]!==undefined)o[k]=fr[k]+(to[k]-fr[k])*e;place();if(p<1)tw8=requestAnimationFrame(st);};tw8=requestAnimationFrame(st);};
  L3.fit=()=>{const r0=fitR(o.th,o.ph,cx,cz);place();animTo({tx:cx,ty:0,tz:cz,r:r0});};
  L3.dolly=f=>animTo({r:o.r*f});
  L3.focus=b=>animTo({tx:b.x+b.w/2,tz:b.y+b.h/2,r:Math.min(o.r,Math.max(60,Math.max(b.w,b.h)*2.4))});
  $('#lx-zoomv').textContent='3D';
  const el=r.domElement;el.style.touchAction='none';const pts=new Map();let drag=null,pinch=null;
  el.addEventListener('pointerdown',e=>{cancelAnimationFrame(tw8);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);
    if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,r:o.r,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};drag=null;return;}
    drag={x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey||e.button===1,moved:false};});
  el.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pts.size>=2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),cxn=(a.x+b.x)/2,cyn=(a.y+b.y)/2;o.r=pinch.r*pinch.d/d;
      panBy((cxn-pinch.cx),(cyn-pinch.cy));pinch.cx=cxn;pinch.cy=cyn;place();return;}
    if(!drag)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;
    if(drag.pan)panBy(dx,dy);else{o.th+=dx*0.006;o.ph-=dy*0.005;}place();});
  // right = forward × up, forward = from camera towards the target on the ground plane
  const panBy=(dx,dy)=>{const s=o.r*0.0016,rx=Math.sin(o.th),rz=-Math.cos(o.th),fx=-Math.cos(o.th),fz=-Math.sin(o.th);o.tx+=(-rx*dx+fx*dy)*s;o.tz+=(-rz*dx+fz*dy)*s;};
  const up=e=>{const d=drag;pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(d&&!d.moved&&e.type==='pointerup'&&pts.size===0)pick3D(e);if(!pts.size)drag=null;};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('wheel',e=>{e.preventDefault();cancelAnimationFrame(tw8);o.r*=Math.exp(e.deltaY*(e.deltaMode===1?0.05:(e.ctrlKey?0.01:0.0012)));place();},{passive:false});
  L3.ro=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;r.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();sizeLabels();});L3.ro.observe(host);
  L3.last=performance.now();
  const lv=new THREE.Vector3(),placed=[];
  // big lines first, the selected one always; a label that would overlap one already shown is skipped
  L3.labels.sort((a,b)=>b.size-a.size);
  const layoutLabels=()=>{const Hh=host.clientHeight||H,Ww=host.clientWidth||W;placed.length=0;cam.updateMatrixWorld();
    const order=LX.sel?[...L3.labels.filter(l=>l.key===LX.sel),...L3.labels.filter(l=>l.key!==LX.sel)]:L3.labels;
    for(const l of order){const d=lv.copy(l.sp.position).sub(cam.position).length(),sel=l.key===LX.sel;
      if(!sel&&l.size*Hh/(2*d*tanH)<46){l.sp.visible=false;continue;}
      lv.copy(l.sp.position).project(cam);if(lv.z>1){l.sp.visible=false;continue;}
      const x=(lv.x+1)/2*Ww,y=(1-lv.y)/2*Hh,w=l.px*l.asp,rc=[x-w/2,y-l.px,x+w/2,y];
      if(!sel&&(rc[0]<4||rc[2]>Ww-4||rc[1]<4||placed.some(p=>rc[0]<p[2]+4&&rc[2]>p[0]-4&&rc[1]<p[3]+2&&rc[3]>p[1]-2))){l.sp.visible=false;continue;}
      placed.push(rc);l.sp.visible=true;}};
  const loop=t=>{const dt=Math.min(0.05,(t-L3.last)/1000);L3.last=t;if(!reduceMotion)stripe.offset.x-=dt*0.9;
    layoutLabels();r.render(scene,cam);L3.raf=requestAnimationFrame(loop);};
  L3.raf=requestAnimationFrame(loop);
  const hint=document.createElement('div');hint.className='l3-hint';hint.textContent=mobile?'1本指で回転 ・ 2本指で拡大と移動 ・ タップで選択':'ドラッグで回転 ・ 右ドラッグかShiftで移動 ・ ホイールで拡大 ・ クリックで選択';host.appendChild(hint);
}
function pick3D(e){
  if(!L3.r||!window.THREE)return;const THREE=window.THREE,rect=L3.r.domElement.getBoundingClientRect();
  const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(mouse,L3.cam);
  const hit=ray.intersectObjects(L3.picks,false)[0];
  let key=null;if(hit){if(hit.object.isInstancedMesh&&hit.instanceId!==undefined)key=hit.object.userData.keys[hit.instanceId];else key=hit.object.userData.key;}
  lxSelect(key||null);
}
