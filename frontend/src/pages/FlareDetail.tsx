import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts'
import { ArrowLeft, Clock, TrendingUp, Activity, Zap } from 'lucide-react'
import { api, type FlareDetail as FlareDetailType } from '../api'

const CLASS_COLOR: Record<string, string> = {
  X: 'var(--flare-x)', M: 'var(--flare-m)', C: 'var(--flare-c)', B: 'var(--flare-b)', A: 'var(--flare-a)',
}
const CLASS_DESC: Record<string, string> = {
  X: 'Extreme — Major solar event. Can cause widespread radio blackouts.',
  M: 'Strong — Can cause brief radio blackouts on sunlit side of Earth.',
  C: 'Moderate — Minor effects possible on radio communication.',
  B: 'Small — Rarely causes noticeable effects.',
  A: 'Background — No observable effects on Earth.',
}

function fmtTimeFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC',
  }) + ' UTC'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--solar-gold)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
        {Number(payload[0]?.value).toFixed(1)} cts/s
      </div>
    </div>
  )
}

export default function FlareDetail() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<FlareDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.getFlareDetail(Number(id))
      .then(d => { setDetail(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id])

  if (loading) return <div className="loader-wrapper"><div className="loader" /></div>

  if (error || !detail) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌑</div>
      <div style={{ color: 'var(--solar-orange)' }}>{error || 'Flare not found'}</div>
      <Link to="/flares" style={{ color: 'var(--solar-gold)', marginTop: '1rem', display: 'block' }}>← Back to Timeline</Link>
    </div>
  )

  const { flare, lightcurve_window: lc } = detail
  const cls = flare.flare_class
  const color = CLASS_COLOR[cls]

  // Prepare chart data
  const chartData = lc.timestamps.map((t, i) => ({
    t: new Date(t).toISOString().slice(11, 19),
    flux: lc.flux[i],
  }))

  const peakTime = flare.peak_time.slice(11, 19)
  const startTime = flare.start_time.slice(11, 19)

  return (
    <div className="page-enter">
      {/* Back link */}
      <Link to="/flares" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--text-muted)', textDecoration: 'none',
        fontSize: '0.85rem', marginBottom: '1.5rem',
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--solar-gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={16} /> Back to Timeline
      </Link>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '2rem',
        marginBottom: '2rem', flexWrap: 'wrap',
      }}>
        {/* Class badge — large */}
        <motion.div
          style={{
            width: 100, height: 100,
            background: `${color}18`,
            border: `2px solid ${color}50`,
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 900, color,
            fontFamily: 'var(--font-mono)',
            boxShadow: `0 0 30px ${color}20`,
            flexShrink: 0,
          }}
          animate={{
            boxShadow: [`0 0 20px ${color}20`, `0 0 50px ${color}40`, `0 0 20px ${color}20`],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {cls}
        </motion.div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <span className={`flare-badge flare-badge-${cls}`}>Class {cls}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Event #{flare.id}
            </span>
          </div>
          <h1 style={{
            fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em',
            marginBottom: '0.5rem',
          }}>
            Solar Flare Event
          </h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {CLASS_DESC[cls] || ''}
          </div>
          <div style={{
            marginTop: '0.75rem', fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem', color: 'var(--text-muted)',
          }}>
            {fmtTimeFull(flare.start_time)}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Peak Flux', value: `${flare.peak_flux >= 1000 ? (flare.peak_flux/1000).toFixed(2)+'k' : flare.peak_flux.toFixed(1)} cts/s`, icon: <TrendingUp size={16} color={color} /> },
          { label: 'Peak σ', value: `${flare.peak_sigma.toFixed(1)}σ`, icon: <Activity size={16} color={color} /> },
          { label: 'Duration', value: `${flare.duration_minutes.toFixed(2)} min`, icon: <Clock size={16} color={color} /> },
          { label: 'Instrument', value: flare.instrument, icon: <Zap size={16} color={color} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card" style={{ borderTop: `2px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {icon}
              <span className="card-title">{label}</span>
            </div>
            <div className="stat-value" style={{ color, fontSize: '1.3rem' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Light curve chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <Activity size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Light Curve — ±30 min around peak
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {lc.timestamps.length} data points
          </span>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 4, right: 20, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Flare region highlight */}
            <ReferenceArea
              x1={startTime}
              x2={peakTime}
              fill={color}
              fillOpacity={0.08}
            />

            {/* Peak marker */}
            <ReferenceLine
              x={peakTime}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{ value: 'PEAK', position: 'top', fill: color, fontSize: 10, fontFamily: 'var(--font-mono)' }}
            />

            {/* Baseline reference */}
            <ReferenceLine
              y={flare.background_flux}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="2 6"
              label={{ value: 'baseline', position: 'right', fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
            />

            <Line
              type="monotone"
              dataKey="flux"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Technical details */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Event Timeline</div>
          {[
            { label: 'Start', time: flare.start_time },
            { label: 'Peak', time: flare.peak_time },
            { label: 'End', time: flare.end_time },
          ].map(({ label, time }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {time.slice(0, 19).replace('T', ' ')} UTC
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Detection Parameters</div>
          {[
            { label: 'Background Flux', value: `${flare.background_flux.toFixed(2)} cts/s` },
            { label: 'Peak Flux', value: `${flare.peak_flux.toFixed(2)} cts/s` },
            { label: 'Enhancement', value: `${((flare.peak_flux / flare.background_flux) * 100).toFixed(0)}% above baseline` },
            { label: 'Peak Significance', value: `${flare.peak_sigma.toFixed(1)}σ` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.6rem 0', borderBottom: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255,209,102,0.05)',
        border: '1px solid rgba(255,209,102,0.15)',
        borderRadius: 8,
        fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      }}>
        ⚠ {flare.note}
      </div>
    </div>
  )
}
