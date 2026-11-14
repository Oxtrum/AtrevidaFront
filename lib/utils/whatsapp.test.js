import { expect, test } from 'bun:test';
import { buildContactoWhatsappHref } from './whatsapp';

const reserva = {
  fecha: '2030-05-14',
  hora_desde: '15:30',
  local: 'SAN MARTIN',
  telefono_e164: '+59170011223',
  numero_telefono: '70011223',
  servicio: '',
  servicio_solicitado: null,
  servicio_confirmado: null,
};

const textoDe = (href) => decodeURIComponent(new URL(href).searchParams.get('text') ?? '');

test('con servicio, el mensaje habla de esa reserva y no pregunta el tratamiento', () => {
  const texto = textoDe(buildContactoWhatsappHref({ ...reserva, servicio_solicitado: 'Reductivo corporal' }));
  expect(texto).toContain('Reductivo corporal');
  expect(texto).toContain('3:30PM');
  expect(texto).toContain('San Martín');
  expect(texto).not.toContain('¿Qué tratamiento');
});

test('el servicio confirmado manda sobre el solicitado', () => {
  const texto = textoDe(buildContactoWhatsappHref({ ...reserva, servicio_solicitado: 'Masaje', servicio_confirmado: 'Drenaje linfático' }));
  expect(texto).toContain('Drenaje linfático');
  expect(texto).not.toContain('Masaje');
});

test('sin servicio todavía, sí pregunta qué tratamiento quiere', () => {
  const texto = textoDe(buildContactoWhatsappHref(reserva));
  expect(texto).toContain('¿Qué tratamiento deseas realizar?');
});

test('sin teléfono no hay enlace', () => {
  expect(buildContactoWhatsappHref({ ...reserva, telefono_e164: null, numero_telefono: '' })).toBeNull();
});
