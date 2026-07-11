import { motion } from 'framer-motion'

const facts = [
  { label: 'Launch Date', value: 'September 2, 2023' },
  { label: 'Launch Vehicle', value: 'PSLV-C57' },
  { label: 'Launch Site', value: 'Satish Dhawan Space Centre, Sriharikota' },
  { label: 'Mission Type', value: 'Solar Observation' },
  { label: 'Orbit', value: 'Halo orbit around Sun-Earth L1 point' },
  { label: 'Distance from Earth', value: '~1.5 million km (1% of Earth-Sun distance)' },
  { label: 'Operational Since', value: 'January 6, 2024 (L1 insertion)' },
  { label: 'Design Lifetime', value: '5 years' },
]

const instruments = [
  {
    name: 'SoLEXS',
    full: 'Solar Low Energy X-ray Spectrometer',
    band: '1–15 keV (soft X-ray)',
    goal: 'Measure solar X-ray flux, detect micro-flares and nanoflares',
    highlight: true,
  },
  {
    name: 'HEL1OS',
    full: 'High Energy L1 Orbiting X-ray Spectrometer',
    band: '12–200 keV (hard X-ray)',
    goal: 'Study energetic solar flares and particle acceleration',
    highlight: true,
  },
  {
    name: 'VELC',
    full: 'Visible Emission Line Coronagraph',
    band: 'Visible / near-IR',
    goal: 'Observe solar corona and CMEs continuously',
    highlight: false,
  },
  {
    name: 'SUIT',
    full: 'Solar Ultraviolet Imaging Telescope',
    band: '200–400 nm (UV)',
    goal: 'Full-disk images of the Sun in ultraviolet',
    highlight: false,
  },
  {
    name: 'ASPEX',
    full: 'Aditya Solar wind Particle Experiment',
    band: 'Solar wind particles',
    goal: 'Study solar wind and energetic ions',
    highlight: false,
  },
  {
    name: 'PAPA',
    full: 'Plasma Analyser Package for Aditya',
    band: 'Electron / ion',
    goal: 'Analyze solar wind plasma composition',
    highlight: false,
  },
  {
    name: 'MAG',
    full: 'Advanced Tri-axial High Resolution Digital Magnetometers',
    band: 'Magnetic field',
    goal: 'Measure interplanetary magnetic field at L1',
    highlight: false,
  },
]

export default function AboutMission() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title">About Aditya-L1</h1>
        <p className="section-subtitle">
          India's first dedicated solar mission, designed to study the Sun from a privileged vantage point
          at the Sun-Earth L1 Lagrange point — 1.5 million kilometres from Earth.
        </p>
      </div>

      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 50%, rgba(255,209,102,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Animated orbiting dot */}
        <div style={{ position: 'absolute', right: '3rem', top: '50%', transform: 'translateY(-50%)' }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* L1 point indicator */}
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,209,102,0.1)" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="rgba(70,212,255,0.08)" strokeWidth="1" />

            {/* Sun */}
            <circle cx="100" cy="100" r="22" fill="url(#aboutSunGrad)" />
            {/* Earth */}
            <circle cx="100" cy="32" r="6" fill="#4a90d9" />
            {/* Aditya-L1 */}
            <circle cx="100" cy="47" r="3" fill="#ffd166">
              <animateTransform attributeName="transform" type="rotate"
                from="0 100 100" to="360 100 100" dur="12s" repeatCount="indefinite" />
            </circle>

            {/* L1 label */}
            <text x="112" y="48" fontSize="8" fill="rgba(255,209,102,0.6)" fontFamily="monospace">L1</text>

            <defs>
              <radialGradient id="aboutSunGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#fff4e0" />
                <stop offset="100%" stopColor="#ff8c42" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div style={{ maxWidth: '60%' }}>
          <div style={{
            fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
            color: 'var(--solar-gold)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.75rem',
          }}>
            ISRO Mission · 2023 – Present
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            India's First Solar Observatory in Space
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
            Aditya-L1 is positioned at the first Lagrange point (L1) between Earth and the Sun,
            where the gravitational forces of both bodies balance. This allows the spacecraft to
            maintain its position with minimal fuel while observing the Sun <em>continuously</em> —
            without the eclipses that affect Earth-orbiting spacecraft.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            The mission carries 7 scientific payloads to study the solar corona, chromosphere,
            X-ray flares, solar wind, and interplanetary magnetic fields.
          </p>
        </div>
      </motion.div>

      {/* Facts grid */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1.25rem' }}>Mission Facts</div>
          {facts.map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '0.65rem 0', borderBottom: '1px solid var(--border)',
              fontSize: '0.85rem', gap: '1rem',
            }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '1.25rem' }}>Scientific Objectives</div>
          {[
            'Study the dynamics of solar upper atmosphere (chromosphere and corona)',
            'Understand the physics of solar corona heating — one of solar physics\' biggest mysteries',
            'Monitor solar flares and coronal mass ejections (CMEs)',
            'Observe the solar wind origin and acceleration near the Sun',
            'Study the space weather phenomena and their effects on Earth',
            'Measure in-situ particle and plasma environment at L1',
          ].map((obj, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.75rem',
              padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
              fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--solar-gold)', flexShrink: 0, marginTop: '0.1rem' }}>•</span>
              {obj}
            </div>
          ))}
        </div>
      </div>

      {/* Instruments */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.2rem', fontWeight: 700,
          marginBottom: '1.25rem', letterSpacing: '-0.02em',
        }}>
          Scientific Payloads
        </h2>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          {instruments.map((inst, i) => (
            <div key={inst.name} style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 160px',
              gap: '1rem',
              padding: '1rem 1.5rem',
              borderBottom: i < instruments.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              background: inst.highlight ? 'rgba(255,209,102,0.04)' : 'transparent',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  fontSize: '0.9rem',
                  color: inst.highlight ? 'var(--solar-gold)' : 'var(--text-primary)',
                }}>
                  {inst.name}
                  {inst.highlight && (
                    <span style={{
                      marginLeft: '0.4rem', fontSize: '0.6rem',
                      background: 'rgba(255,209,102,0.2)',
                      color: 'var(--solar-gold)',
                      padding: '0.1rem 0.3rem', borderRadius: 3,
                      fontFamily: 'var(--font-sans)',
                    }}>USED</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  {inst.full}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inst.goal}</div>
              </div>
              <div style={{
                fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                padding: '0.2rem 0.6rem',
                background: 'var(--bg-elevated)',
                borderRadius: 4,
                textAlign: 'center',
              }}>
                {inst.band}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data credit */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(70,212,255,0.05)',
        border: '1px solid rgba(70,212,255,0.15)',
        borderRadius: 'var(--radius)',
        fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--flare-a)' }}>Data Credit:</strong> All observational data in Solar Flare Detector
        is sourced from ISRO's <strong>PRADAN</strong> (PRimary Data Archive for National scientific
        Data Centre) portal. This project uses real Level-1 science data from the HEL1OS and SoLEXS
        instruments aboard Aditya-L1. We are grateful to ISRO for making this data publicly accessible.
        <br /><br />
        <strong style={{ color: 'var(--flare-a)' }}>Assets:</strong> Sun and Earth 3D textures courtesy of <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: 'underline'}}>Solar System Scope / NASA</a>.
      </div>
    </div>
  )
}
