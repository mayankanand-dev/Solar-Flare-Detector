import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import type { ReplayStatus, FlareEvent, LightcurveData } from '../api'

interface ScrubberProps {
  replay: ReplayStatus | null
  flares: FlareEvent[]
  lc: LightcurveData | null
  size?: number
}

const CLASS_COLORS: Record<string, string> = {
  X: 'var(--flare-x)',
  M: 'var(--flare-m)',
  C: 'var(--flare-c)',
  B: 'var(--flare-b)',
  A: 'var(--flare-a)',
  quiet: 'var(--solar-gold)',
}

export default function OrbitalScrubber({ replay, flares, lc, size = 500 }: ScrubberProps) {
  const [isManual, setIsManual] = useState(false)
  const [manualProgressPct, setManualProgressPct] = useState(0)

  // Sync with replay progress if not manually overriding
  useEffect(() => {
    if (!isManual && replay) {
      setManualProgressPct(replay.progress_pct)
    }
  }, [replay?.progress_pct, isManual])

  const R = size / 2
  const center = R
  const orbitR = R * 0.75
  const sunR = R * 0.12

  // Determine current active flare based on progress
  const activeFlare = useMemo(() => {
    if (!lc || lc.timestamps.length === 0) return null
    // Calculate current time based on progress percentage
    const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
    const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
    const currentMs = startTimeMs + (manualProgressPct / 100) * (endTimeMs - startTimeMs)

    // Find if currentMs falls in any flare window
    return flares.find(f => {
      const fStart = new Date(f.start_time).getTime()
      const fEnd = new Date(f.end_time).getTime()
      return currentMs >= fStart && currentMs <= fEnd
    }) || null
  }, [lc, flares, manualProgressPct])

  const isFlare = !!activeFlare
  const activeClass = activeFlare?.flare_class || 'quiet'
  const accentColor = CLASS_COLORS[activeClass] || CLASS_COLORS.quiet

  // Marker angle (0 to 360, starting from top: -90 deg)
  const angleDeg = (manualProgressPct / 100) * 360 - 90
  const angleRad = (angleDeg * Math.PI) / 180
  const markerX = center + orbitR * Math.cos(angleRad)
  const markerY = center + orbitR * Math.sin(angleRad)

  // Formatted current time
  const currentTimeDisplay = useMemo(() => {
    if (!lc || lc.timestamps.length === 0) return 'Loading...'
    const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
    const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
    const currentMs = startTimeMs + (manualProgressPct / 100) * (endTimeMs - startTimeMs)
    return new Date(currentMs).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  }, [lc, manualProgressPct])

  return (
    <div className="orbital-scrubber-wrapper" style={{ width: '100%', maxWidth: size, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="var(--solar-gold)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--solar-gold)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--solar-gold)" stopOpacity="0" />
            </radialGradient>
            
            <radialGradient id="flareBurst" cx="50%" cy="50%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
              <stop offset="70%" stopColor={accentColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Orbit Ring */}
          <circle 
            cx={center} cy={center} r={orbitR} 
            fill="none" 
            stroke="var(--border)" 
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Flare Windows on Orbit */}
          {lc && flares.map(f => {
            const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
            const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
            const totalDur = endTimeMs - startTimeMs

            const fStartMs = new Date(f.start_time).getTime()
            const fEndMs = new Date(f.end_time).getTime()

            const startPct = Math.max(0, (fStartMs - startTimeMs) / totalDur)
            const endPct = Math.min(1, (fEndMs - startTimeMs) / totalDur)

            const startAngle = startPct * 360 - 90
            const endAngle = endPct * 360 - 90
            const largeArc = (endAngle - startAngle) > 180 ? 1 : 0

            const x1 = center + orbitR * Math.cos((startAngle * Math.PI) / 180)
            const y1 = center + orbitR * Math.sin((startAngle * Math.PI) / 180)
            const x2 = center + orbitR * Math.cos((endAngle * Math.PI) / 180)
            const y2 = center + orbitR * Math.sin((endAngle * Math.PI) / 180)

            // Skip rendering if practically same point
            if (Math.abs(x1 - x2) < 0.1 && Math.abs(y1 - y2) < 0.1) return null;

            return (
              <path 
                key={f.id}
                d={`M ${x1} ${y1} A ${orbitR} ${orbitR} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={CLASS_COLORS[f.flare_class]}
                strokeWidth={3}
                opacity={0.6}
              />
            )
          })}

          {/* Eruption Animation */}
          <AnimatePresence>
            {isFlare && (
              <motion.g
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: `${center}px ${center}px` }}
              >
                <circle cx={center} cy={center} r={sunR * 2.5} fill="url(#flareBurst)" />
                <path
                  d={`M ${center} ${center - sunR} Q ${center + sunR * 3} ${center - sunR * 3} ${center + sunR} ${center - sunR * 1.5}`}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d={`M ${center - sunR * 0.5} ${center - sunR * 0.8} Q ${center - sunR * 2.5} ${center - sunR * 3.5} ${center - sunR * 0.1} ${center - sunR * 2.5}`}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Sun */}
          <motion.circle 
            cx={center} cy={center} r={sunR * 1.8} 
            fill="url(#sunGlow)"
            animate={{ scale: isFlare ? 1 : [1, 1.05, 1], opacity: isFlare ? 0 : [0.6, 0.8, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx={center} cy={center} r={sunR} fill="#FFF9ED" stroke="var(--solar-gold)" strokeWidth={2} />

          {/* Scrubber Marker */}
          <motion.circle 
            cx={markerX} cy={markerY} r={6} 
            fill={isFlare ? accentColor : "var(--bg-card)"} 
            stroke={isFlare ? "var(--bg-card)" : "var(--solar-gold)"} 
            strokeWidth={3} 
            style={{ filter: isFlare ? `drop-shadow(0 0 8px ${accentColor})` : 'none' }}
          />
          
          {/* Active Flare Info */}
          <AnimatePresence>
            {isFlare && activeFlare && (
              <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <rect 
                  x={center - 70} y={center + sunR * 2.5} 
                  width="140" height="40" rx="6" 
                  fill="var(--bg-card)" 
                  stroke={accentColor} strokeWidth={1}
                />
                <text x={center} y={center + sunR * 2.5 + 18} textAnchor="middle" fill="var(--text-primary)" fontSize="12" fontFamily="var(--font-display)" fontWeight="700">
                  Class {activeFlare.flare_class} Flare
                </text>
                <text x={center} y={center + sunR * 2.5 + 32} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontFamily="var(--font-mono)">
                  Peak: {activeFlare.peak_flux.toFixed(0)} cts/s
                </text>
              </motion.g>
            )}
          </AnimatePresence>

        </svg>
      </div>

      {/* Controls */}
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {currentTimeDisplay}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '400px' }}>
          <button 
            onClick={() => setIsManual(!isManual)}
            style={{ 
              background: 'var(--bg-card)', border: '1px solid var(--border)', 
              borderRadius: '50%', width: 36, height: 36, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)'
            }}
          >
            {isManual ? <Play size={16} /> : <Pause size={16} />}
          </button>
          
          <input 
            type="range" 
            min="0" max="100" step="0.1" 
            value={manualProgressPct}
            onChange={(e) => {
              setIsManual(true)
              setManualProgressPct(parseFloat(e.target.value))
            }}
            style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
        </div>
      </div>
    </div>
  )
}
