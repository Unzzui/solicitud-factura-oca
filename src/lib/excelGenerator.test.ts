import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parsearDatosExcel, generarResumenBatch, FacturaData } from './excelGenerator';

// Construye un buffer de "Datos Facturas" en formato completo (sin hoja Config).
// Cada fila es una factura completa (18 columnas).
async function buildExcelBuffer(rows: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Datos Facturas');
  ws.addRow([
    'Fecha', 'Centro Costo', 'División', 'Empresa', 'RUT (sin DV)', 'DV',
    'Dirección', 'Comuna', 'Ciudad', 'Giro', 'Atención Sr.', 'Jefe Proyecto',
    'Detalle (OT)', 'Orden Compra', 'HES', 'Contacto', 'Monto ($)', 'Días Pago'
  ]);
  rows.forEach(r => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

const filaValida = [
  '24/06/2026', '00012', 'Control de Calidad y Asistencia Técnica',
  'Aguas Andinas S.A.', '61808000', '5',
  'Av. Presidente Balmaceda 1398', 'Santiago', 'Santiago',
  'Servicios Sanitarios', 'Luis Soto', 'Roberto Jamett',
  'OT 00012 detalle', 'OC 12345', 'HES 67890',
  'Contacto X', 1000000, 30
];

describe('parsearDatosExcel - plantilla completa', () => {
  it('parsea una fila válida', async () => {
    const buffer = await buildExcelBuffer([filaValida]);
    const { facturas, configuracion } = await parsearDatosExcel(buffer);
    expect(configuracion).toBeNull();
    expect(facturas).toHaveLength(1);
    expect(facturas[0].empresa).toBe('Aguas Andinas S.A.');
    expect(facturas[0].monto).toBe(1000000);
    expect(facturas[0].fecha).toBeInstanceOf(Date);
    expect(facturas[0].centroCosto).toBe('00012');
  });

  it('rechaza monto inválido (Zod schema)', async () => {
    const filaSinMonto = [...filaValida];
    filaSinMonto[16] = 0;
    const buffer = await buildExcelBuffer([filaSinMonto]);
    await expect(parsearDatosExcel(buffer)).rejects.toThrow(/monto/i);
  });

  it('NO valida duplicados durante el parseo (ahora se delega a la UI)', async () => {
    const fila2 = [...filaValida]; // copia exacta → mismo HES y OC
    const buffer = await buildExcelBuffer([filaValida, fila2]);
    const { facturas } = await parsearDatosExcel(buffer);
    expect(facturas).toHaveLength(2);
  });
});

describe('generarResumenBatch', () => {
  function makeFactura(over: Partial<FacturaData>): FacturaData {
    return {
      fecha: new Date('2026-06-24'),
      centroCosto: '00007',
      division: 'Control de Calidad y Asistencia Técnica',
      empresa: 'Aguas Andinas S.A.',
      rutNumero: '61808000', rutDv: '5',
      direccion: '', comuna: '', ciudad: '', giro: '',
      atencionSr: 'Sr. X', jefeProy: 'Roberto Jamett',
      detalle: '', ordenCompra: 'OC 1', hes: 'HES 1', contacto: '',
      monto: 1000, condicionPago: 30,
      ...over
    };
  }

  it('genera un Blob con las filas y el total', async () => {
    const facturas = [
      makeFactura({ centroCosto: '00007', monto: 1000, ordenCompra: 'OC A', hes: 'HES 1' }),
      makeFactura({ centroCosto: '00012', monto: 2000, ordenCompra: 'OC B', hes: 'HES 2' })
    ];
    const blob = await generarResumenBatch(facturas);
    expect(blob.size).toBeGreaterThan(0);

    // Releer para verificar estructura
    const wb = new ExcelJS.Workbook();
    const buffer = await blob.arrayBuffer();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet('Resumen');
    expect(ws).toBeTruthy();
    let total = 0;
    ws!.eachRow(row => {
      row.eachCell(cell => {
        if (cell.value === 'TOTAL') total++;
      });
    });
    expect(total).toBe(1);
  });

  it('los subtotales y el total son fórmulas SUM', async () => {
    const facturas = [
      makeFactura({ centroCosto: '00007', monto: 1000 }),
      makeFactura({ centroCosto: '00007', monto: 500 }),
      makeFactura({ centroCosto: '00012', monto: 2000 })
    ];
    const blob = await generarResumenBatch(facturas);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.getWorksheet('Resumen')!;

    let subtotalFormulas = 0;
    let totalFormula = false;
    ws.eachRow(row => {
      row.eachCell(cell => {
        const v = cell.value as { formula?: string } | string | number | null;
        if (v && typeof v === 'object' && 'formula' in v && v.formula) {
          if (v.formula.startsWith('SUM(F') && v.formula.includes(':F')) {
            subtotalFormulas++;
          } else if (v.formula.startsWith('SUM(F') && v.formula.includes(',')) {
            totalFormula = true;
          } else if (v.formula.startsWith('SUM(F')) {
            // Total con un solo subtotal: SUM(F8)
            totalFormula = true;
          }
        }
      });
    });
    expect(subtotalFormulas).toBe(2); // OT 7 y OT 12
    expect(totalFormula).toBe(true);
  });
});
