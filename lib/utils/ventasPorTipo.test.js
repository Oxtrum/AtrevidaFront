import { describe, expect, test } from 'bun:test';
import { agruparVentasPorNombre } from './ventasPorTipo';

const linea = (extra) => ({ servicio: 'Limpieza', tipo_linea: 'SERVICIO', cantidad: 1, subtotal: 100, descuento_prorrateado: 0, ...extra });

describe('ventas agrupadas por nombre y tipo de linea', () => {
  test('solo cuenta el tipo pedido', () => {
    const lineas = [
      linea({ cantidad: 2, subtotal: 200 }),
      linea({ servicio: 'Crema', tipo_linea: 'INSUMO', cantidad: 3, subtotal: 60 }),
      linea({ servicio: 'Mario', tipo_linea: 'OTRO', cantidad: 13, subtotal: 65 }),
      linea({ servicio: 'Paquete: Relax', tipo_linea: 'PAQUETE', subtotal: 900 }),
    ];
    expect(agruparVentasPorNombre(lineas, 'SERVICIO')).toEqual([{ nombre: 'Limpieza', cantidad: 2, neto: 200 }]);
    expect(agruparVentasPorNombre(lineas, 'INSUMO')).toEqual([{ nombre: 'Crema', cantidad: 3, neto: 60 }]);
  });
  test('suma cantidad y neto (subtotal menos su descuento) de las lineas del mismo nombre', () => {
    const lineas = [
      linea({ cantidad: 1, subtotal: 100, descuento_prorrateado: 10 }),
      linea({ cantidad: 2, subtotal: 200, descuento_prorrateado: 5.5 }),
    ];
    expect(agruparVentasPorNombre(lineas, 'SERVICIO')).toEqual([{ nombre: 'Limpieza', cantidad: 3, neto: 284.5 }]);
  });
  test('limpia el numero de orden que antecede al nombre', () => {
    expect(agruparVentasPorNombre([linea({ servicio: '12 - Limpieza' })], 'SERVICIO')[0].nombre).toBe('Limpieza');
  });
  test('sin lineas del tipo devuelve una lista vacia', () => {
    expect(agruparVentasPorNombre([linea()], 'INSUMO')).toEqual([]);
  });
});
