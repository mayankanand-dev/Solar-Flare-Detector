import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import { Zap, Activity, BookOpen, Radio } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import FlareTimeline from './pages/FlareTimeline'
import FlareDetail from './pages/FlareDetail'
import HowItWorks from './pages/HowItWorks'
import AboutMission from './pages/AboutMission'
import Metrics from './pages/Metrics'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          {/* Animated SVG sun logo */}
          <svg className="navbar-logo" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="8" fill="url(#sunGrad)" />
            <circle cx="18" cy="18" r="12" fill="none" stroke="url(#rayGrad)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="20s" repeatCount="indefinite"/>
            </circle>
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <line key={i}
                x1={18 + 14 * Math.cos(deg * Math.PI / 180)}
                y1={18 + 14 * Math.sin(deg * Math.PI / 180)}
                x2={18 + 17 * Math.cos(deg * Math.PI / 180)}
                y2={18 + 17 * Math.sin(deg * Math.PI / 180)}
                stroke="#ffd166" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
              />
            ))}
            <defs>
              <radialGradient id="sunGrad" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#fff4e0" />
                <stop offset="50%" stopColor="#ffd166" />
                <stop offset="100%" stopColor="#ff8c42" />
              </radialGradient>
              <linearGradient id="rayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd166" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff8c42" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="navbar-title">Solar Flare Detector</div>
            <div className="navbar-subtitle">Aditya-L1 · HEL1OS & SoLEXS</div>
          </div>
        </Link>

        <div className="navbar-nav">
          <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Activity size={15} /> Dashboard
          </NavLink>
          <NavLink to="/flares" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Zap size={15} /> Flare Timeline
          </NavLink>
          <NavLink to="/how-it-works" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Radio size={15} /> How It Works
          </NavLink>
          <NavLink to="/metrics" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Activity size={15} /> Accuracy & Metrics
          </NavLink>
          <NavLink to="/about" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={15} /> About Mission
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flares" element={<FlareTimeline />} />
            <Route path="/flares/:id" element={<FlareDetail />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/about" element={<AboutMission />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
