import ExcelJS from 'exceljs';
import { z } from 'zod';
import { generarDetalleEjemplo, OT_PRINCIPAL, OT_PADDING } from './data';

export interface FacturaData {
  // Fecha de creación
  fecha: Date;

  // Identificación
  centroCosto: string;
  division: string;

  // Datos del cliente
  empresa: string;
  rutNumero: string;
  rutDv: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  giro: string;

  // Contacto
  atencionSr: string;
  jefeProy: string;

  // Detalles factura
  detalle: string;
  ordenCompra: string;
  hes: string;
  contacto: string;

  // Monto
  monto: number;

  // Condición de pago (días)
  condicionPago: number;

  // Empresa OCA emisora
  empresaOCA?: {
    id: 'ensayos' | 'servicios_tecnicos';
    nombre: string;
    rut: string;
    dv: string;
    direccion: string;
  };

  // Tipo de plantilla a usar al generar el archivo
  tipoPlantilla?: 'nueva' | 'antigua';
}

// Calcula fecha de vencimiento según días de condición de pago
function calcularFechaVcto(fecha: Date, diasPago: number = 30): Date {
  const vcto = new Date(fecha);
  vcto.setDate(vcto.getDate() + diasPago);
  return vcto;
}

// Función auxiliar para establecer valor de celda de forma segura
function setCellValue(ws: ExcelJS.Worksheet, address: string, value: unknown): void {
  try {
    const cell = ws.getCell(address);
    if (cell) {
      cell.value = value as ExcelJS.CellValue;
    }
  } catch {
    // Ignorar errores de celdas problemáticas
  }
}

export type TipoPlantilla = 'nueva' | 'antigua';

// Genera un archivo Excel de factura basado en la plantilla
export async function generarFactura(
  plantillaBuffer: ArrayBuffer,
  data: FacturaData,
  tipoPlantillaParam: TipoPlantilla = 'nueva'
): Promise<Blob> {
  const tipoPlantilla: TipoPlantilla = data.tipoPlantilla || tipoPlantillaParam;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(plantillaBuffer);

  // En la plantilla antigua el nombre de la hoja puede variar (ej: "Factura 01-101031 ")
  const ws =
    workbook.getWorksheet('Factura') ||
    workbook.worksheets.find(w => w.name.trim().toLowerCase().startsWith('factura')) ||
    workbook.worksheets[0];
  if (!ws) throw new Error('No se encontró la hoja de factura');

  const fechaVcto = calcularFechaVcto(data.fecha, data.condicionPago);

  // Fecha de creación (D10=día, F10=mes, H10=año)
  setCellValue(ws, 'D10', data.fecha.getDate());
  setCellValue(ws, 'F10', data.fecha.getMonth() + 1);
  setCellValue(ws, 'H10', data.fecha.getFullYear() % 100);

  // Fecha vencimiento (D11=día, F11=mes, H11=año)
  setCellValue(ws, 'D11', fechaVcto.getDate());
  setCellValue(ws, 'F11', fechaVcto.getMonth() + 1);
  setCellValue(ws, 'H11', fechaVcto.getFullYear() % 100);

  // Centro de costo y división
  setCellValue(ws, 'L10', data.centroCosto);
  setCellValue(ws, 'L13', data.division);

  // Datos del cliente
  setCellValue(ws, 'D18', data.empresa);
  setCellValue(ws, 'D20', data.rutNumero);
  setCellValue(ws, 'H20', data.rutDv);
  setCellValue(ws, 'D22', data.direccion);
  setCellValue(ws, 'D24', data.comuna);
  setCellValue(ws, 'K24', data.ciudad);
  setCellValue(ws, 'D26', data.giro);

  // Contacto
  setCellValue(ws, 'D28', data.atencionSr);
  setCellValue(ws, 'D29', data.jefeProy);

  // Detalles. Normalizamos saltos (\r\n → \n) por si el textarea entrega CRLF.
  const detalleNormalizado = (data.detalle || '').replace(/\r\n/g, '\n');
  setCellValue(ws, 'D31', detalleNormalizado);
  if (detalleNormalizado.includes('\n')) {
    // D31 sólo ocupa la columna D (muy angosta). Con wrapText activo Excel rompe
    // por palabra dentro de ese ancho mínimo, así que hacemos merge D31:L31 para
    // que el texto tenga el ancho visual completo de la glosa y los \n se
    // respeten como saltos manuales.
    const yaMergeada = (ws.model.merges || []).some(m => m === 'D31:L31');
    if (!yaMergeada) {
      try {
        ws.mergeCells('D31:L31');
      } catch {
        // Si la celda ya está merged de otra forma, ignoramos.
      }
    }
    const cell = ws.getCell('D31');
    cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'top' };
    // Ajustar la altura proporcional al número de líneas
    const lineas = detalleNormalizado.split('\n').length;
    const row = ws.getRow(31);
    const alturaPorLinea = 15;
    row.height = lineas * alturaPorLinea;
  }

  // Formatear OC con prefijo si no lo tiene
  const ocFormateada = data.ordenCompra
    ? (data.ordenCompra.toUpperCase().startsWith('OC') ? data.ordenCompra : `OC ${data.ordenCompra}`)
    : '';

  // Formatear HES/LCL con prefijo si no lo tiene (LCL para Enel, HES para otros)
  const esEnel = data.empresa.toLowerCase().includes('enel');
  let hesFormateada = '';
  if (data.hes) {
    const numero = data.hes.replace(/^(HES|LCL)\s*/i, '').trim();
    if (esEnel) {
      hesFormateada = data.hes.toUpperCase().startsWith('LCL') ? data.hes : `LCL ${numero}`;
    } else {
      hesFormateada = data.hes.toUpperCase().startsWith('HES') ? data.hes : `HES ${numero}`;
    }
  }

  const contactoFormateado = data.contacto ? `CONTACTO ${data.contacto}` : '';

  if (tipoPlantilla === 'antigua') {
    // Plantilla antigua: OC/HES/Contacto en filas distintas
    setCellValue(ws, 'D32', '');           // Limpiar sub-detalle de ejemplo
    setCellValue(ws, 'K32', null);         // No usar K32 para mantener la glosa limpia
    setCellValue(ws, 'D45', data.monto);   // Monto directo en la celda total (reemplaza fórmula SUM)
    setCellValue(ws, 'D39', ocFormateada);
    setCellValue(ws, 'D40', hesFormateada);
    setCellValue(ws, 'D41', '');           // FECHA CONFORMIDAD - limpiar ejemplo
    setCellValue(ws, 'D42', contactoFormateado);
  } else {
    // Plantilla nueva
    setCellValue(ws, 'D35', ocFormateada);
    setCellValue(ws, 'D36', hesFormateada);
    setCellValue(ws, 'D37', contactoFormateado);
    setCellValue(ws, 'D42', data.monto);
  }

  // Empresa OCA emisora (D15)
  if (data.empresaOCA) {
    setCellValue(ws, 'D15', data.empresaOCA.nombre);
  } else {
    // Por defecto: Servicios Técnicos
    setCellValue(ws, 'D15', 'OCA GLOBAL SERVICIOS TECNICOS CHILE, S.A.');
  }

  // Fecha de emisión del documento
  setCellValue(ws, 'L3', new Date());

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

// Configuración prellenada para la plantilla
export interface PlantillaConfig {
  empresa: string;
  rutNumero: string;
  rutDv: string;
  jefeProy: string;
  condicionPago: 30 | 60 | 90;
  // Nuevos campos prellenados
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  giro?: string;
  // Empresa OCA emisora
  empresaOCA?: {
    id: 'ensayos' | 'servicios_tecnicos';
    nombre: string;
    rut: string;
    dv: string;
    direccion: string;
  };
  // Tipo de plantilla seleccionado al configurar la descarga
  tipoPlantilla?: TipoPlantilla;
}

// Resultado del parseo de Excel con configuración
export interface ResultadoParseoExcel {
  facturas: FacturaData[];
  configuracion: PlantillaConfig | null;
}

// Schema de validación para una fila parseada del Excel.
// Se aplica DESPUÉS del parseo para garantizar tipos correctos antes de
// devolver los datos al consumidor (UI, generador de Excel).
const FacturaDataSchema = z.object({
  fecha: z.date(),
  centroCosto: z.string(),
  division: z.string(),
  empresa: z.string().min(1, 'falta el nombre de la empresa'),
  rutNumero: z.string().min(1, 'falta el RUT'),
  rutDv: z.string().min(1, 'falta el dígito verificador'),
  direccion: z.string(),
  comuna: z.string(),
  ciudad: z.string(),
  giro: z.string(),
  atencionSr: z.string(),
  jefeProy: z.string().min(1, 'falta el jefe de proyecto'),
  detalle: z.string(),
  ordenCompra: z.string(),
  hes: z.string(),
  contacto: z.string(),
  monto: z.number().positive('el monto debe ser mayor a 0'),
  condicionPago: z.number().refine(v => [30, 60, 90].includes(v), {
    message: 'condición de pago debe ser 30, 60 o 90'
  }),
  empresaOCA: z.object({
    id: z.enum(['ensayos', 'servicios_tecnicos']),
    nombre: z.string(),
    rut: z.string(),
    dv: z.string(),
    direccion: z.string()
  }).optional(),
  tipoPlantilla: z.enum(['nueva', 'antigua']).optional()
});

// Genera la plantilla de datos para que el usuario la llene
export async function generarPlantillaDatos(config?: PlantillaConfig): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OCA Global';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Datos Facturas');

  // Fecha de hoy formateada
  const hoy = new Date();
  const fechaHoy = `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`;
  const mesActual = hoy.toLocaleString('es-CL', { month: 'long', year: 'numeric' });

  if (config) {
    // === PLANTILLA SIMPLIFICADA (con datos prellenados) ===
    // Solo los campos que el usuario necesita llenar - sin títulos
    const esEnel = config.empresa.toLowerCase().includes('enel');

    // Headers simplificados - solo campos a llenar
    // Para Enel: Conformidad + LCL (equivalente a OC + HES)
    // Para otros: Orden Compra + HES
    const headersSimple = esEnel
      ? [
          'Fecha',
          'Centro Costo',
          'Detalle (OT)',
          'Conformidad',
          'LCL',
          'Atención Sr.',
          'Monto ($)'
        ]
      : [
          'Fecha',
          'Centro Costo',
          'Detalle (OT)',
          'Orden Compra',
          'HES',
          'Atención Sr.',
          'Monto ($)'
        ];

    const headerRow = ws.addRow(headersSimple);
    headerRow.height = 25;

    // Aplicar estilos solo a las celdas con datos (columnas 1 a headersSimple.length)
    for (let col = 1; col <= headersSimple.length; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF111111' } },
        bottom: { style: 'thin', color: { argb: 'FF111111' } },
        left: { style: 'thin', color: { argb: 'FF111111' } },
        right: { style: 'thin', color: { argb: 'FF111111' } }
      };
    }

    // Anchos de columnas simplificados (7 columnas para todos)
    // Enel: Conformidad + LCL | Otros: OC + HES
    ws.columns = [
      { width: 12 },  // Fecha
      { width: 12 },  // Centro Costo
      { width: 40 },  // Detalle
      { width: 16 },  // Conformidad / OC
      { width: 16 },  // LCL / HES
      { width: 20 },  // Atención Sr
      { width: 14 },  // Monto
    ];

    // Primera fila con ejemplo
    const ejemploOT = OT_PRINCIPAL.padStart(OT_PADDING, '0');
    const ejemploDetalle = generarDetalleEjemplo(OT_PRINCIPAL, mesActual);
    const exampleRow = esEnel
      ? ws.addRow([
          fechaHoy,
          ejemploOT,
          ejemploDetalle,
          '5600012345',       // Conformidad
          'LCL 1003449089',   // LCL
          'Luis Soto',
          5856250
        ])
      : ws.addRow([
          fechaHoy,
          ejemploOT,
          ejemploDetalle,
          'OC 42189111',
          'HES 1003449089',
          'Luis Soto',
          5856250
        ]);
    exampleRow.font = { color: { argb: 'FF888888' }, italic: true };
    exampleRow.alignment = { vertical: 'middle' };
    exampleRow.height = 20;

    // Filas vacías para llenar (7 columnas para todos)
    for (let i = 0; i < 19; i++) {
      const emptyValues = [fechaHoy, '', '', '', '', '', ''];
      const emptyRow = ws.addRow(emptyValues);
      emptyRow.height = 20;
    }

    // === HOJA DE CONFIGURACIÓN (para guardar datos prellenados) ===
    const configSheet = workbook.addWorksheet('Config');
    configSheet.getCell('A1').value = 'empresa';
    configSheet.getCell('B1').value = config.empresa;
    configSheet.getCell('A2').value = 'rutNumero';
    configSheet.getCell('B2').value = config.rutNumero;
    configSheet.getCell('A3').value = 'rutDv';
    configSheet.getCell('B3').value = config.rutDv;
    configSheet.getCell('A4').value = 'jefeProy';
    configSheet.getCell('B4').value = config.jefeProy;
    configSheet.getCell('A5').value = 'condicionPago';
    configSheet.getCell('B5').value = config.condicionPago;
    configSheet.getCell('A6').value = 'division';
    configSheet.getCell('B6').value = 'Control de Calidad y Asistencia Técnica';
    configSheet.getCell('A7').value = 'giro';
    configSheet.getCell('B7').value = config.giro || '';
    configSheet.getCell('A8').value = 'direccion';
    configSheet.getCell('B8').value = config.direccion || '';
    configSheet.getCell('A9').value = 'comuna';
    configSheet.getCell('B9').value = config.comuna || '';
    configSheet.getCell('A10').value = 'ciudad';
    configSheet.getCell('B10').value = config.ciudad || '';
    // Datos de empresa OCA emisora
    configSheet.getCell('A11').value = 'empresaOCA_id';
    configSheet.getCell('B11').value = config.empresaOCA?.id || 'servicios_tecnicos';
    configSheet.getCell('A12').value = 'empresaOCA_nombre';
    configSheet.getCell('B12').value = config.empresaOCA?.nombre || 'OCA GLOBAL SERVICIOS TECNICOS CHILE, S.A.';
    configSheet.getCell('A13').value = 'empresaOCA_rut';
    configSheet.getCell('B13').value = config.empresaOCA?.rut || '77851467';
    configSheet.getCell('A14').value = 'empresaOCA_dv';
    configSheet.getCell('B14').value = config.empresaOCA?.dv || '2';
    configSheet.getCell('A15').value = 'empresaOCA_direccion';
    configSheet.getCell('B15').value = config.empresaOCA?.direccion || 'PEDRO DE VALDIVIA 291 90 PROVIDENCIA, Chile';
    configSheet.getCell('A16').value = 'tipoPlantilla';
    configSheet.getCell('B16').value = config.tipoPlantilla || 'nueva';
    configSheet.state = 'hidden'; // Ocultar hoja de config

  } else {
    // === PLANTILLA COMPLETA (sin prellenar) - sin títulos ===

    // Headers completos
    const headers = [
      'Fecha', 'Centro Costo', 'División', 'Empresa', 'RUT (sin DV)', 'DV',
      'Dirección', 'Comuna', 'Ciudad', 'Giro', 'Atención Sr.', 'Jefe Proyecto',
      'Detalle (OT)', 'Orden Compra', 'HES', 'Contacto', 'Monto ($)', 'Días Pago'
    ];

    const headerRow = ws.addRow(headers);
    headerRow.height = 25;

    // Aplicar estilos solo a las celdas con datos (columnas 1 a headers.length)
    for (let col = 1; col <= headers.length; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF111111' } },
        bottom: { style: 'thin', color: { argb: 'FF111111' } },
        left: { style: 'thin', color: { argb: 'FF111111' } },
        right: { style: 'thin', color: { argb: 'FF111111' } }
      };
    }

    ws.columns = [
      { width: 12 }, { width: 12 }, { width: 35 }, { width: 40 }, { width: 11 }, { width: 4 },
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 30 }, { width: 18 }, { width: 20 },
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 12 }, { width: 10 }
    ];

    // Fila de ejemplo
    const exampleRow = ws.addRow([
      fechaHoy, OT_PRINCIPAL.padStart(OT_PADDING, '0'), 'Control de Calidad y Asistencia Técnica',
      'Compañía General de Electricidad S.A', '76411321', '7',
      'Av. Presidente Riesco 5435, Piso 15', 'Las Condes', 'Santiago',
      'Distribución de Energía Eléctrica', 'Luis Soto', 'Roberto Jamett',
      generarDetalleEjemplo(OT_PRINCIPAL, mesActual), 'OC 42189111', 'HES 1003449089',
      'Pablo González', 5856250, 30
    ]);
    exampleRow.font = { color: { argb: 'FF888888' }, italic: true };
    exampleRow.alignment = { vertical: 'middle' };
    exampleRow.height = 20;

    // Filas vacías
    for (let i = 0; i < 19; i++) {
      const emptyRow = ws.addRow([]);
      emptyRow.height = 20;
    }
  }

  // === HOJA DE INSTRUCCIONES ===
  const instrucciones = workbook.addWorksheet('Instrucciones');
  instrucciones.mergeCells('A1:B1');
  instrucciones.getCell('A1').value = 'INSTRUCCIONES DE USO';
  instrucciones.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF111111' } };
  instrucciones.getRow(1).height = 30;
  instrucciones.addRow([]);

  if (config) {
    // Mostrar empresa OCA emisora primero
    instrucciones.addRow(['EMPRESA OCA EMISORA:', '']);
    instrucciones.getRow(3).font = { bold: true, color: { argb: 'FF111111' } };
    const nombreOCA = config.empresaOCA?.nombre || 'OCA GLOBAL SERVICIOS TECNICOS CHILE, S.A.';
    const rutOCA = config.empresaOCA ? `${config.empresaOCA.rut}-${config.empresaOCA.dv}` : '77851467-2';
    const direccionOCA = config.empresaOCA?.direccion || 'PEDRO DE VALDIVIA 291 90 PROVIDENCIA, Chile';
    instrucciones.addRow(['Nombre:', nombreOCA]);
    instrucciones.addRow(['NIF:', `RUT ${rutOCA}`]);
    instrucciones.addRow(['Domicilio:', direccionOCA]);
    instrucciones.addRow([]);

    instrucciones.addRow(['DATOS YA CONFIGURADOS (no necesita ingresarlos):', '']);
    const rowDatosConfig = instrucciones.lastRow?.number || 8;
    instrucciones.getRow(rowDatosConfig).font = { bold: true, color: { argb: 'FF28A745' } };
    instrucciones.addRow(['✓ Empresa:', config.empresa]);
    instrucciones.addRow(['✓ RUT:', `${config.rutNumero}-${config.rutDv}`]);
    instrucciones.addRow(['✓ Jefe de Proyecto:', config.jefeProy]);
    instrucciones.addRow(['✓ Condición de Pago:', `${config.condicionPago} días`]);
    instrucciones.addRow(['✓ División:', 'Control de Calidad y Asistencia Técnica']);
    if (config.direccion) instrucciones.addRow(['✓ Dirección:', config.direccion]);
    if (config.comuna) instrucciones.addRow(['✓ Comuna:', config.comuna]);
    if (config.ciudad) instrucciones.addRow(['✓ Ciudad:', config.ciudad]);
    if (config.giro) instrucciones.addRow(['✓ Giro:', config.giro]);
    instrucciones.addRow([]);
  }

  const esEnelConfig = config?.empresa.toLowerCase().includes('enel') ?? false;
  // Para Enel: Conformidad + LCL (equivalente a OC + HES)
  // Para otros: OC + HES
  const pasos = config ? (esEnelConfig ? [
    ['SOLO DEBE COMPLETAR:', ''],
    ['•', 'Centro de Costo'],
    ['•', 'Detalle (OT) - Ejemplo: OT 00007 (OCA) SSTT, Enero 2026'],
    ['•', 'Conformidad'],
    ['•', 'LCL'],
    ['•', 'Atención Sr. (contacto del cliente)'],
    ['•', 'Monto (solo números, sin puntos)'],
    ['', ''],
    ['PASOS:', ''],
    ['1.', 'Complete los campos en cada fila'],
    ['2.', 'Agregue más filas si necesita más facturas'],
    ['3.', 'Guarde y suba el archivo a la aplicación'],
  ] : [
    ['SOLO DEBE COMPLETAR:', ''],
    ['•', 'Centro de Costo'],
    ['•', 'Detalle (OT) - Ejemplo: OT 00007 (OCA) SSTT, Enero 2026'],
    ['•', 'Orden de Compra (OC)'],
    ['•', 'HES'],
    ['•', 'Atención Sr. (contacto del cliente)'],
    ['•', 'Monto (solo números, sin puntos)'],
    ['', ''],
    ['PASOS:', ''],
    ['1.', 'Complete los campos en cada fila'],
    ['2.', 'Agregue más filas si necesita más facturas'],
    ['3.', 'Guarde y suba el archivo a la aplicación'],
  ]) : [
    ['PASOS A SEGUIR:', ''],
    ['1.', 'La fila 5 tiene un ejemplo - puede editarla o eliminarla'],
    ['2.', 'Agregue una fila por cada factura'],
    ['3.', 'El RUT debe ir SIN puntos, DV en columna separada'],
    ['4.', 'El monto debe ser solo números'],
    ['5.', 'Guarde y suba el archivo'],
    ['', ''],
    ['CAMPOS OBLIGATORIOS:', ''],
    ['•', 'Empresa, RUT, Monto, LCL/HES u OC'],
  ];

  pasos.forEach((paso) => {
    const row = instrucciones.addRow(paso);
    if (paso[0] === 'SOLO DEBE COMPLETAR:' || paso[0] === 'PASOS:' || paso[0] === 'PASOS A SEGUIR:' || paso[0] === 'CAMPOS OBLIGATORIOS:') {
      row.font = { bold: true, color: { argb: 'FF111111' } };
    }
  });

  instrucciones.getColumn(1).width = 8;
  instrucciones.getColumn(2).width = 60;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

// Parsea el archivo de datos subido por el usuario
export async function parsearDatosExcel(buffer: ArrayBuffer): Promise<ResultadoParseoExcel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Datos Facturas');
  if (!ws) throw new Error('No se encontró la hoja "Datos Facturas"');

  const facturas: FacturaData[] = [];
  const errores: string[] = [];

  // Verificar si hay datos de configuración prellenados
  const configSheet = workbook.getWorksheet('Config');
  let configData: PlantillaConfig | null = null;
  let division = '';
  let giro = '';

  // Variables adicionales para datos prellenados
  let direccion = '';
  let comuna = '';
  let ciudad = '';

  if (configSheet) {
    // Leer datos de configuración
    const getConfigValue = (row: number): string => {
      try {
        return configSheet.getCell(`B${row}`).value?.toString() || '';
      } catch {
        return '';
      }
    };

    // Leer datos de empresa OCA emisora
    const empresaOCAId = getConfigValue(11) as 'ensayos' | 'servicios_tecnicos' || 'servicios_tecnicos';
    const empresaOCANombre = getConfigValue(12) || 'OCA GLOBAL SERVICIOS TECNICOS CHILE, S.A.';
    const empresaOCARut = getConfigValue(13) || '77851467';
    const empresaOCADv = getConfigValue(14) || '2';
    const empresaOCADireccion = getConfigValue(15) || 'PEDRO DE VALDIVIA 291 90 PROVIDENCIA, Chile';

    const tipoPlantillaRaw = getConfigValue(16);
    const tipoPlantillaCfg: TipoPlantilla = tipoPlantillaRaw === 'antigua' ? 'antigua' : 'nueva';

    configData = {
      empresa: getConfigValue(1),
      rutNumero: getConfigValue(2),
      rutDv: getConfigValue(3),
      jefeProy: getConfigValue(4),
      condicionPago: (parseInt(getConfigValue(5)) || 30) as 30 | 60 | 90,
      empresaOCA: {
        id: empresaOCAId,
        nombre: empresaOCANombre,
        rut: empresaOCARut,
        dv: empresaOCADv,
        direccion: empresaOCADireccion
      },
      tipoPlantilla: tipoPlantillaCfg
    };
    division = getConfigValue(6) || 'Control de Calidad y Asistencia Técnica';
    giro = getConfigValue(7);
    direccion = getConfigValue(8);
    comuna = getConfigValue(9);
    ciudad = getConfigValue(10);
  }

  // Determinar si es plantilla simplificada (con config) o completa
  const esPlantillaSimplificada = configData !== null;

  // Función segura para obtener valor de celda
  const getCellValue = (row: ExcelJS.Row, col: number): unknown => {
    try {
      const cell = row.getCell(col);
      return cell?.value;
    } catch {
      return undefined;
    }
  };

  ws.eachRow((row, rowNumber) => {
    // Saltar la primera fila (headers)
    if (rowNumber === 1) return;

    try {
      const fechaVal = getCellValue(row, 1);
      const fechaStr = fechaVal?.toString() || '';

      // Parsear fecha
      let fecha: Date;
      if (fechaStr.includes('/')) {
        const [dia, mes, anio] = fechaStr.split('/').map(Number);
        fecha = new Date(anio < 100 ? 2000 + anio : anio, mes - 1, dia);
      } else if (fechaVal instanceof Date) {
        fecha = fechaVal;
      } else {
        fecha = new Date();
      }

      const getValue = (col: number): string => {
        const val = getCellValue(row, col);
        return val?.toString().trim() || '';
      };

      const getNumber = (col: number): number => {
        const val = getCellValue(row, col);
        if (typeof val === 'number') return val;
        return parseInt(val?.toString().replace(/[^\d]/g, '') || '0', 10);
      };

      if (esPlantillaSimplificada && configData) {
        // Determinar si es Enel para saber los nombres de campos
        const esEnel = configData.empresa.toLowerCase().includes('enel');

        // Plantilla simplificada (7 columnas para todos):
        // Fecha(1), CentroCosto(2), Detalle(3), Conformidad/OC(4), LCL/HES(5), AtencionSr(6), Monto(7)
        // Para Enel: col 4 = Conformidad, col 5 = LCL
        // Para otros: col 4 = OC, col 5 = HES

        let ordenCompra = '';
        let hes = '';
        const atencionSr = getValue(6);
        const monto = getNumber(7);

        if (esEnel) {
          // Para Enel: columna 4 es Conformidad (se guarda en ordenCompra), columna 5 es LCL (se guarda en hes)
          ordenCompra = getValue(4); // Conformidad
          hes = getValue(5);         // LCL
        } else {
          // Para otros: columna 4 es OC, columna 5 es HES
          ordenCompra = getValue(4);
          hes = getValue(5);
        }

        // Solo procesar filas con monto
        if (monto > 0) {
          // Nota: detección de OC/HES duplicados se hace en la UI (validations.ts)
          // para que el usuario pueda decidir caso por caso si es intencional.
          facturas.push({
            fecha,
            centroCosto: getValue(2),
            division: division,
            empresa: configData.empresa,
            rutNumero: configData.rutNumero,
            rutDv: configData.rutDv,
            direccion: direccion, // Usar dato prellenado
            comuna: comuna,       // Usar dato prellenado
            ciudad: ciudad,       // Usar dato prellenado
            giro: giro,          // Usar dato prellenado
            atencionSr: atencionSr,
            jefeProy: configData.jefeProy,
            detalle: getValue(3),
            ordenCompra,
            hes,
            contacto: '',
            monto,
            condicionPago: configData.condicionPago,
            empresaOCA: configData.empresaOCA, // Empresa OCA emisora
            tipoPlantilla: configData.tipoPlantilla || 'nueva'
          });
        }
      } else {
        // Plantilla completa: todas las columnas
        // Solo procesar filas con datos
        if (getValue(4)) { // Si tiene empresa
          const ordenCompra = getValue(14);
          const hes = getValue(15);

          // Nota: detección de OC/HES duplicados se hace en la UI (validations.ts).

          // Validar campos requeridos
          if (!getValue(4)) {
            errores.push(`Fila ${rowNumber}: Falta el nombre de la empresa`);
          }
          if (!getValue(5)) {
            errores.push(`Fila ${rowNumber}: Falta el RUT`);
          }
          if (!getNumber(17)) {
            errores.push(`Fila ${rowNumber}: Falta el monto`);
          }

          // Obtener condición de pago (default 30)
          const condicionPagoRaw = getNumber(18);
          const condicionPago = [30, 60, 90].includes(condicionPagoRaw) ? condicionPagoRaw : 30;

          facturas.push({
            fecha,
            centroCosto: getValue(2),
            division: getValue(3),
            empresa: getValue(4),
            rutNumero: getValue(5),
            rutDv: getValue(6),
            direccion: getValue(7),
            comuna: getValue(8),
            ciudad: getValue(9),
            giro: getValue(10),
            atencionSr: getValue(11),
            jefeProy: getValue(12),
            detalle: getValue(13),
            ordenCompra,
            hes,
            contacto: getValue(16),
            monto: getNumber(17),
            condicionPago
          });
        }
      }
    } catch (err) {
      errores.push(`Fila ${rowNumber}: Error al procesar - ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  });

  // Validación estructural con Zod sobre las facturas ya construidas.
  // Atrapa tipos inválidos o campos requeridos vacíos que el parseo permisivo
  // pudo dejar pasar (p.ej. monto = 0 en plantilla completa).
  facturas.forEach((factura, idx) => {
    const result = FacturaDataSchema.safeParse(factura);
    if (!result.success) {
      const detalles = result.error.issues
        .map(i => `${i.path.join('.') || 'campo'}: ${i.message}`)
        .join('; ');
      errores.push(`Factura ${idx + 1}: ${detalles}`);
    }
  });

  // Si hay errores, lanzar excepción con todos los errores
  if (errores.length > 0) {
    throw new Error(errores.join('\n'));
  }

  return {
    facturas,
    configuracion: configData
  };
}

// Genera un resumen Excel del batch para incluir en el ZIP.
// Una sola hoja con: encabezado del batch, tabla agrupada por OT con subtotales
// y total general al final.
export async function generarResumenBatch(facturas: FacturaData[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OCA Global';
  wb.created = new Date();

  const ws = wb.addWorksheet('Resumen');

  // Columnas: OT, Detalle (glosa), Empresa, OC/Conformidad, HES/LCL, Monto
  ws.columns = [
    { width: 10 },  // OT
    { width: 38 },  // Detalle (glosa)
    { width: 38 },  // Empresa
    { width: 20 },  // OC / Conformidad
    { width: 20 },  // HES / LCL
    { width: 18 },  // Monto
  ];

  // === Encabezado del batch ===
  const fechaGen = new Date();
  const totalMonto = facturas.reduce((sum, f) => sum + f.monto, 0);

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Resumen de solicitudes de facturación';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value =
    `Generado: ${fechaGen.toLocaleString('es-CL')} · ${facturas.length} solicitud(es) · Total $${totalMonto.toLocaleString('es-CL')}`;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF555555' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  // Empresa OCA emisora (si todas comparten una)
  const ocas = new Set(facturas.map(f => f.empresaOCA?.nombre).filter(Boolean));
  if (ocas.size === 1) {
    ws.mergeCells('A3:F3');
    ws.getCell('A3').value = `Emisor: ${[...ocas][0]}`;
    ws.getCell('A3').font = { italic: true, color: { argb: 'FF555555' } };
    ws.getCell('A3').alignment = { horizontal: 'center' };
  }

  ws.addRow([]);

  // === Headers de la tabla ===
  const headers = ['OT', 'Detalle (glosa)', 'Empresa', 'OC / Conformidad', 'HES / LCL', 'Monto ($)'];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  headerRow.height = 22;

  // === Agrupar por OT ===
  type Item = { factura: FacturaData };
  const grupos = new Map<string, Item[]>();
  facturas.forEach(factura => {
    const raw = (factura.centroCosto || '').replace(/\D/g, '');
    const key = raw ? (raw.replace(/^0+/, '') || '0') : 'sin_numero';
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push({ factura });
  });

  const gruposOrdenados = [...grupos.entries()].sort((a, b) => {
    const na = a[0] === 'sin_numero' ? Number.MAX_SAFE_INTEGER : parseInt(a[0], 10);
    const nb = b[0] === 'sin_numero' ? Number.MAX_SAFE_INTEGER : parseInt(b[0], 10);
    return na - nb;
  });

  // Referencias a las celdas de subtotal por grupo, para que el TOTAL sea =SUM(...) sobre ellas
  const subtotalRefs: string[] = [];

  gruposOrdenados.forEach(([otKey, items]) => {
    const subtotal = items.reduce((s, it) => s + it.factura.monto, 0);
    const otLabel = otKey === 'sin_numero' ? 'Sin OT' : `OT ${otKey}`;

    // Encabezado de grupo: OT (mergeada con Detalle/Empresa/OC), conteo en HES, subtotal en Monto.
    // El subtotal y el conteo se rellenan como fórmulas después de escribir las filas de detalle.
    const groupRow = ws.addRow([otLabel, '', '', '', '', '']);
    const groupRowNum = groupRow.number;
    ws.mergeCells(`A${groupRowNum}:D${groupRowNum}`);

    // Filas de detalle
    const firstDetailRow = groupRowNum + 1;
    items.forEach(({ factura: f }) => {
      const row = ws.addRow([
        f.centroCosto || '',
        f.detalle || '',
        f.empresa,
        f.ordenCompra || '',
        f.hes || '',
        f.monto
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { wrapText: true };
      row.getCell(6).numFmt = '$#,##0';
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
          left: { style: 'hair', color: { argb: 'FFDDDDDD' } },
          right: { style: 'hair', color: { argb: 'FFDDDDDD' } }
        };
        if (!cell.font) cell.font = { size: 10 };
        else cell.font = { ...cell.font, size: 10 };
      });
    });
    const lastDetailRow = firstDetailRow + items.length - 1;

    // Fórmulas: subtotal del grupo y conteo de solicitudes.
    // `result` permite que el archivo se vea bien antes de que Excel recalcule.
    groupRow.getCell(5).value = {
      formula: `COUNTA(A${firstDetailRow}:A${lastDetailRow})&" sol."`,
      result: `${items.length} sol.`
    };
    groupRow.getCell(6).value = {
      formula: `SUM(F${firstDetailRow}:F${lastDetailRow})`,
      result: subtotal
    };
    subtotalRefs.push(`F${groupRowNum}`);

    // Estilo del encabezado de grupo (aplicado después de setear las fórmulas)
    groupRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1F8' } };
      cell.font = { bold: true, color: { argb: 'FF294D6D' } };
    });
    groupRow.getCell(5).alignment = { horizontal: 'right' };
    groupRow.getCell(6).numFmt = '$#,##0';
    groupRow.getCell(6).alignment = { horizontal: 'right' };
  });

  // === Total general (fórmula sobre los subtotales) ===
  ws.addRow([]);
  const totalRow = ws.addRow(['', '', '', '', 'TOTAL', '']);
  totalRow.getCell(6).value = subtotalRefs.length > 0
    ? { formula: `SUM(${subtotalRefs.join(',')})`, result: totalMonto }
    : 0;
  totalRow.getCell(5).alignment = { horizontal: 'right' };
  totalRow.getCell(5).font = { bold: true, size: 11 };
  totalRow.getCell(6).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  totalRow.getCell(6).numFmt = '$#,##0';
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.height = 24;

  // Congelar encabezados de la tabla
  ws.views = [{ state: 'frozen', ySplit: 5 }];

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
