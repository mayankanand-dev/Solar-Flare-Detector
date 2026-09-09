import {
  Orbit, Cpu, BookOpen, Layers, Sun
} from 'lucide-react'

export default function HowItWorks() {
  return (
    <div className="page-enter">
      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title">How Solar Sentinel Works</h1>
        <p className="section-subtitle">
          From solar coronal magnetic reconnection at 15 million Kelvin to real-time 30-minute early warning alerts — the complete physics, orbital mechanics, and machine learning pipeline.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
          {[
            { label: '30-Min Early Warning', color: '#F4A261' },
            { label: 'L1 Halo Orbit (1.5M km)', color: '#4A90D9' },
            { label: 'Aditya-L1 Dual Sensors (SoLEXS + HEL1OS)', color: '#2A9D8F' },
            { label: 'XGBoost 2.1 Precursor Engine', color: '#D8481E' },
            { label: 'NOAA GOES Validated', color: '#6B9080' },
          ].map(tag => (
            <span key={tag.label} style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0.25rem 0.75rem',
              borderRadius: 100,
              background: `${tag.color}15`,
              border: `1px solid ${tag.color}40`,
              color: tag.color,
            }}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Section 1: The Physics of Early Warning (Why Soft X-Rays Precede Flares) ── */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(244,162,97,0.3)', background: 'linear-gradient(180deg, rgba(244,162,97,0.04) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Sun size={22} color="#F4A261" />
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
            The Physics: Why Solar Flares Can Be Predicted 30 Minutes Early
          </h2>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          A solar flare is not an instantaneous flash out of nowhere. It follows a distinct 3-phase physical sequence. 
          By observing in <strong>soft X-rays (SoLEXS)</strong> before <strong>hard X-rays (HEL1OS)</strong> erupt, 
          Solar Sentinel detects the flare's thermal precursor slope before the catastrophic explosion occurs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Phase 1 */}
          <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F4A261', background: 'rgba(244,162,97,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                T - 30 to 15 MIN
              </span>
              <span style={{ fontSize: '1.2rem' }}>🧲</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              1. Magnetic Reconnection
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Tangled magnetic field loops on the solar surface twist under convective stress until they snap and reconnect. 
              Trapped coronal plasma is rapidly heated to 10–30 million Kelvin.
            </p>
          </div>

          {/* Phase 2 */}
          <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid #2A9D8F50' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F', background: 'rgba(42,157,143,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                T - 15 to 0 MIN (EARLY WARNING)
              </span>
              <span style={{ fontSize: '1.2rem' }}>🌡️</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2A9D8F', marginBottom: '0.4rem' }}>
              2. Soft X-Ray Thermal Swelling
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              The superheated plasma emits strongly in <strong>soft X-rays (1–15 keV)</strong>. 
              Aditya-L1's <strong>SoLEXS</strong> instrument records this steady rise in flux—the "smoke before the fire" that triggers our XGBoost high-risk warning.
            </p>
          </div>

          {/* Phase 3 */}
          <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid #D8481E50' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#D8481E', background: 'rgba(216,72,30,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                T = 0 to +30 MIN (PEAK)
              </span>
              <span style={{ fontSize: '1.2rem' }}>💥</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#D8481E', marginBottom: '0.4rem' }}>
              3. Impulsive Hard X-Ray Burst
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Relativistic electron beams slam into the dense chromosphere, creating Bremsstrahlung radiation in 
              <strong>hard X-rays (12–200 keV)</strong> recorded by <strong>HEL1OS</strong>. Solar radio blackouts hit Earth.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Orbit & Instruments (Aditya-L1 at L1) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Orbit Advantage */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Orbit size={20} color="#4A90D9" />
            <div className="card-title" style={{ margin: 0 }}>The L1 Halo Orbit Advantage</div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Aditya-L1 operates in a halo orbit around the <strong>Sun-Earth Lagrange Point 1 (L1)</strong>, 
            roughly 1.5 million km from Earth (about 4× the distance to the Moon).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#4A90D9', fontWeight: 800 }}>✓</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Continuous 24/7 View:</strong> Unlike low-Earth orbit satellites (like ISS or Hubble), Aditya-L1 is never eclipsed by the Earth. It monitors the Sun uninterrupted.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#4A90D9', fontWeight: 800 }}>✓</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Zero Atmospheric Attenuation:</strong> Earth's atmosphere shields ground observers from solar X-rays. At L1, Aditya-L1 records pristine, unfiltered high-energy photon counts.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#4A90D9', fontWeight: 800 }}>✓</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Upstream Sentinel Position:</strong> Stationed sunward of Earth, Aditya-L1 detects space weather disturbances before they reach the terrestrial magnetosphere.
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Sensor Synergy */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Layers size={20} color="#2A9D8F" />
            <div className="card-title" style={{ margin: 0 }}>Dual-Sensor Synergy (SoLEXS & HEL1OS)</div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Solar Sentinel fuses two uncoupled instruments aboard Aditya-L1 to give the AI complementary sightlines:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(42,157,143,0.08)', border: '1px solid #2A9D8F', borderRadius: 8, padding: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#2A9D8F', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                SoLEXS (Soft X-Ray)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                1.0 – 15.0 keV
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                Measures thermal emission from hot coronal plasma. Drives 15-to-30 min rate-of-change early warning features.
              </p>
            </div>

            <div style={{ background: 'rgba(216,72,30,0.08)', border: '1px solid #D8481E', borderRadius: 8, padding: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: '#D8481E', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                HEL1OS (Hard X-Ray)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                12.0 – 200.0 keV
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                Measures non-thermal Bremsstrahlung particle acceleration during impulsive flare peaks. Confirms event intensity.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Section 3: The AI Engine (XGBoost Feature Engineering) ── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Cpu size={20} color="var(--accent)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
            The AI Pipeline: 22 Causal Physical Features in XGBoost 2.1
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Rather than feeding raw noisy counts into a black-box model, Solar Sentinel engineers 22 physics-based indicators 
          derived from solar astrophysics literature:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.3rem' }}>
              📈 Rates of Change (ROC)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Measures relative flux velocity over 5, 15, and 30-minute rolling intervals for both SoLEXS and HEL1OS channels.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2A9D8F', marginBottom: '0.3rem' }}>
              ⚡ Thermal Acceleration
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Second-derivative of soft X-ray flux (<code>solexs_acc_15m</code>). Catches whether the plasma heating curve is steepening.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4A90D9', marginBottom: '0.3rem' }}>
              📊 Causal Rolling Z-Scores
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Computes deviation from quiet-Sun background using strictly past data (<code>center=False</code>) to guarantee zero future data leakage.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#E76F51', marginBottom: '0.3rem' }}>
              🔄 Dual-Sensor Ratio (H/S)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Hard-to-soft X-ray flux ratio and its rate of change, tracking the exact physical transition from thermal pre-heating to impulsive explosion.
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Beginner Glossary of Technical Terms ── */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(42,157,143,0.3)', background: 'linear-gradient(180deg, rgba(42,157,143,0.04) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <BookOpen size={20} color="#2A9D8F" />
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
            Beginner's Glossary: Space Weather Terms Made Simple
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#F4A261', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
              🌟 GOES Flare Classes (A, B, C, M, X)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A logarithmic scale measuring flare energy in powers of 10.
              <strong> A & B:</strong> Calm solar background.
              <strong> C:</strong> Minor flare, minimal Earth impact.
              <strong> M:</strong> Moderate flare; causes polar radio blackouts.
              <strong> X:</strong> Catastrophic mega-flare; can damage orbiting satellites, blind spacecraft sensors, and disrupt terrestrial electrical grids.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#4A90D9', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
              🛸 Lagrange Point 1 (L1)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              A gravitational equilibrium point in space where the gravitational pull of the Sun and Earth balance out the orbital centrifugal force. 
              A spacecraft at L1 stays locked between the Earth and Sun forever without expending massive fuel.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#2A9D8F', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
              🔒 Causal Rolling Window (Zero Leakage)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              In machine learning, you must never allow an AI to "peek into the future." 
              All rolling statistics in Solar Sentinel use past minutes only (<code>center=False</code>), 
              ensuring the model makes genuine forward predictions just like in real life.
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#D8481E', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
              📅 Stratified Daily Block Partitioning
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Because solar activity comes in active storm weeks followed by calm months, we partition data in 24-hour daily blocks. 
              The AI is trained on 70% of days and tested on 30% strictly unseen days, proving it works on brand new future storms.
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Tech Stack & Data Attribution ── */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>🛠 Built With Real Space Science Technology</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Solar Sentinel was built for offline collegiate demonstration and production web deployment using official ISRO Aditya-L1 data:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {[
            'Python 3.11', 'Astropy (FITS Processing)', 'XGBoost 2.1', 'Scikit-Learn', 'Pandas & NumPy',
            'FastAPI (Local Telemetry Server)', 'React 19', 'TypeScript', 'Vite', 'Three.js / React Three Fiber',
            'Framer Motion', 'ISRO PRADAN Open Data', 'NOAA Space Weather Prediction Center (SWPC)',
          ].map(tech => (
            <span key={tech} style={{
              padding: '0.3rem 0.75rem',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: '0.78rem',
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
