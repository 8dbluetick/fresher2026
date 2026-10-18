import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  getConfig, 
  getExistingRegistration, 
  sendEmailOtp,
  verifyOtpAndRegister,
  verifyOtpAndSignIn,
  saveRegistrationDetails,
  signOutStudent, 
  type RegistrationData,
  isSupabaseConfigured
} from './lib/supabase';

export const App: React.FC = () => {
  // Countdown State
  const [revealAt, setRevealAt] = useState<Date>(new Date("2026-11-01T10:00:00+05:30"));
  const [eventDateText, setEventDateText] = useState<string>("DATE TO BE ANNOUNCED");
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('');
  const [email, setEmail] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [needsDetails, setNeedsDetails] = useState<boolean>(false);

  // Feedback State
  const [err, setErr] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);

  // Confetti explosion
  const triggerConfetti = () => {
    try {
      const count = 140;
      const defaults = {
        origin: { y: 0.33 },
        colors: ["#c6ff1a", "#ffffff", "#c6ff1a", "#7d8bff"],
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
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

  // Load config & existing session on mount
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

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Countdown ticker
  useEffect(() => {
    const tick = () => {
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

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [revealAt]);

  // Scroll reveal observer
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.rv');
    elements.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [registration]);

  // Switch tabs
  const handleTabSwitch = (newMode: 'up' | 'in') => {
    setMode(newMode);
    setOtpSent(false);
    setOtpCode('');
    setNeedsDetails(false);
    setErr('');
    setInfoMsg('');
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfoMsg('');

    const emailTrim = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(emailTrim)) {
      setErr("Valid email address enter karo.");
      return;
    }

    if (mode === "up") {
      const nameTrim = name.trim();
      const phoneTrim = phone.trim();
      if (nameTrim.length < 2) {
        setErr("Apna poora naam daalo.");
        return;
      }
      if (!/^[0-9]{10}$/.test(phoneTrim)) {
        setErr("10 digit mobile number daalo.");
        return;
      }
      if (!["2023", "2024", "2025", "2026"].includes(batch)) {
        setErr("Batch select karo (2023, 2024, 2025, ya 2026).");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await sendEmailOtp(emailTrim);
      setOtpSent(true);
      setResendTimer(60);
      setInfoMsg(res.message || `6-digit OTP aapke email (${emailTrim}) par bhej diya gaya hai!`);
    } catch (ex: any) {
      console.error("Send OTP error:", ex);
      setErr(ex.message || "OTP bhejte waqt problem aayi. Email check karo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfoMsg('');

    const tokenTrim = otpCode.trim();
    if (tokenTrim.length < 6) {
      setErr("Email par aaya hua 6-digit OTP code enter karo.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "up") {
        const reg = await verifyOtpAndRegister({
          email: email.trim(),
          token: tokenTrim,
          fullName: name.trim(),
          phone: phone.trim(),
          batch: parseInt(batch, 10),
        });
        setRegistration(reg);
        triggerConfetti();
      } else {
        // Login mode
        const reg = await verifyOtpAndSignIn({
          email: email.trim(),
          token: tokenTrim,
        });

        if (reg) {
          setRegistration(reg);
          triggerConfetti();
        } else {
          setNeedsDetails(true);
          setInfoMsg("Email verify ho gaya! Apni details fill karke registration complete karo.");
        }
      }
    } catch (ex: any) {
      console.error("Verify OTP error:", ex);
      setErr(ex.message || "Galat ya expired OTP. Dobara check karo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 (Optional if user logged in via OTP but has no record in DB yet)
  const handleCompleteDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    const nameTrim = name.trim();
    const phoneTrim = phone.trim();
    if (nameTrim.length < 2) {
      setErr("Apna poora naam daalo.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phoneTrim)) {
      setErr("10 digit mobile number daalo.");
      return;
    }
    if (!["2023", "2024", "2025", "2026"].includes(batch)) {
      setErr("Batch select karo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reg = await saveRegistrationDetails({
        fullName: nameTrim,
        phone: phoneTrim,
        batch: parseInt(batch, 10),
        email: email.trim(),
      });
      setRegistration(reg);
      setNeedsDetails(false);
      triggerConfetti();
    } catch (ex: any) {
      console.error("Save details error:", ex);
      setErr(ex.message || "Registration save karne mein dikkat aayi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return;
    setErr('');
    setInfoMsg('');
    setIsSubmitting(true);
    try {
      const res = await sendEmailOtp(email.trim());
      setResendTimer(60);
      setInfoMsg(res.message || "Naya OTP bhej diya gaya hai!");
    } catch (ex: any) {
      setErr(ex.message || "Resend OTP failed. Thodi der baad try karo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Back to edit details
  const handleBackToEdit = () => {
    setOtpSent(false);
    setOtpCode('');
    setErr('');
    setInfoMsg('');
  };

  // Sign out
  const handleSignOut = async () => {
    await signOutStudent();
    setRegistration(null);
    setOtpSent(false);
    setOtpCode('');
    setNeedsDetails(false);
    setErr('');
    setInfoMsg('');
  };

  return (
    <>
      <canvas id="cf"></canvas>

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
        <header>
          <div className="badge">
            <img 
              src="https://res.cloudinary.com/axgam8br/image/upload/v1792348294/tgpcop_media_logo.jpg" 
              alt="TGPCOP Media" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/tgpcop_media_logo.jpg';
              }}
            />
          </div>
          <p>
            Tulsiramji Gaikwad-Patil<br />
            College of Pharmacy
            <b>TGPCOP MEDIA</b>
          </p>
        </header>

        <div className="hero">
          <svg className="bfly" viewBox="0 0 400 260" fill="none" stroke="#fff" strokeWidth="1">
            <path d="M200 130L40 30L20 110L90 170L200 130L110 230L170 250L200 130L230 250L290 230L200 130L310 170L380 110L360 30L200 130L120 60L90 170M200 130L280 60L310 170M120 60L20 110M280 60L380 110M200 130V60" />
            <path d="M196 130Q180 60 150 40M204 130Q220 60 250 40" />
          </svg>
          <svg className="sp s1"><use href="#splat" /></svg>
          <svg className="sp s2"><use href="#splat" /></svg>
          <svg className="sp s3"><use href="#splat" /></svg>
          <h1>
            <span className="a">Fresher's</span>
            <span className="b">Party</span>
          </h1>
          <p className="of">THE FRESHERS PARTY OF</p>
          <p className="batch">Batch 26</p>
        </div>

        {/* Countdown card */}
        <section className="card rv">
          <p className="lbl" id="cdLabel">
            {isRevealed ? "Date is out!" : "Date reveal in"}
          </p>

          {!isRevealed ? (
            <div className="cd sec" id="cd">
              <div><b key={`d-${timeLeft.d}`} className="tick">{timeLeft.d}</b><small>Days</small></div>
              <div><b key={`h-${timeLeft.h}`} className="tick">{timeLeft.h}</b><small>Hrs</small></div>
              <div><b key={`m-${timeLeft.m}`} className="tick">{timeLeft.m}</b><small>Min</small></div>
              <div><b key={`s-${timeLeft.s}`} className="tick">{timeLeft.s}</b><small>Sec</small></div>
            </div>
          ) : (
            <div className="reveal" id="reveal" style={{ display: 'block' }}>
              <strong id="dateTxt">{eventDateText}</strong>
            </div>
          )}

          <a 
            href="#register" 
            className="btn"
            onPointerDown={handleButtonRipple}
          >
            {registration ? "View Registration" : "Register now"}
          </a>
        </section>

        {/* Registration Section */}
        <section className="card rv" id="register">
          <h2>Join the <span>Party</span></h2>

          {!registration ? (
            <div id="formBox">
              {!needsDetails && (
                <div className="tabs">
                  <button 
                    type="button"
                    className={mode === 'up' ? 'on' : ''} 
                    onClick={() => handleTabSwitch('up')}
                  >
                    Sign up
                  </button>
                  <button 
                    type="button"
                    className={mode === 'in' ? 'on' : ''} 
                    onClick={() => handleTabSwitch('in')}
                  >
                    Login
                  </button>
                </div>
              )}

              {infoMsg && <div className="info-msg">{infoMsg}</div>}

              {/* CASE 1: Need Registration Details (After Login OTP when user is new) */}
              {needsDetails ? (
                <form onSubmit={handleCompleteDetails} noValidate>
                  <label htmlFor="name">Full name</label>
                  <input 
                    id="name" 
                    autoComplete="name" 
                    placeholder="Enter your full name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <label htmlFor="phone">Mobile number</label>
                  <input 
                    id="phone" 
                    inputMode="numeric" 
                    maxLength={10} 
                    placeholder="10 digit mobile number" 
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

                  {err && <p className="err">{err}</p>}

                  <button 
                    className="btn" 
                    type="submit" 
                    style={{ marginTop: '16px' }}
                    disabled={isSubmitting}
                    onPointerDown={handleButtonRipple}
                  >
                    {isSubmitting ? 'Saving...' : 'Complete Registration'}
                  </button>
                </form>
              ) : !otpSent ? (
                /* CASE 2: Step 1 - Enter details & Request OTP */
                <form onSubmit={handleSendOtp} noValidate>
                  {mode === 'up' && (
                    <div id="regOnly">
                      <label htmlFor="name">Full name</label>
                      <input 
                        id="name" 
                        autoComplete="name" 
                        placeholder="Your full name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />

                      <label htmlFor="phone">Mobile number</label>
                      <input 
                        id="phone" 
                        inputMode="numeric" 
                        maxLength={10} 
                        placeholder="10 digit mobile number" 
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

                  <label htmlFor="email">Email address</label>
                  <input 
                    id="email" 
                    type="email" 
                    autoComplete="email" 
                    placeholder="you@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  {err && <p className="err">{err}</p>}

                  <button 
                    className="btn" 
                    type="submit" 
                    style={{ marginTop: '16px' }}
                    disabled={isSubmitting}
                    onPointerDown={handleButtonRipple}
                  >
                    {isSubmitting 
                      ? 'Sending OTP...' 
                      : mode === 'up' ? 'Send Verification OTP' : 'Send Login OTP'
                    }
                  </button>
                </form>
              ) : (
                /* CASE 3: Step 2 - Enter 6-digit OTP code */
                <form onSubmit={handleVerifyOtp} noValidate>
                  <div className="otp-box">
                    <p className="otp-meta">
                      Enter the 6-digit verification code sent to:<br />
                      <b>{email}</b>
                    </p>

                    <label htmlFor="otp" style={{ textAlign: 'center', marginBottom: '8px' }}>
                      6-DIGIT OTP CODE
                    </label>
                    <input 
                      id="otp" 
                      className="otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6} 
                      placeholder="• • • • • •" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />

                    <div className="otp-actions">
                      <button 
                        type="button" 
                        className="text-btn"
                        onClick={handleBackToEdit}
                      >
                        ← Edit Details / Change Email
                      </button>

                      <button 
                        type="button" 
                        className="text-btn"
                        disabled={resendTimer > 0 || isSubmitting}
                        onClick={handleResendOtp}
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>

                  {err && <p className="err">{err}</p>}

                  <button 
                    className="btn" 
                    type="submit" 
                    style={{ marginTop: '12px' }}
                    disabled={isSubmitting || otpCode.trim().length < 6}
                    onPointerDown={handleButtonRipple}
                  >
                    {isSubmitting 
                      ? 'Verifying...' 
                      : mode === 'up' ? 'Verify OTP & Register' : 'Verify & Login'
                    }
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* CASE 4: Success Ticket */
            <div className="done" id="done" style={{ display: 'block' }}>
              <div className="big">YOU'RE IN!</div>
              <p style={{ marginTop: '8px', fontSize: '15px' }}>
                Welcome, <b>{registration.full_name}</b>! 🎉
              </p>

              <div className="reg-details">
                <p><b>Status:</b> <span style={{ color: '#c6ff1a' }}>Verified & Registered</span></p>
                <p><b>Batch:</b> {registration.batch}</p>
                <p><b>Email:</b> {registration.email}</p>
                <p><b>Phone:</b> {registration.phone}</p>
              </div>

              <p>Registration confirmed. Date reveal ka wait karo 🎉</p>

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

          {/* Database connection badge */}
          <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.6, fontSize: '10px', letterSpacing: '0.1em' }}>
            {isSupabaseConfigured ? (
              <span style={{ color: '#c6ff1a' }}>● Supabase Live Connected (Email OTP Active)</span>
            ) : (
              <span>○ Demo Mode (Demo OTP: 123456)</span>
            )}
          </div>
        </section>

        <footer className="rv">
          <p>Captured & Presented by <b>TGPCOP MEDIA</b></p>
          <p>www.tgpcopmedia.online</p>
          <p>Together We <b>Create.</b> Together We <b>Inspire.</b></p>
        </footer>
      </div>
    </>
  );
};

export default App;
