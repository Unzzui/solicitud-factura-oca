import { describe, it, expect } from 'vitest';
import {
  esOT,
  OT_PRINCIPAL,
  normalizarOT,
  generarDetalleEjemplo,
  getEmpresaAbreviada,
  usaLclConformidad,
  filtrarClientes,
  findClienteByEmpresa
} from './data';

describe('normalizarOT', () => {
  it('quita ceros a la izquierda', () => {
    expect(normalizarOT('00007')).toBe('7');
    expect(normalizarOT('007')).toBe('7');
    expect(normalizarOT('7')).toBe('7');
  });

  it('devuelve cadena vacía si no hay valor', () => {
    expect(normalizarOT('')).toBe('');
  });
});

describe('esOT', () => {
  it('reconoce la OT principal con cualquier padding', () => {
    expect(esOT('7')).toBe(true);
    expect(esOT('07')).toBe(true);
    expect(esOT('007')).toBe(true);
    expect(esOT('00007')).toBe(true);
  });

  it('devuelve false para otras OT', () => {
    expect(esOT('8')).toBe(false);
    expect(esOT('70')).toBe(false);
  });

  it('devuelve false para entradas vacías', () => {
    expect(esOT('')).toBe(false);
  });

  it('OT_PRINCIPAL es la constante usada por default', () => {
    expect(esOT(OT_PRINCIPAL)).toBe(true);
  });
});

describe('generarDetalleEjemplo', () => {
  it('formatea con padding y mes', () => {
    expect(generarDetalleEjemplo('7', 'enero 2026')).toBe('OT 00007 (OCA) SSTT, enero 2026');
  });

  it('usa OT_PRINCIPAL por default', () => {
    expect(generarDetalleEjemplo(undefined, 'febrero 2026')).toBe('OT 00007 (OCA) SSTT, febrero 2026');
  });
});

describe('findClienteByEmpresa', () => {
  it('encuentra por nombre exacto case-insensitive', () => {
    expect(findClienteByEmpresa('Compañía General de Electricidad S.A')?.rut).toBe('76411321');
    expect(findClienteByEmpresa('compañía general de electricidad s.a')?.rut).toBe('76411321');
  });

  it('encuentra por RUT', () => {
    expect(findClienteByEmpresa('76411321')?.nombre).toBe('Compañía General de Electricidad S.A');
  });

  it('devuelve undefined si no existe', () => {
    expect(findClienteByEmpresa('No Existe S.A.')).toBeUndefined();
  });
});

describe('getEmpresaAbreviada', () => {
  it('usa el primer alias cuando existe', () => {
    expect(getEmpresaAbreviada('Compañía General de Electricidad S.A')).toBe('CGE');
    expect(getEmpresaAbreviada('Enel Distribución Chile S.A')).toBe('ENEL');
  });

  it('cae a substring saneado cuando no hay alias', () => {
    expect(getEmpresaAbreviada('Aguas Andinas S.A.')).toBe('Aguas_Andinas_S');
  });
});

describe('usaLclConformidad', () => {
  it('true para Enel', () => {
    expect(usaLclConformidad('Enel Distribución Chile S.A')).toBe(true);
    expect(usaLclConformidad('Enel Colina S.A.')).toBe(true);
  });

  it('false para otras empresas', () => {
    expect(usaLclConformidad('Compañía General de Electricidad S.A')).toBe(false);
    expect(usaLclConformidad('Metrogas S.A.')).toBe(false);
  });

  it('fallback por substring cuando la empresa no está en la lista', () => {
    expect(usaLclConformidad('Enel Sucursal Random')).toBe(true);
    expect(usaLclConformidad('Empresa Random S.A.')).toBe(false);
  });
});

describe('filtrarClientes', () => {
  it('encuentra CGE por alias', () => {
    const resultados = filtrarClientes('cge');
    expect(resultados.some(c => c.rut === '76411321')).toBe(true);
  });

  it('encuentra por substring del nombre', () => {
    const resultados = filtrarClientes('aguas');
    expect(resultados.length).toBeGreaterThanOrEqual(2);
  });

  it('encuentra por RUT', () => {
    const resultados = filtrarClientes('76411321');
    expect(resultados[0].nombre).toBe('Compañía General de Electricidad S.A');
  });

  it('devuelve todos los clientes si la búsqueda está vacía', () => {
    expect(filtrarClientes('').length).toBeGreaterThan(0);
  });
});
