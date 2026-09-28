import { useState } from 'react'
import {
  FileText, Download, Github, Award, CheckCircle2,
  BarChart3, Layers, ShieldCheck,
  Maximize2, X, ExternalLink
} from 'lucide-react'

interface FigureItem {
  id: string
  num: string
  title: string
  category: 'benchmark' | 'ablation' | 'attribution' | 'timeline'
  src: string
  caption: string
  keyFinding: string
}

const FIGURES: FigureItem[] = [
  {
    id: 'fig1',
    num: 'Fig. 1',
    title: 'Benchmark Performance Comparison',
    category: 'benchmark',
    src: '/figures/fig1_performance_comparison.png',
    caption: 'Fig. 1. Benchmark performance comparison between Bringewald & Parisot (MDPI Astronomy 2025) and Solar Sentinel across 10-fold CV (balanced) and SDBP Holdout test sets.',
    keyFinding: 'Solar Sentinel achieves F1 = 0.772 on 10-fold CV (+6.8% over the 0.723 SDO/HMI baseline) and ROC AUC = 0.870 (+7.3%).'
  },
  {
    id: 'fig2',
    num: 'Fig. 2',
    title: 'Precision-Recall Dynamics on Unseen Blocks',
    category: 'benchmark',
    src: '/figures/fig2_pr_curve.png',
    caption: 'Fig. 2. Precision-Recall curve on strictly unseen SDBP 24-hour holdout blocks (PR AUC = 0.272 vs random prevalence baseline = 0.043).',
    keyFinding: 'Delivers a 6.3x gain over random prevalence under extreme 4.3% class imbalance, correctly isolating 264 true positive precursor minutes.'
  },
  {
    id: 'fig3',
    num: 'Fig. 3',
    title: 'TreeSHAP Feature Attributions by Sensor',
    category: 'attribution',
    src: '/figures/fig3_feature_importance.png',
    caption: 'Fig. 3. TreeSHAP feature attribution bar chart grouped by physical domain: SoLEXS soft X-rays (48.6%), Cross-Sensor Hardness (31.2%), Stability (11.8%), and HEL1OS (8.4%).',
    keyFinding: 'Cross-sensor spectral hardness interaction accounts for nearly one-third (31.2%) of total predictive power.'
  },
  {
    id: 'fig4',
    num: 'Fig. 4',
    title: 'Cross-Sensor Synergy & Baseline Ablations',
    category: 'ablation',
    src: '/figures/fig4_ablation_dual_sensor.png',
    caption: 'Fig. 4. Sensor ablation study on unseen holdout test set demonstrating dual-sensor synergy over single-sensor and heuristic baselines.',
    keyFinding: 'Dual-sensor model (TSS = 0.318) strictly defeats SoLEXS-only (0.283), HEL1OS-only (0.289), k-sigma (+122%), and Persistence (+132%).'
  },
  {
    id: 'fig5',
    num: 'Fig. 5',
    title: 'Forecast Horizon Sensitivity Decay',
    category: 'ablation',
    src: '/figures/fig5_horizon_ablation.png',
    caption: 'Fig. 5. Forecast horizon sensitivity sweep across lead times (10 to 60 minutes) demonstrating monotonic physical skill decay.',
    keyFinding: 'TSS decays cleanly from 0.502 at 10 min to 0.288 at 60 min, reflecting coronal pre-heating dissipation.'
  },
  {
    id: 'fig6',
    num: 'Fig. 6',
    title: 'Full-Mission Operational Backtest (76.7k min)',
    category: 'timeline',
    src: '/figures/fig6_operational_timeline.png',
    caption: 'Fig. 6. Continuous operational classification across all 76,784 telemetry minutes from February 2024 to July 2026.',
    keyFinding: '95.7% accuracy with 1,528 true positive flare minutes captured and only ~1 false alarm per 24 hours of flight monitoring.'
  },
  {
    id: 'fig7',
    num: 'Fig. 7',
    title: 'TreeSHAP Beeswarm Impact Density',
    category: 'attribution',
    src: '/figures/shap_summary.png',
    caption: 'Fig. 7. TreeSHAP beeswarm density plot illustrating positive vs. negative impact directionality on flare prediction log-odds across N = 5,000 holdout instances.',
    keyFinding: 'High values of solexs_roc_5m and h_s_ratio strongly drive model log-odds into the high-risk flare state.'
  }
]

export default function ResearchPaper() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeModalFigure, setActiveModalFigure] = useState<FigureItem | null>(null)
  const [activeTableTab, setActiveTableTab] = useState<'t1' | 't2' | 't3' | 't4'>('t1')

  const filteredFigures = selectedCategory === 'all'
    ? FIGURES
    : FIGURES.filter(f => f.category === selectedCategory)

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* ── Top Hero: Paper Title & Authors ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(74,144,217,0.08) 0%, rgba(42,157,143,0.04) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '2.5rem 2rem',
        marginBottom: '2.5rem',
        position: 'relative',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(42,157,143,0.15)', border: '1px solid #2A9D8F', borderRadius: 100, padding: '0.35rem 1rem', fontSize: '0.8rem', color: '#2A9D8F', fontWeight: 700, marginBottom: '1.25rem' }}>
          <Award size={16} /> Research Paper & Scientific Evaluation
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Solar Sentinel: Operational 30-Minute Solar Flare Early Warning via Dual-Sensor X-Ray Radiometry on ISRO Aditya-L1
        </h1>

        {/* Author Roster */}
        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
          <span>Mayank Anand</span> <sup style={{ color: '#F4A261' }}>1,*</sup>,{' '}
          <span>Aditi Jha</span> <sup>1</sup>,{' '}
          <span>Vidushi Kesharwani</span> <sup>1</sup>,{' '}
          <span>Gauri Nandana M</span> <sup>1</sup>,{' '}
          <span>Prakriti Wadhwani</span> <sup>1</sup>,{' '}
          <span>Kasak Fitkariwala</span> <sup>1</sup>
        </div>

        {/* Affiliation */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', borderLeft: '3px solid #4A90D9', paddingLeft: '0.85rem' }}>
          <div><strong>1.</strong> Department of Computer Science & Engineering (Specialization in AI & Machine Learning),</div>
          <div><strong>School of Computing Science Engineering and Artificial Intelligence</strong>, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India</div>
          <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            * Correspondence: <strong>Mayank Anand</strong> (Lead Architect & Author; <code style={{ color: 'var(--accent)' }}>mayank.25bai11209@vitbhopal.ac.in</code> | <code style={{ color: 'var(--accent)' }}>dev.mayankanand@gmail.com</code>)
          </div>
        </div>

        {/* Download & Source Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <a
            href="/Solar_Sentinel_Research_Paper.docx"
            download
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
          >
            <Download size={16} /> Download Paper (.docx)
          </a>
          <a
            href="/solar_sentinel_research_paper.md"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
          >
            <FileText size={16} /> Read Full Markdown (.md)
          </a>
          <a
            href="https://github.com/mayankanand-dev/Solar-Sentinel"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
          >
            <Github size={16} /> GitHub Source & Pipeline <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* ── Key Highlights Ribbon ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: '10-Fold CV F1', val: '0.772 ± 0.019', sub: 'Surpasses Bringewald 2025 (0.723)', color: '#2A9D8F' },
          { label: 'True Skill Statistic (TSS)', val: '0.554 (CV) / 0.318', sub: '+132% gain over Persistence', color: '#4A90D9' },
          { label: 'Continuous Telemetry', val: '76,784 Min', sub: '95.7% full-mission accuracy', color: '#F4A261' },
          { label: 'Cross-Sensor Contribution', val: '31.2%', sub: 'TreeSHAP spectral interaction', color: '#D8481E' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${item.color}35`,
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: item.color }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)' }}>
              {item.val}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 1: The 4 Core Research Remedies ── */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={22} color="var(--accent)" />
          <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
            The 4 Scientific Remedies: Eliminating Flaws in Space Weather ML
          </h2>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Standard machine learning models fail on satellite telemetry due to label noise, chronological leakage, and reliance on uncalibrated metrics. Solar Sentinel introduces four rigorous architectural remedies:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          
          {/* Remedy 1 */}
          <div className="card" style={{ borderLeft: '4px solid #2A9D8F' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F', background: 'rgba(42,157,143,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                REMEDY 1
              </span>
              <CheckCircle2 size={16} color="#2A9D8F" />
            </div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Precursor-Gated Positive Labeling (PGPL)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Fixed 30-min horizon labeling blindly marks quiescent equilibrium minutes as "flare positive", injecting severe noise. PGPL gates precursor labels by physical soft X-ray departure:
            </p>
            <div style={{ background: 'var(--bg-elevated)', padding: '0.6rem 0.8rem', borderRadius: 6, margin: '0.75rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#2A9D8F' }}>
              G(t) = &#123; z<sup>S</sup>(t) ≥ 0.35 &#125; ∪ &#123; RoC<sub>5</sub><sup>S</sup>(t) ≥ 0.01 &#125; ∪ &#123; z<sub>fused</sub>(t) ≥ 0.35 &#125;
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Gate ablation confirms PGPL acts as a pure noise filter (+0.071 precision boost) rather than a shortcut.
            </div>
          </div>

          {/* Remedy 2 */}
          <div className="card" style={{ borderLeft: '4px solid #4A90D9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#4A90D9', background: 'rgba(74,144,217,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                REMEDY 2
              </span>
              <CheckCircle2 size={16} color="#4A90D9" />
            </div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Stratified Daily Block Partitioning (SDBP)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Naive random splits leak rolling baselines across adjacent minutes, while chronological tail splits fail because July 2026 is an empty quiet minimum (0 NOAA events = division-by-zero F1).
            </p>
            <div style={{ background: 'var(--bg-elevated)', padding: '0.6rem 0.8rem', borderRadius: 6, margin: '0.75rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#4A90D9' }}>
              D<sub>train</sub> = 70% Active Blocks ∪ 70% Quiet Blocks (24h diurnal units)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Ensures strictly unseen daily blocks in test sets while maintaining identical class prevalence.
            </div>
          </div>

          {/* Remedy 3 */}
          <div className="card" style={{ borderLeft: '4px solid #F4A261' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F4A261', background: 'rgba(244,162,97,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                REMEDY 3
              </span>
              <CheckCircle2 size={16} color="#F4A261" />
            </div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Standard Meteorological Skill Scores (TSS & HSS)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Under 4.3% flare imbalance, Accuracy and ROC AUC are easily inflated by quiet background. Solar Sentinel reports the True Skill Statistic (TSS) and Heidke Skill Score (HSS):
            </p>
            <div style={{ background: 'var(--bg-elevated)', padding: '0.6rem 0.8rem', borderRadius: 6, margin: '0.75rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#F4A261' }}>
              TSS = TPR - FPR = TP/(TP+FN) - FP/(FP+TN) = 0.554 (CV) / 0.318 (Holdout)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Guaranteed unbiased against class imbalance; standard protocol in solar physics (Barnes et al. 2016).
            </div>
          </div>

          {/* Remedy 4 */}
          <div className="card" style={{ borderLeft: '4px solid #D8481E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#D8481E', background: 'rgba(216,72,30,0.15)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                REMEDY 4
              </span>
              <CheckCircle2 size={16} color="#D8481E" />
            </div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Baseline & Sensor Synergy Verification
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Proves genuine machine learning value over trivial heuristics:
            </p>
            <div style={{ background: 'var(--bg-elevated)', padding: '0.6rem 0.8rem', borderRadius: 6, margin: '0.75rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div>• <strong>vs Persistence:</strong> TSS 0.318 vs 0.137 (<span style={{ color: '#2A9D8F', fontWeight: 700 }}>+132% gain</span>)</div>
              <div>• <strong>vs k-sigma (≥3σ):</strong> TSS 0.318 vs 0.143 (<span style={{ color: '#2A9D8F', fontWeight: 700 }}>+122% gain</span>)</div>
              <div>• <strong>Dual-Sensor Synergy:</strong> Beats SoLEXS-only (0.283) & HEL1OS-only (0.289)</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Verified across 5 random seeds (F1 = 0.294 ± 0.000, zero seed sensitivity).
            </div>
          </div>

        </div>
      </div>

      {/* ── Section 2: Publication Figure Gallery (High-Res 300 DPI) ── */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BarChart3 size={22} color="#4A90D9" />
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                Publication Figures & Visualizations
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              High-resolution figures from the research paper. Click any figure to expand into full view.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.3rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            {[
              { id: 'all', label: 'All Figures' },
              { id: 'benchmark', label: 'Benchmarks' },
              { id: 'ablation', label: 'Ablations' },
              { id: 'attribution', label: 'TreeSHAP' },
              { id: 'timeline', label: 'Timeline' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  background: selectedCategory === tab.id ? 'var(--accent)' : 'transparent',
                  color: selectedCategory === tab.id ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Figures Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredFigures.map(fig => (
            <div
              key={fig.id}
              onClick={() => setActiveModalFigure(fig)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
              className="card-hover"
            >
              <div style={{ position: 'relative', background: '#ffffff', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                <img
                  src={fig.src}
                  alt={fig.title}
                  style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
                  loading="lazy"
                />
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  borderRadius: 4, padding: '0.25rem 0.5rem',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.72rem', fontWeight: 600
                }}>
                  <Maximize2 size={12} /> Expand
                </div>
                <div style={{
                  position: 'absolute', bottom: 10, left: 10,
                  background: '#111827', color: '#ffd166',
                  borderRadius: 4, padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)'
                }}>
                  {fig.num}
                </div>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {fig.title}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 0.75rem 0', flex: 1 }}>
                  {fig.caption}
                </p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                  💡 {fig.keyFinding}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Interactive Benchmark Tables ── */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Layers size={22} color="#F4A261" />
          <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
            Benchmark & Ablation Tables
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Formatted following academic booktabs specifications and benchmarked against published literature.
        </p>

        {/* Table Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          {[
            { id: 't1', label: 'Table I: Published Comparison' },
            { id: 't2', label: 'Table II: Baselines & Ablations' },
            { id: 't3', label: 'Table III: Forecast Horizons' },
            { id: 't4', label: 'Table IV: TreeSHAP Attributions' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTableTab(tab.id as any)}
              style={{
                background: activeTableTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTableTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeTableTab === tab.id ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 6,
                padding: '0.45rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Comprehensive Comparison */}
        {activeTableTab === 't1' && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              TABLE I: Comprehensive Performance Comparison across Evaluation Protocols
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem' }}>Model / System</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem' }}>Evaluation Scope</th>
                  <th style={{ padding: '0.6rem' }}>F1 Score</th>
                  <th style={{ padding: '0.6rem' }}>ROC AUC</th>
                  <th style={{ padding: '0.6rem' }}>PR AUC</th>
                  <th style={{ padding: '0.6rem' }}>TSS</th>
                  <th style={{ padding: '0.6rem' }}>HSS</th>
                  <th style={{ padding: '0.6rem' }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 600 }}>Bringewald & Parisot (2025) [1]</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-muted)' }}>10-Fold CV (SDO/HMI)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.723</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.811</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.834</td>
                  <td>—</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.733</td>
                </tr>
                <tr style={{ background: 'rgba(42,157,143,0.08)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 700, color: '#2A9D8F' }}>★ Solar Sentinel (Aditya-L1)</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', color: '#2A9D8F', fontWeight: 600 }}>10-Fold CV (Balanced)</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.772 ± 0.019</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F' }}>0.870 ± 0.015</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F' }}>0.875 ± 0.014</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F' }}>0.554</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F' }}>0.554</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2A9D8F' }}>0.777</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 600 }}>Solar Sentinel (Aditya-L1)</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-muted)' }}>M/X-Class Severe CV</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.715</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.816</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.733</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 600 }}>Solar Sentinel (Aditya-L1)</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-muted)' }}>SDBP Holdout (30% Unseen)</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>0.292</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.783</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.272</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F4A261' }}>0.318</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F4A261' }}>0.255</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.926</td>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--text-primary)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 600 }}>Solar Sentinel (Aditya-L1)</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', color: 'var(--text-muted)' }}>Full-Mission Backtest</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.479</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.893</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.471</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.439</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.457</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>0.957</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Baselines & Sensor Ablations */}
        {activeTableTab === 't2' && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              TABLE II: Baselines and Sensor Ablation Study on Unseen SDBP Holdout Data
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem' }}>Model ID</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem' }}>Architecture / Sensor</th>
                  <th style={{ padding: '0.6rem' }}>Features</th>
                  <th style={{ padding: '0.6rem' }}>F1 Score</th>
                  <th style={{ padding: '0.6rem' }}>TSS</th>
                  <th style={{ padding: '0.6rem' }}>HSS</th>
                  <th style={{ padding: '0.6rem' }}>ROC AUC</th>
                  <th style={{ padding: '0.6rem' }}>Precision</th>
                  <th style={{ padding: '0.6rem' }}>Recall</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontFamily: 'var(--font-mono)' }}>B1</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem' }}>Persistence (y<sub>t</sub> = y<sub>t-30</sub>)</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.172</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0.137</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0.137</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.172</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.172</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontFamily: 'var(--font-mono)' }}>B2</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem' }}>k-sigma Threshold (σ ≥ 3.0)</td>
                  <td>1</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.223</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0.143</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>0.205</td>
                  <td>—</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.412</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.153</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontFamily: 'var(--font-mono)' }}>B3</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem' }}>SoLEXS-Only (Soft X-Ray)</td>
                  <td>12</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.279</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.283</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.242</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.798</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.243</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.327</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontFamily: 'var(--font-mono)' }}>B4</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem' }}>HEL1OS-Only (Hard X-Ray)</td>
                  <td>11</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.265</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.289</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.226</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.771</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.216</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>0.344</td>
                </tr>
                <tr style={{ background: 'rgba(42,157,143,0.08)', borderBottom: '2px solid var(--text-primary)' }}>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>Full</td>
                  <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 800, color: '#2A9D8F' }}>★ Dual-Sensor Fused (SoLEXS + HEL1OS)</td>
                  <td style={{ fontWeight: 800 }}>22</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.292</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.318</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.255</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.783</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.243</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2A9D8F' }}>0.367</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Forecast Horizon Sweep */}
        {activeTableTab === 't3' && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              TABLE III: Forecast Horizon Sensitivity Sweep across Lead Times (10 to 60 Minutes)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem' }}>Forecast Horizon</th>
                  <th style={{ padding: '0.6rem' }}>F1 Score</th>
                  <th style={{ padding: '0.6rem' }}>TSS</th>
                  <th style={{ padding: '0.6rem' }}>HSS</th>
                  <th style={{ padding: '0.6rem' }}>ROC AUC</th>
                  <th style={{ padding: '0.6rem' }}>PR AUC</th>
                  <th style={{ padding: '0.6rem' }}>Precision</th>
                  <th style={{ padding: '0.6rem' }}>Recall</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { h: '10 Minutes', f1: '0.427', tss: '0.502', hss: '0.408', roc: '0.879', pr: '0.432', p: '0.358', r: '0.528' },
                  { h: '20 Minutes', f1: '0.385', tss: '0.427', hss: '0.357', roc: '0.837', pr: '0.380', p: '0.329', r: '0.465' },
                  { h: '30 Minutes (Nominal)', f1: '0.287', tss: '0.326', hss: '0.248', roc: '0.782', pr: '0.260', p: '0.231', r: '0.381', bold: true },
                  { h: '45 Minutes', f1: '0.300', tss: '0.314', hss: '0.246', roc: '0.782', pr: '0.271', p: '0.244', r: '0.389' },
                  { h: '60 Minutes', f1: '0.312', tss: '0.288', hss: '0.249', roc: '0.790', pr: '0.290', p: '0.272', r: '0.366' },
                ].map(row => (
                  <tr key={row.h} style={{ borderBottom: '1px solid var(--border)', background: row.bold ? 'rgba(244,162,97,0.08)' : 'transparent' }}>
                    <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: row.bold ? 700 : 500, color: row.bold ? '#F4A261' : 'var(--text-primary)' }}>{row.h}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.f1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{row.tss}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.hss}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.roc}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.pr}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.p}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: TreeSHAP Attributions */}
        {activeTableTab === 't4' && (
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              TABLE IV: Top-10 Telemetry Features by Mean Absolute TreeSHAP Attribution (N = 5,000 Holdout Samples)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem' }}>Rank</th>
                  <th style={{ padding: '0.6rem' }}>Feature Code</th>
                  <th style={{ padding: '0.6rem' }}>Domain</th>
                  <th style={{ padding: '0.6rem' }}>Mean |SHAP|</th>
                  <th style={{ padding: '0.6rem' }}>Mass %</th>
                  <th style={{ padding: '0.6rem' }}>Physical Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { r: 1, f: 'solexs_roc_5m', d: 'SoLEXS', s: '0.6335', m: '21.8%', desc: 'Thermal precursor loop heating velocity (5-min slope)' },
                  { r: 2, f: 'h_s_ratio', d: 'Cross-Sensor', s: '0.5559', m: '19.1%', desc: 'Hard-to-soft X-ray hardness ratio (non-thermal onset)' },
                  { r: 3, f: 'solexs_zscore', d: 'SoLEXS', s: '0.3079', m: '10.6%', desc: 'Departure above 90-min causal quiet-Sun baseline' },
                  { r: 4, f: 'energy_partition_idx', d: 'Cross-Sensor', s: '0.2674', m: '9.2%', desc: 'Non-thermal energy partition index [ln(HEL1OS) - ln(SoLEXS)]' },
                  { r: 5, f: 'flux_zscore', d: 'Ensemble', s: '0.1772', m: '6.1%', desc: 'Global payload combined baseline departure' },
                  { r: 6, f: 'solexs_roc_15m', d: 'SoLEXS', s: '0.1644', m: '5.7%', desc: 'Medium-term thermal heating momentum' },
                  { r: 7, f: 'solexs_ewma_diff', d: 'SoLEXS', s: '0.0972', m: '3.3%', desc: 'Moving average divergence from baseline' },
                  { r: 8, f: 'solexs_roc_30m', d: 'SoLEXS', s: '0.0937', m: '3.2%', desc: 'Long-window background trend indicator' },
                  { r: 9, f: 'h_s_ratio_roc', d: 'Cross-Sensor', s: '0.0839', m: '2.9%', desc: 'Rate of spectral hardening acceleration' },
                  { r: 10, f: 'hel1os_zscore', d: 'HEL1OS', s: '0.0819', m: '2.8%', desc: 'Impulsive hard X-ray photon count anomaly' },
                ].map(row => (
                  <tr key={row.r} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{row.r}</td>
                    <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{row.f}</td>
                    <td style={{ padding: '0.6rem', color: row.d === 'Cross-Sensor' ? '#F4A261' : row.d === 'SoLEXS' ? '#2A9D8F' : '#4A90D9', fontWeight: 600 }}>{row.d}</td>
                    <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)' }}>{row.s}</td>
                    <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{row.m}</td>
                    <td style={{ padding: '0.6rem', color: 'var(--text-secondary)' }}>{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Figure Lightbox Modal ── */}
      {activeModalFigure && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            maxWidth: 960,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>
                  {activeModalFigure.num}:
                </span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {activeModalFigure.title}
                </span>
              </div>
              <button
                onClick={() => setActiveModalFigure(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', flex: 1 }}>
              <img
                src={activeModalFigure.src}
                alt={activeModalFigure.title}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {activeModalFigure.caption}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                💡 <strong>Core Finding:</strong> {activeModalFigure.keyFinding}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
