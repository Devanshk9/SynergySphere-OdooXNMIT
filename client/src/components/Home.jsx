import React from 'react'

const Home = () => {
  return (
    <div className="container" style={{paddingTop: '4rem', paddingBottom: '4rem'}}>
      <section className="landing-hero surface-glass" style={{
        borderRadius: '32px',
        padding: '4.5rem clamp(1.5rem,4vw,4rem)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="hero-bg-gradient" style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 20% 30%, rgba(56,189,248,0.18) 0%, transparent 55%), radial-gradient(circle at 85% 40%, rgba(30,58,138,0.55) 0%, transparent 60%)'
        }} />
        <div style={{position: 'relative', zIndex: 2, maxWidth: '860px'}}>
          <div style={{display:'inline-block', padding: '.4rem .9rem', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', backdropFilter:'blur(12px)', fontSize: '.8rem', letterSpacing: '.08em', textTransform:'uppercase', fontWeight:600, marginBottom:'1.7rem', border:'1px solid var(--color-border)'}}>
            Introducing SynergySphere
          </div>
          <h1 style={{
            fontSize: 'clamp(2.75rem,6vw,4.2rem)',
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: '-.03em',
            background: 'linear-gradient(92deg,#e2e8f0 0%,#93c5fd 45%,#38bdf8 75%,#93c5fd 100%)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            marginBottom: '1.4rem'
          }}>
            Orchestrate Operations. Accelerate Growth.
          </h1>
          <p style={{
            fontSize: 'clamp(1.05rem,1.35vw,1.25rem)',
            lineHeight: 1.55,
            maxWidth: '720px',
            color: 'var(--color-text-secondary)',
            fontWeight: 400,
            marginBottom: '2.6rem'
          }}>
            A unified control surface for projects, teams, insights and execution—crafted for modern organizations who demand clarity, velocity and resilience.
          </p>
          <div style={{display:'flex', gap:'1.1rem', flexWrap:'wrap'}}>
            <button className="btn btn-primary gradient-accent" style={{
              fontSize:'1.05rem', padding:'1.05rem 2.1rem', borderRadius:'14px', letterSpacing:'.02em', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'var(--shadow-glow)'
            }}>Launch Workspace</button>
            <button className="btn btn-secondary" style={{
              background:'rgba(255,255,255,0.08)', color:'var(--color-text-primary)', border:'1px solid var(--color-border)', fontSize:'1.05rem', padding:'1.05rem 2.1rem', borderRadius:'14px'
            }}>Product Tour</button>
          </div>
        </div>
        <div aria-hidden="true" style={{position:'absolute', inset:0, pointerEvents:'none'}}>
          <div style={{position:'absolute', top:'-120px', right:'-120px', width:'380px', height:'380px', background:'radial-gradient(circle at center, rgba(56,189,248,0.22), transparent 70%)', filter:'blur(40px)', opacity:.7}} />
          <div style={{position:'absolute', bottom:'-140px', left:'-80px', width:'420px', height:'420px', background:'radial-gradient(circle at center, rgba(30,58,138,0.55), transparent 70%)', filter:'blur(52px)', opacity:.55}} />
        </div>
      </section>
    </div>
  )
}

export default Home
