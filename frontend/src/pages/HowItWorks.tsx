import { motion } from 'framer-motion'

const steps = [
  {
    icon: '☀️',
    title: 'The Sun',
    subtitle: 'Source of X-ray radiation',
    desc: 'Solar flares occur when magnetic field lines on the Sun suddenly reconnect, releasing enormous amounts of energy as X-rays, ultraviolet, and energetic particles.',
    color: '#ffd166',
  },
  {
    icon: '🛸',
    title: 'Aditya-L1 at L1',
    subtitle: '~1.5 million km from Earth',
    desc: "ISRO's Aditya-L1 spacecraft sits at the Sun-Earth Lagrange point 1 (L1), where it can observe the Sun continuously without Earth blocking its view.",
    color: '#70d4ff',
  },
  {
    icon: '📡',
    title: 'HEL1OS & SoLEXS',
    subtitle: 'X-ray instruments on Aditya-L1',
    desc: 'HEL1OS (12–200 keV) and SoLEXS (1–8 Å) measure the Sun\'s X-ray output every second. A sudden spike in this signal indicates a solar flare.',
    color: '#48d8a0',
  },
  {
    icon: '🧮',
    title: 'Detection Algorithm',
    subtitle: 'Rolling baseline + k-σ spike detection',
    desc: "Our algorithm computes a 90-minute rolling median of the flux as a 'quiet Sun' baseline. When the flux exceeds baseline by 3+ standard deviations for 3+ consecutive seconds, we flag it as a flare.",
    color: '#ff8c42',
  },
  {
    icon: '💻',
    title: 'Solar Flare Detector',
    subtitle: 'This website!',
    desc: 'The FastAPI backend serves detected flare data in real time. The React frontend displays an animated dashboard, light curve chart, and flare timeline — all from real ISRO data.',
    color: '#ff2020',
  },
]

const algorithmSteps = [
  { step: '1', label: 'Load light curve', detail: 'Import FITS → pandas DataFrame with timestamp + flux columns' },
  { step: '2', label: 'Compute rolling baseline', detail: 'Rolling 90-min median of flux = "quiet Sun" background' },
  { step: '3', label: 'Measure deviation', detail: 'σ = (flux − baseline) / rolling_std for each sample' },
  { step: '4', label: 'Flag candidates', detail: 'Mark samples where σ ≥ 3.0 (configurable k-sigma threshold)' },
  { step: '5', label: 'Reject noise', detail: 'Require ≥ 3 consecutive flagged samples (suppress single-sample spikes)' },
  { step: '6', label: 'Track peak & decay', detail: 'Follow flux until it returns to baseline + 1.5σ tolerance' },
  { step: '7', label: 'Classify', detail: 'Assign A/B/C/M/X class based on peak sigma above baseline' },
]

export default function HowItWorks() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title">How It Works</h1>
        <p className="section-subtitle">
          From raw X-ray photons at the L1 point to a real-time flare dashboard —
          here's the complete data journey.
        </p>
      </div>

      {/* ── Data Journey ────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem', position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          left: '40px',
          top: 40,
          bottom: 40,
          width: 2,
          background: 'linear-gradient(to bottom, #ffd166, #70d4ff, #48d8a0, #ff8c42, #ff2020)',
          opacity: 0.3,
        }} />

        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            style={{
              display: 'flex', gap: '1.5rem', marginBottom: '1.5rem',
              position: 'relative',
            }}
          >
            {/* Icon circle */}
            <div style={{
              width: 80, height: 80, flexShrink: 0,
              background: `${s.color}18`,
              border: `2px solid ${s.color}40`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
              position: 'relative', zIndex: 1,
            }}>
              {s.icon}
            </div>

            {/* Content */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${s.color}`,
              borderRadius: 'var(--radius)',
              padding: '1.25rem 1.5rem',
              flex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{
                  fontSize: '1rem', fontWeight: 700, color: s.color,
                }}>{s.title}</span>
                <span style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  padding: '0.1rem 0.5rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 4,
                }}>{s.subtitle}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Algorithm Details ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>
          🧮 Detection Algorithm — Step by Step
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {algorithmSteps.map(({ step, label, detail }) => (
            <div key={step} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: 28, height: 28,
                  background: 'rgba(255,209,102,0.15)',
                  border: '1px solid rgba(255,209,102,0.3)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--solar-gold)',
                  fontFamily: 'var(--font-mono)', flexShrink: 0,
                }}>
                  {step}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Classifier note ─────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'rgba(255,209,102,0.06)',
        border: '1px solid rgba(255,209,102,0.2)',
        borderRadius: 'var(--radius)',
        marginBottom: '2rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--solar-gold)' }}>
          ⚠ Important: Approximate Classification
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          The A/B/C/M/X classification uses GOES-style thresholds as an <em>approximation</em>.
          GOES measures X-ray flux in the 1–8 Å wavelength band (W/m²), while HEL1OS operates
          in the 12–200 keV energy band (counts/s). These are not equivalent — the relative
          scaling between the instruments differs. Our classifications indicate the relative
          strength of events within our dataset, not absolute GOES equivalences.
          For scientific analysis, cross-reference with the official NOAA GOES event catalogue.
        </p>
      </div>

      {/* Tech stack */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1.5rem' }}>🛠 Technology Stack</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            'Python 3.11', 'Astropy', 'NumPy', 'Pandas', 'SciPy',
            'FastAPI', 'Uvicorn', 'React 19', 'TypeScript', 'Vite',
            'Recharts', 'Framer Motion', 'ISRO PRADAN data',
          ].map(tech => (
            <span key={tech} style={{
              padding: '0.3rem 0.8rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}>
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
