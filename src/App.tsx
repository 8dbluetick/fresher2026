import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  getConfig, 
  getExistingRegistration, 
  registerStudent, 
  signInStudent, 
  signOutStudent, 
  type RegistrationData,
  isSupabaseConfigured
} from './lib/supabase';

export const App: React.FC = () => {
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
  const [mode, setMode] = useState<'up' | 'in'>('up');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      const count = 160;
      const defaults = {
        origin: { y: 0.6 },
        colors: ['#C6FF1A', '#FFFFFF', '#7D8BFF', '#C6FF1A'],
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

  // Load config & check existing session on mount
  useEffect(() => {
    const init = async () => {
      // 1. Load config
      const conf = await getConfig();
      if (conf.reveal_at) {
        setRevealAt(new Date(conf.reveal_at));
      }
      if (conf.event_date) {
        setEventDateText(conf.event_date);
      }

      // 2. Check if user is already registered (on return / page reload)
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
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.rv');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [registration]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const emailTrimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(emailTrimmed)) {
      setErrorMessage('Valid email daalo.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password kam se kam 6 characters ka rakho.');
      return;
    }

    if (mode === 'up') {
      const nameTrimmed = fullName.trim();
      const phoneTrimmed = phone.trim();
      if (nameTrimmed.length < 2) {
        setErrorMessage('Apna naam daalo.');
        return;
      }
      if (!/^[0-9]{10}$/.test(phoneTrimmed)) {
        setErrorMessage('10 digit mobile number daalo.');
        return;
      }
      if (!['2023', '2024', '2025', '2026'].includes(batch)) {
        setErrorMessage('Batch select karo.');
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
        setErrorMessage(err.message || 'Kuch gadbad ho gayi, dobara try karo.');
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
          setErrorMessage('Login successful, par registration record nahi mila.');
        }
      } catch (err: any) {
        console.error('Login failed:', err);
        setErrorMessage(err.message || 'Login failed. Check your email & password.');
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

  return (
    <>
      {/* SVG Splatter Symbol definition */}
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
        {/* HEADER */}
        <header>
          <div className="badge">
            <img 
              src="/council-emblem.png" 
              alt="TGPCOP Students Council" 
              onError={(e) => {
                // fallback if root path differs
                (e.currentTarget as HTMLImageElement).src = 'council-emblem.png';
              }}
            />
          </div>
          <p>
            Tulsiramji Gaikwad-Patil<br />
            College of Pharmacy
            <b>TGPCOP Students Council</b>
          </p>
        </header>

        {/* HERO SECTION */}
        <div className="hero">
          {/* Wireframe Butterfly Watermark */}
          <svg className="bfly" viewBox="0 0 400 260" fill="none" stroke="#fff" strokeWidth="1">
            <path d="M200 130L40 30L20 110L90 170L200 130L110 230L170 250L200 130L230 250L290 230L200 130L310 170L380 110L360 30L200 130L120 60L90 170M200 130L280 60L310 170M120 60L20 110M280 60L380 110M200 130V60" />
            <path d="M196 130Q180 60 150 40M204 130Q220 60 250 40" />
          </svg>

          {/* Floating Lime Splatters */}
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
            {isRevealed ? 'Date is out!' : 'Date reveal in'}
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
            {registration ? 'View Registration' : 'Register now'}
          </a>
        </section>

        {/* ABOUT THE COUNCIL STRIP */}
        <section className="about rv">
          <h2>
            About the <span style={{ color: '#1429E0' }}>Council</span>
          </h2>
          <p>
            Representing the voice of students, fostering leadership, innovation, academic excellence and campus engagement.
          </p>
          <img 
            className="icons" 
            src="/council-pillars-icons.png" 
            alt="Academic Growth, Student Representation, Campus Engagement, Innovation & Initiatives"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'council-pillars-icons.png';
            }}
          />
        </section>

        {/* REGISTER / LOGIN / YOU'RE IN SECTION */}
        <section className="card rv" id="register">
          <h2>
            Join the <span>Party</span>
          </h2>

          {!registration ? (
            <div id="formBox">
              <div className="tabs">
                <button 
                  type="button"
                  className={mode === 'up' ? 'on' : ''} 
                  onClick={() => { setMode('up'); setErrorMessage(''); }}
                >
                  Sign up
                </button>
                <button 
                  type="button"
                  className={mode === 'in' ? 'on' : ''} 
                  onClick={() => { setMode('in'); setErrorMessage(''); }}
                >
                  Login
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {mode === 'up' && (
                  <div id="regOnly">
                    <label htmlFor="name">Full name</label>
                    <input 
                      id="name" 
                      type="text"
                      autoComplete="name" 
                      placeholder="Your name" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />

                    <label htmlFor="phone">Mobile number</label>
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
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>
                )}

                <label htmlFor="email">Email</label>
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
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'} 
                  placeholder="Min 6 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {errorMessage && (
                  <p className="err">{errorMessage}</p>
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
                    ? 'Processing...' 
                    : mode === 'up' 
                      ? 'Register' 
                      : 'Login'
                  }
                </button>
              </form>
            </div>
          ) : (
            /* YOU'RE IN SUCCESS / REGISTERED CARD */
            <div className="done" style={{ display: 'block' }}>
              <div className="big">YOU'RE IN!</div>
              <p style={{ marginTop: '8px', fontSize: '15px', color: '#fff' }}>
                Welcome, <b>{registration.full_name}</b>! 🎉
              </p>
              
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  margin: '16px 0',
                  textAlign: 'left',
                  fontSize: '13px',
                  border: '1px solid rgba(198, 255, 26, 0.3)'
                }}
              >
                <p><b>Status:</b> <span style={{ color: '#C6FF1A' }}>Registered (Phase 1)</span></p>
                <p><b>Batch:</b> {registration.batch}</p>
                <p><b>Email:</b> {registration.email}</p>
                <p><b>Phone:</b> {registration.phone}</p>
              </div>

              <p style={{ fontSize: '13px', opacity: 0.9 }}>
                Date reveal ka wait karo. Voting polls will open in Phase 2!
              </p>

              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  marginTop: '16px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
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

          {/* Database connection status badge */}
          <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.6, fontSize: '10px', letterSpacing: '0.1em' }}>
            {isSupabaseConfigured ? (
              <span style={{ color: '#C6FF1A' }}>● Supabase Cloud Connected</span>
            ) : (
              <span>○ Local Demo Mode (Set .env for Live Supabase)</span>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="rv">
          <p>Instagram <b>@tgpcop.council</b></p>
          <p>www.tgpcopcouncil.online</p>
          <p>
            Together We <b>Lead.</b> Together We <b>Inspire.</b>
          </p>
        </footer>
      </div>
    </>
  );
};

export default App;
