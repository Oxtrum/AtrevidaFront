'use client';

import { useEffect, useState } from 'react';
import { Boxes, Landmark, SlidersHorizontal } from 'lucide-react';
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
