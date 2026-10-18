import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  getConfig, 
  getExistingRegistration, 
  registerStudent, 
  signInStudent, 
  signOutStudent,
  submitCollaboration,
  type RegistrationData,
  isSupabaseConfigured
} from './lib/supabase';
import { SITE_CONFIG } from './config/siteConfig';

export const App: React.FC = () => {
  // Navigation active tab: 'event' or 'media'
  const [activeTab, setActiveTab] = useState<'event' | 'media'>('event');

  // Countdown State
  const [revealAt, setRevealAt] = useState<Date>(new Date('2026-11-01T10:00:00+05:30'));
  const [eventDateText, setEventDateText] = useState<string>('DATE TO BE ANNOUNCED');
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string }>({
    d: '00',
    h: '00',
    m: '00',
    s: '00',
  });
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const revealedRef = useRef<boolean>(false);

  // Auth / Registration State
  const [authMode, setAuthMode] = useState<'up' | 'in'>('up');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);

  // Collaboration Form State (Media Page)
  const [collabName, setCollabName] = useState('');
  const [collabEmail, setCollabEmail] = useState('');
  const [collabPhone, setCollabPhone] = useState('');
  const [collabType, setCollabType] = useState('Event Photography & Video');
  const [collabDate, setCollabDate] = useState('');
  const [collabDetails, setCollabDetails] = useState('');
  const [collabSubmitting, setCollabSubmitting] = useState(false);
  const [collabSuccess, setCollabSuccess] = useState(false);
  const [collabError, setCollabError] = useState('');

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      const count = 160;
      const defaults = {
        origin: { y: 0.6 },
        colors: ['#E50914', '#FFFFFF', '#FF3B30', '#E50914'],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } catch (e) {
      console.error('Confetti error:', e);
    }
  };

  // Button Ripple effect
  const handleButtonRipple = (e: React.PointerEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'rip';
    const d = Math.max(r.width, r.height);
    s.style.width = `${d}px`;
    s.style.height = `${d}px`;
    s.style.left = `${e.clientX - r.left - d / 2}px`;
    s.style.top = `${e.clientY - r.top - d / 2}px`;
    btn.appendChild(s);
    setTimeout(() => s.remove(), 600);
  };

  // Sync hash routing on mount
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#media') {
        setActiveTab('media');
      } else if (hash === '#event' || hash === '#register') {
        setActiveTab('event');
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  // Load config & check existing session on mount
  useEffect(() => {
    const init = async () => {
      const conf = await getConfig();
      if (conf.reveal_at) {
        setRevealAt(new Date(conf.reveal_at));
      }
      if (conf.event_date) {
        setEventDateText(conf.event_date);
      }

      const existing = await getExistingRegistration();
      if (existing) {
        setRegistration(existing);
      }
    };

    init();
  }, []);

  // Countdown timer ticker
  useEffect(() => {
    const checkTimer = () => {
      const diff = revealAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
        if (!revealedRef.current) {
          revealedRef.current = true;
          setIsRevealed(true);
          triggerConfetti();
        }
        return;
      }

      const d = Math.floor(diff / 864e5);
      const h = Math.floor(diff / 36e5) % 24;
      const m = Math.floor(diff / 6e4) % 60;
      const s = Math.floor(diff / 1e3) % 60;

      setTimeLeft({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };

    checkTimer();
    const timer = setInterval(checkTimer, 1000);
    return () => clearInterval(timer);
  }, [revealAt]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    const elements = document.querySelectorAll('.rv');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeTab, registration]);

  // Handle Event Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailTrimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(emailTrimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'up') {
      const nameTrimmed = fullName.trim();
      const phoneTrimmed = phone.trim();
      if (nameTrimmed.length < 2) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!/^[0-9]{10}$/.test(phoneTrimmed)) {
        setErrorMessage('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!['2023', '2024', '2025', '2026'].includes(batch)) {
        setErrorMessage('Please select your batch.');
        return;
      }

      setIsSubmitting(true);
      try {
        const reg = await registerStudent({
          fullName: nameTrimmed,
          phone: phoneTrimmed,
          batch: parseInt(batch, 10),
          email: emailTrimmed,
          password: password,
        });
        setRegistration(reg);
        triggerConfetti();
      } catch (err: any) {
        console.error('Registration failed:', err);
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Login Mode
      setIsSubmitting(true);
      try {
        const reg = await signInStudent({
          email: emailTrimmed,
          password: password,
        });
        if (reg) {
          setRegistration(reg);
          triggerConfetti();
        } else {
          setErrorMessage('Login successful, but no registration was found for this user.');
        }
      } catch (err: any) {
        console.error('Login failed:', err);
        setErrorMessage(err.message || 'Login failed. Check your email and password.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOutStudent();
    setRegistration(null);
    setPassword('');
  };

  // Handle Media Collaboration Request
  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCollabError('');
    setCollabSuccess(false);

    if (collabName.trim().length < 2) {
      setCollabError('Please enter your name or club name.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(collabEmail.trim())) {
      setCollabError('Please enter a valid email.');
      return;
    }
    if (!/^[0-9]{10}$/.test(collabPhone.trim())) {
      setCollabError('Please enter a valid 10-digit phone number.');
      return;
    }

    setCollabSubmitting(true);
    try {
      await submitCollaboration({
        name: collabName.trim(),
        email: collabEmail.trim(),
        phone: collabPhone.trim(),
        eventType: collabType,
        eventDate: collabDate,
        details: collabDetails.trim(),
      });
      setCollabSuccess(true);
      setCollabName('');
      setCollabEmail('');
      setCollabPhone('');
      setCollabDate('');
      setCollabDetails('');
      triggerConfetti();
    } catch (err: any) {
      setCollabError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setCollabSubmitting(false);
    }
  };

  return (
    <>
      {/* SVG Splatter Symbol definition in bold red */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <symbol id="splat" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="22" />
            <circle cx="20" cy="30" r="8" />
            <circle cx="82" cy="24" r="6" />
            <circle cx="80" cy="76" r="9" />
            <circle cx="24" cy="80" r="5" />
            <circle cx="50" cy="8" r="4" />
            <circle cx="94" cy="52" r="4" />
            <path d="M50 50L10 54L50 58Z" />
          </symbol>
        </defs>
      </svg>

      <div className="wrap">
        {/* CLEAN MEDIA BRAND HEADER (Council branding removed) */}
        <header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-badge">
              <img 
                src={SITE_CONFIG.logo} 
                alt={SITE_CONFIG.logoAlt}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'tgpcop-media-logo.jpg';
                }}
              />
            </div>
            <div className="brand-info">
              <div className="brand-title">
                TGPCOP <span>MEDIA</span>
              </div>
              <div className="brand-sub">
                {SITE_CONFIG.subTitle}
              </div>
            </div>
          </div>
        </header>

        {/* NAVIGATION PILLS: EVENT & MEDIA */}
        <nav className="nav-pills" aria-label="Page Sections">
          <button 
            type="button"
            className={`nav-pill ${activeTab === 'event' ? 'active' : ''}`}
            onClick={() => { setActiveTab('event'); window.location.hash = 'event'; }}
          >
            <span>🎉</span> Fresher's Party
          </button>
          <button 
            type="button"
            className={`nav-pill ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => { setActiveTab('media'); window.location.hash = 'media'; }}
          >
            <span>📸</span> Media & Creative
          </button>
        </nav>

        {/* ======================================================== */}
        {/* TAB 1: FRESHER'S PARTY (EVENT & REGISTRATION)             */}
        {/* ======================================================== */}
        {activeTab === 'event' && (
          <div>
            {/* HERO SECTION */}
            <div className="hero">
              {/* Wireframe Butterfly Watermark */}
              <svg className="bfly" viewBox="0 0 400 260" fill="none" stroke="#E50914" strokeWidth="1">
                <path d="M200 130L40 30L20 110L90 170L200 130L110 230L170 250L200 130L230 250L290 230L200 130L310 170L380 110L360 30L200 130L120 60L90 170M200 130L280 60L310 170M120 60L20 110M280 60L380 110M200 130V60" />
                <path d="M196 130Q180 60 150 40M204 130Q220 60 250 40" />
              </svg>

              {/* Graffiti Lime / Red Splatters */}
              <svg className="sp s1">
                <use href="#splat" />
              </svg>
              <svg className="sp s2">
                <use href="#splat" />
              </svg>
              <svg className="sp s3">
                <use href="#splat" />
              </svg>

              {/* Titles */}
              <h1>
                <span className="a">Fresher's</span>
                <span className="b">Party</span>
              </h1>
              <p className="of">THE FRESHERS PARTY OF</p>
              <p className="batch">Batch 26</p>
            </div>

            {/* COUNTDOWN & DATE REVEAL CARD */}
            <section className="card rv">
              <p className="lbl" id="cdLabel">
                {isRevealed ? 'Official Date is Out!' : 'Date Reveal In'}
              </p>

              {!isRevealed ? (
                <div className="cd sec" id="cd">
                  <div>
                    <b key={`d-${timeLeft.d}`} className="tick">{timeLeft.d}</b>
                    <small>Days</small>
                  </div>
                  <div>
                    <b key={`h-${timeLeft.h}`} className="tick">{timeLeft.h}</b>
                    <small>Hrs</small>
                  </div>
                  <div>
                    <b key={`m-${timeLeft.m}`} className="tick">{timeLeft.m}</b>
                    <small>Min</small>
                  </div>
                  <div>
                    <b key={`s-${timeLeft.s}`} className="tick">{timeLeft.s}</b>
                    <small>Sec</small>
                  </div>
                </div>
              ) : (
                <div className="reveal" style={{ display: 'block' }}>
                  <strong id="dateTxt">{eventDateText}</strong>
                </div>
              )}

              <a 
                href="#register" 
                className="btn" 
                onPointerDown={handleButtonRipple}
              >
                {registration ? 'View Registration' : 'Register Now'}
              </a>
            </section>

            {/* REGISTRATION / LOGIN / YOU'RE IN SECTION */}
            <section className="card rv" id="register">
              <h2>
                Join the <span>Party</span>
              </h2>

              {!registration ? (
                <div id="formBox">
                  <div className="tabs">
                    <button 
                      type="button"
                      className={authMode === 'up' ? 'on' : ''} 
                      onClick={() => { setAuthMode('up'); setErrorMessage(''); }}
                    >
                      Sign Up
                    </button>
                    <button 
                      type="button"
                      className={authMode === 'in' ? 'on' : ''} 
                      onClick={() => { setAuthMode('in'); setErrorMessage(''); }}
                    >
                      Login
                    </button>
                  </div>

                  <form onSubmit={handleRegisterSubmit} noValidate>
                    {authMode === 'up' && (
                      <div id="regOnly">
                        <label htmlFor="name">Full Name</label>
                        <input 
                          id="name" 
                          type="text"
                          autoComplete="name" 
                          placeholder="Your full name" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />

                        <label htmlFor="phone">Mobile Number</label>
                        <input 
                          id="phone" 
                          type="tel"
                          inputMode="numeric" 
                          maxLength={10} 
                          placeholder="10 digit number" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        />

                        <label htmlFor="batch">Batch</label>
                        <select 
                          id="batch"
                          value={batch}
                          onChange={(e) => setBatch(e.target.value)}
                        >
                          <option value="">Select batch</option>
                          <option value="2023">Batch 2023</option>
                          <option value="2024">Batch 2024</option>
                          <option value="2025">Batch 2025</option>
                          <option value="2026">Batch 2026</option>
                        </select>
                      </div>
                    )}

                    <label htmlFor="email">College / Personal Email</label>
                    <input 
                      id="email" 
                      type="email" 
                      autoComplete="email" 
                      placeholder="you@email.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    <label htmlFor="pw">Password</label>
                    <input 
                      id="pw" 
                      type="password" 
                      autoComplete={authMode === 'up' ? 'new-password' : 'current-password'} 
                      placeholder="Min 6 characters" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    {errorMessage && (
                      <p className="err">
                        <span>⚠️</span> {errorMessage}
                      </p>
                    )}

                    <button 
                      className="btn" 
                      type="submit" 
                      id="go" 
                      style={{ marginTop: '16px' }}
                      disabled={isSubmitting}
                      onPointerDown={handleButtonRipple}
                    >
                      {isSubmitting 
                        ? 'Verifying with Database...' 
                        : authMode === 'up' 
                          ? 'Complete Registration' 
                          : 'Sign In'
                      }
                    </button>
                  </form>
                </div>
              ) : (
                /* YOU'RE IN SUCCESS / REGISTERED CARD */
                <div className="done" style={{ display: 'block' }}>
                  <div className="big">YOU'RE IN!</div>
                  <p style={{ marginTop: '8px', fontSize: '15px', color: '#fff' }}>
                    Welcome to the Party, <b>{registration.full_name}</b>! 🎉
                  </p>
                  
                  <div 
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      margin: '16px 0',
                      textAlign: 'left',
                      fontSize: '13px',
                      border: '1px solid rgba(229, 9, 20, 0.4)'
                    }}
                  >
                    <p style={{ margin: '4px 0' }}>
                      <b>Status:</b> <span style={{ color: '#E50914', fontWeight: 600 }}>● Confirmed Registration</span>
                    </p>
                    <p style={{ margin: '4px 0' }}><b>Batch:</b> {registration.batch}</p>
                    <p style={{ margin: '4px 0' }}><b>Email:</b> {registration.email}</p>
                    <p style={{ margin: '4px 0' }}><b>Phone:</b> {registration.phone}</p>
                  </div>

                  <p style={{ fontSize: '13px', color: '#A0A0A0' }}>
                    Your spot is reserved. Watch for official date and venue announcements!
                  </p>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={{
                      marginTop: '16px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    Sign Out / Switch Account
                  </button>
                </div>
              )}

              {/* Database status banner */}
              <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.6, fontSize: '10px', letterSpacing: '0.1em' }}>
                {isSupabaseConfigured ? (
                  <span style={{ color: '#4ADE80' }}>● Supabase Database Connected</span>
                ) : (
                  <span>○ Demo Mode (Set VITE_SUPABASE_URL in .env)</span>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TGPCOP MEDIA SHOWCASE & CREATIVE HUB              */}
        {/* ======================================================== */}
        {activeTab === 'media' && (
          <div>
            {/* HERO: TGPCOP MEDIA */}
            <div className="hero">
              <svg className="sp s1"><use href="#splat" /></svg>
              <svg className="sp s2"><use href="#splat" /></svg>
              <h1>
                <span className="a">TGPCOP</span>
                <span className="b">MEDIA</span>
              </h1>
              <p className="of">CAMPUS LIFE • PHOTOGRAPHY • CINEMA</p>
              <p className="batch">Creative Crew</p>
            </div>

            {/* FEATURED EVENT HIGHLIGHTS */}
            <section className="card rv">
              <h2>Featured <span>Coverage</span></h2>
              <p style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '14px' }}>
                Capturing campus events, cultural festivals, student achievements, and high-energy college life.
              </p>

              <div className="media-grid">
                <div className="media-item">
                  <img 
                    src="/tgpcop-media-logo.png" 
                    alt="TGPCOP Media Official Brand" 
                  />
                  <div className="overlay">
                    <span>Echo TGPCOP Media</span>
                    <small>Official Brand</small>
                  </div>
                </div>

                <div className="media-item">
                  <div style={{ width: '100%', height: '100%', background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎬</div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Flash Mob & Reels</span>
                      <p style={{ fontSize: '10px', color: '#A0A0A0', marginTop: '4px' }}>Campus Dance & Energy</p>
                    </div>
                  </div>
                  <div className="overlay">
                    <span>College Flash Mob</span>
                    <small>Reels Coverage</small>
                  </div>
                </div>

                <div className="media-item">
                  <div style={{ width: '100%', height: '100%', background: '#1c0709', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏆</div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Cultural Day 2K26</span>
                      <p style={{ fontSize: '10px', color: '#A0A0A0', marginTop: '4px' }}>LED Stage & Performances</p>
                    </div>
                  </div>
                  <div className="overlay">
                    <span>Cultural Day</span>
                    <small>Stage Photography</small>
                  </div>
                </div>

                <div className="media-item">
                  <div style={{ width: '100%', height: '100%', background: '#0e1726', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎮</div>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>E-Sports 2026</span>
                      <p style={{ fontSize: '10px', color: '#A0A0A0', marginTop: '4px' }}>Gaming Tournament</p>
                    </div>
                  </div>
                  <div className="overlay">
                    <span>E-Sports League</span>
                    <small>Graphic & Stream</small>
                  </div>
                </div>
              </div>
            </section>

            {/* CREATIVE DEPARTMENTS */}
            <section className="card rv">
              <h2>Creative <span>Wings</span></h2>
              <div className="crew-list">
                <div className="crew-card">
                  <h4>📸 Photography</h4>
                  <p>Event & Stage Candids</p>
                </div>
                <div className="crew-card">
                  <h4>🎥 Cinematography</h4>
                  <p>Reels & Aftermovies</p>
                </div>
                <div className="crew-card">
                  <h4>🎨 Graphic Design</h4>
                  <p>Posters, Branding, UI</p>
                </div>
                <div className="crew-card">
                  <h4>⚡ Live Coverage</h4>
                  <p>Campus Highlights</p>
                </div>
              </div>
            </section>

            {/* COLLABORATION & COVERAGE REQUEST */}
            <section className="card rv" id="collab">
              <h2>Request <span>Coverage</span></h2>
              <p style={{ fontSize: '13px', color: '#A0A0A0', marginBottom: '16px' }}>
                Organizing an event or club activity? Connect with TGPCOP Media for official photo & video coverage.
              </p>

              {collabSuccess ? (
                <div style={{ background: 'rgba(229, 9, 20, 0.15)', border: '1px solid #E50914', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
                  <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: 600 }}>Coverage Request Submitted!</h3>
                  <p style={{ fontSize: '12px', color: '#D0D0D0', marginTop: '4px' }}>
                    Our media crew will review the schedule and get in touch via email/phone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCollabSuccess(false)}
                    style={{ marginTop: '12px', background: 'transparent', border: '1px solid #E50914', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCollabSubmit} noValidate>
                  <label htmlFor="cname">Name / Club / Committee</label>
                  <input 
                    id="cname" 
                    type="text" 
                    placeholder="e.g. Sports Club / Cultural Team"
                    value={collabName}
                    onChange={(e) => setCollabName(e.target.value)}
                  />

                  <label htmlFor="cemail">Email Address</label>
                  <input 
                    id="cemail" 
                    type="email" 
                    placeholder="contact@college.edu"
                    value={collabEmail}
                    onChange={(e) => setCollabEmail(e.target.value)}
                  />

                  <label htmlFor="cphone">Mobile Number</label>
                  <input 
                    id="cphone" 
                    type="tel" 
                    maxLength={10}
                    placeholder="10 digit number"
                    value={collabPhone}
                    onChange={(e) => setCollabPhone(e.target.value.replace(/\D/g, ''))}
                  />

                  <label htmlFor="ctype">Coverage Type</label>
                  <select 
                    id="ctype" 
                    value={collabType}
                    onChange={(e) => setCollabType(e.target.value)}
                  >
                    <option value="Event Photography & Video">Event Photography & Video</option>
                    <option value="Reels & Short-Form Video">Reels & Short-Form Video</option>
                    <option value="Graphic Poster Design">Graphic Poster Design</option>
                    <option value="Complete Media Partnership">Complete Media Partnership</option>
                  </select>

                  <label htmlFor="cdate">Event Date (Optional)</label>
                  <input 
                    id="cdate" 
                    type="date"
                    value={collabDate}
                    onChange={(e) => setCollabDate(e.target.value)}
                  />

                  <label htmlFor="cdetails">Brief Event Details</label>
                  <textarea 
                    id="cdetails" 
                    rows={3} 
                    placeholder="Tell us what you need covered..."
                    value={collabDetails}
                    onChange={(e) => setCollabDetails(e.target.value)}
                  />

                  {collabError && (
                    <p className="err">
                      <span>⚠️</span> {collabError}
                    </p>
                  )}

                  <button 
                    className="btn" 
                    type="submit" 
                    style={{ marginTop: '16px' }}
                    disabled={collabSubmitting}
                    onPointerDown={handleButtonRipple}
                  >
                    {collabSubmitting ? 'Sending Request...' : 'Send Coverage Request'}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        {/* FOOTER (Council branding & @tgpcop.council removed) */}
        <footer className="rv">
          {/* Configurable Instagram Handle: Only shown if configured */}
          {SITE_CONFIG.instagramHandle && (
            <p>
              Instagram{' '}
              <a 
                href={SITE_CONFIG.instagramUrl || `https://instagram.com/${SITE_CONFIG.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#E50914', textDecoration: 'none', fontWeight: 600 }}
              >
                @{SITE_CONFIG.instagramHandle}
              </a>
            </p>
          )}

          <p style={{ marginTop: '4px' }}>
            Inquiries: <b style={{ color: '#fff' }}>{SITE_CONFIG.contactEmail}</b>
          </p>

          <p style={{ marginTop: '6px', fontSize: '11px', opacity: 0.7 }}>
            {SITE_CONFIG.disclaimer}
          </p>

          <p style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            © {new Date().getFullYear()} TGPCOP MEDIA. All Rights Reserved.
          </p>
        </footer>
      </div>
    </>
  );
};

export default App;
