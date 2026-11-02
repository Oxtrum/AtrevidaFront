import { CobrosTabs } from '@/components/AdminCobros/CobrosTabs';

/** Cobros y su historial comparten pestañas arriba de cada pantalla. */
export default function CobrosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CobrosTabs />
      {children}
    </>
  );
}
