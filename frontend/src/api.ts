// API base URL — proxied via Vite in dev, environment variable in prod
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

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
  getLightcurve: (downsample = 2000): Promise<LightcurveData> =>
    apiFetch(`/lightcurve?downsample=${downsample}`),

  getFlares: (): Promise<{ flares: FlareEvent[]; count: number; meta: Record<string, unknown> }> =>
    apiFetch('/flares'),

  getFlareDetail: (id: number): Promise<FlareDetail> =>
    apiFetch(`/flares/${id}`),

  getReplayStatus: (): Promise<ReplayStatus> =>
    apiFetch('/replay/status'),

  getStats: (): Promise<Stats> =>
    apiFetch('/stats'),

  getMetrics: (): Promise<MetricsData> =>
    apiFetch('/metrics'),
}
