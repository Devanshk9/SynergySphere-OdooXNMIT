import React from 'react'

const Dashboard = () => {
  return (
    <div className="container" style={{paddingTop:'2.5rem', paddingBottom:'3.5rem'}}>
      <header style={{marginBottom:'2.4rem'}}>
        <h1 style={{fontSize:'clamp(2.1rem,4vw,2.85rem)', fontWeight:800, letterSpacing:'-.02em', marginBottom:'.75rem'}}>Dashboard</h1>
        <p className="text-muted" style={{maxWidth:'640px', fontSize:'1rem', lineHeight:1.5}}>This is a protected area. Dashboard content will be built here.</p>
      </header>
      <div className="surface-glass" style={{borderRadius:'26px', padding:'4rem', textAlign:'center'}}>
        <h2 style={{fontSize:'1.5rem', fontWeight:600, letterSpacing:'.01em', color:'var(--color-text-primary)'}}>Content Area</h2>
        <p className="text-muted" style={{marginTop:'1rem'}}>Future dashboard components will be rendered here.</p>
      </div>
    </div>
  )
}

export default Dashboard
