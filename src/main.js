import './tokens.css'
import './scalper.css'
import {initScanners} from './scanners.js'
import {initFb2} from './fb2.js'
import {initWatchlist} from './watchlist.js'
import {initLive} from './live.js'
import {resolve} from './eligibility.js'

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// ---------- data (captured from the app on 9 Nov 2026; rows marked s:1 are sample fill-ins) ----------
const S={
 DATAPATTNS:["Data Patterns (India)",4032.00,328.00],IREDA:["Indian Renew. Energy Dev",120.00,8.67],PNB:["Punjab National Bank",132.25,6.70],
 EMAMILTD:["Emami",410.95,19.65],EXIDEIND:["Exide Industries",383.20,16.85],BANKBARODA:["Bank of Baroda",259.79,10.89],COCHINSHIP:["Cochin Shipyard",1290.00,53.50],
 JUBLFOOD:["Jubilant Foodworks",428.40,-22.60],TENNECO:["Tenneco Clean Air India",424.80,-13.20],PIIND:["PI Industries",1706.40,-44.30],
 IKS:["Inventurus Knowledge Solutions",1650.80,-37.10],AMBER:["Amber ENT India",6227.50,-126.50],
 SCHNEIDER:["Schneider Electric Infra",1066.30,-48.10],EMCURE:["Emcure Pharmaceuticals",2218.40,-61.60],OLAELEC:["Ola Electric Mobility",33.98,-0.50],
 HYUNDAI:["Hyundai Motor India",2108.10,-27.30],CASTROLIND:["Castrol India",190.30,-1.26],
 HUDCO:["Housing & Urban Dev",169.14,5.45],KALYANKJIL:["Kalyan Jewellers India",611.00,19.00],HAVELLS:["Havells India",1159.50,36.50],AUROPHARMA:["Aurobindo Pharma",1855.30,51.30],
 COFORGE:["Coforge",1912.40,38.60,1],MAXHEALTH:["Max Healthcare Institute",1184.10,19.70,1],TRENT:["Trent",4870.00,62.50,1],
 ADANIENT:["Adani Enterprises",2706.30,-24.70],TATAGOLD:["Tata Gold ETF",13.76,0.04],
 // Watchlist → Stock Scanners → Gainers, captured from SAHI 968 on 9 Nov; plus the Recently viewed MCX future
 GLAXO:["Glaxosmithkline Pharma",2710.00,170.40],UNIONBANK:["Union Bank of India",197.00,10.45],SANSERA:["Sansera Engineering",4653.40,239.10],
 GLAND:["Gland Pharma",3302.40,169.60],IRB:["IRB Infrastructure Dev",18.27,0.93],CRUDEOILM:["Crude Oil Mini 19 Nov Fut",8273.00,-283.00]
};
const SCAN={
 pvb:{name:"Price Volume Breakout",bull:["DATAPATTNS","IREDA","PNB","EMAMILTD","EXIDEIND","BANKBARODA","COCHINSHIP"],bear:["JUBLFOOD","TENNECO","PIIND"]},
 em:{name:"Early Mover",bull:["HUDCO","KALYANKJIL","HAVELLS","AUROPHARMA"],bear:["TENNECO","IKS","AMBER"]},
 orb:{name:"Opening Range Breakout",bull:["COFORGE","MAXHEALTH","TRENT"],bear:["SCHNEIDER","EMCURE","OLAELEC","HYUNDAI","CASTROLIND"]}
};
const fbHook={update(){},setInput(){}}; // order bar + form (fb2.js) re-render on order changes
const LISTS=[{name:"Stock Scanners",items:["ADANIENT"]},{name:"xyz",items:[]},{name:"New watchlist",items:[]},{name:"New watchlist",items:[]}]; // the 4 lists on the signed-in account
const HOLD={TATAGOLD:{qty:1,avg:14.16}};
const st={src:"scan",scan:"pvb",dir:"bull",list:0,sym:"TATAGOLD",group:["TATAGOLD"],mode:"mkt",limit:null,qty:1,legend:false,sort:"popular",holdView:false,prod:"mis",prodPref:"mis"};

const fmt=n=>n.toFixed(2), sign=n=>(n>=0?"+":"")+fmt(n);
const pct=k=>{const [,l,c]=S[k];return Math.abs(c/(l-c)*100)};
const chgTxt=k=>{const c=S[k][2];return `${sign(c)} (${pct(k).toFixed(2)}%)`};

// ---------- sheets ----------
const scrim=$("#scrim"); let open=[];
function showSheet(id){const el=$("#sh-"+id); el.hidden=false; scrim.hidden=false; requestAnimationFrame(()=>requestAnimationFrame(()=>{el.classList.add("show");scrim.classList.add("show")})); open.push(id); el.querySelectorAll(".seg").forEach(placeThumb); scrim.style.zIndex=20+open.length*2-1; el.style.zIndex=20+open.length*2;}
function hideSheet(id,cb){const el=$("#sh-"+id); if(!el||el.hidden) return cb&&cb(); el.classList.remove("show"); open=open.filter(x=>x!==id);
  if(!open.length) scrim.classList.remove("show"); else scrim.style.zIndex=20+open.length*2-1;
  setTimeout(()=>{el.hidden=true; if(!open.length) scrim.hidden=true; cb&&cb()},matchMedia("(prefers-reduced-motion:reduce)").matches?0:300);}
const top=()=>open[open.length-1];
scrim.onclick=()=>{const t=top(); if(t) closeTop(t)};
function closeTop(t){ if(t==="switch") return hideSheet("switch",()=>{ if($("#scalper").hidden) enterScalper(st.sym)}); hideSheet(t)}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){ if(!$("#tourTip").hidden) return endTour(); const t=top(); if(t) closeTop(t)}});
$$("[data-close]").forEach(b=>b.onclick=()=>hideSheet(b.closest(".sheet").id.slice(3)));

// segmented controls (DLS Segment switcher)
function placeThumb(seg){const on=seg.querySelector("button.on"), th=seg.querySelector(".thumb"); if(!on||!th) return; th.style.left=on.offsetLeft+"px"; th.style.width=on.offsetWidth+"px";}
const segRO=new ResizeObserver(es=>es.forEach(e=>placeThumb(e.target)));
document.querySelectorAll(".seg").forEach(s=>segRO.observe(s));
function bindSeg(seg,cb){seg.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{seg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b)); placeThumb(seg); cb&&cb(b.dataset.v,b)}));}

// ---------- home / trade ----------
$("#navTrade").onclick=()=>showSheet("trade");
// Founder feedback (5 Nov): Stock Scalper opens on a full page of intraday scanners; the chart comes only after a stock is picked.
$("#openStockScalper").onclick=()=>hideSheet("trade",()=>renderSC.openAll("scalper"));

// ---------- Stocks on the move (was "Switch symbol") ----------
const tabsEl=$("#swTabs"), listEl=$("#swList");
function curItems(){
  if(st.src==="scan") return [...SCAN[st.scan][st.dir]];
  if(st.src==="hold") return Object.keys(HOLD);
  return [...LISTS[st.list].items];
}
function sorted(items){const a=[...items], by={ltpd:k=>-S[k][1],ltpa:k=>S[k][1],chd:k=>-S[k][2]/S[k][1],cha:k=>S[k][2]/S[k][1]}[st.sort]; return by?a.sort((x,y)=>by(x)-by(y)):a}
function renderSwitch(){
  $$("#srcChips .schip").forEach(c=>{const on=c.dataset.src===st.src; c.classList.toggle("on",on); const ck=c.querySelector(".ck"); if(on&&!ck) c.insertAdjacentHTML("beforeend",'<i class="i ck" style="font-size:16px">&#xe029;</i>'); if(!on&&ck) ck.remove();});
  tabsEl.hidden=st.src==="hold"; $("#bbRow").hidden=st.src!=="scan";
  if(st.src==="scan"){
    tabsEl.innerHTML=Object.entries(SCAN).map(([k,v])=>`<button class="tab${k===st.scan?" on":""}" data-k="${k}">${v.name}${k===st.scan?'<i class="i info" data-info="'+k+'">&#xe065;</i>':""}</button>`).join("");
  } else if(st.src==="lists"){
    tabsEl.innerHTML=LISTS.map((l,i)=>`<button class="tab${i===st.list?" on":""}" data-l="${i}">${l.name}</button>`).join("")+'<span class="addtab" aria-label="New watchlist"><i class="i">&#xe0bc;</i></span>';
  }
  tabsEl.querySelectorAll(".tab").forEach(t=>t.onclick=e=>{
    if(e.target.dataset.info){ if(e.target.dataset.info==="pvb") $("#pvbTip").hidden=false; return }
    if(t.dataset.k){st.scan=t.dataset.k} else st.list=+t.dataset.l; $("#pvbTip").hidden=true; renderSwitch(); t.scrollIntoView({inline:"nearest",block:"nearest"});
    const n=tabsEl.querySelector(".tab.on"); n&&n.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});
  });
  $$("#bbTog button").forEach(b=>b.classList.toggle("on",b.dataset.d===st.dir));
  const items=sorted(curItems());
  if(!items.length){listEl.innerHTML=`<div class="empty"><span class="bmb">Your watchlist is empty</span><span class="bs sec">Add Stocks, ETFs or F&amp;O you want to track.</span></div>`;return}
  listEl.innerHTML=items.map(k=>{const [n,l,c]=S[k], h=st.src==="hold"?HOLD[k]:null;
    return `<button class="row" data-sym="${k}"><span class="l"><span class="bm">${n}${k==="ADANIENT"?'<i class="i" style="font-size:14px">&#xe000;</i>':""}</span><span class="bs ter">NSE${h?' <span style="color:var(--text-tertiary)">•</span> <span class="num">'+h.qty+'</span>':""}</span></span><span class="r"><span class="bmb num" data-px="${k}">${fmt(l)}</span><span class="bs num ${c>=0?"pos":"neg"}" data-ch="${k}">${sign(c)} (${pct(k).toFixed(2)}%)</span></span></button>`}).join("");
  listEl.querySelectorAll(".row").forEach(r=>r.onclick=()=>{st.group=items; hideSheet("switch",()=>enterScalper(r.dataset.sym))});
}
$$("#srcChips .schip").forEach(c=>c.onclick=()=>{st.src=c.dataset.src; $("#pvbTip").hidden=true; renderSwitch()});
$$("#bbTog button").forEach(b=>b.onclick=()=>{st.dir=b.dataset.d; renderSwitch()});
$("#tipX").onclick=()=>$("#pvbTip").hidden=true;

// filter & sort
const FILTER={
 Index:{type:"radio",opts:["Nifty 500","Nifty 50","Largecap 100","Midcap 150","Smallcap 250","Nifty F&O","All Stocks"],def:"Nifty 500"},
 Watchlists:{type:"check",opts:["Select all","Stock Scanners","xyz","New watchlist"]},
 Sector:{type:"check",search:1,opts:["Select all","Aerospace & Defence","Agro Chemicals","Air Transport Service","Alcoholic Beverages","Auto Ancillaries","Automobile","Banks","Bearings","Cables","Capital Goods","Cement","Chemicals","Consumer Durables","Finance","FMCG","Healthcare","Infrastructure","IT - Software","Metals","Oil & Gas","Pharmaceuticals","Power","Realty","Retail","Telecom","Textiles"]},
 "Market Cap":{type:"check",opts:["Large","Mid","Small"]},
 "Price Change of 1%":{type:"radio",opts:["None","5 min","15 min","1 hour"],def:"None"},
 "Relative volume":{type:"radio",opts:["None","> 1×","≥ 1.5×","≥ 2×","≥ 5×","≥ 10×"],def:"None"}
};
const SORTS=[["popular","Popular"],["ltpd","LTP (High to low)"],["ltpa","LTP (Low to high)"],["chd","Change % (High to low)"],["cha","Change % (Low to high)"],["vold","Volume (High to low)"],["vola","Volume (Low to high)"]];
let fState={}, fCat="Index", sortDraft=st.sort, fsMode="filter", fQuery="";
const resetF=()=>{fState={};for(const[k,v]of Object.entries(FILTER)) fState[k]=v.type==="radio"?v.def:new Set()};
resetF(); let fApplied=JSON.stringify(serF());
function serF(){return Object.fromEntries(Object.entries(fState).map(([k,v])=>[k,v instanceof Set?[...v].sort():v]))}
const isDef=k=>{const v=fState[k], d=FILTER[k]; return d.type==="radio"?v===d.def:v.size===0};
function renderFilter(){
  $("#rail").innerHTML=Object.keys(FILTER).map(k=>`<button class="${k===fCat?"on":""}" data-c="${k}">${k}${k==="Index"||!isDef(k)?'<span class="d"></span>':""}</button>`).join("");
  $$("#rail button").forEach(b=>b.onclick=()=>{fCat=b.dataset.c;fQuery="";renderFilter()});
  const d=FILTER[fCat], v=fState[fCat];
  let opts=d.opts; if(d.search&&fQuery) opts=opts.filter(o=>o==="Select all"||o.toLowerCase().includes(fQuery.toLowerCase()));
  $("#opts").innerHTML=(d.search?`<label class="osearch"><i class="i" style="font-size:18px;color:var(--icon-secondary)">&#xe30a;</i><input id="fSearch" placeholder="Search" value="${fQuery}"></label>`:"")+
    opts.map(o=>{const on=d.type==="radio"?v===o:(o==="Select all"?v.size===d.opts.length-(d.opts[0]==="Select all"?1:0):v.has(o));
      return `<button class="opt${on?" on":""}" data-o="${o}">${o.replace(/&/g,"&amp;")}<span class="${d.type==="radio"?"radio":"cbox"}">${d.type==="radio"?"":'<i class="i">&#xe029;</i>'}</span></button>`}).join("");
  const fs=$("#fSearch"); if(fs){fs.oninput=e=>{fQuery=e.target.value;const p=e.target.selectionStart;renderFilter();const n=$("#fSearch");n.focus();n.setSelectionRange(p,p)}}
  $$("#opts .opt").forEach(b=>b.onclick=()=>{const o=b.dataset.o;
    if(d.type==="radio") fState[fCat]=o; else if(o==="Select all"){const all=d.opts.filter(x=>x!=="Select all"); fState[fCat]=v.size===all.length?new Set():new Set(all)} else {v.has(o)?v.delete(o):v.add(o)}
    renderFilter()});
  $("#fApply").disabled=JSON.stringify(serF())===fApplied;
}
function renderSort(){
  $("#fsSort").innerHTML=SORTS.map(([k,l])=>`<button class="opt${k===sortDraft?" on":""}" data-s="${k}">${l}<span class="radio"></span></button>`).join("");
  $$("#fsSort .opt").forEach(b=>b.onclick=()=>{sortDraft=b.dataset.s;renderSort()});
  $("#fApply").disabled=sortDraft===st.sort;
}
bindSeg($("#fsSeg"),v=>{fsMode=v;$("#fsFilter").hidden=v!=="filter";$("#fsSort").hidden=v!=="sort";$("#fClear").textContent=v==="sort"?"Reset":"Clear all";v==="sort"?renderSort():renderFilter()});
$("#btnFilter").onclick=()=>{sortDraft=st.sort;renderFilter();showSheet("filter")};
$("#fClear").onclick=()=>{if(fsMode==="sort"){sortDraft="popular";renderSort()}else{resetF();renderFilter()}};
$("#fApply").onclick=()=>{if(fsMode==="sort"){st.sort=sortDraft}else{fApplied=JSON.stringify(serF())} $("#fDot").hidden=st.sort==="popular"&&fApplied===JSON.stringify((()=>{const t=fState;resetF();const r=serF();fState=t;return r})()); hideSheet("filter"); renderSwitch(); renderSC()};

// ---------- scalper ----------
function enterScalper(sym){
  $("#home").hidden=true; $("#scalper").hidden=false;
  if(!st.group.includes(sym)) st.group=st.src==="hold"?Object.keys(HOLD):[sym];
  loadSymbol(sym); requestAnimationFrame(()=>{placeThumb($("#modeSeg"));sizeCanvas();renderPills(true);nudgeStrip()});
}
let scBack="#home";
// Back goes to where the stock was picked; the scanners page keeps its scroll and brings the last-viewed stock into view.
$("#btnClose").onclick=()=>{stopNudge(); $("#scalper").hidden=true; $(scBack).hidden=false;
  if(scBack==="#scanAll"){renderSC.syncFromScalper(); const r=$(`#saBody [data-sym="${st.sym}"]`); r&&r.scrollIntoView({block:"nearest"})}
  scBack="#home"};
$("#btnList").onclick=()=>{renderSwitch();showSheet("switch")};

// ---------- stock strip: slide through the list without leaving the chart ----------
// The strip snaps the centred chip. While a finger drags it, the chip under the centre lights up with a light haptic tick;
// when the scroll settles, that stock's chart loads and slides in from the side it came from.
const pillsEl=$("#pills"), track=$("#pillTrack");
const reduceMotion=()=>matchMedia("(prefers-reduced-motion:reduce)").matches;
let pillKey="", nearSym=null, userScroll=false, settleT=0;
function renderPills(force){
  const key=st.group.join();
  if(force||key!==pillKey){
    pillKey=key;
    track.innerHTML=st.group.map(k=>{const c=S[k][2];return `<button class="pill press" role="option" data-sym="${k}"><span class="bs">${k}</span><span class="bx num ch ${c>=0?"pos":"neg"}" data-ch="${k}" data-cf="pill">${c>=0?"+":"\u2212"}${pct(k).toFixed(2)}%</span></button>`}).join("");
    track.querySelectorAll(".pill").forEach(p=>p.onclick=()=>{userScroll=false; loadSymbol(p.dataset.sym)});
    const ps=track.querySelectorAll(".pill"); if(ps.length){ // padding so the first and last chip can sit in the centre
      track.style.paddingLeft=Math.max(0,(pillsEl.clientWidth-ps[0].offsetWidth)/2)+"px";
      track.style.paddingRight=Math.max(0,(pillsEl.clientWidth-ps[ps.length-1].offsetWidth)/2)+"px";}
  }
  const i=st.group.indexOf(st.sym);
  track.querySelectorAll(".pill").forEach(p=>{const on=p.dataset.sym===st.sym; p.classList.toggle("on",on); p.classList.remove("near"); p.setAttribute("aria-selected",on)});
  nearSym=st.sym;
  $("#navCount").textContent=st.group.length>1?`${i+1}/${st.group.length}`:"";
  centrePill(force?"instant":"smooth");
}
function centrePill(behavior){
  const on=track.querySelector(".pill.on"); if(!on||!pillsEl.clientWidth) return;
  pillsEl.scrollTo({left:on.offsetLeft+on.offsetWidth/2-pillsEl.clientWidth/2,behavior:reduceMotion()?"instant":behavior});
}
function centredSym(){
  const mid=pillsEl.scrollLeft+pillsEl.clientWidth/2; let best=null,d=1e9;
  track.querySelectorAll(".pill").forEach(p=>{const dd=Math.abs(p.offsetLeft+p.offsetWidth/2-mid); if(dd<d){d=dd;best=p}});
  return best&&best.dataset.sym;
}
pillsEl.addEventListener("pointerdown",()=>{userScroll=true; stopNudge()});
pillsEl.addEventListener("touchstart",()=>{userScroll=true; stopNudge()},{passive:true});
pillsEl.addEventListener("wheel",()=>{userScroll=true; stopNudge()},{passive:true});
pillsEl.addEventListener("scroll",()=>{
  if(userScroll){const k=centredSym(); if(k&&k!==nearSym){nearSym=k;
    track.querySelectorAll(".pill").forEach(p=>p.classList.toggle("near",p.dataset.sym===k&&k!==st.sym));
    navigator.vibrate&&navigator.vibrate(6)}}
  clearTimeout(settleT); settleT=setTimeout(settle,160); // fallback for browsers without scrollend
},{passive:true});
pillsEl.addEventListener("scrollend",()=>{clearTimeout(settleT); settle()});
function settle(){ if(!userScroll) return; userScroll=false; const k=centredSym(); if(k&&k!==st.sym) loadSymbol(k); else renderPills() }

// Chart and stock name enter from the side of the stock they came from: next stock from the right, previous from the left.
function slideChart(dir){
  const els=[$("#chartWrap"),$("#symText")]; els.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
  if(!dir) return;
  const kf=reduceMotion()?[{opacity:.4},{opacity:1}]:[{transform:`translateX(${dir*20}px)`,opacity:0},{transform:"none",opacity:1}];
  els.forEach(el=>el.animate(kf,{duration:reduceMotion()?150:220,easing:"cubic-bezier(.23,1,.32,1)"}));
}

// Slide nudge: every time the chart opens on a list of 2+ stocks, the strip drifts to reveal the next stock, then springs back,
// so people always see that it slides. No "seen" memory: it plays on every open, from every entry point.
// If a sheet or the tour is up when it's due, it waits for that to close. Touching the strip cancels it.
let nudgeT=0, nudgeAnim=null;
function nudgeStrip(delay=700){
  if(st.group.length<2) return;
  clearTimeout(nudgeT);
  nudgeT=setTimeout(()=>{
    if($("#scalper").hidden) return;
    if(open.length||!$("#tourTip").hidden) return nudgeStrip(300); // wait for the sheet / tour to close
    if(nudgeAnim) nudgeAnim.cancel();
    const atEnd=st.group.indexOf(st.sym)===st.group.length-1, d=atEnd?56:-56; // reveal what comes next (or before, at the end of the list)
    nudgeAnim=track.animate([
      {transform:"translateX(0)",easing:"cubic-bezier(.77,0,.175,1)"},
      {transform:`translateX(${d}px)`,offset:.4},
      {transform:`translateX(${d}px)`,offset:.52,easing:"cubic-bezier(.23,1,.32,1)"},
      {transform:"translateX(0)"}],{duration:1300});
  },delay);
}
function stopNudge(){clearTimeout(nudgeT); if(nudgeAnim){nudgeAnim.cancel(); nudgeAnim=null}}
// deterministic sample candles ending at the captured LTP
function rng(seed){let s=0;for(const c of seed)s=(s*31+c.charCodeAt(0))>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
let candles=[];
function makeCandles(k){
  const [,ltp,chg]=S[k], prev=ltp-chg, r=rng(k), n=75, tick=ltp<50?0.01:0.05, out=[];
  // path from prev close (+gap) to ltp with noise
  let p=prev*(1+(r()-.5)*.004); const vol=Math.max(Math.abs(chg)/n*4.5,ltp*0.0012); let mom=0;
  for(let i=0;i<n;i++){
    const o=p, left=n-i, pull=left<=4?1:0; mom=mom*.6+(r()-.5)*vol*2.4; let c=o+(ltp-o)/left*(.6+pull*.4)+mom*(1-pull*.9); if(i===n-1) c=ltp;
    const h=Math.max(o,c)+r()*vol*.9, l=Math.min(o,c)-r()*vol*.9;
    const q=x=>Math.round(x/tick)*tick;
    out.push({o:q(o),h:q(h),l:q(l),c:q(c),v:Math.round((0.3+r()*(i<6?3:1.2))*1e5*(ltp<50?6:1))}); p=c;
  }
  return out;
}
function loadSymbol(k){
  const from=st.group.indexOf(st.sym), to=st.group.indexOf(k), dir=st.sym===k||from<0||to<0?0:Math.sign(to-from);
  st.sym=k; st.limit=null; st.holdView=false; st.prod=st.prodPref; const [n,l,c]=S[k];
  $("#symName").textContent=n; $("#symLtp").textContent=fmt(l); $("#symLtp").dataset.px=k;
  const ch=$("#symChg"); ch.textContent=chgTxt(k); ch.className="bs num "+(c>=0?"pos":"neg"); ch.dataset.ch=k;
  const h=HOLD[k]; $("#holdChip").hidden=!h; if(h) $("#holdTxt").textContent=h.qty+" Holding";
  $("#ann").hidden=true; $("#resetBtn").hidden=true;
  candles=makeCandles(k); const tv=candles.reduce((a,b)=>a+b.v,0); $("#volTxt").textContent=(tv/1e5).toFixed(1)+"L";
  renderPills(); updateOrder(); syncLimit(); draw(); slideChart(dir);
}
// chart drawing
const cv=$("#chart"), ctx=cv.getContext("2d"); let W=0,H=0,DPR=1, view=null;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function sizeCanvas(){const r=$("#chartWrap").getBoundingClientRect(); DPR=devicePixelRatio||1; W=r.width;H=r.height; cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); draw()}
new ResizeObserver(()=>{if(!$("#scalper").hidden) sizeCanvas()}).observe($("#chartWrap"));
let AX=40; const TOP=56, BOT=26;
function scale(){
  let lo=Math.min(...candles.map(c=>c.l)), hi=Math.max(...candles.map(c=>c.h));
  if(st.holdView&&HOLD[st.sym]){const a=HOLD[st.sym].avg; lo=Math.min(lo,a); hi=Math.max(hi,a)}
  const pad=(hi-lo)*.08; lo-=pad; hi+=pad; const ph=H-TOP-BOT;
  return {lo,hi,y:p=>TOP+(hi-p)/(hi-lo)*ph, p:y=>hi-(y-TOP)/ph*(hi-lo)};
}
function niceStep(range){const raw=range/7, m=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/m; return (f<1.5?1:f<3?2:f<7?5:10)*m}
function draw(){
  if(!W||!candles.length) return; ctx.clearRect(0,0,W,H);
  ctx.font=`500 12px "SAHI Sans", system-ui, sans-serif`; AX=Math.max(40,Math.ceil(ctx.measureText(fmt(Math.max(...candles.map(c=>c.h)))).width)+12);
  const sc=scale(); view=sc; const plotW=W-AX, n=candles.length, cw=plotW/(n+3), bw=Math.max(2,cw*.62);
  const fnt=(w,s)=>`${w} ${s}px "SAHI Sans", system-ui, sans-serif`;
  // axis divider
  ctx.fillStyle=css("--border-L1"); ctx.fillRect(plotW,0,1,H-BOT+4);
  // price labels
  const step=niceStep(sc.hi-sc.lo), dec=sc.hi<50?2:2; ctx.font=fnt(400,12); ctx.fillStyle=css("--text-tertiary"); ctx.textBaseline="middle"; ctx.textAlign="left";
  for(let p=Math.ceil(sc.lo/step)*step;p<sc.hi;p+=step){const y=sc.y(p); if(y<TOP-6||y>H-BOT-8) continue; ctx.fillText(p.toFixed(dec),plotW+5,y)}
  // volume
  const vmax=Math.max(...candles.map(c=>c.v)), vh=(H-TOP-BOT)*.22;
  candles.forEach((c,i)=>{const x=i*cw+cw/2, h=c.v/vmax*vh; ctx.fillStyle=(c.c>=c.o?css("--candle-pos"):css("--candle-neg"))+"40"; ctx.fillRect(x-bw/2,H-BOT-h,bw,h)});
  // candles
  candles.forEach((c,i)=>{const x=Math.round(i*cw+cw/2)+.5, up=c.c>=c.o, col=up?css("--candle-pos"):css("--candle-neg");
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,sc.y(c.h)); ctx.lineTo(x,sc.y(c.l)); ctx.stroke();
    const y1=sc.y(Math.max(c.o,c.c)), y2=sc.y(Math.min(c.o,c.c)); ctx.fillRect(x-bw/2,y1,bw,Math.max(1,y2-y1))});
  // high / low markers
  let hi=0,lo=0; candles.forEach((c,i)=>{if(c.h>candles[hi].h)hi=i; if(c.l<candles[lo].l)lo=i});
  ctx.font=fnt(400,12); ctx.fillStyle=css("--text-primary");
  const mark=(i,p,above)=>{const x=i*cw+cw/2, y=sc.y(p)+(above?-0:0), right=x<plotW*.6; ctx.beginPath(); ctx.arc(x,y,2.5,0,7); ctx.fill(); ctx.textAlign=right?"left":"right"; ctx.fillText(fmt(p),x+(right?6:-6),y)};
  mark(hi,candles[hi].h,true); mark(lo,candles[lo].l,false);
  // time axis
  ctx.textAlign="center"; ctx.fillStyle=css("--text-tertiary"); ctx.textBaseline="alphabetic";
  [["Nov",0],["11:15",24],["13:15",48],["15:15",72]].forEach(([t,i])=>{const x=i*cw+cw/2; ctx.textAlign=i===0?"left":"center"; ctx.fillText(t,i===0?0:x,H-8)});
  // LTP line & tag with candle countdown
  const ltp=S[st.sym][1], last=candles[n-1], y=sc.y(ltp), col=last.c>=last.o?css("--candle-pos"):css("--candle-neg");
  if(st.mode!=="lmt"){ctx.strokeStyle=col; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(n*cw,y); ctx.lineTo(plotW,y); ctx.stroke(); ctx.setLineDash([])}
  const now=new Date(), s=300-((now.getMinutes()%5)*60+now.getSeconds()), cd=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
  ctx.fillStyle=col; roundRect(plotW-4,y-16,AX+4,32,4); ctx.fill(); ctx.fillStyle=css("--text-inverse-primary"); ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.font=fnt(500,12); ctx.fillText(fmt(ltp),plotW+AX/2-2,y-6); ctx.font=fnt(400,10); ctx.fillText(cd,plotW+AX/2-2,y+8);
  // holding annotation
  const h=HOLD[st.sym]; if(h&&st.holdView){const ay=sc.y(h.avg); ctx.strokeStyle=css("--text-tertiary"); ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(0,ay); ctx.lineTo(plotW,ay); ctx.stroke(); ctx.setLineDash([]);
    const a=$("#ann"); a.hidden=false; a.style.top=ay+"px"; a.style.left=(plotW*.15)+"px"; const pl=(ltp-h.avg)*h.qty; $("#annPnl").textContent=(pl<0?"-₹":"+₹")+Math.abs(pl).toFixed(2); $("#annPnl").className=(pl<0?"neg":"pos")+" num"; $("#annQ").textContent="+"+h.qty;}
  if(st.mode==="lmt") syncLimit();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
setInterval(()=>{const d=nowD(), h=d.getHours()%12||12; $("#clock").textContent=[h,d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,"0")).join(":"); if(!$("#scalper").hidden) draw(); productTick()},1000);

// 1-Tap order panel (Buy / qty / Sell) is always shown; tapping the chart no longer hides it. Legend; holding chip
$("#lgBtn").onclick=()=>{st.legend=!st.legend; $("#lgVol").hidden=!st.legend; $("#lgTxt").hidden=st.legend; $("#lgChev").innerHTML=st.legend?"&#xe02c;":"&#xe170;"};
$("#holdChip").onclick=()=>{st.holdView=true; $("#resetBtn").hidden=false; draw()};
$("#resetBtn").onclick=()=>{st.holdView=false; $("#ann").hidden=true; $("#resetBtn").hidden=true; draw()};

// order bar
bindSeg($("#modeSeg"),v=>{st.mode=v; st.limit=null; syncLimit(); updateOrder(); draw()});
function syncLimit(){
  const line=$("#limitLine"); line.hidden=st.mode!=="lmt"; if(line.hidden||!view) return;
  const p=st.limit??S[st.sym][1]; line.style.top=view.y(p)+"px"; $("#limitTag").textContent=fmt(p);
}
function updateOrder(){
  const ltp=S[st.sym][1], p=st.limit??ltp; let b="Mkt",s="Mkt";
  if(st.mode==="lmt"){ if(Math.abs(p-ltp)<1e-9){b="Lmt";s="Lmt"} else if(p>ltp){b="Trg";s="Lmt"} else {b="Lmt";s="Trg"} }
  $("#buyLbl").textContent=b; $("#sellLbl").textContent=s;
  const r=barProd(), note=$("#opNotice");
  // No product pills on the 1-tap bar. The product shows under the quantity; it's hidden when the stock has no intraday leverage.
  const mp=$("#mProd"); mp.textContent=r.label; mp.style.visibility=r.label?"":"hidden";
  note.hidden=!r.notice;
  if(r.notice){note.className="notice bs "+r.notice.tone; note.innerHTML=`<i class="i" aria-hidden="true">${r.notice.tone==="attentive"?ALERT:INFO}</i><span>${r.notice.text}</span>`}
  $("#buyBtn").disabled=$("#sellBtn").disabled=!r.prod;
  const m=r.prod?Math.round(p*st.qty/r.prod.lev):null; $("#mBuy").textContent=$("#mSell").textContent=m==null?"Margin: –":"Margin: ₹"+m.toLocaleString("en-IN");
  fbHook.update();
}
// drag the limit line (handle or price tag)
function dragLimit(e){e.preventDefault(); e.stopPropagation(); const wrap=$("#chartWrap").getBoundingClientRect(), tick=S[st.sym][1]<50?0.01:0.05;
  const mv=ev=>{const y=Math.min(Math.max(ev.clientY-wrap.top,TOP),H-BOT); st.limit=Math.round(view.p(y)/tick)*tick; syncLimit(); updateOrder()};
  const up=()=>{removeEventListener("pointermove",mv);removeEventListener("pointerup",up)}; addEventListener("pointermove",mv); addEventListener("pointerup",up)}
$("#lpHandle").addEventListener("pointerdown",dragLimit); $("#limitTag").addEventListener("pointerdown",dragLimit);
$("#lpReset").onclick=e=>{e.stopPropagation(); st.limit=null; syncLimit(); updateOrder()};
const qty=$("#qty"); const setQ=v=>{st.qty=Math.max(1,Math.min(99999,v|0||1)); qty.value=st.qty; updateOrder()};
$("#qMinus").onclick=()=>setQ(st.qty-1); $("#qPlus").onclick=()=>setQ(st.qty+1); qty.onchange=()=>setQ(+qty.value);
let tt; const toast=m=>{const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),2200)};
$("#buyBtn").onclick=()=>sent("Buy",barProd().prod,st.qty,st.mode==="lmt"?"Lmt":"Mkt");
$("#sellBtn").onclick=()=>sent("Sell",barProd().prod,st.qty,st.mode==="lmt"?"Lmt":"Mkt");
function sent(side,p,q,t){toast(`${side} ${q} · ${p.label} · ${t}. Prototype: no order is sent.`)}
$("#btnForm").onclick=()=>openForm();
["#btnDepth","#chipFunds"].forEach(s=>$(s).onclick=()=>toast("Not captured from the app in this prototype."));
Object.assign(fbHook,initFb2({$,$$,S,st,fmt,chgTxt,showSheet,hideSheet,toast,bindSeg,placeThumb,price:()=>st.limit??S[st.sym][1],levOf:()=>barProd().prod?.lev??1, product:()=>barProd().prod, mountProducts:(seg,note)=>renderProducts(seg,note,st.sym,st.prod,v=>{st.prod=v;updateOrder()}),setQty:v=>setQ(v),enterScalper:k=>enterScalper(k)}));

// top-bar sheets
$$("[data-sheet]").forEach(b=>b.onclick=()=>showSheet(b.dataset.sheet));
bindSeg($("#pnlSeg"),v=>{$("#pnlEmpty").textContent=v==="total"?"You have not taken any positions or scalper trades today":"You have not taken any stock scalper trades today"; $("#pnlProtect").hidden=v!=="total"});
$("#openDefaults").onclick=()=>hideSheet("more",()=>{odDraft=[...odSaved]; odTab("1"); renderOD(); showSheet("defaults")});
let odSaved=["m","m","mis","qty"], odDraft=["m","m","mis","qty"]; // [1-tap buy/sell, exit, product, order size]
function renderOD(){[1,2,3,4].forEach(i=>{const seg=$("#odSeg"+i); seg.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.v===odDraft[i-1])); placeThumb(seg)});
  $("#odLimit").hidden=odDraft[0]!=="l"; $("#odDesc1").hidden=odDraft[0]==="l"; $("#odDesc2").hidden=odDraft[1]==="l";
  $("#odDesc3").textContent=odDraft[2]==="mis"?"Uses intraday leverage. Stocks without it go as Delivery; when intraday is shut, 1-Tap waits until it opens.":"Buys and sells as Delivery."; renderODSize(); $("#odApply").disabled=odDraft.join()===odSaved.join()}
// Order size tab: says what each choice means, with a live example on the stock that's open
function renderODSize(){
  const amt=odDraft[3]==="amt", k=st.sym, p=S[k][1], L=barProd().prod?.lev??1, inr=n=>"₹"+Math.round(n).toLocaleString("en-IN");
  $("#odIn").textContent=amt?"Trade value in ₹":"Number of shares";
  $("#odOut").textContent=amt?"Shares and margin":"Trade value and margin";
  if(amt){const a=10000, q=Math.floor(a/p); $("#odEx").textContent=q<1?`${inr(a)} → below 1 share of ${k}`:`${inr(a)} → ${q} shares · Margin ${inr(q*p/L)}`}
  else{const q=5; $("#odEx").textContent=`${q} shares → ${inr(q*p)} · Margin ${inr(q*p/L)}`}
  $("#odNote").textContent=amt?"Shares are rounded down to a whole number. If the amount is less than one share, Buy and Sell stay off and the bar shows the minimum. Margin is trade value ÷ leverage (full value for Delivery).":"Margin is trade value ÷ leverage (full value for Delivery). In the order form you can switch to the other one for a single order.";
}
function odTab(t){$$(".od-tabs .tab").forEach(b=>{const on=b.dataset.odt===t; b.classList.toggle("on",on); b.setAttribute("aria-selected",on)}); $("#odPane1").hidden=t!=="1"; $("#odPane2").hidden=t!=="2"; if(t==="2") placeThumb($("#odSeg4")); else [1,2,3].forEach(i=>placeThumb($("#odSeg"+i)))}
$$(".od-tabs .tab").forEach(b=>b.onclick=()=>odTab(b.dataset.odt));
bindSeg($("#odSeg1"),v=>{odDraft[0]=v;renderOD()}); bindSeg($("#odSeg3"),v=>{odDraft[2]=v;renderOD()}); bindSeg($("#odSeg2"),v=>{odDraft[1]=v;renderOD()}); bindSeg($("#odSeg4"),v=>{odDraft[3]=v;renderOD()});
$("#odApply").onclick=()=>{odSaved=[...odDraft]; st.prodPref=st.prod=odSaved[2]; fbHook.setInput(odSaved[3]); updateOrder(); hideSheet("defaults")};
bindSeg($("#langSeg"));

// ---------- products: eligibility + blocked windows (shared by the 1-tap bar, the order form and Feedback v2) ----------
// Market time is the device clock, or a prototype override from the Market time sheet (tap the clock). Starts at 11:30 AM.
var tOffset=0, sessKey="regular"; // var: Feedback v2 reads the clock while booting, before this line runs
function nowD(){return new Date(Date.now()+(tOffset||0))}
function nowMin(){const d=nowD(); return d.getHours()*60+d.getMinutes()+d.getSeconds()/60}
function setDemo(v){
  if(v==="live"){tOffset=0; sessKey="regular"}
  else{const [s,m]=v.split(":"), d=new Date(), base=new Date(d); base.setHours(0,0,0,0); tOffset=base.getTime()+(+m)*60000-d.getTime(); sessKey=s==="m"?"muhurat":"regular"}
  productTick(true);
}
function res(k,want){return resolve(k,S[k][0],want,nowMin(),sessKey||"regular")}
function curProd(want){return res(st.sym,want).prod}
// What a 1-tap order goes as. Intraday (the default) when the stock has it; stocks with no intraday leverage go as Delivery.
// When intraday exists but is shut right now, Buy/Sell stay off and the notice says when it opens.
function barProd(){
  const r=res(st.sym,st.prod), mis=r.ps.find(p=>p.k==="mis"), cnc=r.ps.find(p=>p.k==="cnc");
  if(!mis) return {prod:cnc,label:"",notice:null};
  const picked=r.ps.find(p=>p.k===st.prod&&p.k!=="mis"); // Delivery as the 1-tap default, or a product picked in the order form
  if(picked) return {prod:picked,label:picked.label+(picked.lev>1?` ${picked.lev}x`:""),notice:null};
  if(mis.block) return {prod:null,label:`Intraday ${mis.lev}x`,notice:{tone:"attentive",text:mis.block.text}};
  return {prod:mis,label:`Intraday ${mis.lev}x`,notice:null};
}
const ALERT="&#xe001;", CLOCK="&#xe17d;", INFO="&#xe065;";
function renderProducts(seg,note,k,want,onPick){
  const r=res(k,want), single=r.ps.length===1;
  seg.parentElement.hidden=single; // Delivery-only stocks show no pill row, just the notice saying so
  seg.innerHTML='<span class="thumb"></span>'+r.ps.map(p=>`<button role="radio" data-v="${p.k}" aria-checked="${p.k===r.sel}" class="${p.k===r.sel?"on":""}"${p.block?' aria-disabled="true"':""}>${p.block?`<i class="i" aria-hidden="true">${CLOCK}</i>`:""}${p.label}${p.lev>1?` <span class="lev bxx num">${p.lev}x</span>`:""}</button>`).join("");
  const th=seg.querySelector(".thumb"); th.hidden=!r.sel; placeThumb(seg);
  seg.querySelectorAll("button").forEach(b=>b.onclick=()=>{const p=r.ps.find(x=>x.k===b.dataset.v);
    if(p.block){toast(p.block.text); navigator.vibrate&&navigator.vibrate(10); return} onPick(p.k)});
  note.hidden=!r.notice;
  if(r.notice){note.className="notice bs "+r.notice.tone; note.innerHTML=`<i class="i" aria-hidden="true">${r.notice.tone==="attentive"?ALERT:INFO}</i><span>${r.notice.text}</span>`}
  return r;
}
// Re-render when a window opens or shuts while the screen is up (e.g. the clock crossing 3:10 PM).
let prodKey="";
function productTick(force){
  const k=[st.sym,of.sym].map(s=>s&&JSON.stringify(res(s,"mis").ps.map(p=>p.block&&p.block.text))).join("|")+sessKey;
  if(!force&&k===prodKey) return; prodKey=k;
  updateOrder(); if(of.sym) renderForm();
}

// ---------- order form ----------
const of={sym:null,side:"buy",prod:"mis",qty:1,type:"mkt"};
function openForm(){Object.assign(of,{sym:st.sym,prod:curProd(st.prod)?.k??st.prod,qty:st.qty,side:"buy",type:"mkt"});
  const [n,l,c]=S[of.sym]; $("#ofName").textContent=n; $("#ofLtp").textContent=fmt(l); $("#ofLtp").dataset.px=of.sym; const ch=$("#ofChg"); ch.textContent=chgTxt(of.sym); ch.className="num "+(c>=0?"pos":"neg"); ch.dataset.ch=of.sym;
  $("#ofQty").value=of.qty; ["#ofSide","#ofType"].forEach((s,i)=>$$(s+" button").forEach(b=>b.classList.toggle("on",b.dataset.v===(i?of.type:of.side))));
  renderForm(); showSheet("form")}
function renderForm(){
  const r=renderProducts($("#ofProd"),$("#ofNotice"),of.sym,of.prod,v=>{of.prod=v;renderForm()});
  const l=S[of.sym][1], cta=$("#ofCta"), side=of.side==="buy"?"Buy":"Sell";
  $("#ofMargin").textContent=r.prod?"₹"+Math.round(l*of.qty/r.prod.lev).toLocaleString("en-IN"):"–";
  cta.disabled=!r.prod; cta.classList.toggle("sell",of.side==="sell");
  cta.textContent=r.prod?`${side} ${of.qty} · ${r.prod.label}`:"Pick a product to continue";
}
bindSeg($("#ofSide"),v=>{of.side=v;renderForm()}); bindSeg($("#ofType"),v=>{of.type=v});
const setOQ=v=>{of.qty=Math.max(1,Math.min(99999,v|0||1)); $("#ofQty").value=of.qty; renderForm()};
$("#ofMinus").onclick=()=>setOQ(of.qty-1); $("#ofPlus").onclick=()=>setOQ(of.qty+1); $("#ofQty").onchange=e=>setOQ(+e.target.value);
$("#ofCta").onclick=()=>{const p=res(of.sym,of.prod).prod; sent(of.side==="buy"?"Buy":"Sell",p,of.qty,of.type==="lmt"?"Lmt":"Mkt"); hideSheet("form")};

// ---------- one-tap watchlist from the scanner ----------
// The bookmark on every scanner card/row adds the stock to the "Stock Scanners" watchlist (the first list) in one tap; tap again to remove.
const WL=LISTS[0];
function inWatch(k){return WL.items.includes(k)}
function toggleWatch(k){const on=!inWatch(k); if(on) WL.items.push(k); else WL.items.splice(WL.items.indexOf(k),1);
  navigator.vibrate&&navigator.vibrate(8); toast(`${on?"Added to":"Removed from"} ${WL.name} watchlist`); return on}

// guided tour (5 steps, copy from the app)
const TOUR=[
 ["#chartCard","Stock Chart","Track the chart of any stock that you want to trade intraday (MIS) with leverage.","below"],
 ["#btnList","Stocks on the move","Pick the list of stocks to move through: a Stocks on the move scanner, a watchlist or your holdings.","above"],
 ["#navPanel","Slide between stocks","Slide left or right to move through your list. The chart loads the stock you stop on.","above"],
 ["#chartTools","Customize your Charts","Select time interval, add indicators or customize chart type here.","below"],
 ["#orderPanel","1-Tap or Trade from Charts","1-Tap to send a market or limit order based on your defaults or drag price line on the chart to set limit or trigger price.","above"]
];
let tStep=0;
$("#openTour").onclick=()=>hideSheet("more",()=>showSheet("tour"));
$("#startTour").onclick=()=>hideSheet("tour",()=>{tStep=0; $("#tourHole").hidden=false; $("#tourTip").hidden=false; tourGo()});
function tourGo(){
  const [sel,t,b,pos]=TOUR[tStep], ph=$("#phone").getBoundingClientRect(), r=$(sel).getBoundingClientRect(), pad=sel==="#btnList"?6:0;
  const hole=$("#tourHole"); Object.assign(hole.style,{left:r.left-ph.left-pad+"px",top:r.top-ph.top-pad+"px",width:r.width+pad*2+"px",height:r.height+pad*2+"px",borderRadius:sel==="#btnList"?"999px":"16px"});
  $("#ttTitle").textContent=t; $("#ttBody").textContent=b; $("#ttCount").textContent=`${tStep+1} of ${TOUR.length}`;
  $("#ttPrev").hidden=tStep===0; $("#ttNext").textContent=tStep===TOUR.length-1?"Done":"Next";
  const tip=$("#tourTip"); tip.style.visibility="hidden"; tip.style.top="0px";
  requestAnimationFrame(()=>{const th=tip.offsetHeight; let y=sel==="#chartCard"?r.bottom-ph.top-th-24:pos==="below"?r.bottom-ph.top+12:r.top-ph.top-th-12-pad; y=Math.max(12,Math.min(y,ph.height-th-12)); tip.style.top=y+"px"; tip.style.visibility="visible"; $("#ttNext").focus({preventScroll:true})});
}
function endTour(){$("#tourHole").hidden=true;$("#tourTip").hidden=true}
$("#ttNext").onclick=()=>{if(tStep===TOUR.length-1) return endTour(); tStep++; tourGo()};
$("#ttPrev").onclick=()=>{tStep--; tourGo()};
$("#ttClose").onclick=endTour;

const defF=()=>{const t=fState;resetF();const r=serF();fState=t;return JSON.stringify(r)};
const renderSC=initScanners({$,$$,S,SCAN,st,fmt,sign,pct,chgTxt,sorted,bindSeg,placeThumb,enterScalper,
  openFilter:()=>{sortDraft=st.sort;renderFilter();showSheet("filter")}, filterDirty:()=>st.sort!=="popular"||fApplied!==defF(),
  appliedFilter:()=>JSON.parse(fApplied), inWatch, toggleWatch, setBack:s=>{scBack=s;$(s).hidden=true}});

// Watchlist page (Home → Watchlist in the bottom nav)
const WLP=initWatchlist({$,$$,S,LISTS,fmt,sign,showSheet,hideSheet,toast,bindSeg,placeThumb,enterScalper,st,
  setBack:s=>{scBack=s;$(s).hidden=true}, chart:renderSC.chart, xAxis:renderSC.xAxis});
$("#navWatch").onclick=()=>WLP.open();

// ---------- live prices (live.js): every price on every screen ticks; the scalper's last candle moves with it ----------
const IDX={NIFTY50:["NIFTY50",25003.65,17.25],SENSEX:["SENSEX",81064.68,65.28],BANKNIFTY:["BANKNIFTY",59632.20,781.55]};
let bucket=Math.floor(Date.now()/3e5); // 5-minute candle the chart is on
initLive({$$,books:[S,IDX],fmt,onTick(moved){
  if($("#scalper").hidden||!candles.length) return;
  const b=Math.floor(Date.now()/3e5), l=S[st.sym][1];
  if(b!==bucket){bucket=b; const c=candles[candles.length-1].c; candles.push({o:c,h:c,l:c,c,v:0}); candles.shift()} // a new 5-min candle opens
  if(!moved.includes(st.sym)) return;
  const last=candles[candles.length-1]; last.c=l; last.h=Math.max(last.h,l); last.l=Math.min(last.l,l); last.v+=Math.round((0.02+Math.random()*0.08)*1e5*(l<50?6:1));
  updateOrder(); draw();
}});

// boot: open on Home; #scalper / #scanner jump straight in
function boot(){const h=location.hash.slice(1);
  if(h.startsWith("scalper")){st.group=[...SCAN[st.scan][st.dir]]; enterScalper(st.group[0])} else if(h.startsWith("scanner")){renderSwitch(); showSheet("switch")} else if(h.startsWith("stocks")) renderSC.openAll("scalper"); else if(h.startsWith("watchlist")) WLP.open()}
$("#demoTime").onchange=e=>setDemo(e.target.value);
setDemo($("#demoTime").value);
document.fonts.ready.then(()=>{$$(".seg").forEach(placeThumb); draw()});
boot();
