import { ChoiceChips } from './ChoiceChips';

type Vista = 'calendario' | 'lista';

const OPCIONES: { value: Vista; label: string }[] = [
  { value: 'calendario', label: 'Calendario' },
  { value: 'lista', label: 'Lista' },
];

/** Interruptor Calendario o Lista: una sola vista a la vez, sin repetir los mismos datos. */
export function VistaToggle({ value, onChange }: { value: Vista; onChange: (value: Vista) => void }) {
  return <ChoiceChips variant="toggle" ariaLabel="Vista" options={OPCIONES} value={value} onChange={onChange} />;
}
