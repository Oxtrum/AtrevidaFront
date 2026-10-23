import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useMontado } from './useMontado';

test('en el servidor (y en la hidratación) aún no está montado', () => {
  const Probe = () => createElement('span', null, String(useMontado()));
  expect(renderToString(createElement(Probe))).toContain('false');
});
