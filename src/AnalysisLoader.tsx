import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisLoaderProps {
  height?: number
  startPhase?: 1 | 2
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const GR = (a: number) => `rgba(16,185,129,${a})`
const G2 = (a: number) => `rgba(74,222,128,${a})`
const G3 = (a: number) => `rgba(134,239,172,${a})`
const RD = (a: number) => `rgba(220,38,38,${a})`
const R2 = (a: number) => `rgba(248,113,113,${a})`

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T1 = [
  { t: 'оцениваю ценовую динамику...', r: 'market analysis · phase 1' },
  { t: 'проверяю исторические паттерны...', r: 'edge detection' },
  { t: 'рассчитываю справедливую стоимость...', r: 'fair value model' },
  { t: 'ищу расхождение с рынком...', r: 'mispricing scan' },
  { t: 'взвешиваю kelly criterion...', r: 'position sizing' },
]
const T2 = [
  { t: 'изучаю контекст события...', r: 'event intelligence · phase 2' },
  { t: 'анализирую участников и факторы...', r: 'actor mapping' },
  { t: 'картографирую пространство факторов...', r: 'geographic mapping' },
  { t: 'строю сценарии исхода...', r: 'scenario tree' },
  { t: 'оцениваю crowd bias...', r: 'behavioral analysis' },
  { t: 'три независимых пути\nведут в одно место', r: 'инвариантность' },
  { t: 'форма знакома.\nно контекст изменился', r: 'паттерн в новой среде' },
  { t: 'граница между порядком\nи хаосом — здесь', r: 'точка бифуркации' },
  { t: 'формирую итоговый тезис...', r: 'synthesis complete' },
]
const S1 = ['Анализирую рыночные данные...','Вычисляю edge score...','Строю модель fair value...','Оцениваю Kelly criterion...','Завершаю анализ маркета...']
const S2 = ['Загружаю данные события...','Картографирую пространство факторов...','Строю сценарии исхода...','Оцениваю crowd bias...','Формирую Event Intelligence...']

// ─── Globe data ───────────────────────────────────────────────────────────────

const CONTINENTS_LL = [
  { pts: [[-125,48],[-95,49],[-83,46],[-75,35],[-82,25],[-90,29],[-97,26],[-104,29],[-117,32],[-124,37],[-125,48]] as [number,number][], col:'g' },
  { pts: [[-35,-5],[-39,-15],[-43,-23],[-50,-29],[-65,-35],[-69,-55],[-72,-54],[-57,-38],[-57,-35],[-73,-10],[-70,-18],[-60,-20],[-55,-27],[-35,-5]] as [number,number][], col:'r' },
  { pts: [[-2,44],[7,44],[13,47],[15,51],[8,58],[0,54],[-2,49],[-5,48],[-2,44]] as [number,number][], col:'g' },
  { pts: [[44,-12],[50,-24],[32,-22],[28,-18],[16,-34],[28,-34],[36,-12],[40,4],[50,12],[36,22],[25,22],[10,31],[10,22],[-8,22],[-2,36],[8,38],[20,32],[34,30],[44,-12]] as [number,number][], col:'r' },
  { pts: [[26,37],[44,37],[60,35],[65,25],[72,24],[88,28],[92,22],[105,20],[120,22],[130,42],[105,50],[82,48],[60,55],[40,55],[26,43],[26,37]] as [number,number][], col:'g' },
  { pts: [[114,-22],[130,-14],[140,-14],[150,-24],[152,-28],[150,-38],[140,-38],[130,-32],[116,-36],[114,-32],[112,-26],[114,-22]] as [number,number][], col:'r' },
  { pts: [[-44,60],[-20,60],[-18,70],[-26,76],[-44,76],[-52,70],[-44,60]] as [number,number][], col:'g' },
]
const HUBS: [number,number,string,(a:number)=>string][] = [
  [-74,40.7,'NYC',G2],[-118,34,'LA',GR],[-0.1,51.5,'LON',G2],[116,39.9,'BEJ',RD],
  [139.7,35.7,'TOK',RD],[72.8,19.1,'MUM',G2],[151.2,-33.9,'SYD',GR],[37.6,55.8,'MSK',RD],
]

// ─── Regions ──────────────────────────────────────────────────────────────────

interface City { x:number; y:number; n:string; C:(a:number)=>string; hot:boolean }
interface Region { id:string; label:string; seed:number; coast:[number,number][]; cities:City[]; links:[number,number][] }

const REGIONS: Region[] = [
  {
    id:'americas', label:'AMERICAS · SECTOR SCAN', seed:42,
    coast:[[.08,.05],[.18,.04],[.25,.08],[.30,.12],[.26,.18],[.32,.15],[.38,.22],[.36,.28],[.30,.38],[.26,.46],[.22,.54],[.18,.64],[.16,.72],[.18,.80],[.22,.88],[.28,.82],[.36,.84],[.40,.76],[.44,.56],[.46,.36],[.44,.24],[.46,.16],[.42,.08],[.30,.03],[.08,.05]],
    cities:[
      {x:.22,y:.22,n:'NYC',C:G2,hot:false},{x:.14,y:.30,n:'LA',C:G2,hot:false},
      {x:.18,y:.26,n:'CHI',C:RD,hot:true},{x:.38,y:.50,n:'MEX',C:G2,hot:false},
      {x:.30,y:.70,n:'BOG',C:RD,hot:true},{x:.28,y:.78,n:'LIM',C:G2,hot:false},
      {x:.32,y:.88,n:'SAO',C:RD,hot:false},{x:.26,y:.92,n:'BUE',C:G2,hot:false},
    ],
    links:[[0,2],[0,1],[2,1],[0,4],[4,5],[5,6],[6,7],[4,3],[3,5]],
  },
  {
    id:'eurasia', label:'EURASIA · SECTOR SCAN', seed:137,
    coast:[[.02,.20],[.08,.18],[.22,.16],[.30,.16],[.38,.12],[.50,.12],[.62,.12],[.75,.16],[.88,.16],[.96,.22],[.94,.28],[.90,.32],[.88,.38],[.90,.44],[.90,.56],[.86,.60],[.74,.64],[.62,.64],[.50,.62],[.38,.60],[.26,.58],[.14,.56],[.04,.54],[.02,.48],[.04,.30],[.02,.20]],
    cities:[
      {x:.22,y:.28,n:'LON',C:G2,hot:false},{x:.28,y:.30,n:'PAR',C:G2,hot:false},
      {x:.36,y:.28,n:'BER',C:RD,hot:true},{x:.56,y:.24,n:'MSK',C:RD,hot:true},
      {x:.44,y:.44,n:'IST',C:G2,hot:false},{x:.58,y:.48,n:'BAG',C:RD,hot:true},
      {x:.66,y:.50,n:'MUM',C:G2,hot:false},{x:.30,y:.58,n:'NAI',C:G2,hot:false},
    ],
    links:[[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[4,7],[3,5],[1,7]],
  },
  {
    id:'fareast', label:'FAR EAST · SECTOR SCAN', seed:213,
    coast:[[.06,.10],[.22,.10],[.38,.06],[.54,.10],[.70,.10],[.82,.10],[.94,.16],[.96,.22],[.94,.28],[.90,.34],[.88,.40],[.90,.46],[.84,.58],[.72,.64],[.60,.64],[.48,.66],[.36,.64],[.24,.62],[.12,.60],[.06,.56],[.04,.44],[.06,.32],[.06,.10]],
    cities:[
      {x:.58,y:.26,n:'BEJ',C:RD,hot:true},{x:.64,y:.30,n:'SHA',C:G2,hot:false},
      {x:.76,y:.28,n:'TOK',C:RD,hot:false},{x:.72,y:.32,n:'SEO',C:G2,hot:false},
      {x:.60,y:.46,n:'HAN',C:RD,hot:true},{x:.52,y:.50,n:'BKK',C:G2,hot:false},
      {x:.56,y:.56,n:'SIN',C:RD,hot:false},{x:.80,y:.60,n:'SYD',C:G2,hot:false},
      {x:.46,y:.36,n:'DEL',C:RD,hot:true},
    ],
    links:[[0,1],[0,2],[1,3],[2,3],[0,4],[4,5],[5,6],[6,7],[4,8],[8,5],[0,8]],
  },
]

// ─── Scene orders ─────────────────────────────────────────────────────────────

const P1_SCENES = [
  {id:'candles',  hold:280},
  {id:'price',    hold:260},
  {id:'graph',    hold:280},
  {id:'entities', hold:270},
]

const P2_SCENES = [
  {id:'globe',    hold:300},
  {id:'americas', hold:320},
  {id:'globe',    hold:280},
  {id:'eurasia',  hold:320},
  {id:'globe',    hold:280},
  {id:'fareast',  hold:320},
]

const ASSETS = ['BTC','ETH','SPX','DXY','GLD','OIL','EUR','JPY','BND']
const ACOL: Record<string,(a:number)=>string> = {BTC:RD,ETH:R2,SPX:G2,DXY:RD,GLD:G2,OIL:RD,EUR:G2,JPY:GR,BND:RD}
const ENTS = [
  {l:'Трамп',C:RD},{l:'Байден',C:G2},{l:'Путин',C:RD},{l:'Си Цзиньпин',C:RD},
  {l:'Нефть WTI',C:G2},{l:'Газ',C:G2},{l:'Золото',C:G2},{l:'Пшеница',C:RD},
  {l:'ФРС',C:RD},{l:'ЕЦБ',C:G2},{l:'Инфляция',C:RD},{l:'Рецессия',C:RD},
]

// ─── Noise ────────────────────────────────────────────────────────────────────

function noise2(x:number,y:number,s:number){return Math.sin(x*3.1+s)*Math.cos(y*2.7+s*.5)*Math.sin(x*y*.4+s*.3)}
function fbm(x:number,y:number,s:number){let v=0,a=1,f=1;for(let i=0;i<4;i++){v+=noise2(x*f,y*f,s+i*50)*a;a*=.5;f*=2}return v}

// ─── State ────────────────────────────────────────────────────────────────────

function mkState(){
  return {
    frame:0, phase:1 as 1|2,
    drops:[] as {y:number;sp:number;br:boolean;red:boolean}[],
    pH:[] as number[], pV:100, pPh:0, pTk:0,
    candles:[] as {open:number;close:number;high:number;low:number}[], cProg:0,
    globeRot:0,
    scanY:0, regionIdx:0, cityReveal:[] as {revealed:boolean;alpha:number}[], cornerAnim:0,
    entVals:Array.from({length:12},()=>({cur:.1+Math.random()*.6,target:.1+Math.random()*.9,speed:.008+Math.random()*.015})),
    scanLine:0,
    graphNodes:[] as {label:string;x:number;y:number;vx:number;vy:number;r:number}[],
    graphEdges:[] as {a:number;b:number;s:number}[],
  }
}
type S = ReturnType<typeof mkState>

// ─── Inits ────────────────────────────────────────────────────────────────────

function initDrops(s:S,w:number,h:number){s.drops=Array.from({length:Math.floor(w/13)},()=>({y:Math.random()*-(h/12),sp:.06+Math.random()*.12,br:Math.random()>.94,red:Math.random()>.72}))}
function tickPrice(s:S){s.pV+=Math.sin(s.pPh)*.08+(Math.random()-.49)*.9+(100-s.pV)*.004;s.pV=Math.max(55,Math.min(145,s.pV));s.pPh+=.018;s.pH.push(s.pV);if(s.pH.length>300)s.pH.shift()}
function initPrice(s:S){s.pH=[];s.pV=80+Math.random()*40;s.pPh=Math.random()*Math.PI*2;s.pTk=0;for(let i=0;i<60;i++)tickPrice(s)}
function initCandles(s:S){s.candles=[];s.cProg=0;let p=100;for(let i=0;i<28;i++){const o=p,c=o+(Math.random()-.47)*4.5;s.candles.push({open:o,close:c,high:Math.max(o,c)+Math.random()*2.2,low:Math.min(o,c)-Math.random()*2.2});p=c}}
function initGraph(s:S){s.graphNodes=ASSETS.map(a=>({label:a,x:.1+Math.random()*.8,y:.08+Math.random()*.84,vx:(Math.random()-.5)*.0016,vy:(Math.random()-.5)*.0016,r:5+Math.random()*5}));s.graphEdges=[];for(let i=0;i<s.graphNodes.length;i++)for(let j=i+1;j<s.graphNodes.length;j++)if(Math.random()>.42)s.graphEdges.push({a:i,b:j,s:.3+Math.random()*.7})}
function initRegion(s:S,idx:number){s.regionIdx=idx;s.scanY=0;s.cornerAnim=0;s.cityReveal=REGIONS[idx].cities.map(()=>({revealed:false,alpha:0}))}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

const MC='PRESCIO▲△↑↓∑∆≈%$€₿01新聞分析予測'.split('')

function drawMatrix(ctx:CanvasRenderingContext2D,s:S,w:number,h:number){
  s.drops.forEach((d,i)=>{
    const ch=MC[Math.floor(Math.random()*MC.length)],x=i*13+1,y=Math.floor(d.y)*12
    if(y>=0&&y<h){ctx.font='10px monospace';ctx.fillStyle=d.br&&Math.random()>.4?(d.red?RD(.42):G2(.38)):GR(.022+Math.random()*.018);ctx.fillText(ch,x,y)}
    d.y+=d.sp;if(d.y*12>h+14){d.y=Math.random()*-8;d.sp=.06+Math.random()*.12;d.br=Math.random()>.94;d.red=Math.random()>.72}
  })
}


function projectGlobe(lon:number,lat:number,rot:number,cx:number,cy:number,R:number){
  const lonR=(lon+rot)*Math.PI/180,latR=lat*Math.PI/180
  const x=R*Math.cos(latR)*Math.sin(lonR),y=-R*Math.sin(latR),z=Math.cos(latR)*Math.cos(lonR)
  return{x:cx+x,y:cy+y,visible:z>0}
}

function drawGlobe(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  s.globeRot+=.28;const R=Math.min(w,h)*.32,cx=w/2,cy=h/2
  ctx.save();ctx.globalAlpha=alpha
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle='rgba(2,8,2,0.7)';ctx.fill();ctx.strokeStyle=GR(.14);ctx.lineWidth=.8;ctx.stroke()
  ctx.beginPath();ctx.arc(cx,cy,R+3,0,Math.PI*2);ctx.strokeStyle=G2(.07);ctx.lineWidth=6;ctx.stroke()
  for(let lat=-60;lat<=60;lat+=30){ctx.beginPath();let f=true;for(let lon=-180;lon<=180;lon+=5){const p=projectGlobe(lon,lat,s.globeRot,cx,cy,R);if(!p.visible){f=true;continue}f?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);f=false}ctx.strokeStyle=GR(.06);ctx.lineWidth=.35;ctx.stroke()}
  for(let lon=0;lon<360;lon+=30){ctx.beginPath();let f=true;for(let lat=-80;lat<=80;lat+=5){const p=projectGlobe(lon,lat,s.globeRot,cx,cy,R);if(!p.visible){f=true;continue}f?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);f=false}ctx.strokeStyle=GR(.05);ctx.lineWidth=.35;ctx.stroke()}
  CONTINENTS_LL.forEach(cont=>{ctx.beginPath();let fv=true,hv=false;cont.pts.forEach(([lon,lat])=>{const p=projectGlobe(lon,lat,s.globeRot,cx,cy,R);if(!p.visible){fv=true;return}fv?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);fv=false;hv=true});if(hv){ctx.closePath();ctx.fillStyle=cont.col==='g'?G2(.1):RD(.08);ctx.fill();ctx.strokeStyle=cont.col==='g'?G2(.45):RD(.38);ctx.lineWidth=.8;ctx.stroke()}})
  HUBS.forEach(([lon,lat,name,C],i)=>{const p=projectGlobe(lon,lat,s.globeRot,cx,cy,R);if(!p.visible)return;const pp=(s.frame*.04+i*.4)%1;ctx.beginPath();ctx.arc(p.x,p.y,2+pp*7,0,Math.PI*2);ctx.strokeStyle=C((1-pp)*.28);ctx.lineWidth=.6;ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fillStyle=C(.85);ctx.fill();if(pp<.25){ctx.font='8px monospace';ctx.fillStyle=C(.44);ctx.fillText(name,p.x+4,p.y-3)}})
  const scanLon=(s.frame*.4)%360;ctx.beginPath();let sf=true;for(let lat=-80;lat<=80;lat+=4){const p=projectGlobe(scanLon,lat,s.globeRot,cx,cy,R);if(!p.visible){sf=true;continue}sf?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);sf=false}ctx.strokeStyle=G3(.32);ctx.lineWidth=1.1;ctx.stroke()
  ctx.beginPath();ctx.ellipse(cx,cy,R+12,R*.18+4,0,0,Math.PI*2);ctx.strokeStyle=GR(.07);ctx.lineWidth=.5;ctx.stroke()
  const oa=(s.frame*.025)%(Math.PI*2);ctx.beginPath();ctx.arc(cx+(R+12)*Math.cos(oa),cy+(R*.18+4)*Math.sin(oa),2,0,Math.PI*2);ctx.fillStyle=G2(.7);ctx.fill()
  const bz=14;[[cx-R-6,cy-R-6],[cx+R+6,cy-R-6],[cx-R-6,cy+R+6],[cx+R+6,cy+R+6]].forEach(([bx,by],qi)=>{const sx=qi%2===0?1:-1,sy=qi<2?1:-1;ctx.strokeStyle=G2(.35);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,by+sy*bz);ctx.lineTo(bx,by);ctx.lineTo(bx+sx*bz,by);ctx.stroke()})
  ctx.restore()
}

function drawRegion(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  const region=REGIONS[s.regionIdx];s.scanY=Math.min(s.scanY+.004,1);s.cornerAnim=Math.min(s.cornerAnim+.04,1)
  ctx.save();ctx.globalAlpha=alpha
  ctx.fillStyle=GR(.04);for(let x=8;x<w;x+=16)for(let y=8;y<h;y+=16){ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill()}
  ctx.beginPath();region.coast.forEach(([rx,ry],i)=>i===0?ctx.moveTo(rx*w,ry*h):ctx.lineTo(rx*w,ry*h));ctx.closePath();ctx.fillStyle=GR(.04);ctx.fill();ctx.strokeStyle=G2(.52);ctx.lineWidth=1.1;ctx.stroke()
  const res=28
  for(let lv=0;lv<10;lv++){const level=-.4+lv*.08,isHigh=lv>6;for(let j=0;j<res-1;j++){for(let i=0;i<res-1;i++){const midY=(j+.5)/res;if(midY>s.scanY+.025)continue;const fresh=Math.max(0,1-(s.scanY-midY)*4);const v00=fbm(i/res*3,j/res*2.5,region.seed),v10=fbm((i+1)/res*3,j/res*2.5,region.seed),v01=fbm(i/res*3,(j+1)/res*2.5,region.seed),v11=fbm((i+1)/res*3,(j+1)/res*2.5,region.seed);const x0=i/res*w,x1=(i+1)/res*w,y0=j/res*h,y1=(j+1)/res*h;const segs:[number,number][]=[];if((v00>level)!==(v10>level))segs.push([x0+(x1-x0)*(level-v00)/(v10-v00),y0]);if((v10>level)!==(v11>level))segs.push([x1,y0+(y1-y0)*(level-v10)/(v11-v10)]);if((v01>level)!==(v11>level))segs.push([x0+(x1-x0)*(level-v01)/(v11-v01),y1]);if((v00>level)!==(v01>level))segs.push([x0,y0+(y1-y0)*(level-v00)/(v01-v00)]);if(segs.length>=2){const ba=isHigh?(.18+fresh*.28):(.07+fresh*.13);ctx.beginPath();ctx.moveTo(segs[0][0],segs[0][1]);ctx.lineTo(segs[1][0],segs[1][1]);ctx.strokeStyle=isHigh?RD(ba):GR(ba);ctx.lineWidth=isHigh?.75:.4;ctx.stroke()}}}}
  if(s.scanY<1){const sy=s.scanY*h;const grd=ctx.createLinearGradient(0,sy-28,0,sy);grd.addColorStop(0,'rgba(74,222,128,0)');grd.addColorStop(1,'rgba(74,222,128,0.1)');ctx.fillStyle=grd;ctx.fillRect(0,sy-28,w,28);ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(w,sy);ctx.strokeStyle=G2(.6);ctx.lineWidth=.9;ctx.stroke()}
  region.cities.forEach((city,i)=>{const cr=s.cityReveal[i];if(!cr)return;if(city.y<=s.scanY+.01&&!cr.revealed)cr.revealed=true;if(cr.revealed)cr.alpha=Math.min(cr.alpha+.04,1);if(cr.alpha<=0)return;const cx2=city.x*w,cy2=city.y*h,pp=(s.frame*.04+i*.35)%1;ctx.globalAlpha=alpha*cr.alpha;ctx.beginPath();ctx.arc(cx2,cy2,3+pp*9,0,Math.PI*2);ctx.strokeStyle=city.C((1-pp)*.22);ctx.lineWidth=.6;ctx.stroke();ctx.beginPath();ctx.arc(cx2,cy2,2.8,0,Math.PI*2);ctx.fillStyle=city.C(.85);ctx.fill();ctx.strokeStyle=city.C(.38);ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(cx2-7,cy2);ctx.lineTo(cx2-4,cy2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx2+4,cy2);ctx.lineTo(cx2+7,cy2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx2,cy2-7);ctx.lineTo(cx2,cy2-4);ctx.stroke();ctx.beginPath();ctx.moveTo(cx2,cy2+4);ctx.lineTo(cx2,cy2+7);ctx.stroke();ctx.font=`bold ${city.hot?10:8}px monospace`;ctx.fillStyle=city.C(.6);ctx.fillText(city.n,cx2+9,cy2+3);ctx.globalAlpha=alpha})
  region.links.forEach(([a,b])=>{const ca=region.cities[a],cb=region.cities[b],ra=s.cityReveal[a],rb=s.cityReveal[b];if(!ra?.revealed||!rb?.revealed)return;const ax=ca.x*w,ay=ca.y*h,bx=cb.x*w,by=cb.y*h,mx=(ax+bx)/2,my=(ay+by)/2-Math.abs(bx-ax)*.1;ctx.globalAlpha=alpha*Math.min(ra.alpha,rb.alpha)*.45;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(mx,my,bx,by);ctx.strokeStyle=GR(.2);ctx.lineWidth=.55;ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);const t=((s.frame*.007+a*.2)%1),qt=1-t;ctx.beginPath();ctx.arc(qt*qt*ax+2*qt*t*mx+t*t*bx,qt*qt*ay+2*qt*t*my+t*t*by,1.5,0,Math.PI*2);ctx.fillStyle=(ca.hot||cb.hot)?RD(.8):G2(.8);ctx.fill();ctx.globalAlpha=alpha})
  const bz=14*s.cornerAnim;ctx.globalAlpha=alpha*s.cornerAnim;ctx.strokeStyle=G2(.4);ctx.lineWidth=1;[[4,4],[w-4,4],[4,h-4],[w-4,h-4]].forEach(([bx,by],qi)=>{const sx=qi%2===0?1:-1,sy=qi<2?1:-1;ctx.beginPath();ctx.moveTo(bx,by+sy*bz);ctx.lineTo(bx,by);ctx.lineTo(bx+sx*bz,by);ctx.stroke()});ctx.font='bold 9px monospace';ctx.fillStyle=G2(.5);ctx.fillText(region.label,8,h-10);ctx.font='9px monospace';ctx.fillStyle=GR(.32);ctx.fillText('SCAN '+Math.round(s.scanY*100)+'%',w-62,h-10);ctx.globalAlpha=alpha
  ctx.restore()
}

function drawCandles(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  s.cProg=Math.min(s.cProg+.04,s.candles.length);const vis=s.candles.slice(0,Math.floor(s.cProg)+1);if(!vis.length)return
  const maxP=Math.max(...vis.map(c=>c.high)),minP=Math.min(...vis.map(c=>c.low)),rng=maxP-minP||1
  const pad=38,cw=(w-pad*2)/s.candles.length*.58,gap=(w-pad*2)/s.candles.length
  const py=(p:number)=>h*.1+(h*.78)*(1-(p-minP)/rng)
  ctx.save();ctx.globalAlpha=alpha
  for(let i=0;i<=4;i++){const y=h*.1+i*(h*.78/4);ctx.strokeStyle=GR(.07);ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();ctx.font='8px monospace';ctx.fillStyle=GR(.2);ctx.fillText((maxP-i*(maxP-minP)/4).toFixed(1),pad-34,y+3)}
  vis.forEach((c,i)=>{const x=pad+i*gap+gap*.2,bull=c.close>=c.open,isLast=i===vis.length-1;ctx.strokeStyle=(bull?GR:R2)(.45);ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x+cw/2,py(c.high));ctx.lineTo(x+cw/2,py(c.low));ctx.stroke();const bY=Math.min(py(c.open),py(c.close)),bH=Math.max(1,Math.abs(py(c.close)-py(c.open)));const dH=isLast?bH*((s.cProg%1)||1):bH;ctx.fillStyle=(bull?G2:RD)(bull?.64:.54);ctx.fillRect(x,bull?bY+bH-dH:bY,cw,dH);ctx.strokeStyle=(bull?G2:RD)(bull?.8:.7);ctx.lineWidth=.6;ctx.strokeRect(x,bY,cw,bH)})
  const last=vis[vis.length-1],ly=py(last.close),bull=last.close>=last.open;ctx.setLineDash([3,5]);ctx.strokeStyle=(bull?G2:RD)(.48);ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(pad,ly);ctx.lineTo(w-pad,ly);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 9px monospace';ctx.fillStyle=(bull?G2:RD)(.85);ctx.fillText(last.close.toFixed(2),w-pad+3,ly+4)
  ctx.restore()
}

function drawPriceLine(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  s.pTk++;if(s.pTk%2===0)tickPrice(s);if(s.pH.length<2)return
  const rec=s.pH.slice(-100),mn=Math.min(...rec)-1.5,mx=Math.max(...rec)+1.5,rng=mx-mn||1
  const pL=38,pR=38,pT=h*.1,plotH=h*.8
  const py=(p:number)=>pT+plotH*(1-(p-mn)/rng)
  const px=(i:number)=>pL+(i/299)*(w-pL-pR)
  ctx.save();ctx.globalAlpha=alpha
  for(let i=0;i<=4;i++){const y=pT+i*plotH/4;ctx.strokeStyle=GR(.06);ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(pL,y);ctx.lineTo(w-pR,y);ctx.stroke();ctx.font='8px monospace';ctx.fillStyle=GR(.2);ctx.fillText((mx-i*(mx-mn)/4).toFixed(1),pL-34,y+3)}
  ctx.beginPath();s.pH.forEach((p,i)=>i===0?ctx.moveTo(px(i),py(p)):ctx.lineTo(px(i),py(p)));ctx.lineTo(px(s.pH.length-1),pT+plotH);ctx.lineTo(px(0),pT+plotH);ctx.closePath();ctx.fillStyle=GR(.04);ctx.fill()
  const rising=s.pH[s.pH.length-1]>=(s.pH[s.pH.length-8]||0)
  ctx.beginPath();s.pH.forEach((p,i)=>i===0?ctx.moveTo(px(i),py(p)):ctx.lineTo(px(i),py(p)));ctx.strokeStyle=rising?G2(.7):RD(.65);ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke()
  const tipX=px(s.pH.length-1),tipY=py(s.pH[s.pH.length-1]),pp=(s.frame*.05)%1
  ctx.beginPath();ctx.arc(tipX,tipY,2+pp*9,0,Math.PI*2);ctx.strokeStyle=(rising?G2:RD)((1-pp)*.3);ctx.lineWidth=.6;ctx.stroke();ctx.beginPath();ctx.arc(tipX,tipY,2.5,0,Math.PI*2);ctx.fillStyle=(rising?G2:RD)(.92);ctx.fill()
  ctx.setLineDash([2,5]);ctx.strokeStyle=(rising?G2:RD)(.22);ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.lineTo(w-pR,tipY);ctx.stroke();ctx.setLineDash([]);ctx.font='bold 9px monospace';ctx.fillStyle=(rising?G2:RD)(.8);ctx.fillText(s.pH[s.pH.length-1].toFixed(2),w-pR+3,tipY+4)
  ctx.restore()
}

function drawEntities(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  ctx.save();ctx.globalAlpha=alpha
  s.entVals.forEach(v=>{v.cur+=(v.target-v.cur)*v.speed;if(Math.abs(v.target-v.cur)<.02)v.target=.05+Math.random()*.9})
  s.scanLine=(s.scanLine+.9)%(w*.86);const sl=w*.07+s.scanLine
  ctx.strokeStyle=G2(.13);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sl,h*.05);ctx.lineTo(sl,h*.95);ctx.stroke()
  const cols=3,cellW=(w*.84)/cols,cellH=(h*.82)/Math.ceil(ENTS.length/cols),sx=w*.08,sy=h*.1
  ENTS.forEach((e,i)=>{const col=i%cols,row=Math.floor(i/cols),cx2=sx+col*cellW,cy2=sy+row*cellH,C=e.C;const boost=Math.abs(sl-(cx2+cellW*.5))<cellW*.6?(.6-Math.abs(sl-(cx2+cellW*.5))/cellW)*.42:0;if(row>0&&col===0){ctx.strokeStyle=GR(.04);ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(sx,cy2-2);ctx.lineTo(w*.92,cy2-2);ctx.stroke()}ctx.font='500 10px monospace';ctx.fillStyle=C(.36+boost);ctx.fillText(e.l,cx2,cy2+12);const bx=cx2,by=cy2+16,bw=cellW*.84,bh=3;ctx.fillStyle=GR(.06);ctx.fillRect(bx,by,bw,bh);ctx.fillStyle=C(.28+s.entVals[i].cur*.26+boost);ctx.fillRect(bx,by,bw*s.entVals[i].cur,bh);ctx.fillStyle=C(.82+boost);ctx.fillRect(bx+bw*s.entVals[i].cur-2,by,2,bh);ctx.beginPath();ctx.arc(bx+bw*s.entVals[i].cur,by+1.5,2,0,Math.PI*2);ctx.fillStyle=C(.62+boost*.4);ctx.fill();ctx.font='8px monospace';ctx.fillStyle=C(.25+boost);ctx.fillText(Math.round(s.entVals[i].cur*100)+'%',bx+bw+2,by+bh)})
  ctx.restore()
}

function drawGraph(ctx:CanvasRenderingContext2D,s:S,w:number,h:number,alpha:number){
  ctx.save();ctx.globalAlpha=alpha
  s.graphNodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;if(n.x<.07||n.x>.93)n.vx*=-1;if(n.y<.05||n.y>.95)n.vy*=-1})
  s.graphEdges.forEach(e=>{const a=s.graphNodes[e.a],b=s.graphNodes[e.b];ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.strokeStyle=GR(e.s*.13);ctx.lineWidth=e.s*1.0;ctx.stroke();const t=((s.frame*.009+e.a*.18)%1),qt=1-t,C=ACOL[ASSETS[e.a]]||G2;ctx.beginPath();ctx.arc(qt*a.x*w+t*b.x*w,qt*a.y*h+t*b.y*h,2,0,Math.PI*2);ctx.fillStyle=C(.82);ctx.fill()})
  s.graphNodes.forEach((n,i)=>{const p=1+Math.sin(s.frame*.04+i)*.1,C=ACOL[n.label]||G2;ctx.beginPath();ctx.arc(n.x*w,n.y*h,n.r*p,0,Math.PI*2);ctx.strokeStyle=C(.5);ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(n.x*w,n.y*h,n.r*.4,0,Math.PI*2);ctx.fillStyle=C(.22);ctx.fill();ctx.font='bold 8px monospace';ctx.fillStyle=C(.65);ctx.fillText(n.label,n.x*w-n.r*.9,n.y*h-n.r-3)})
  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalysisLoader({
  height=220, startPhase=1,
}: AnalysisLoaderProps) {
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const rafRef=useRef<number>(0)
  const stateRef=useRef<S>({...mkState(), phase: startPhase})
  const phaseRef=useRef<1|2>(startPhase)
  const p2Scene=useRef({idx:0,age:0,alpha:0})

  const [phase,setPhase]=useState<1|2>(startPhase)
  const [flash,setFlash]=useState(false)
  const [thoughtText,setThoughtText]=useState('')
  const [remarkText,setRemarkText]=useState('')
  const [remarkVis,setRemarkVis]=useState(false)
  const [statusText,setStatusText]=useState(startPhase===2?S2[0]:S1[0])
  const [pct,setPct]=useState(0)
  const [sceneLabel,setSceneLabel]=useState('')

  const typeRef=useRef<ReturnType<typeof setInterval>|null>(null)
  const tIdx=useRef(0)
  const sIdx=useRef(0)
  const pctT=useRef(0)
  const pctV=useRef(0)

  const typeThought=useCallback((obj:{t:string;r:string})=>{
    if(typeRef.current)clearInterval(typeRef.current)
    let ci=0;setRemarkVis(false);setThoughtText('')
    typeRef.current=setInterval(()=>{ci++;setThoughtText(obj.t.slice(0,ci));if(ci>=obj.t.length){clearInterval(typeRef.current!);setRemarkText(obj.r);setRemarkVis(true)}},40)
  },[])

  const nextThought=useCallback(()=>{
    const arr=phaseRef.current===1?T1:T2
    typeThought(arr[tIdx.current%arr.length]);tIdx.current++
  },[typeThought])

  useEffect(()=>{
    const s=stateRef.current
    const canvas=canvasRef.current!
    const ctx=canvas.getContext('2d')!
    function resize(){canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight||height}
    resize()
    initDrops(s,canvas.width,canvas.height);initPrice(s);initCandles(s);initGraph(s);initRegion(s,0)
    const scenes=startPhase===1?P1_SCENES:P2_SCENES
    setSceneLabel(scenes[0].id)
    nextThought()
    const tTimer=setInterval(nextThought,3600)
    const statusArr=startPhase===1?S1:S2
    const sTimer=setInterval(()=>{setStatusText(statusArr[sIdx.current%statusArr.length]);sIdx.current++},1700)
    const pTimer=setInterval(()=>{pctT.current=Math.min(pctT.current+2+Math.random()*2.5,97)},420)
    const paTimer=setInterval(()=>{pctV.current+=(pctT.current-pctV.current)*.14;setPct(Math.round(pctV.current))},30)

    const FD=28
    function loop(){
      const w=canvas.width,h=canvas.height
      ctx.fillStyle='rgba(2,5,2,0.28)';ctx.fillRect(0,0,w,h)
      drawMatrix(ctx,s,w,h)
      const sc=p2Scene.current
      sc.age++
      const scene=scenes[sc.idx%scenes.length]
      if(sc.age<FD)sc.alpha=sc.age/FD
      else if(sc.age>scene.hold-FD)sc.alpha=Math.max(0,(scene.hold-sc.age)/FD)
      else sc.alpha=1
      if(sc.age>=scene.hold){
        sc.idx=(sc.idx+1)%scenes.length;sc.age=0;sc.alpha=0
        const next=scenes[sc.idx]
        setSceneLabel(next.id)
        if(next.id==='candles')initCandles(s)
        if(next.id==='graph')initGraph(s)
        if(next.id==='price')initPrice(s)
        if(next.id==='americas')initRegion(s,0)
        if(next.id==='eurasia')initRegion(s,1)
        if(next.id==='fareast')initRegion(s,2)
      }
      const id=scene.id
      if(id==='globe')drawGlobe(ctx,s,w,h,sc.alpha)
      else if(id==='americas'||id==='eurasia'||id==='fareast')drawRegion(ctx,s,w,h,sc.alpha)
      else if(id==='candles')drawCandles(ctx,s,w,h,sc.alpha)
      else if(id==='price')drawPriceLine(ctx,s,w,h,sc.alpha)
      else if(id==='entities')drawEntities(ctx,s,w,h,sc.alpha)
      else if(id==='graph')drawGraph(ctx,s,w,h,sc.alpha)
      s.frame++
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return()=>{
      cancelAnimationFrame(rafRef.current)
      clearInterval(tTimer);clearInterval(sTimer);clearInterval(pTimer);clearInterval(paTimer)
      if(typeRef.current)clearInterval(typeRef.current)
    }
  },[height,startPhase,nextThought])

  const step1State = phase===1?'active':'done'
  const step2State = phase===2?'active':'pending'

  return(
    <div style={{fontFamily:'"JetBrains Mono","Fira Code","Cascadia Code",monospace'}}>
      {/* Vertical stepper */}
      <div style={{display:'flex',gap:12,marginBottom:12}}>
        {/* Steps column */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:2}}>
          <StepDot state={step1State}/>
          <div style={{width:1,flex:1,background:step1State==='done'?'rgba(34,197,94,.35)':'rgba(255,255,255,.07)',transition:'background .6s',marginTop:4,marginBottom:4,minHeight:24}}/>
          <StepDot state={step2State}/>
        </div>
        {/* Labels column */}
        <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',gap:0,minWidth:0}}>
          <StepLabel num="01" label="Market Analysis" sub="edge · fair value · kelly" state={step1State}/>
          <div style={{flex:1}}/>
          <StepLabel num="02" label="Event Intelligence" sub="globe · regions · scenarios" state={step2State}/>
        </div>
        {/* Progress column */}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9,color:'rgba(16,185,129,.35)',letterSpacing:'.08em',marginBottom:2,whiteSpace:'nowrap'}}>
              {sceneLabel?sceneLabel.toUpperCase().replace(/_/g,' '):''}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:60,height:1.5,background:'rgba(16,185,129,.08)',borderRadius:1,overflow:'hidden'}}>
                <div style={{height:'100%',background:'#22c55e',borderRadius:1,width:`${pct}%`,transition:'width .8s cubic-bezier(.4,0,.2,1)'}}/>
              </div>
              <div style={{fontSize:9,color:'rgba(16,185,129,.4)',width:24,textAlign:'right',flexShrink:0}}>{pct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{position:'relative',borderRadius:6,overflow:'hidden',background:'#080c08',border:'0.5px solid rgba(16,185,129,.1)'}}>
        <canvas ref={canvasRef} style={{display:'block',width:'100%',height}}/>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:'0 48px',pointerEvents:'none'}}>
          <div style={{fontSize:13,color:'#d4ffd4',lineHeight:1.75,textAlign:'center',whiteSpace:'pre-line',minHeight:52,display:'flex',alignItems:'center'}}>{thoughtText}<Cursor/></div>
          <div style={{fontSize:9,color:'rgba(16,185,129,.35)',letterSpacing:'.06em',minHeight:14,opacity:remarkVis?1:0,transition:'opacity .5s'}}>{remarkText}</div>
        </div>
        <Corners/>
        {flash&&<div style={{position:'absolute',inset:0,background:'rgba(34,197,94,.07)',borderRadius:6,pointerEvents:'none'}}/>}
      </div>

      {/* Status bar */}
      <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:'#22c55e',flexShrink:0,animation:'ldot 1.2s ease-in-out infinite'}}/>
        <div style={{fontSize:9,color:'rgba(16,185,129,.5)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{statusText}</div>
      </div>
      <style>{`@keyframes ldot{0%,100%{opacity:1}50%{opacity:.12}}@keyframes sp{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.3)}50%{box-shadow:0 0 0 4px rgba(74,222,128,0)}}`}</style>
    </div>
  )
}

function StepDot({state}:{state:'active'|'done'|'pending'}){
  const c={
    active:{border:'#4ade80',bg:'rgba(74,222,128,.12)',text:'#4ade80'},
    done:  {border:'rgba(34,197,94,.5)',bg:'rgba(34,197,94,.06)',text:'rgba(34,197,94,.7)'},
    pending:{border:'rgba(255,255,255,.1)',bg:'transparent',text:'rgba(255,255,255,.18)'},
  }[state]
  return(
    <div style={{width:18,height:18,borderRadius:'50%',border:`1px solid ${c.border}`,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,animation:state==='active'?'sp 1.4s ease-in-out infinite':'none',transition:'all .5s'}}>
      {state==='done'
        ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke={c.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <div style={{width:4,height:4,borderRadius:'50%',background:c.text,opacity:state==='active'?1:.4}}/>
      }
    </div>
  )
}

function StepLabel({num,label,sub,state}:{num:string;label:string;sub:string;state:'active'|'done'|'pending'}){
  const active=state==='active',done=state==='done'
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:1}}>
        <span style={{fontSize:8,fontWeight:700,color:active?'rgba(74,222,128,.5)':done?'rgba(34,197,94,.3)':'rgba(255,255,255,.12)',letterSpacing:'.06em'}}>{num}</span>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:active?'#4ade80':done?'rgba(34,197,94,.55)':'rgba(255,255,255,.18)',transition:'color .5s'}}>{label}</span>
        {active&&<span style={{fontSize:7,color:'rgba(74,222,128,.5)',letterSpacing:'.08em',marginLeft:2}}>● RUNNING</span>}
        {done&&<span style={{fontSize:7,color:'rgba(34,197,94,.35)',letterSpacing:'.06em',marginLeft:2}}>DONE</span>}
      </div>
      <div style={{fontSize:7,color:active?'rgba(16,185,129,.4)':done?'rgba(34,197,94,.22)':'rgba(255,255,255,.1)',letterSpacing:'.08em',paddingLeft:13}}>{sub}</div>
    </div>
  )
}

function Cursor(){
  const[on,setOn]=useState(true)
  useEffect(()=>{const id=setInterval(()=>setOn(v=>!v),400);return()=>clearInterval(id)},[])
  return<span style={{display:'inline-block',width:2,height:12,background:on?'#22c55e':'transparent',marginLeft:1,verticalAlign:'middle',flexShrink:0}}/>
}

function Corners(){
  const s:React.CSSProperties={position:'absolute',width:10,height:10,borderColor:'rgba(74,222,128,.28)',borderStyle:'solid'}
  return(
    <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <div style={{...s,top:5,left:5,borderWidth:'1px 0 0 1px'}}/>
      <div style={{...s,top:5,right:5,borderWidth:'1px 1px 0 0'}}/>
      <div style={{...s,bottom:5,left:5,borderWidth:'0 0 1px 1px'}}/>
      <div style={{...s,bottom:5,right:5,borderWidth:'0 1px 1px 0'}}/>
    </div>
  )
}
