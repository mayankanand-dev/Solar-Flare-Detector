import { useEffect, useState } from 'react'

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, BarChart, Bar 
} from 'recharts'
import { api, type MetricsData, type Stats, type FlareEvent } from '../api'

const COLORS = ['#D8481E', '#4A90D9', '#F4A261', '#2A9D8F', '#E76F51']
const CLASS_COLORS: Record<string, string> = {
  X: '#A33327', M: '#D8481E', C: '#F4A261', B: '#2A9D8F', A: '#6B9080', quiet: '#F4A261'
}
const CLASS_ORDER = ['X', 'M', 'C', 'B', 'A']

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [flares, setFlares] = useState<FlareEvent[]>([])
  
  useEffect(() => {
    api.getMetrics().then(setMetrics).catch(console.error)
    api.getStats().then(setStats).catch(console.error)
    api.getFlares().then(res => setFlares(res.flares)).catch(console.error)
  }, [])

  if (!metrics || !stats || !flares) {
    return <div className="page-enter" style={{ padding: '2rem', textAlign: 'center' }}>Loading metrics...</div>
  }

  // Process data for charts
  const classDist = CLASS_ORDER.map(cls => ({
    name: cls,
    count: stats.flares.by_class[cls] || 0,
    color: CLASS_COLORS[cls]
  })).filter(d => d.count > 0)

  const scatterData = flares.map(f => ({
    x: f.duration_minutes,
    y: f.peak_flux,
    z: f.peak_sigma,
    class: f.flare_class,
    fill: CLASS_COLORS[f.flare_class] || CLASS_COLORS.quiet
  }))

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title">Accuracy & Training Metrics</h1>
        <p className="section-subtitle">
          Inferences and validation metrics for the underlying flare detection pipeline.
          Data is sourced via 50-50 Sensor Fusion from HEL1OS and SoLEXS payloads.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Loss Curve */}
        <div className="card">
          <div className="card-title">Model Loss Optimization</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Training loss vs Validation loss over 100 simulated epochs.
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={metrics.training_curves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }} 
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="loss" stroke="#D8481E" strokeWidth={2} dot={false} name="Training Loss" />
                <Line type="monotone" dataKey="val_loss" stroke="#4A90D9" strokeWidth={2} dot={false} name="Validation Loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy */}
        <div className="card">
          <div className="card-title">Detection Accuracy</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Model accuracy progression. Target: &gt;95% accuracy.
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={metrics.training_curves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A9D8F" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2A9D8F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#2A9D8F" fillOpacity={1} fill="url(#accGradient)" name="Accuracy" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Sensor Fusion Weightage */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Dataset Weightage (Sensor Fusion)</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Pipeline guarantees exactly 50-50 blended interpolation.
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.weightage}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {metrics.weightage.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="card">
          <div className="card-title">Confusion Matrix (Test Set)</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Validation against synthetic ground truth catalogs.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ background: 'rgba(42, 157, 143, 0.1)', border: '1px solid #2A9D8F', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Positives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2A9D8F' }}>{metrics.confusion_matrix.TP}</div>
            </div>
            <div style={{ background: 'rgba(216, 72, 30, 0.1)', border: '1px solid #D8481E', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Positives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D8481E' }}>{metrics.confusion_matrix.FP}</div>
            </div>
            <div style={{ background: 'rgba(216, 72, 30, 0.1)', border: '1px solid #D8481E', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Negatives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D8481E' }}>{metrics.confusion_matrix.FN}</div>
            </div>
            <div style={{ background: 'rgba(42, 157, 143, 0.1)', border: '1px solid #2A9D8F', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Negatives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2A9D8F' }}>{metrics.confusion_matrix.TN}</div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Flare Distribution */}
        <div className="card">
          <div className="card-title">Detected Class Distribution</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Count of flares detected by GOES-style classification.
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={classDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--bg-elevated)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }} 
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {classDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak vs Duration */}
        <div className="card">
          <div className="card-title">Inference: Peak Flux vs Duration</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Scatter map of all {flares.length} detected events.
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" name="Duration (min)" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Peak Flux" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                <RechartsTooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }} 
                />
                <Scatter name="Flares" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
