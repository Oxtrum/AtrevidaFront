'use client';

import { useEffect, useState } from 'react';
import { Boxes, Landmark, SlidersHorizontal, UsersRound } from 'lucide-react';
import { AdminButton, AdminPageShell, AdminPanel, AlertBanner, FormField, FormSubmitError, PageHeader } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getStoredAdminRole } from '@/lib/auth/adminSession';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import type { ConfiguracionSistema } from '@/types/finanzas';
import styles from './page.module.css';

const TIMEZONES = ['America/La_Paz', 'America/Lima', 'America/Bogota', 'America/Argentina/Buenos_Aires', 'America/Santiago', 'America/Sao_Paulo'];

// Gerencia puede leer; solo admin_sys edita (§7).
const ROLES = ['admin_sys', 'gerencia'];

export default function ParametrosPage() {
  const { config, loading, update } = useConfiguracion();
  const [form, setForm] = useState<ConfiguracionSistema>(config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = typeof window !== 'undefined' && getStoredAdminRole() === 'admin_sys';

  useEffect(() => {
    setForm(config);  
  }, [config]);

  const set = <K extends keyof ConfiguracionSistema>(key: K, value: ConfiguracionSistema[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(config);

  const handleSave = async () => {
    const dias = Number(form['finanzas.dias_aviso_gasto_fijo']);
    if (!Number.isInteger(dias) || dias < 0 || dias > 31) {
      setError('Los días de aviso deben estar entre 0 y 31');
      return;
    }
    if (!form['finanzas.moneda'].trim()) {
      setError('La moneda es obligatoria');
      return;
    }
    const diaPago = Number(form['rrhh.dia_pago_defecto']);
    if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
      setError('El día de pago por defecto debe estar entre 1 y 31');
      return;
    }
    const diasFalta = Number(form['rrhh.dias_mes_faltas']);
    if (!Number.isInteger(diasFalta) || diasFalta < 1 || diasFalta > 31) {
      setError('Los días base para valorar una falta deben estar entre 1 y 31');
      return;
    }
    for (const k of ['rrhh.aporte_laboral_pct', 'rrhh.aporte_patronal_pct'] as const) {
      const pct = Number(form[k]);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        setError('Los porcentajes de aportes deben estar entre 0 y 100');
        return;
      }
    }
    setSaving(true);
    try {
      await update(form);
      toast.success('Parámetros guardados');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los parámetros');
    } finally {
      setSaving(false);
    }
  };

  const bool = (key: 'inventario.permitir_stock_negativo' | 'inventario.considerar_comprometido') => (
    <CustomSelect
      value={String(form[key])}
      onChange={(v) => set(key, v === 'true')}
      options={[{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }]}
      searchable={false}
    />
  );

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<SlidersHorizontal size={14} strokeWidth={2} />}
        title="Parámetros de Inventario y Finanzas"
        accentWord="Parámetros"
        subtitle="Reglas de stock en reservas y de generación de gastos fijos"
        backHref="/atrevida-gestion/configuracion"
      />
      {!canEdit && <AlertBanner tone="info">Modo lectura: solo el administrador del sistema puede modificar estos parámetros. Tu rol actual puede consultarlos.</AlertBanner>}

      <fieldset className={styles.fieldset} disabled={!canEdit || saving}>
        <AdminPanel card title="Inventario" description="Qué pasa con el stock cuando se agenda o completa una reserva." icon={<Boxes size={18} strokeWidth={1.75} />}>
          <div className={styles.grid}>
            <FormField label="Si no hay stock al reservar" labelId="p-pol-lbl" hint="Advertir: la reserva se guarda con aviso. Bloquear: el panel interno rechaza la reserva (el formulario público siempre registra).">
              <CustomSelect
                value={form['inventario.politica_sin_stock']}
                onChange={(v) => set('inventario.politica_sin_stock', v as ConfiguracionSistema['inventario.politica_sin_stock'])}
                options={[{ value: 'ADVERTIR', label: 'Advertir y registrar' }, { value: 'BLOQUEAR', label: 'Bloquear la reserva' }]}
                searchable={false}
                ariaLabelledBy="p-pol-lbl"
              />
            </FormField>
            <FormField label="Descontar insumos cuando la reserva pasa a" labelId="p-desc-lbl" hint="Completado = cuando el servicio se realizó.">
              <CustomSelect
                value={form['inventario.descontar_en_estado']}
                onChange={(v) => set('inventario.descontar_en_estado', v as ConfiguracionSistema['inventario.descontar_en_estado'])}
                options={[{ value: 'COMPLETADO', label: 'Completado' }, { value: 'AGENDADO', label: 'Agendado' }]}
                searchable={false}
                ariaLabelledBy="p-desc-lbl"
              />
            </FormField>
            <FormField label="Permitir stock negativo al completar" labelId="p-neg-lbl" hint="Si no alcanza el stock, permite completar y deja el faltante por regularizar. En “No” se rechaza.">
              <div id="p-neg-lbl">{bool('inventario.permitir_stock_negativo')}</div>
            </FormField>
            <FormField label="Considerar reservas agendadas futuras" labelId="p-comp-lbl" hint="Al calcular si alcanza el stock, también cuenta lo que necesitan las reservas agendadas de los próximos días en este local. Así no se promete un insumo que ya está reservado para otra clienta.">
              <div id="p-comp-lbl">{bool('inventario.considerar_comprometido')}</div>
            </FormField>
          </div>
        </AdminPanel>

        <AdminPanel card tone="info" title="Finanzas" description="Cómo se generan y avisan los gastos fijos." icon={<Landmark size={18} strokeWidth={1.75} />}>
          <div className={styles.grid}>
            <FormField label="Estado del gasto fijo generado" labelId="p-gf-lbl" hint="Pendiente: alguien confirma que se pagó. Pagado: nace ya confirmado.">
              <CustomSelect
                value={form['finanzas.estado_gasto_fijo_generado']}
                onChange={(v) => set('finanzas.estado_gasto_fijo_generado', v as ConfiguracionSistema['finanzas.estado_gasto_fijo_generado'])}
                options={[{ value: 'PENDIENTE', label: 'Pendiente' }, { value: 'PAGADO', label: 'Pagado' }]}
                searchable={false}
                ariaLabelledBy="p-gf-lbl"
              />
            </FormField>
            <FormField label="Días de aviso antes del cobro" htmlFor="p-aviso" hint="Los gastos fijos que vencen en este plazo aparecen en el dashboard.">
              <div className={styles.suffixWrap}>
                <input id="p-aviso" type="number" min={0} max={31} value={form['finanzas.dias_aviso_gasto_fijo']} onChange={(e) => set('finanzas.dias_aviso_gasto_fijo', Number(e.target.value))} />
                <span className={styles.suffix} aria-hidden>días</span>
              </div>
            </FormField>
            <FormField label="Zona horaria" labelId="p-tz-lbl" hint="Define cuándo vence cada gasto fijo.">
              <CustomSelect
                value={form['finanzas.zona_horaria']}
                onChange={(v) => set('finanzas.zona_horaria', v)}
                options={TIMEZONES.map((t) => ({ value: t, label: t }))}
                searchable={false}
                ariaLabelledBy="p-tz-lbl"
              />
            </FormField>
            <FormField label="Moneda" htmlFor="p-moneda" hint="Símbolo que se muestra en pantallas y reportes.">
              <input id="p-moneda" type="text" maxLength={5} value={form['finanzas.moneda']} onChange={(e) => set('finanzas.moneda', e.target.value)} />
            </FormField>
          </div>
        </AdminPanel>

        <AdminPanel card tone="info" title="Recursos Humanos" description="Cuándo se pagan los sueldos y cómo se calculan los aportes de ley." icon={<UsersRound size={18} strokeWidth={1.75} />}>
          <div className={styles.grid}>
            <FormField label="Día de pago por defecto" htmlFor="p-rrhh-dia" hint="Cada empleado puede tener su propio día. Si el mes no tiene ese día se usa el último.">
              <div className={styles.suffixWrap}>
                <input id="p-rrhh-dia" type="number" min={1} max={31} value={form['rrhh.dia_pago_defecto']} onChange={(e) => set('rrhh.dia_pago_defecto', Number(e.target.value))} />
                <span className={styles.suffix} aria-hidden>de cada mes</span>
              </div>
            </FormField>
            <FormField label="Días base para valorar una falta" htmlFor="p-rrhh-faltas" hint="Una falta descuenta sueldo base ÷ este número.">
              <div className={styles.suffixWrap}>
                <input id="p-rrhh-faltas" type="number" min={1} max={31} value={form['rrhh.dias_mes_faltas']} onChange={(e) => set('rrhh.dias_mes_faltas', Number(e.target.value))} />
                <span className={styles.suffix} aria-hidden>días</span>
              </div>
            </FormField>
            <FormField label="Aporte laboral (se retiene al empleado)" htmlFor="p-rrhh-lab" hint="AFP: 10% jubilación + 1.71% riesgo común + 0.5% comisión + 0.5% solidario = 12.71%. Verifícalo con tu contador.">
              <div className={styles.suffixWrap}>
                <input id="p-rrhh-lab" type="number" min={0} max={100} step="0.01" value={form['rrhh.aporte_laboral_pct']} onChange={(e) => set('rrhh.aporte_laboral_pct', Number(e.target.value))} />
                <span className={styles.suffix} aria-hidden>%</span>
              </div>
            </FormField>
            <FormField label="Aporte patronal (lo paga la empresa)" htmlFor="p-rrhh-pat" hint="CNS 10% + riesgo profesional 1.71% + vivienda 2% + solidario 3% = 16.71%. Verifícalo con tu contador.">
              <div className={styles.suffixWrap}>
                <input id="p-rrhh-pat" type="number" min={0} max={100} step="0.01" value={form['rrhh.aporte_patronal_pct']} onChange={(e) => set('rrhh.aporte_patronal_pct', Number(e.target.value))} />
                <span className={styles.suffix} aria-hidden>%</span>
              </div>
            </FormField>
          </div>
        </AdminPanel>
      </fieldset>
      <FormSubmitError message={error} />

      {canEdit && dirty && (
        <div className={styles.saveBar} role="region" aria-label="Cambios sin guardar">
          <span className={styles.saveMsg}><span className={styles.dot} aria-hidden />Cambios sin guardar</span>
          <div className={styles.saveActions}>
            <AdminButton variant="secondary" onClick={() => { setForm(config); setError(''); }} disabled={saving}>Descartar</AdminButton>
            <AdminButton variant="primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </AdminButton>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
