import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parsearDatosExcel } from './excelGenerator';

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
