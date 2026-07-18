'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { getPaquetesDB, type PaqueteDetalle } from '@/lib/api/paquetes';
import section from '@/components/Servicios/Servicios.module.css';
import styles from './Paquetes.module.css';

const WHATSAPP = '59177411855';
const INSTAGRAM = 'https://instagram.com/atrevida.fit';

// Glifo de WhatsApp (mismo trazo que components/WhatsappFab).
function WhatsappGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5ZM14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z"
      />
    </svg>
  );
}

const moneda = (valor: number, codigo?: string) =>
  `${valor.toLocaleString('es-BO')} ${!codigo || codigo === 'BOB' ? 'Bs' : codigo}`;

const sesionesLabel = (n: number) => `${n} ${n === 1 ? 'sesión' : 'sesiones'}`;

const whatsappUrl = (nombre: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, me interesa el paquete ${nombre}.`)}`;

// Servicios base únicos (deduplicados por texto) — el back guarda una línea por
// servicio base, pero el admin puede repetir el mismo texto.
function serviciosUnicos(base: PaqueteDetalle['servicios_base']): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const s of base) {
    const label = (s.servicio_texto ?? '').trim();
    if (!label) continue;
    const clave = label.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    out.push(label);
  }
  return out;
}

export default function Paquetes() {
  const [paquetes, setPaquetes] = useState<PaqueteDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<Set<number>>(new Set());

  const toggleServicios = (id: number) =>
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Carga dinámica: refleja altas/bajas de paquetes en cada visita.
  useEffect(() => {
    let active = true;
    getPaquetesDB()
      .then((res) => {
        if (active) setPaquetes(res.data?.paquetes ?? []);
      })
      .catch(() => {
        if (active) setPaquetes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Entrada animada; count-agnostic (anima las cards que existan). Respeta reduce-motion.
  useEffect(() => {
    if (loading || paquetes.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 40, opacity: 0, willChange: 'transform, opacity', force3D: true },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 80%', toggleActions: 'play none none none' },
        }
      );

      const cards = gridRef.current?.querySelectorAll(`.${styles.card}`);
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0, willChange: 'transform, opacity', force3D: true },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            stagger: { each: 0.1, amount: 0.8 },
            scrollTrigger: { trigger: gridRef.current, start: 'top 78%', toggleActions: 'play none none none' },
            onComplete: () => cards.forEach((el) => ((el as HTMLElement).style.willChange = '')),
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, paquetes]);

  return (
    <section ref={sectionRef} className={styles.paquetes} id="paquetes">
      <div className={section.container}>
        <div ref={titleRef} className={section.sectionHeader}>
          <div>
            <span className={section.sectionBadge}>Paquetes</span>
            <h2 className={section.sectionTitle}>
              Más sesiones,
              <br />
              <span className={section.titleAccent}>mejor precio</span>
            </h2>
          </div>
          <p className={section.sectionSubtitle}>
            Promociones cerradas por tratamiento. Elige tu número de sesiones y coordina tu
            primera cita directo por WhatsApp.
          </p>
        </div>

        {loading ? (
          <div className={styles.grid} aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : paquetes.length === 0 ? (
          <p className={styles.empty}>Pronto publicaremos nuevos paquetes. Escríbenos por WhatsApp mientras tanto.</p>
        ) : (
          <div ref={gridRef} className={styles.grid}>
            {paquetes.map((p) => {
              const cover = p.paquete.imagen_url;
              const servicios = serviciosUnicos(p.servicios_base);
              const tiers = [...p.tiers].sort((a, b) => (a.sesiones_totales ?? 0) - (b.sesiones_totales ?? 0));
              const abierto = expandido.has(p.paquete.id);
              return (
                <article key={p.paquete.id} className={styles.card}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={p.paquete.nombre} className={styles.cardBg} loading="lazy" />
                  ) : (
                    <div className={styles.cardBgFallback} aria-hidden="true" />
                  )}
                  <div className={styles.cardOverlay} aria-hidden="true" />

                  <div className={styles.detail}>
                    <h3 className={styles.name}>{p.paquete.nombre}</h3>

                    {servicios.length > 0 && (
                      <div className={styles.serviciosWrap}>
                        <button
                          type="button"
                          className={styles.serviciosToggle}
                          onClick={() => toggleServicios(p.paquete.id)}
                          aria-expanded={abierto}
                        >
                          <span>{abierto ? 'Ocultar servicios' : `Ver servicios (${servicios.length})`}</span>
                          <ChevronDown
                            size={15}
                            strokeWidth={2.2}
                            className={abierto ? styles.chevronOpen : styles.chevron}
                          />
                        </button>
                        {abierto && (
                          <ul className={styles.services}>
                            {servicios.map((label, i) => (
                              <li key={i}>
                                <Check size={14} strokeWidth={2.4} />
                                <span>{label}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {tiers.length > 0 && (
                      <div className={styles.tiers}>
                        <span className={styles.tiersLabel}>
                          {tiers.length > 1 ? 'Elige tus sesiones' : 'Reserva tu paquete'}
                        </span>
                        <div className={styles.tierList}>
                          {tiers.map((tier) => (
                            <a
                              key={tier.id}
                              className={styles.tier}
                              href={whatsappUrl(tier.nombre ?? p.paquete.nombre)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className={styles.tierSesiones}>{sesionesLabel(tier.sesiones_totales ?? 0)}</span>
                              <span className={styles.tierPrecio}>{moneda(tier.precio_final ?? 0, tier.moneda)}</span>
                            </a>
                          ))}
                        </div>
                        <span className={styles.tiersHint}>
                          <WhatsappGlyph size={14} />
                          Reservas por WhatsApp
                        </span>
                      </div>
                    )}

                    {p.locales.length > 0 && (
                      <div className={styles.locales}>
                        {p.locales.map((l) => (
                          <span key={l.id} className={styles.pin}>
                            <MapPin size={13} strokeWidth={2} />
                            {l.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && paquetes.length > 0 && (
          <p className={styles.follow}>
            Síguenos en{' '}
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
              Instagram @atrevida.fit
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
