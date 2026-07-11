import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, RefreshCw, AlertTriangle } from 'lucide-react'
import { api, type ReplayStatus, type FlareEvent, type LightcurveData } from '../api'
import OrbitalScrubber3D from '../components/OrbitalScrubber3D'
import './Dashboard.css'

function fmtFlux(v: number) {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v.toFixed(0)
}

export default function Dashboard() {
  const [replay, setReplay] = useState<ReplayStatus | null>(null)
  const [flares, setFlares] = useState<FlareEvent[]>([])
  const [lc, setLc] = useState<LightcurveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load static data once
  useEffect(() => {
    Promise.all([
      api.getFlares(),
      api.getLightcurve(),
    ]).then(([fRes, lcRes]) => {
      setFlares(fRes.flares)
      setLc(lcRes)
      setLoading(false)
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [])

  // Poll replay status every 1s
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await api.getReplayStatus()
        setReplay(r)
      } catch { /* backend may not be running */ }
    }
    poll()
    const id = setInterval(poll, 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) return (
    <div className="loader-wrapper"><div className="loader" /></div>
  )

  if (error) return (
    <div className="page-enter" style={{ textAlign: 'center', padding: '4rem 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <div style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        Cannot connect to Solar Flare Detector API
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
        {error}
        <br /><br />
        Run: <code>uvicorn backend.main:app --reload</code> first
      </div>
    </div>
  )

  // Recent flares for ticker (last 8)
  const recentFlares = [...flares].sort((a, b) =>
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  ).slice(0, 8)

  const isFlareActive = replay?.flare_active ?? false

  return (
    <div className="page-enter">
      {/* ── Centerpiece ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        
        {/* Status badge */}
        <div style={{ minHeight: '40px', marginBottom: '1.5rem' }}>
          <AnimatePresence mode="wait">
            {isFlareActive && replay?.active_flare ? (
              <motion.div key="flare"
                className="status-badge status-flare"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <span className="pulse-dot" />
                ⚠ Flare in Progress — Class {replay?.active_flare?.flare_class}
              </motion.div>
            ) : (
              <motion.div key="quiet"
                className="status-badge status-quiet"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <span className="pulse-dot" />
                Sun is Quiet
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <OrbitalScrubber3D replay={replay} flares={flares} lc={lc} size={540} />

        {/* Replay mode info */}
        {replay && (
          <div style={{ 
            marginTop: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', 
            background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: 100,
            border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)'
          }}>
            <RefreshCw size={14} color="var(--accent)" />
            <span className="text-accent">REPLAY MODE</span>
            <span>·</span>
            <span>{replay.replay_speed_x}× speed</span>
            <span>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${replay.progress_pct}%`, background: 'var(--accent)' }} />
              </div>
              {replay.progress_pct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Flare List ───────────────────────────────────────── */}
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <div className="card-title">
            <Zap size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Detected Flare Timeline
          </div>
          <Link to="/flares" style={{
            fontSize: '0.85rem', color: 'var(--text-secondary)',
            textDecoration: 'none', fontWeight: 500
          }}>
            View all {flares.length} →
          </Link>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentFlares.map((f, i) => (
            <Link key={f.id} to={`/flares/${f.id}`} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: '1rem',
              padding: '1rem 0.5rem', borderBottom: i === recentFlares.length - 1 ? 'none' : '1px solid var(--border)',
              textDecoration: 'none', color: 'inherit', transition: 'background 0.2s', borderRadius: '4px'
            }} className="flare-list-row">
              <span className={`flare-badge flare-badge-${f.flare_class}`}>{f.flare_class}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {new Date(f.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(f.start_time).toISOString().slice(11, 16)} UTC
                </span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {fmtFlux(f.peak_flux)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cts/s</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <div style={{
        marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem',
        color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
      }}>
        <AlertTriangle size={12} color="var(--text-muted)" />
        Aditya-L1 data courtesy of ISRO PRADAN
      </div>
    </div>
  )
}
