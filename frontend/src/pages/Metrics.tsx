import { useEffect, useState } from 'react'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, BarChart, Bar, Legend
} from 'recharts'
import { api, type MetricsData, type Stats, type FlareEvent, type ValidationData } from '../api'

const COLORS = ['#D8481E', '#4A90D9', '#F4A261', '#2A9D8F', '#E76F51']
const CLASS_COLORS: Record<string, string> = {
  X: '#A33327', M: '#D8481E', C: '#F4A261', B: '#2A9D8F', A: '#6B9080', quiet: '#F4A261'
}
const CLASS_ORDER = ['X', 'M', 'C', 'B', 'A']

function MetricCard({ label, value, sub, color = '#2A9D8F' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: `rgba(${color === '#D8481E' ? '216,72,30' : '42,157,143'},0.08)`,
      border: `1px solid ${color}`,
      borderRadius: 10, padding: '1.25rem 1.5rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  )
}

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [validation, setValidation] = useState<ValidationData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [flares, setFlares] = useState<FlareEvent[]>([])

  useEffect(() => {
    api.getMetrics().then(setMetrics).catch(console.error)
    api.getValidation().then(setValidation).catch(console.error)
    api.getStats().then(setStats).catch(console.error)
    api.getFlares().then(res => setFlares(res.flares)).catch(console.error)
  }, [])

  if (!metrics || !stats || !flares) {
    return <div className="page-enter" style={{ padding: '2rem', textAlign: 'center' }}>Loading metrics...</div>
  }

  const isReal = !metrics.note?.includes('STUB')

  // Class distribution
  const classDist = CLASS_ORDER.map(cls => ({
    name: cls,
    count: stats.flares.by_class[cls] || 0,
    color: CLASS_COLORS[cls]
  })).filter(d => d.count > 0)

  // Scatter data
  const scatterData = flares.map(f => ({
    x: f.duration_minutes,
    y: f.peak_flux,
    z: f.peak_sigma,
    class: f.flare_class,
    fill: CLASS_COLORS[f.flare_class] || CLASS_COLORS.quiet
  }))

  // Feature importances sorted
  const featureImportances = Object.entries(metrics.feature_importances || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      importance: Math.round(value * 1000) / 10
    }))

  // Confusion matrix derived metrics
  const cm = metrics.confusion_matrix
  const cmTotal = cm.TP + cm.FP + cm.TN + cm.FN
  const accuracy = cmTotal > 0 ? ((cm.TP + cm.TN) / cmTotal * 100).toFixed(1) : '—'

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title">Model Performance & Training Metrics</h1>
        <p className="section-subtitle">
          XGBoost solar flare predictor trained on real Aditya-L1 sensor fusion data.
          Labels derived from NOAA GOES ground-truth event catalog.
        </p>
        {isReal ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(42,157,143,0.12)', border: '1px solid #2A9D8F',
            borderRadius: 100, padding: '0.3rem 0.9rem', fontSize: '0.78rem',
            color: '#2A9D8F', fontWeight: 600, marginTop: '0.75rem'
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2A9D8F', display: 'inline-block' }} />
            Real ML metrics — XGBoost trained on NOAA ground truth
          </div>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(216,72,30,0.12)', border: '1px solid #D8481E',
            borderRadius: 100, padding: '0.3rem 0.9rem', fontSize: '0.78rem',
            color: '#D8481E', fontWeight: 600, marginTop: '0.75rem'
          }}>
            ⚠ Stub data — run <code style={{ marginLeft: 4 }}>python pipeline/retrain.py</code> to generate real metrics
          </div>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard label="Overall Accuracy" value={`${accuracy}%`} sub="On held-out test set" />
        <MetricCard label="Precision" value={metrics.precision !== undefined ? (metrics.precision * 100).toFixed(1) + '%' : '—'} color="#4A90D9" />
        <MetricCard label="Recall" value={metrics.recall !== undefined ? (metrics.recall * 100).toFixed(1) + '%' : '—'} color="#4A90D9" />
        <MetricCard label="F1 Score" value={metrics.f1_score !== undefined ? metrics.f1_score.toFixed(3) : '—'} color="#F4A261" />
        {metrics.predict_horizon_minutes && (
          <MetricCard label="Predict Horizon" value={`${metrics.predict_horizon_minutes} min`} sub="Look-ahead window" color="#6B9080" />
        )}
        {metrics.n_train_samples && (
          <MetricCard label="Training Samples" value={metrics.n_train_samples.toLocaleString()} sub="1-min windows" color="#6B9080" />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Training Loss Curve (Real XGBoost rounds) */}
        <div className="card">
          <div className="card-title">XGBoost Training Loss</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Real per-round log-loss for training and validation sets.
            {isReal ? ' Early stopping applied.' : ' (stub data)'}
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={metrics.training_curves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} label={{ value: 'Round', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                <Line type="monotone" dataKey="loss" stroke="#D8481E" strokeWidth={2} dot={false} name="Train Loss" />
                <Line type="monotone" dataKey="val_loss" stroke="#4A90D9" strokeWidth={2} dot={false} name="Val Loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Curve */}
        <div className="card">
          <div className="card-title">Model Accuracy per Round</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Training accuracy vs validation accuracy across boosting rounds.
          </p>
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={metrics.training_curves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A9D8F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2A9D8F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="valAccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90D9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4A90D9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#2A9D8F" fillOpacity={1} fill="url(#accGrad)" name="Train Acc" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="val_accuracy" stroke="#4A90D9" fillOpacity={1} fill="url(#valAccGrad)" name="Val Acc" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Confusion Matrix */}
        <div className="card">
          <div className="card-title">Confusion Matrix (Test Set)</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {isReal
              ? `Evaluated on ${metrics.n_test_samples?.toLocaleString() ?? '?'} held-out samples. Labels from NOAA GOES catalog.`
              : 'Run python pipeline/retrain.py to populate with real values.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid #2A9D8F', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Positives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2A9D8F' }}>{cm.TP}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Correctly predicted flare</div>
            </div>
            <div style={{ background: 'rgba(216,72,30,0.1)', border: '1px solid #D8481E', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Positives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D8481E' }}>{cm.FP}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Predicted flare, no event</div>
            </div>
            <div style={{ background: 'rgba(216,72,30,0.1)', border: '1px solid #D8481E', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>False Negatives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D8481E' }}>{cm.FN}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Missed flare</div>
            </div>
            <div style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid #2A9D8F', padding: '1.5rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>True Negatives</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2A9D8F' }}>{cm.TN}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Correctly predicted quiet</div>
            </div>
          </div>
        </div>

        {/* Sensor Fusion Weightage */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">Sensor Fusion Weightage</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Pipeline uses exactly 50-50 blended interpolation on overlapping dates (Jul 2–9).
          </p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={metrics.weightage}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={75}
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
      </div>

      {/* Feature Importances */}
      {featureImportances.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card">
            <div className="card-title">Feature Importances</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Which flux features drive the XGBoost flare predictions most.
            </p>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={featureImportances} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={80} />
                  <RechartsTooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem' }}
                    formatter={(v: any) => [`${v}%`, 'Importance']}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {featureImportances.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NOAA Validation */}
          {validation && (
            <div className="card">
              <div className="card-title">NOAA Ground Truth Validation</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Detection algorithm cross-checked vs NOAA GOES catalog (±{validation.tolerance_minutes ?? 10} min tolerance).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Our Detections', value: validation.detected ?? '—', color: '#4A90D9' },
                  { label: 'NOAA Events', value: validation.noaa_events ?? '—', color: '#4A90D9' },
                  { label: 'True Positives', value: validation.true_positives ?? '—', color: '#2A9D8F' },
                  { label: 'False Positives', value: validation.false_positives ?? '—', color: '#D8481E' },
                  { label: 'False Negatives', value: validation.false_negatives ?? '—', color: '#D8481E' },
                  { label: 'F1 Score', value: validation.f1_score !== undefined ? validation.f1_score.toFixed(3) : '—', color: '#F4A261' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '0.75rem', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
              {validation.note && (
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '1rem', fontStyle: 'italic' }}>
                  Note: {validation.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

        {/* Peak vs Duration Scatter */}
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

      {metrics.trained_at && (
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Model trained: {new Date(metrics.trained_at).toLocaleString()} ·
          {metrics.n_train_samples?.toLocaleString()} train / {metrics.n_test_samples?.toLocaleString()} test samples
        </div>
      )}
    </div>
  )
}
