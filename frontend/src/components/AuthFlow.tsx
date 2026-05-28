import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { ArrowRight, LogIn, UserPlus, Eye, EyeOff, Lock, Mail, User, Plus, Timer } from 'lucide-react';

export const AuthFlow: React.FC = () => {
  const { login, register, apiFetch } = useAuth();
  const { showNotification, setSyncingState } = useNotification();
  
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState(0); // 0: Welcome, 1: Name, 2: Email, 3: Password, 4: Let's Start
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
  const savedEmail = localStorage.getItem('saved_email') || '';
  const savedPassword = localStorage.getItem('saved_password') || '';

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem('saved_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('saved_password') || '');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async () => {
    if (!savedEmail || !savedPassword) return;
    setLoading(true);
    try {
      await login(savedEmail, savedPassword);
    } catch (err: any) {
      localStorage.removeItem('remember_me');
      localStorage.removeItem('saved_email');
      localStorage.removeItem('saved_password');
      setEmail('');
      setPassword('');
      setIsLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !name.trim()) {
      showNotification('Please tell us your name.', 'error');
      return;
    }
    if (step === 2) {
      if (!email.trim() || !email.includes('@')) {
        showNotification('Please enter a valid email address.', 'error');
        return;
      }
      setLoading(true);
      setSyncingState(true, 'Checking email availability...');
      try {
        const data = await apiFetch('/auth/check-email', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        });
        if (data.exists) {
          showNotification('This email is already registered', 'error');
          return;
        }
      } catch (err: any) {
        showNotification(err.message || 'Email check failed', 'error');
        return;
      } finally {
        setLoading(false);
        setSyncingState(false);
      }
    }
    if (step === 3 && password.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }
    setStep(step + 1);
  };

  const handleBackStep = (target: number) => {
    if (target < step) {
      setStep(target);
    }
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    try {
      await register(name, email, password);
      // Auto-save registration details for quick login
      localStorage.setItem('remember_me', 'true');
      localStorage.setItem('saved_email', email);
      localStorage.setItem('saved_password', password);
    } catch (err: any) {
      setStep(3); // Send back to password step to retry
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification('All fields are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('saved_email', email);
        localStorage.setItem('saved_password', password);
      } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_password');
      }
    } catch (err: any) {
      // Errors are handled inside login in AuthContext
    } finally {
      setLoading(false);
    }
  };

  // Dots progress bar (visual indicator matching wireframes)
  const StepDots = () => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          onClick={() => handleBackStep(i)}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: i <= step ? 'var(--text-main)' : 'rgba(0, 0, 0, 0.1)',
            cursor: i < step ? 'pointer' : 'default',
            transition: 'var(--transition-smooth)'
          }}
        />
      ))}
    </div>
  );

  const OnboardingStepDots = () => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
      {[5, 6, 7, 8].map((i) => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: i <= step ? 'var(--text-main)' : 'rgba(0, 0, 0, 0.1)',
            transition: 'var(--transition-smooth)'
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '60vh', padding: '20px 0' }}>
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        
        {/* LOGIN SCREEN */}
        {isLogin ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div>
              <h2 style={{ fontSize: '26px', color: 'var(--text-main)', marginBottom: '8px' }}>Welcome back</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sign in to access your notes</p>
            </div>



            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  className="input-field"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', position: 'relative' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '40px', paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', margin: '-8px 0 -4px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '15px',
                    height: '15px',
                    accentColor: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                />
                Remember me
              </label>
            </div>
 
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'} <LogIn size={16} />
            </button>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              New to Notes?{' '}
              <button type="button" onClick={() => setIsLogin(false)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                Create an account
              </button>
            </div>
          </form>
        ) : (
          <div className="animate-fade-in">
            {/* Step 0: Welcome Screen */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h2 style={{ fontSize: '32px', color: 'var(--text-main)', fontWeight: 700 }}>Notes</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                    A beautiful space to plan, manage, and complete notes.
                  </p>
                </div>
 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {savedEmail && savedPassword && (
                    <button 
                      onClick={handleQuickLogin} 
                      className="btn btn-primary animate-fade-in" 
                      style={{ 
                        width: '100%', 
                        height: '44px', 
                        borderRadius: '22px', 
                        backgroundColor: '#10B981', 
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                      }}
                      disabled={loading}
                    >
                      <User size={15} /> Quick Login ({savedEmail})
                    </button>
                  )}

                  <button onClick={() => setStep(1)} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }}>
                    Get Started <UserPlus size={16} />
                  </button>
                  <button onClick={() => setIsLogin(true)} className="btn" style={{ width: '100%', height: '44px', borderRadius: '22px', backgroundColor: 'transparent' }}>
                    I already have an account
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Name Input */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <StepDots />
                <div>
                  <h3 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '6px' }}>What's your name?</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Let's personalize your workspace</p>
                </div>



                <div style={{ display: 'flex', gap: '10px', width: '100%', position: 'relative' }}>
                  <div style={{ position: 'relative', flexGrow: 1 }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      style={{ paddingLeft: '40px' }}
                      autoFocus
                    />
                  </div>
                  <button onClick={handleNext} className="btn btn-primary btn-icon" style={{ borderRadius: '22px', width: '44px', height: '44px' }}>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Email Input */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <StepDots />
                <div>
                  <h3 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '6px' }}>What's your email?</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>For securing your credentials</p>
                </div>



                <div style={{ display: 'flex', gap: '10px', width: '100%', position: 'relative' }}>
                  <div style={{ position: 'relative', flexGrow: 1 }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      style={{ paddingLeft: '40px' }}
                      autoFocus
                    />
                  </div>
                  <button onClick={handleNext} className="btn btn-primary btn-icon" style={{ borderRadius: '22px', width: '44px', height: '44px' }}>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Password Input */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <StepDots />
                <div>
                  <h3 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '6px' }}>Set Password</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Choose a secure password</p>
                </div>



                <div style={{ display: 'flex', gap: '10px', width: '100%', position: 'relative' }}>
                  <div style={{ position: 'relative', flexGrow: 1 }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="Choose password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      style={{ paddingLeft: '40px', paddingRight: '45px' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button onClick={handleNext} className="btn btn-primary btn-icon" style={{ borderRadius: '22px', width: '44px', height: '44px' }}>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Let's Start */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <StepDots />
                <div>
                  <h3 style={{ fontSize: '26px', color: 'var(--text-main)', marginBottom: '6px' }}>Ready to start!</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Let's initialize your notes workspace</p>
                </div>

                <button onClick={() => setStep(5)} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }}>
                  Lets Go
                </button>
              </div>
            )}

            {/* Step 5: Onboarding - The Notch */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                <OnboardingStepDots />
                <div>
                  <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '6px' }}>1. The Control Island</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                    All navigation and settings are housed inside the hardware notch at the top of your screen. Tap the notch anytime to open search.
                  </p>
                </div>

                {/* Micro-graphic */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '120px'
                }}>
                  {/* Visual representing the Notch */}
                  <div style={{
                    width: '120px',
                    height: '38px',
                    borderRadius: '19px',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    animation: 'pulseNotch 2s infinite ease-in-out'
                  }}>
                    <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>Notch</span>
                  </div>
                </div>

                <button onClick={() => setStep(6)} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }}>
                  Next
                </button>

                <style>{`
                  @keyframes pulseNotch {
                    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    50% { transform: scale(1.05); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
                  }
                `}</style>
              </div>
            )}

            {/* Step 6: Onboarding - Add Items */}
            {step === 6 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                <OnboardingStepDots />
                <div>
                  <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '6px' }}>2. Add Folders & Notes</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                    Click the notch, then click the <strong>+</strong> button inside the Dynamic Island to create a new category folder or task board checklist.
                  </p>
                </div>

                {/* Micro-graphic */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '120px'
                }}>
                  <div style={{
                    width: '180px',
                    height: '40px',
                    borderRadius: '20px',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    color: '#ffffff'
                  }}>
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>Search...</span>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'pulsePlus 1.5s infinite ease-in-out'
                    }}>
                      <Plus size={12} />
                    </div>
                  </div>
                </div>

                <button onClick={() => setStep(7)} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }}>
                  Next
                </button>

                <style>{`
                  @keyframes pulsePlus {
                    0%, 100% { transform: scale(1); background-color: rgba(255,255,255,0.2); }
                    50% { transform: scale(1.15); background-color: rgba(255,255,255,0.4); }
                  }
                `}</style>
              </div>
            )}

            {/* Step 7: Onboarding - Timer & Complete */}
            {step === 7 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                <OnboardingStepDots />
                <div>
                  <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '6px' }}>3. Focus Clock & Settings</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                    Launch deep focus Pomodoro timers or access account logout actions straight from the Dynamic Island panels.
                  </p>
                </div>

                {/* Micro-graphic */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '120px'
                }}>
                  <div style={{
                    width: '180px',
                    height: '40px',
                    borderRadius: '20px',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    color: '#ffffff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#D0E8FF' }}>
                      <Timer size={12} />
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>25:00</span>
                    </div>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>Active Focus</span>
                  </div>
                </div>

                <button onClick={() => setStep(8)} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }}>
                  Next
                </button>
              </div>
            )}

            {/* Step 8: Onboarding - Keyboard Shortcuts */}
            {step === 8 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                <OnboardingStepDots />
                <div>
                  <h3 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '6px' }}>4. Keyboard Shortcuts</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                    Control your entire workspace with fast keyboard shortcuts. Speed up your workflow without touching the mouse.
                  </p>
                </div>

                {/* Micro-graphic showing shortcuts */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <kbd style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', fontWeight: 600 }}>Ctrl</kbd>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>+</span>
                      <kbd style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', fontWeight: 600 }}>K</kbd>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>or</span>
                      <kbd style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', fontWeight: 600 }}>/</kbd>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: 500 }}>Fuzzy Search</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <kbd style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', fontWeight: 600 }}>N</kbd>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: 500 }}>Create New Item</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <kbd style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', boxShadow: '0 1px 1px rgba(0,0,0,0.05)', fontWeight: 600 }}>Esc</kbd>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: 500 }}>Collapse Notch</span>
                  </div>
                </div>

                <button onClick={handleRegisterSubmit} className="btn btn-primary" style={{ width: '100%', height: '44px', borderRadius: '22px' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Start Using Notes'}
                </button>
              </div>
            )}

            {/* Bottom Login Link if in register steps (hide in onboarding steps) */}
            {step > 0 && step < 4 && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px' }}>
                Already have an account?{' '}
                <button onClick={() => { setIsLogin(true); setStep(0); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                  Login
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
