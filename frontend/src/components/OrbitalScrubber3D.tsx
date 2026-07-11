import { useState, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { PerspectiveCamera, Billboard, Text, Line } from '@react-three/drei'
import { Play, Pause } from 'lucide-react'
import type { ReplayStatus, FlareEvent, LightcurveData } from '../api'

interface ScrubberProps {
  replay: ReplayStatus | null
  flares: FlareEvent[]
  lc: LightcurveData | null
  size?: number
}

const CLASS_COLORS: Record<string, string> = {
  X: '#A33327', // Deep red
  M: '#D8481E', // Orange
  C: '#F4A261', // Amber
  B: '#2A9D8F', // Blue-green
  A: '#6B9080', // Green
  quiet: '#F4A261',
}

// Emissive glow sprite texture
const createGlowTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255, 230, 150, 1)')
    gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.6)')
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
  }
  return new THREE.CanvasTexture(canvas)
}

function Sun({ isFlare, accentColor, reducedMotion }: { isFlare: boolean, accentColor: string, reducedMotion: boolean }) {
  const sunTexture = useLoader(THREE.TextureLoader, '/textures/2k_sun.jpg')
  const sunRef = useRef<THREE.Mesh>(null)
  const glowTex = useMemo(() => createGlowTexture(), [])
  
  // Eruption rings
  const ringRefs = useRef<THREE.Mesh[]>([])

  useFrame((_, delta) => {
    if (!reducedMotion && sunRef.current) {
      sunRef.current.rotation.y += delta * 0.05
    }
    
    // Animate eruption rings
    if (!reducedMotion && isFlare) {
      ringRefs.current.forEach((ring, i) => {
        ring.scale.x += delta * (1.5 + i * 0.2)
        ring.scale.y += delta * (1.5 + i * 0.2)
        ring.scale.z += delta * (1.5 + i * 0.2)
        
        // Add some rotation to the expanding rings
        ring.rotation.x += delta * 0.5
        ring.rotation.y += delta * 0.3
        
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity -= delta * 0.8
        
        if (mat.opacity <= 0) {
          ring.scale.set(1.0, 1.0, 1.0)
          mat.opacity = 0.8
        }
      })
    } else {
      ringRefs.current.forEach(ring => {
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = 0
        ring.scale.set(1.0, 1.0, 1.0)
      })
    }
  })

  return (
    <group>
      {/* The Sun Body */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial 
          map={sunTexture} 
          emissive="#331100" 
          emissiveIntensity={0.5} 
        />
      </mesh>
      
      {/* Background Glow */}
      <Billboard>
        <mesh>
          <planeGeometry args={[8, 8]} />
          <meshBasicMaterial 
            map={glowTex} 
            transparent 
            depthWrite={false} 
            blending={THREE.AdditiveBlending} 
            opacity={isFlare ? 0.3 : 0.8}
          />
        </mesh>
      </Billboard>

      {/* Flare Eruptions */}
      {[0, 1, 2].map((i) => (
        <mesh 
          key={i} 
          ref={el => { if (el) ringRefs.current[i] = el }}
          rotation={[Math.PI/2 * i, Math.PI/3 * i, 0]}
        >
          <torusGeometry args={[1.5, 0.08, 16, 64]} />
          <meshBasicMaterial 
            color={accentColor} 
            transparent 
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function EarthSystem({ reducedMotion }: { reducedMotion: boolean }) {
  const earthTexture = useLoader(THREE.TextureLoader, '/textures/2k_earth_daymap.jpg')
  const groupRef = useRef<THREE.Group>(null)
  const earthRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (groupRef.current) groupRef.current.rotation.y += delta * 0.02
      if (earthRef.current) earthRef.current.rotation.y += delta * 0.5
    }
  })

  // Dashed orbit line
  const orbitPoints = useMemo(() => {
    const pts = []
    const segments = 64
    const radius = 6
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius))
    }
    return pts
  }, [])

  return (
    <group>
      {/* Orbit Track */}
      <Line 
        points={orbitPoints} 
        color="#D8481E" 
        lineWidth={1} 
        dashed={true} 
        dashSize={0.2} 
        gapSize={0.2} 
        opacity={0.3} 
        transparent 
      />

      {/* Orbiting Bodies */}
      <group ref={groupRef}>
        {/* Earth */}
        <mesh ref={earthRef} position={[6, 0, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial map={earthTexture} roughness={0.7} />
        </mesh>

        {/* Aditya-L1 Point (between Earth and Sun) */}
        <group position={[4.8, 0, 0]}>
          {/* Satellite shape */}
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="#FFD166" />
          </mesh>
          <mesh position={[0, 0, 0.15]}>
            <planeGeometry args={[0.05, 0.2]} />
            <meshStandardMaterial color="#4A90D9" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.15]}>
            <planeGeometry args={[0.05, 0.2]} />
            <meshStandardMaterial color="#4A90D9" side={THREE.DoubleSide} />
          </mesh>
          
          <Billboard position={[0, 0.3, 0]}>
            <Text fontSize={0.2} color="var(--text-secondary)" anchorX="center" anchorY="bottom">
              Aditya-L1
            </Text>
          </Billboard>
        </group>

        {/* L1 Connection Line */}
        <Line 
          points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 0)]}
          color="#FFD166"
          lineWidth={1}
          dashed={true}
          dashSize={0.1}
          gapSize={0.1}
          opacity={0.2}
          transparent
        />
      </group>
    </group>
  )
}

function Scene({ isFlare, activeFlare, accentColor, reducedMotion }: any) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={100} distance={20} decay={2} color="#FFF9ED" />

      {/* Bodies */}
      <Sun isFlare={isFlare} accentColor={accentColor} reducedMotion={reducedMotion} />
      <EarthSystem reducedMotion={reducedMotion} />
      
      {/* Active Flare Info Billboard */}
      {isFlare && activeFlare && (
        <Billboard position={[0, 2.5, 0]}>
          <group>
            <mesh>
              <planeGeometry args={[3, 1]} />
              <meshBasicMaterial color="var(--bg-card)" opacity={0.9} transparent />
            </mesh>
            <Text position={[0, 0.15, 0.01]} fontSize={0.25} color={accentColor} fontWeight="bold">
              Class {activeFlare.flare_class} Flare
            </Text>
            <Text position={[0, -0.2, 0.01]} fontSize={0.2} color="var(--text-secondary)">
              Peak: {activeFlare.peak_flux.toFixed(0)} cts/s
            </Text>
          </group>
        </Billboard>
      )}
    </>
  )
}

export default function OrbitalScrubber3D({ replay, flares, lc, size = 500 }: ScrubberProps) {
  const [isManual, setIsManual] = useState(false)
  const [manualProgressPct, setManualProgressPct] = useState(0)
  
  const reducedMotion = useMemo(() => 
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  , [])

  useEffect(() => {
    if (!isManual && replay) {
      setManualProgressPct(replay.progress_pct)
    }
  }, [replay?.progress_pct, isManual])

  const activeFlare = useMemo(() => {
    if (!lc || lc.timestamps.length === 0) return null
    const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
    const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
    const currentMs = startTimeMs + (manualProgressPct / 100) * (endTimeMs - startTimeMs)

    return flares.find(f => {
      const fStart = new Date(f.start_time).getTime()
      const fEnd = new Date(f.end_time).getTime()
      return currentMs >= fStart && currentMs <= fEnd
    }) || null
  }, [lc, flares, manualProgressPct])

  const isFlare = !!activeFlare
  const activeClass = activeFlare?.flare_class || 'quiet'
  const accentColor = CLASS_COLORS[activeClass] || CLASS_COLORS.quiet

  const currentTimeDisplay = useMemo(() => {
    if (!lc || lc.timestamps.length === 0) return 'Loading...'
    const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
    const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
    const currentMs = startTimeMs + (manualProgressPct / 100) * (endTimeMs - startTimeMs)
    return new Date(currentMs).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  }, [lc, manualProgressPct])

  return (
    <div style={{ width: '100%', maxWidth: size, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: 'transparent', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 1.5, 10]} fov={45} />
          <Scene 
            isFlare={isFlare} 
            activeFlare={activeFlare} 
            accentColor={accentColor} 
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>

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
          
          <div style={{ position: 'relative', flex: 1, height: 24, display: 'flex', alignItems: 'center' }}>
            {/* Markers */}
            <div style={{ position: 'absolute', left: 0, right: 0, height: 4, top: 10, pointerEvents: 'none' }}>
              {lc && flares.map(f => {
                const startTimeMs = new Date(lc.time_range?.start || lc.timestamps[0]).getTime()
                const endTimeMs = new Date(lc.time_range?.end || lc.timestamps[lc.timestamps.length - 1]).getTime()
                const totalDur = endTimeMs - startTimeMs

                const fStartMs = new Date(f.start_time).getTime()
                const startPct = Math.max(0, Math.min(100, ((fStartMs - startTimeMs) / totalDur) * 100))
                
                return (
                  <div 
                    key={f.id} 
                    style={{
                      position: 'absolute',
                      left: `${startPct}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 6,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: CLASS_COLORS[f.flare_class] || 'var(--solar-gold)',
                      opacity: 0.8,
                      zIndex: 1,
                    }}
                    title={`Class ${f.flare_class}`}
                  />
                )
              })}
            </div>
            
            <input 
              type="range" 
              min="0" max="100" step="0.1" 
              value={manualProgressPct}
              onChange={(e) => {
                setIsManual(true)
                setManualProgressPct(parseFloat(e.target.value))
              }}
              style={{ width: '100%', position: 'relative', zIndex: 2, cursor: 'pointer', accentColor: 'var(--accent)', opacity: 0.8, background: 'transparent' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
