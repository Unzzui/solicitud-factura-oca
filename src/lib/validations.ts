import type { FacturaData } from './excelGenerator';

export type TipoDuplicado = 'OC' | 'HES';

export interface DuplicadoGrupo {
  tipo: TipoDuplicado;
  valor: string;
  // Índices de las facturas involucradas en el array original
  indices: number[];
}

// Clave canónica de un grupo, para usar en Sets/Maps de aprobaciones
export function duplicadoKey(grupo: Pick<DuplicadoGrupo, 'tipo' | 'valor'>): string {
  return `${grupo.tipo}:${grupo.valor.trim().toUpperCase()}`;
}

// Detecta facturas con la misma OC o el mismo HES/LCL.
// Reglas:
// - Se ignoran valores vacíos.
// - La comparación es case-insensitive y descarta espacios extra.
// - No aplica filtro por OT — es deliberado: la decisión de "es OK que se
//   repita" la toma el usuario en la UI.
export function detectarDuplicados(facturas: FacturaData[]): DuplicadoGrupo[] {
  const ocMap = new Map<string, number[]>();
  const hesMap = new Map<string, number[]>();

  facturas.forEach((f, i) => {
    const oc = (f.ordenCompra || '').trim().toUpperCase();
    if (oc) {
      const arr = ocMap.get(oc) ?? [];
      arr.push(i);
      ocMap.set(oc, arr);
    }
    const hes = (f.hes || '').trim().toUpperCase();
    if (hes) {
      const arr = hesMap.get(hes) ?? [];
      arr.push(i);
      hesMap.set(hes, arr);
    }
  });

  const grupos: DuplicadoGrupo[] = [];
  ocMap.forEach((indices, valor) => {
    if (indices.length > 1) grupos.push({ tipo: 'OC', valor, indices });
  });
  hesMap.forEach((indices, valor) => {
    if (indices.length > 1) grupos.push({ tipo: 'HES', valor, indices });
  });
  return grupos;
}
