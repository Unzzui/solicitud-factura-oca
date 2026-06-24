import { describe, it, expect } from 'vitest';
import { detectarDuplicados, duplicadoKey } from './validations';
import type { FacturaData } from './excelGenerator';

function makeFactura(over: Partial<FacturaData>): FacturaData {
  return {
    fecha: new Date('2026-06-24'),
    centroCosto: '00007',
    division: 'Control de Calidad y Asistencia Técnica',
    empresa: 'Aguas Andinas S.A.',
    rutNumero: '61808000',
    rutDv: '5',
    direccion: 'Av. X',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Servicios Sanitarios',
    atencionSr: 'Sr. X',
    jefeProy: 'Roberto Jamett',
    detalle: 'OT 7',
    ordenCompra: '',
    hes: '',
    contacto: '',
    monto: 1000,
    condicionPago: 30,
    ...over
  };
}

describe('detectarDuplicados', () => {
  it('devuelve [] cuando no hay duplicados', () => {
    expect(detectarDuplicados([
      makeFactura({ ordenCompra: 'OC 1', hes: 'HES A' }),
      makeFactura({ ordenCompra: 'OC 2', hes: 'HES B' })
    ])).toEqual([]);
  });

  it('detecta OC repetida con índices', () => {
    const grupos = detectarDuplicados([
      makeFactura({ ordenCompra: 'OC 1', hes: 'HES A' }),
      makeFactura({ ordenCompra: 'OC 1', hes: 'HES B' }),
      makeFactura({ ordenCompra: 'OC 2', hes: 'HES C' })
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].tipo).toBe('OC');
    expect(grupos[0].indices).toEqual([0, 1]);
  });

  it('detecta HES repetido aunque OC sean distintas', () => {
    const grupos = detectarDuplicados([
      makeFactura({ ordenCompra: 'OC 1', hes: 'HES A' }),
      makeFactura({ ordenCompra: 'OC 2', hes: 'HES A' })
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].tipo).toBe('HES');
  });

  it('comparación case-insensitive con trim', () => {
    const grupos = detectarDuplicados([
      makeFactura({ ordenCompra: ' oc 1 ', hes: '' }),
      makeFactura({ ordenCompra: 'OC 1', hes: '' })
    ]);
    expect(grupos).toHaveLength(1);
  });

  it('ignora valores vacíos', () => {
    expect(detectarDuplicados([
      makeFactura({ ordenCompra: '', hes: '' }),
      makeFactura({ ordenCompra: '', hes: '' })
    ])).toEqual([]);
  });

  it('NO filtra por OT — incluso OT 7 reporta duplicados; la UI decide qué es OK', () => {
    const grupos = detectarDuplicados([
      makeFactura({ centroCosto: '00007', ordenCompra: 'OC 1', hes: '' }),
      makeFactura({ centroCosto: '00007', ordenCompra: 'OC 1', hes: '' })
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].tipo).toBe('OC');
  });
});

describe('duplicadoKey', () => {
  it('normaliza el valor', () => {
    expect(duplicadoKey({ tipo: 'OC', valor: ' oc 1 ' })).toBe('OC:OC 1');
    expect(duplicadoKey({ tipo: 'HES', valor: 'hes a' })).toBe('HES:HES A');
  });
});
