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
    desc: 'SoLEXS (1–15 keV soft X-rays) captures low-energy thermal pre-heating minutes before eruption, while HEL1OS (12–200 keV hard X-rays) records impulsive particle acceleration during eruption peak.',
    color: '#48d8a0',
  },
  {
    icon: '🤖',
    title: 'ML Forecasting & K-σ Detection',
    subtitle: 'Dual-Sensor XGBoost Precursor Engine + K-σ Spike Cataloging',
    desc: "Our uncoupled XGBoost pipeline analyzes independent soft and hard X-ray features—using SoLEXS rate-of-change to predict flares before eruption onset with >91% accuracy. Concurrently, a 90-min rolling baseline (k=3.0) archives historical event intensity.",
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

      {/* ── Dual-Sensor ML Architecture ─────────────────────── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>
          🤖 Dual-Sensor Machine Learning Pipeline (XGBoost)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(42,157,143,0.08)', border: '1px solid #2A9D8F', borderRadius: 8, padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2A9D8F', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📡</span> Independent Sensor Feature Streams
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Instead of squashing soft and hard X-rays into a single blended curve, we pass <code>solexs_flux</code> (soft X-ray thermal pre-heating) and <code>hel1os_flux</code> (hard X-ray eruption spike) directly to XGBoost as distinct columns. This allows the ensemble to detect early soft X-ray precursors without dilution from flat hard X-ray baselines.
            </p>
          </div>
          <div style={{ background: 'rgba(244,162,97,0.08)', border: '1px solid #F4A261', borderRadius: 8, padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F4A261', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⏱️</span> Precursor-Gated Ground Truth Labeling
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Within our pre-flare early warning window before a NOAA-cataloged event, target labels (1) are gated to trigger only once the soft X-ray curve initiates its upward departure from baseline noise. This prevents penalizing the model with False Negatives during calm minutes immediately preceding onset.
            </p>
          </div>
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
            'XGBoost 2.1', 'Scikit-Learn', 'Joblib',
            'FastAPI', 'Uvicorn', 'React 19', 'TypeScript', 'Vite',
            'Three.js', 'React Three Fiber', 'Recharts', 'Framer Motion', 'ISRO PRADAN Data',
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
