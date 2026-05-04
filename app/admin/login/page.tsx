'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import Header from '@/components/Header/Header';
import styles from './page.module.css';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const orb1Ref      = useRef<HTMLSpanElement>(null);
  const orb2Ref      = useRef<HTMLSpanElement>(null);
  const orb3Ref      = useRef<HTMLSpanElement>(null);
  const badgeRef     = useRef<HTMLSpanElement>(null);
  const titleRef     = useRef<HTMLHeadingElement>(null);
  const subtitleRef  = useRef<HTMLParagraphElement>(null);
  const formRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Page fade-in
      gsap.fromTo(containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );

      // Card entrance
      gsap.fromTo(cardRef.current,
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, delay: 0.15, ease: 'power3.out' }
      );

      // Inner elements stagger
      const tl = gsap.timeline({ delay: 0.45, defaults: { ease: 'power3.out' } });
      tl.fromTo(badgeRef.current,  { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 })
        .fromTo(titleRef.current,  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
        .fromTo(subtitleRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, '-=0.3')
        .fromTo(formRef.current,   { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.2');

      // Orbs float loops
      gsap.to(orb1Ref.current, { y: '+=35', duration: 4.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(orb2Ref.current, { y: '-=28', duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.6 });
      gsap.to(orb3Ref.current, { y: '+=20', x: '+=10', duration: 5,   ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Success flash before navigation
        gsap.to(cardRef.current, { scale: 1.02, opacity: 0.8, duration: 0.3, ease: 'power2.in', onComplete: () => {
          localStorage.setItem('adminToken', data.token);
          router.push('/admin/dashboard');
        }});
      } else {
        setError(data.message || 'Credenciales inválidas');
        // Shake on error
        gsap.fromTo(cardRef.current,
          { x: -10 },
          { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
        );
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      {/* Ambient orbs */}
      <span ref={orb1Ref} className={`${styles.orb} ${styles.orb1}`} />
      <span ref={orb2Ref} className={`${styles.orb} ${styles.orb2}`} />
      <span ref={orb3Ref} className={`${styles.orb} ${styles.orb3}`} />

      {/* Background mesh */}
      <div className={styles.bgMesh} />

      {/* Decorative particles */}
      <span className={styles.particle} style={{ top: '12%', left: '8%' }}>✦</span>
      <span className={styles.particle} style={{ top: '80%', right: '10%', opacity: 0.12 }}>◉</span>
      <span className={styles.particle} style={{ bottom: '15%', left: '15%', fontSize: '1rem', opacity: 0.1 }}>◎</span>

      <Header />

      <main className={styles.main}>
        <div ref={cardRef} className={styles.loginCard}>
          {/* Gradient top line */}
          <div className={styles.cardLine} />

          {/* Header */}
          <div className={styles.loginHeader}>
            <h1 ref={titleRef} className={styles.title}>
              Atrevida<em className={styles.titleAccent}>Fit</em>
            </h1>
            <p ref={subtitleRef} className={styles.subtitle}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Form */}
          <div ref={formRef}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Username */}
              <div className={styles.formGroup}>
                <label htmlFor="username" className={styles.label}>
                  <span className={styles.labelIcon}>◈</span>
                  Usuario
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="username"
                    type="text"
                    className={styles.input}
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    placeholder="Nombre de usuario"
                    autoComplete="username"
                    required
                  />
                  <span className={styles.inputGlow} />
                </div>
              </div>

              {/* Password */}
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  <span className={styles.labelIcon}>◈</span>
                  Contraseña
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.input} ${styles.inputPadRight}`}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? '○' : '●'}
                  </button>
                  <span className={styles.inputGlow} />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={styles.errorBox}>
                  <span className={styles.errorIcon}>⚠</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.loadingInner}>
                    <span className={styles.spinner} />
                    Verificando...
                  </span>
                ) : (
                  <>✦ Iniciar Sesión</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>AtrevidaFit</span>
              <span className={styles.dividerLine} />
            </div>

            {/* Back link */}
            <Link href="/" className={styles.backLink}>
              <span className={styles.backIcon}>←</span>
              Volver al sitio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}