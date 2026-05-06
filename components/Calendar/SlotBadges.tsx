export function SlotBadges({ mesas, bicicletas }: { mesas: number; bicicletas: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {mesas > 0 && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.15rem 0.4rem',
          borderRadius: '999px',
          background: 'rgba(236, 72, 153, 0.15)',
          border: '1px solid rgba(236, 72, 153, 0.5)',
          color: '#f472b6',
          letterSpacing: '0.03em',
        }}>
          {mesas} {mesas === 1 ? 'Mesa' : 'Mesas'}
        </span>
      )}
      {bicicletas > 0 && (
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.15rem 0.4rem',
          borderRadius: '999px',
          background: 'rgba(96, 165, 250, 0.15)',
          border: '1px solid rgba(96, 165, 250, 0.5)',
          color: '#93c5fd',
          letterSpacing: '0.03em',
        }}>
          {bicicletas} {bicicletas === 1 ? 'Bicicleta' : 'Bicicletas'}
        </span>
      )}
    </div>
  );
}