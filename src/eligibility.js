// Founder feedback (9 Nov, after Muhurat trading): one user got 4 rejections and 3 orders that went through as Delivery.
// This module is the single source for which products a stock can take and when intraday is shut, so the Scalper 1-tap bar,
// the order form and the 1-tap defaults all show the same pills and say the same thing.
//
//  - A product pill only shows when the stock offers it: no intraday leverage → no Intraday pill (Delivery only).
//  - MTF is not live yet, so it is not offered anywhere in the prototype (no pill, no copy).
//  - When intraday exists but is shut (the 9:14 AM minute, after square-off 3:20–3:30, the 3:10 PM early square-off) the pill
//    stays, disabled with a clock, and a notice says why. Market closed (before 9:00, after 3:30) is not shut: orders go as AMO. Nothing is ever switched to Delivery behind the user's back.
//  - Pre-open is NOT a block (checked against live SAHI 968 + order data, 11 Nov 2026): Intraday orders placed 9:00–9:13 are
//    accepted and fill at the 9:15 open. Only 9:14–9:15 rejects (backend "AmoNotAllowed"). New intraday after square-off rejects
//    with "IntradayOrdersDisallowedAfterSquareOff".

// Sample leverage per stock (prototype data). mis = intraday leverage, 0 = not offered.
// early = squares off at 3:10 PM instead of 3:20 PM (the "CAS" stocks).
const DEF={mis:5,early:0};
const ELIG={
  TATAGOLD:{mis:0},                // ETF: delivery only
  EXIDEIND:{mis:0},                // no intraday leverage: delivery only
  EMAMILTD:{early:1}, TENNECO:{early:1}, IKS:{early:1}, COCHINSHIP:{early:1}, CASTROLIND:{early:1}
};
export const elig=k=>({...DEF,...ELIG[k]});

const T=(h,m)=>h*60+m;
// Muhurat timings are sample values for the prototype.
export const SESSIONS={
  regular:{name:"",open0:T(9,0),open:T(9,15),sq:T(15,20),sqEarly:T(15,10),close:T(15,30)},
  muhurat:{name:"Muhurat ",open0:T(18,0),open:T(18,15),sq:T(19,5),sqEarly:T(18,55),close:T(19,15)}
};
export const clockTxt=m=>{const h=Math.floor(m/60)%24, mm=String(Math.floor(m%60)).padStart(2,"0"); return `${h%12||12}:${mm} ${h<12?"AM":"PM"}`};

// Why intraday is shut for this stock right now, or null when it's open.
export function intradayBlock(k,min,sk){
  const s=SESSIONS[sk], e=elig(k), m=s.name, at=clockTxt;
  if(min>=s.open-1&&min<s.open) return {short:`Opens ${at(s.open)}`,text:`Orders pause for the last minute before the open. Place it at ${at(s.open)}.`};
  if(min>=s.close) return null; // after the close: not shut, orders go as AMO (see intradayInfo)
  if(e.early&&min>=s.sqEarly) return {short:`Closed ${at(s.sqEarly)}`,text:`Intraday closed at ${at(s.sqEarly)} for this stock. It squares off early, ${s.sq-s.sqEarly} minutes before the rest.`};
  if(min>=s.sq) return {short:`Closed ${at(s.sq)}`,text:`Intraday closed at ${at(s.sq)}, ${m}square-off time. New intraday orders aren't accepted.`};
  return null;
}

// Not a block: a heads-up shown while intraday orders are accepted but won't fill yet.
//   · market closed (before 9:00, after 3:30): the order goes as an AMO (after-market order), as in prod — the bar stays on
//   · pre-open (9:00–9:14): goes in now, fills at the 9:15 open
export function intradayInfo(k,min,sk){
  const s=SESSIONS[sk], at=clockTxt;
  if(min<s.open0) return {text:`Market is closed. Your order will be placed as an AMO (after-market order) and sent when the market opens at ${at(s.open)}.`};
  if(min>=s.close) return {text:`Market is closed. Your order will be placed in the next trading session as an AMO (after-market order).`};
  if(min>=s.open0&&min<s.open-1) return {text:`Pre-open. Your order goes in now and fills when the market opens at ${at(s.open)}.`};
  return null;
}

// Products this stock can take, in pill order. Pills for products the stock doesn't offer are left out entirely.
export function products(k,min,sk){
  const e=elig(k), out=[];
  if(e.mis){ const block=intradayBlock(k,min,sk); out.push({k:"mis",label:"Intraday",lev:e.mis,block,info:block?null:intradayInfo(k,min,sk)}) }
  out.push({k:"cnc",label:"Delivery",lev:1,block:null});
  return out;
}

// Resolve what the user wants (`want`) against what's possible now.
// sel = the product an order will go as, or null when the user has to pick one (never a silent swap to Delivery).
export function resolve(k,name,want,min,sk){
  const ps=products(k,min,sk), mis=ps.find(p=>p.k==="mis");
  let sel=ps.some(p=>p.k===want&&!p.block)?want:null;
  if(!sel&&ps.length===1) sel=ps[0].k; // the only product there is, labelled as such below
  const others=ps.filter(p=>p.k!=="mis").map(p=>p.label).join(" or ");
  let notice=null;
  if(!mis) notice={tone:"neutral",text:ps.length===1?`Delivery only. ${name} has no intraday leverage.`:`${name} has no intraday leverage.${sel?"":` Pick ${others} to trade.`}`};
  else if(mis.block) notice={tone:"attentive",text:mis.block.text+(sel?"":` Pick ${others} to trade now.`)};
  else if(mis.info&&sel==="mis") notice={tone:"neutral",text:mis.info.text};
  return {ps,sel,notice,prod:ps.find(p=>p.k===sel)||null};
}
