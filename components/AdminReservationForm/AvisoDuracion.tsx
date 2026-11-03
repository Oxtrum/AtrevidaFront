import modalStyles from '@/components/AdminConfig/FormModal.module.css';
import type { DesajusteDuracion } from '@/lib/utils/slotRange';

interface AvisoDuracionProps {
  servicio: string;
  desajuste: DesajusteDuracion;
  /** Qué hacer si fue un error; depende de dónde se eligió el horario. */
  ayuda: string;
}

/** Cuerpo del aviso "la duración no coincide con el servicio", compartido por el formulario y la aprobación. */
export function AvisoDuracion({ servicio, desajuste, ayuda }: AvisoDuracionProps) {
  return (
    <>
      <p style={{ margin: 0 }}>
        <strong>{servicio}</strong> dura <strong>{desajuste.duracionServicio}</strong>,
        pero el horario es de <strong>{desajuste.horaDesde}</strong> a{' '}
        <strong>{desajuste.horaHasta}</strong> ({desajuste.duracionElegida}).
      </p>
      <p className={modalStyles.notice}>
        {desajuste.esMasLargo
          ? `El ambiente queda ocupado toda esa franja: ${desajuste.bloquesDiferencia} bloque(s) de 30 min extra no podrán usarse para otras reservas ese día.`
          : `El servicio podría no alcanzar a completarse: faltan ${desajuste.bloquesDiferencia} bloque(s) de 30 min respecto de su duración habitual.`}
      </p>
      <p className={modalStyles.noticeHint}>{ayuda}</p>
    </>
  );
}
