'use client'
import React from 'react'
import { useLiveLayout } from '@/contexts/LiveLayoutContext'
import type { Discipline } from './WorldBackground'
import { LogoFootball, LogoBasketball, LogoTennis, LogoMMA, ShimmerGameLogo } from './icons/games'

// ─── Sport heroes ─────────────────────────────────────────────────────────────
function FootballHero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      <div style={{ position:'absolute', top:-40, left:'22%', width:200, height:280, background:'conic-gradient(from 80deg at 50% 0%,transparent,rgba(255,240,180,0.07) 10deg,rgba(255,230,150,0.11) 18deg,rgba(255,240,180,0.07) 26deg,transparent 36deg)', zIndex:1 }} />
      <div style={{ position:'absolute', top:-40, right:'22%', width:200, height:280, background:'conic-gradient(from 74deg at 50% 0%,transparent,rgba(255,240,180,0.06) 10deg,rgba(255,230,150,0.10) 18deg,rgba(255,240,180,0.06) 26deg,transparent 36deg)', zIndex:1 }} />
      <div style={{ position:'absolute', bottom:-10, left:'-5%', right:'-5%', height:70, zIndex:2, background:'linear-gradient(180deg,transparent,rgba(10,9,6,0.5) 40%,rgba(10,9,6,0.8))' }} />
      <div style={{ position:'absolute', bottom:-10, left:'-5%', right:'-5%', height:65, zIndex:2, backgroundImage:'repeating-linear-gradient(90deg,rgba(50,38,5,0.18) 0px,rgba(50,38,5,0.18) 28px,rgba(60,45,6,0.10) 28px,rgba(60,45,6,0.10) 56px)', clipPath:'polygon(8% 0%,92% 0%,100% 100%,0% 100%)' }} />
      <div style={{ position:'absolute', bottom:-80, left:'50%', transform:'translateX(-50%)', width:280, height:280, border:'1px solid rgba(255,255,255,0.05)', borderRadius:'50%', zIndex:3 }} />
      <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.15)', zIndex:4 }} />
      <div style={{ position:'absolute', inset:0, zIndex:3, background:'linear-gradient(90deg,rgba(10,9,6,0.92),rgba(10,9,6,0.7) 25%,transparent 60%)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:3, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)', backgroundSize:'40px 40px', maskImage:'linear-gradient(90deg,transparent,rgba(0,0,0,0.5) 40%,rgba(0,0,0,0.5))' }} />
      <svg style={{ position:'absolute', inset:0, zIndex:4, width:'100%', height:'100%' } as React.CSSProperties} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <rect x="460" y="142" width="280" height="48" stroke="rgba(255,255,255,0.055)" strokeWidth="0.8" fill="none"/>
        <rect x="545" y="168" width="110" height="24" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" fill="none"/>
        <line x1="600" y1="130" x2="600" y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="0.7"/>
        <line x1="220" y1="0" x2="400" y2="200" stroke="rgba(255,240,180,0.04)" strokeWidth="18"/>
        <line x1="230" y1="0" x2="460" y2="200" stroke="rgba(255,240,180,0.05)" strokeWidth="10"/>
        <line x1="980" y1="0" x2="800" y2="200" stroke="rgba(255,240,180,0.04)" strokeWidth="18"/>
        <line x1="970" y1="0" x2="740" y2="200" stroke="rgba(255,240,180,0.05)" strokeWidth="10"/>
        <circle cx="220" cy="5" r="4" fill="rgba(255,245,200,0.45)"/>
        <circle cx="220" cy="5" r="8" fill="rgba(255,240,180,0.1)"/>
        <circle cx="980" cy="5" r="4" fill="rgba(255,245,200,0.45)"/>
        <circle cx="980" cy="5" r="8" fill="rgba(255,240,180,0.1)"/>
      </svg>
      <div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:28, zIndex:9, background:'radial-gradient(ellipse,rgba(232,192,50,0.12),transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:'linear-gradient(90deg,transparent,rgba(232,192,50,0) 10%,rgba(232,192,50,0.65) 40%,rgba(232,192,50,0.95) 50%,rgba(232,192,50,0.65) 60%,rgba(232,192,50,0) 90%,transparent)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, background:'rgba(200,160,30,0.1)', border:'1px solid rgba(200,160,30,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#e8c032' }}>
          <LogoFootball size={32} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(232,192,50,0.65)', marginBottom:7 }}>Football · Prediction Markets</div>
          <div style={{ fontFamily:'"Oswald",sans-serif', fontSize:50, fontWeight:700, lineHeight:0.9, textTransform:'uppercase', letterSpacing:'0.04em', color:'#f4f0e0', whiteSpace:'nowrap' }}>
            FOOT<span style={{ color:'#e8c032' }}>BALL</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:1, width:24, background:'rgba(232,192,50,0.35)' }} />
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, color:'rgba(210,180,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase' }}>EPL · La Liga · Bundesliga · Serie A</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Oswald",sans-serif', fontSize:22, fontWeight:700, color:'#e8c032', lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(210,180,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(232,192,50,0.12)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Oswald",sans-serif', fontSize:22, fontWeight:700, color:'#ece8d0', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(210,180,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Сегодня</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(232,192,50,0.08)', border:'1px solid rgba(232,192,50,0.28)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#e8c032', textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
          <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:'#e8c032', display:'inline-block', boxShadow:'0 0 6px rgba(232,192,50,0.85)' }} />
          Live
        </div>
      </div>
    </div>
  )
}

function BasketballHero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      {/* Left dark fade for text readability — WorldBackground court shows through on the right */}
      <div style={{ position:'absolute', inset:0, zIndex:4, background:'linear-gradient(90deg,rgba(10,6,3,0.92),rgba(10,6,3,0.7) 28%,transparent 62%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:'linear-gradient(90deg,transparent,rgba(230,100,20,0) 10%,rgba(230,100,20,0.7) 50%,rgba(230,100,20,0) 90%,transparent)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, background:'rgba(230,100,20,0.1)', border:'1px solid rgba(230,100,20,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#e66414' }}>
          <LogoBasketball size={32} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(230,140,40,0.7)', marginBottom:7 }}>Basketball · Prediction Markets</div>
          <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:56, fontWeight:700, lineHeight:0.9, textTransform:'uppercase', letterSpacing:'0.06em', color:'#f5ebe0', whiteSpace:'nowrap' }}>
            BASKET<span style={{ color:'#e66414' }}>BALL</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:1, width:24, background:'rgba(230,100,20,0.3)' }} />
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase' }}>NBA · EuroLeague · FIBA</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:22, fontWeight:700, color:'#e66414', lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(230,100,20,0.12)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Bebas Neue",sans-serif', fontSize:22, fontWeight:700, color:'#f0e0cc', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Сегодня</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(230,100,20,0.08)', border:'1px solid rgba(230,100,20,0.28)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#e66414', textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
          <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:'#e66414', display:'inline-block', boxShadow:'0 0 6px rgba(230,100,20,0.8)' }} />
          Live
        </div>
      </div>
    </div>
  )
}

function TennisHero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      <div style={{ position:'absolute', top:-30, left:'15%', width:180, height:250, background:'conic-gradient(from 78deg at 50% 0%,transparent,rgba(200,230,60,0.07) 14deg,rgba(200,230,60,0.11) 22deg,rgba(200,230,60,0.07) 30deg,transparent 44deg)', zIndex:1 }} />
      <div style={{ position:'absolute', top:-30, right:'10%', width:180, height:250, background:'conic-gradient(from 70deg at 50% 0%,transparent,rgba(200,230,60,0.06) 14deg,rgba(200,230,60,0.09) 22deg,rgba(200,230,60,0.06) 30deg,transparent 44deg)', zIndex:1 }} />
      <div style={{ position:'absolute', bottom:-8, left:'-5%', right:'-5%', height:68, zIndex:2, background:'linear-gradient(180deg,rgba(6,8,9,0.4),rgba(6,8,9,0.75))', clipPath:'polygon(8% 0%,92% 0%,100% 100%,0% 100%)' }} />
      <div style={{ position:'absolute', bottom:28, left:'10%', right:'10%', height:24, zIndex:4, borderTop:'1px solid rgba(255,255,255,0.12)', backgroundImage:'repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 8px)', clipPath:'polygon(2% 0%,98% 0%,100% 100%,0% 100%)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:5, background:'linear-gradient(90deg,rgba(6,8,9,0.92),rgba(6,8,9,0.7) 25%,transparent 60%)' }} />
      <svg style={{ position:'absolute', inset:0, zIndex:4, width:'100%', height:'100%', pointerEvents:'none' } as React.CSSProperties} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <rect x="200" y="134" width="800" height="58" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" fill="none"/>
        <line x1="600" y1="134" x2="600" y2="192" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7"/>
        <rect x="310" y="134" width="580" height="34" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" fill="none"/>
        <line x1="200" y1="155" x2="1000" y2="155" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        <circle cx="160" cy="6" r="4" fill="rgba(200,230,60,0.5)"/>
        <circle cx="160" cy="6" r="9" fill="rgba(200,230,60,0.1)"/>
        <circle cx="1040" cy="6" r="4" fill="rgba(200,230,60,0.5)"/>
        <circle cx="1040" cy="6" r="9" fill="rgba(200,230,60,0.1)"/>
      </svg>
      <div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:28, zIndex:9, background:'radial-gradient(ellipse,rgba(200,230,60,0.1),transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:'linear-gradient(90deg,transparent,rgba(200,230,60,0) 10%,rgba(200,230,60,0.7) 50%,rgba(200,230,60,0) 90%,transparent)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, background:'rgba(200,230,60,0.1)', border:'1px solid rgba(200,230,60,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#C8E63C' }}>
          <LogoTennis size={32} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,230,60,0.7)', marginBottom:7 }}>Tennis · Prediction Markets</div>
          <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:54, fontWeight:800, lineHeight:0.9, textTransform:'uppercase', letterSpacing:'0.05em', color:'#e8edf8', whiteSpace:'nowrap' }}>
            TEN<span style={{ color:'#C8E63C' }}>NIS</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:1, width:24, background:'rgba(200,230,60,0.3)' }} />
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, color:'rgba(200,230,60,0.35)', letterSpacing:'0.12em', textTransform:'uppercase' }}>ATP · WTA · Grand Slams</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:22, fontWeight:700, color:'#C8E63C', lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(200,230,60,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(200,230,60,0.1)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:22, fontWeight:700, color:'#dce8f8', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(200,230,60,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Сегодня</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(200,230,60,0.08)', border:'1px solid rgba(200,230,60,0.28)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#C8E63C', textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
          <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:'#C8E63C', display:'inline-block', boxShadow:'0 0 6px rgba(200,230,60,0.8)' }} />
          Live
        </div>
      </div>
    </div>
  )
}

function MMAHero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', width:200, height:240, background:'conic-gradient(from 76deg at 50% 0%,transparent,rgba(255,80,80,0.06) 12deg,rgba(255,60,60,0.12) 24deg,rgba(255,80,80,0.06) 36deg,transparent 48deg)', zIndex:1 }} />
      <div style={{ position:'absolute', bottom:-8, left:'-5%', right:'-5%', height:52, zIndex:1, background:'linear-gradient(180deg,rgba(8,5,6,0.4),rgba(8,5,6,0.65))', clipPath:'polygon(8% 0%,92% 0%,100% 100%,0% 100%)' }} />
      <div style={{ position:'absolute', bottom:-8, left:'-5%', right:'-5%', height:75, zIndex:2, backgroundImage:'repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 14px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 14px)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:5, background:'linear-gradient(90deg,rgba(8,5,6,0.92),rgba(8,5,6,0.7) 25%,transparent 62%)' }} />
      <svg style={{ position:'absolute', inset:0, zIndex:4, width:'100%', height:'100%', pointerEvents:'none' } as React.CSSProperties} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <polygon points="600,50 750,80 810,145 750,192 600,192 450,192 390,145 450,80" stroke="rgba(220,30,30,0.12)" strokeWidth="1" fill="none"/>
        <polygon points="600,70 730,95 782,148 730,185 600,185 470,185 418,148 470,95" stroke="rgba(220,30,30,0.07)" strokeWidth="0.6" fill="none"/>
        <circle cx="600" cy="148" r="28" stroke="rgba(220,30,30,0.1)" strokeWidth="0.8" fill="none"/>
        <circle cx="600" cy="5" r="6" fill="rgba(255,100,100,0.6)"/>
        <circle cx="600" cy="5" r="12" fill="rgba(255,60,60,0.1)"/>
        <line x1="600" y1="5" x2="350" y2="200" stroke="rgba(255,60,60,0.04)" strokeWidth="22"/>
        <line x1="600" y1="5" x2="850" y2="200" stroke="rgba(255,60,60,0.04)" strokeWidth="22"/>
        <rect x="170" y="148" width="32" height="44" fill="rgba(180,15,15,0.3)" stroke="rgba(220,30,30,0.2)" strokeWidth="0.6"/>
        <rect x="998" y="148" width="32" height="44" fill="rgba(15,40,120,0.3)" stroke="rgba(40,80,200,0.2)" strokeWidth="0.6"/>
      </svg>
      <div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:28, zIndex:9, background:'radial-gradient(ellipse,rgba(220,30,30,0.12),transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:'linear-gradient(90deg,transparent,rgba(220,30,30,0) 10%,rgba(220,30,30,0.8) 50%,rgba(220,30,30,0) 90%,transparent)' }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0, background:'rgba(200,20,20,0.1)', border:'1px solid rgba(200,20,20,0.35)', display:'flex', alignItems:'center', justifyContent:'center', color:'#e02020' }}>
          <LogoMMA size={32} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(220,80,80,0.7)', marginBottom:7 }}>Mixed Martial Arts · Prediction Markets</div>
          <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:54, fontWeight:800, lineHeight:0.9, textTransform:'uppercase', letterSpacing:'0.06em', color:'#f0e8e8', whiteSpace:'nowrap' }}>
            MMA <span style={{ color:'#e02020' }}>FIGHTS</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:1, width:24, background:'rgba(200,20,20,0.35)' }} />
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, color:'rgba(200,120,120,0.35)', letterSpacing:'0.12em', textTransform:'uppercase' }}>UFC · Bellator · ONE Championship</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:22, fontWeight:700, color:'#e02020', lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(200,120,120,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(200,20,20,0.12)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Barlow Condensed",sans-serif', fontSize:22, fontWeight:700, color:'#f0e0e0', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(200,120,120,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Сегодня</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(200,20,20,0.08)', border:'1px solid rgba(200,20,20,0.3)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#e02020', textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
          <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:'#e02020', display:'inline-block', boxShadow:'0 0 6px rgba(220,30,30,0.8)' }} />
          Live
        </div>
      </div>
    </div>
  )
}

// ─── Esports heroes ───────────────────────────────────────────────────────────
function CS2Hero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  const accent = '#e66414'
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'42%', background:'linear-gradient(105deg,#060402 60%,transparent 100%)', zIndex:2 }} />
      <div style={{ position:'absolute', right:-60, top:-40, bottom:-40, width:'75%', zIndex:1, transform:'skewX(-12deg)', transformOrigin:'top right', display:'flex' }}>
        <div style={{ height:'100%', width:'55%', background:'#120d07' }} />
        <div style={{ height:'100%', width:'5%',  background:'rgba(230,100,20,0.20)' }} />
        <div style={{ height:'100%', width:'15%', background:'#0f0a05' }} />
        <div style={{ height:'100%', width:'3%',  background:'rgba(230,100,20,0.10)' }} />
        <div style={{ height:'100%', width:'22%', background:'#0d0804' }} />
      </div>
      <div style={{ position:'absolute', left:'36%', top:0, bottom:0, width:3, background:`linear-gradient(180deg,transparent,${accent} 30%,${accent} 70%,transparent)`, transform:'skewX(-12deg)', zIndex:3, boxShadow:`0 0 16px ${accent}80` }} />
      <div style={{ position:'absolute', left:'38%', top:0, bottom:0, width:1, background:`linear-gradient(180deg,transparent,${accent}4d 30%,${accent}4d 70%,transparent)`, transform:'skewX(-12deg)', zIndex:3 }} />
      <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', backgroundImage:'repeating-linear-gradient(-12deg,transparent,transparent 28px,rgba(255,255,255,0.012) 28px,rgba(255,255,255,0.012) 29px)' }} />
      <div style={{ position:'absolute', bottom:0, left:'25%', right:'25%', height:28, zIndex:9, background:`radial-gradient(ellipse,${accent}1a,transparent 70%)` }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:`linear-gradient(90deg,transparent,${accent}00 10%,${accent}b3 50%,${accent}00 90%,transparent)` }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <ShimmerGameLogo game="cs2" size={72} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(230,140,40,0.7)', marginBottom:7 }}>Esports · Prediction Markets</div>
          <div style={{ fontFamily:'"Rajdhani",sans-serif', fontSize:52, fontWeight:700, lineHeight:0.9, textTransform:'uppercase', letterSpacing:'0.04em', color:'#f5ede0', whiteSpace:'nowrap' }}>
            COUNTER<br />STRIKE <span style={{ color:accent }}>2</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:1, width:24, background:'rgba(230,100,20,0.30)' }} />
            <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase' }}>BLAST · ESL · PGL · IEM</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Rajdhani",sans-serif', fontSize:22, fontWeight:700, color:accent, lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(230,100,20,0.12)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Rajdhani",sans-serif', fontSize:22, fontWeight:700, color:'#f0e0cc', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(220,160,80,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Total</div>
          </div>
        </div>
        {liveCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(230,100,20,0.08)', border:'1px solid rgba(230,100,20,0.28)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:accent, textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
            <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:accent, display:'inline-block', boxShadow:`0 0 6px ${accent}cc` }} />
            Live
          </div>
        )}
      </div>
    </div>
  )
}

function Dota2Hero({ liveCount, totalCount }: { liveCount: number; totalCount: number }) {
  const accent = '#c0392b'
  const gold   = '#b46e1e'
  return (
    <div style={{ position:'relative', width:'100%', height:200, overflow:'hidden', borderRadius:'12px 12px 0 0' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 120% at 70% 50%,#1a0608 0%,#120305 40%,#0a0203 100%)' }} />
      <div style={{ position:'absolute', right:'5%', top:'-30%', width:'55%', height:'160%', background:'radial-gradient(ellipse,rgba(160,20,20,0.22) 0%,rgba(100,10,10,0.12) 40%,transparent 70%)', zIndex:1 }} />
      <div style={{ position:'absolute', right:'-5%', top:'-20%', width:'35%', height:'140%', background:'radial-gradient(ellipse,rgba(180,120,20,0.15) 0%,rgba(140,80,10,0.07) 50%,transparent 70%)', zIndex:1 }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,#050102 0%,#0d0304 30%,transparent 65%)', zIndex:2 }} />
      <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px)' }} />
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:3 } as React.CSSProperties} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M 750 -60 Q 900 100 750 260" stroke="rgba(180,110,30,0.12)" strokeWidth="1" fill="none"/>
        <path d="M 800 -80 Q 980 100 800 280" stroke="rgba(180,110,30,0.07)" strokeWidth="1" fill="none"/>
        <path d="M 700 -40 Q 840 100 700 240" stroke="rgba(192,57,43,0.10)" strokeWidth="0.8" fill="none"/>
        <path d="M 950 20 Q 1050 100 950 180" stroke="rgba(180,110,30,0.15)" strokeWidth="0.8" fill="none"/>
        <path d="M 1020 0 Q 1150 100 1020 200" stroke="rgba(180,110,30,0.08)" strokeWidth="0.6" fill="none"/>
        <polygon points="1080,80 1095,100 1080,120 1065,100" stroke="rgba(180,110,30,0.2)" strokeWidth="0.8" fill="rgba(180,110,30,0.04)"/>
        <circle cx="860" cy="40" r="1.5" fill="rgba(180,110,30,0.25)"/>
        <circle cx="920" cy="160" r="1" fill="rgba(180,110,30,0.20)"/>
        <circle cx="1000" cy="55" r="1.2" fill="rgba(192,57,43,0.30)"/>
        <path d="M 320 40 L 340 40 L 340 60" stroke="rgba(180,110,30,0.2)" strokeWidth="0.8" fill="none"/>
        <path d="M 320 160 L 340 160 L 340 140" stroke="rgba(180,110,30,0.2)" strokeWidth="0.8" fill="none"/>
      </svg>
      <div style={{ position:'absolute', bottom:0, left:'20%', right:'20%', height:30, zIndex:9, background:`radial-gradient(ellipse,${accent}1f,transparent 70%)` }} />
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, zIndex:10, background:`linear-gradient(90deg,transparent,${gold}00 10%,${gold}80 35%,${accent}cc 50%,${gold}80 65%,${gold}00 90%,transparent)` }} />
      <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', padding:'0 44px', gap:28 }}>
        <ShimmerGameLogo game="dota2" size={72} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(180,110,30,0.75)', marginBottom:8 }}>Defense of the Ancients · Prediction Markets</div>
          <div style={{ fontFamily:'"Cinzel",serif', fontSize:44, fontWeight:900, lineHeight:0.88, textTransform:'uppercase', letterSpacing:'0.06em', color:'#d4c4a0', textShadow:`0 0 40px ${accent}80,0 0 80px ${accent}33`, whiteSpace:'nowrap' }}>
            DOTA <span style={{ color:accent, textShadow:`0 0 20px ${accent}cc,0 0 60px ${accent}4d` }}>2</span>
          </div>
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ height:1, width:32, background:`linear-gradient(90deg,transparent,${gold}66)` }} />
            <div style={{ width:4, height:4, background:`${gold}99`, transform:'rotate(45deg)' }} />
            <div style={{ height:1, width:32, background:`linear-gradient(90deg,${gold}66,transparent)` }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Cinzel",serif', fontSize:20, fontWeight:700, color:accent, lineHeight:1 }}>{liveCount}</div>
            <div style={{ fontSize:8, color:'rgba(180,150,100,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Live</div>
          </div>
          <div style={{ width:1, height:32, background:'rgba(180,110,30,0.15)' }} />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Cinzel",serif', fontSize:20, fontWeight:700, color:'#d4c4a0', lineHeight:1 }}>{totalCount}</div>
            <div style={{ fontSize:8, color:'rgba(180,150,100,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontFamily:'"JetBrains Mono",monospace' }}>Total</div>
          </div>
        </div>
        {liveCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(192,57,43,0.10)', border:'1px solid rgba(192,57,43,0.30)', borderRadius:6, padding:'5px 12px', fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:accent, textTransform:'uppercase', flexShrink:0, fontFamily:'"JetBrains Mono",monospace' }}>
            <span className="animate-pulse" style={{ width:5, height:5, borderRadius:'50%', background:accent, display:'inline-block', boxShadow:`0 0 6px ${accent}cc` }} />
            Live
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function LiveHero({ discipline }: { discipline: Discipline }) {
  const { liveCount, totalCount } = useLiveLayout()

  if (discipline === 'football')   return <FootballHero   liveCount={liveCount} totalCount={totalCount} />
  if (discipline === 'basketball') return <BasketballHero liveCount={liveCount} totalCount={totalCount} />
  if (discipline === 'tennis')     return <TennisHero     liveCount={liveCount} totalCount={totalCount} />
  if (discipline === 'mma')        return <MMAHero        liveCount={liveCount} totalCount={totalCount} />
  if (discipline === 'cs2')        return <CS2Hero        liveCount={liveCount} totalCount={totalCount} />
  if (discipline === 'dota2')      return <Dota2Hero      liveCount={liveCount} totalCount={totalCount} />
  return null
}
