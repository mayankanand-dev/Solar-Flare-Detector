import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, Search } from 'lucide-react'
import { api, type FlareEvent } from '../api'

const CLASS_COLOR: Record<string, string> = {
  X: 'var(--flare-x)', M: 'var(--flare-m)', C: 'var(--flare-c)', B: 'var(--flare-b)', A: 'var(--flare-a)',
}
const CLASS_ORDER = ['X', 'M', 'C', 'B', 'A']

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'UTC',
  }) + ' UTC'
}

export default function FlareTimeline() {
  const [flares, setFlares] = useState<FlareEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getFlares().then(r => {
      setFlares(r.flares.sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ))
      setLoading(false)
    })
  }, [])

  const filtered = flares.filter(f => {
    if (filter !== 'ALL' && f.flare_class !== filter) return false
    if (search && !f.start_time.includes(search) && !f.flare_class.includes(search.toUpperCase())) return false
    return true
  })

  if (loading) return <div className="loader-wrapper"><div className="loader" /></div>

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="section-title">Flare Timeline</h1>
        <p className="section-subtitle">
          All {flares.length} solar flare events detected from real Aditya-L1 HEL1OS data
          (July 2–10, 2026). Classification uses GOES-style thresholds as an approximation
          — HEL1OS operates in 12–200 keV, not the standard GOES 1–8 Å band.
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', ...CLASS_ORDER].map(cls => (
            <button
              key={cls}
              onClick={() => setFilter(cls)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 100,
                border: `1px solid ${filter === cls ? (CLASS_COLOR[cls] || 'var(--solar-gold)') : 'var(--border)'}`,
                background: filter === cls ? `${CLASS_COLOR[cls] || 'var(--solar-gold)'}20` : 'transparent',
                color: filter === cls ? (CLASS_COLOR[cls] || 'var(--solar-gold)') : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {cls === 'ALL' ? 'All Classes' : `Class ${cls}`}
              {cls !== 'ALL' && (
                <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>
                  ({flares.filter(f => f.flare_class === cls).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by date..."
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '0.4rem 0.8rem',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              width: 180,
            }}
          />
        </div>
      </div>

      {/* ── Summary strip ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        {CLASS_ORDER.map(cls => {
          const count = flares.filter(f => f.flare_class === cls).length
          if (!count) return null
          return (
            <div key={cls} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 0.9rem',
              background: `${CLASS_COLOR[cls]}12`,
              border: `1px solid ${CLASS_COLOR[cls]}30`,
              borderRadius: 8,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: CLASS_COLOR[cls], fontSize: '1.1rem',
              }}>{count}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Class {cls}</span>
            </div>
          )
        })}
        <div style={{
          marginLeft: 'auto', color: 'var(--text-muted)',
          fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center',
        }}>
          Showing {filtered.length} of {flares.length}
        </div>
      </div>

      {/* ── Timeline list ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 80px 1fr 140px 110px 100px 80px',
          gap: '1rem',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <span>#</span>
          <span>Class</span>
          <span>Start Time (UTC)</span>
          <span>Peak Time</span>
          <span>Peak Flux</span>
          <span>Duration</span>
          <span>σ</span>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No flares match the current filter.
          </div>
        )}

        {filtered.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <Link
              to={`/flares/${f.id}`}
              id={`flare-row-${f.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 80px 1fr 140px 110px 100px 80px',
                gap: '1rem',
                padding: '0.9rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                #{f.id}
              </span>
              <span className={`flare-badge flare-badge-${f.flare_class}`}>
                {f.flare_class}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={12} color="var(--text-muted)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {fmtTime(f.start_time)}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {fmtTime(f.peak_time).split(',')[1]?.trim()}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={12} color={CLASS_COLOR[f.flare_class]} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: CLASS_COLOR[f.flare_class] }}>
                  {f.peak_flux >= 1000
                    ? (f.peak_flux / 1000).toFixed(1) + 'k'
                    : f.peak_flux.toFixed(0)} cts/s
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {f.duration_minutes.toFixed(1)} min
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {f.peak_sigma.toFixed(1)}σ
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255,209,102,0.05)',
        border: '1px solid rgba(255,209,102,0.15)',
        borderRadius: 8,
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        ⚠ Classification uses GOES-style A/B/C/M/X thresholds as an approximation.
        HEL1OS operates in 12–200 keV, not the standard GOES 1–8 Å band.
        These are not direct GOES equivalences — for scientific use, consult ISRO documentation.
      </div>
    </div>
  )
}
