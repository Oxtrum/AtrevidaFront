import { expect, test } from 'bun:test';
import { traerTodasLasPaginas, PAGINA_COMPLETA } from './traerTodas';

const pagina = (filas, siguiente) => ({ filas, paginacion: { limit: 100, has_more: siguiente !== null, next_cursor: siguiente } });

test('junta todas las paginas siguiendo el cursor', async () => {
  const pedidos = [];
  const paginas = { '': pagina([1, 2], 'a'), a: pagina([3, 4], 'b'), b: pagina([5], null) };
  const todo = await traerTodasLasPaginas(async (cursor) => {
    pedidos.push(cursor);
    return paginas[cursor ?? ''];
  });
  expect(todo).toEqual([1, 2, 3, 4, 5]);
  expect(pedidos).toEqual([undefined, 'a', 'b']);
});

test('una sola pagina no pide mas', async () => {
  let llamadas = 0;
  const todo = await traerTodasLasPaginas(async () => {
    llamadas += 1;
    return pagina([1], null);
  });
  expect(todo).toEqual([1]);
  expect(llamadas).toBe(1);
});

test('sin metadatos de paginacion termina con lo recibido', async () => {
  const todo = await traerTodasLasPaginas(async () => ({ filas: [7, 8] }));
  expect(todo).toEqual([7, 8]);
});

test('corta si el servidor nunca termina de paginar', async () => {
  let llamadas = 0;
  await expect(
    traerTodasLasPaginas(async () => {
      llamadas += 1;
      return pagina([1], 'siempre');
    }, 5),
  ).rejects.toThrow('demasiadas páginas');
  expect(llamadas).toBe(5);
});

test('las paginas completas son de 100, el maximo del servidor', () => {
  expect(PAGINA_COMPLETA).toBe(100);
});
