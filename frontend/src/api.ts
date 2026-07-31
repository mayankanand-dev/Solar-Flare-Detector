// API base URL — pointing to the static data folder
export const API_BASE = '/data'

export interface FlareEvent {
  id: number
  start_time: string
  peak_time: string
  end_time: string
  peak_flux: number
  background_flux: number
  peak_sigma: number
  duration_minutes: number
  flare_class: 'X' | 'M' | 'C' | 'B' | 'A'
  instrument: string
  note: string
}

export interface LightcurveData {
  timestamps: string[]
  flux: number[]
  n_points: number
  time_range?: {
    start: string
    end: string
  }
}

export interface ReplayStatus {
  current_idx: number
  current_time: string | null
  current_flux: number | null
  flare_active: boolean
  active_flare: {
    id: number
    flare_class: string
    peak_flux: number
    peak_time: string
  } | null
  replay_speed_x: number
  started_at: string | null
  total_samples: number
  progress_pct: number
  mode: string
  disclaimer: string
}

export interface FlareDetail {
  flare: FlareEvent
  lightcurve_window: {
    timestamps: string[]
    flux: number[]
    window_start: string
    window_end: string
  }
}

export interface Stats {
  lightcurve: {
    total_rows: number
    time_start: string
    time_end: string
    duration_hours: number
    flux_min: number
    flux_max: number
    flux_median: number
  }
  flares: {
    total: number
    by_class: Record<string, number>
  }
  source: string
}

export interface MetricsData {
  training_curves: {
    epoch: number
    loss: number
    val_loss: number
    accuracy: number
    val_accuracy?: number
  }[]
  weightage: {
    name: string
    value: number
  }[]
  confusion_matrix: {
    TP: number
    FP: number
    TN: number
    FN: number
  }
  precision?: number
  recall?: number
  f1_score?: number
  feature_importances?: Record<string, number>
  predict_horizon_minutes?: number
  trained_at?: string
  n_train_samples?: number
  n_test_samples?: number
  note?: string
}

export interface ValidationData {
  detected?: number
  noaa_events?: number
  true_positives?: number
  false_positives?: number
  false_negatives?: number
  precision?: number
  recall?: number
  f1_score?: number
  tolerance_minutes?: number
  note?: string
  matches?: Array<{
    our_flare_id: number
    our_class: string
    our_time: string
    noaa_class: string
    noaa_time: string
    delta_minutes: number
  }>
}

export interface PredictionData {
  flare_probability: number
  predicted_class: string
  confidence: string
  horizon_minutes?: number
  note?: string
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export const api = {
  getLightcurve: (_downsample = 2000): Promise<LightcurveData> =>
    apiFetch('/lightcurve.json'),

  getFlares: (): Promise<{ flares: FlareEvent[]; count: number; meta: Record<string, unknown> }> =>
    apiFetch('/flares.json'),

  getStats: (): Promise<Stats> =>
    apiFetch('/stats.json'),

  getMetrics: (): Promise<MetricsData> =>
    apiFetch('/metrics.json'),

  getValidation: (): Promise<ValidationData> =>
    apiFetch('/validation.json'),

  getPrediction: (): Promise<{ predictions: Array<{ timestamp: string; flare_probability: number }>; horizon_minutes?: number }> =>
    apiFetch('/prediction_sample.json'),

  // Simulated endpoints for static hosting
  getFlareDetail: async (id: number): Promise<FlareDetail> => {
    const [flaresRes, lcRes] = await Promise.all([
      api.getFlares(),
      api.getLightcurve()
    ])

    const flare = flaresRes.flares.find(f => f.id === id)
    if (!flare) throw new Error('Flare not found')

    const peakTime = new Date(flare.peak_time).getTime()
    const startWindow = peakTime - (1 * 60 * 60 * 1000)
    const endWindow = peakTime + (2 * 60 * 60 * 1000)

    const windowTimestamps: string[] = []
    const windowFlux: number[] = []

    for (let i = 0; i < lcRes.timestamps.length; i++) {
      const t = new Date(lcRes.timestamps[i]).getTime()
      if (t >= startWindow && t <= endWindow) {
        windowTimestamps.push(lcRes.timestamps[i])
        windowFlux.push(lcRes.flux[i])
      }
    }

    return {
      flare,
      lightcurve_window: {
        timestamps: windowTimestamps,
        flux: windowFlux,
        window_start: new Date(startWindow).toISOString(),
        window_end: new Date(endWindow).toISOString()
      }
    }
  },

  getReplayStatus: async (): Promise<ReplayStatus> => {
    return {
      current_idx: 0,
      current_time: new Date().toISOString(),
      current_flux: 0,
      flare_active: false,
      active_flare: null,
      replay_speed_x: 1,
      started_at: null,
      total_samples: 1000,
      progress_pct: 0,
      mode: "Static Serverless Mode",
      disclaimer: "Live replay requires local backend"
    }
  }
}
