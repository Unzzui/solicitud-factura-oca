import ExcelJS from 'exceljs';

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

// Genera un archivo Excel de factura basado en la plantilla
export async function generarFactura(
  plantillaBuffer: ArrayBuffer,
  data: FacturaData
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(plantillaBuffer);

  const ws = workbook.getWorksheet('Factura');
  if (!ws) throw new Error('No se encontró la hoja "Factura"');

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

  // Detalles
  setCellValue(ws, 'D31', data.detalle);

  // Formatear OC con prefijo si no lo tiene
  const ocFormateada = data.ordenCompra
    ? (data.ordenCompra.toUpperCase().startsWith('OC') ? data.ordenCompra : `OC ${data.ordenCompra}`)
    : '';
  setCellValue(ws, 'D35', ocFormateada);

  // Formatear HES con prefijo si no lo tiene
  const hesFormateada = data.hes
    ? (data.hes.toUpperCase().startsWith('HES') ? data.hes : `HES ${data.hes}`)
    : '';
  setCellValue(ws, 'D36', hesFormateada);

  setCellValue(ws, 'D37', data.contacto ? `CONTACTO ${data.contacto}` : '');

  // Monto
  setCellValue(ws, 'D42', data.monto);

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
}

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

    // Headers simplificados - solo campos a llenar
    const headersSimple = [
      'Fecha',
      'Centro Costo',
      'Detalle (OT)',
      'Orden Compra',
      'HES',
      'Dirección',
      'Comuna',
      'Ciudad',
      'Atención Sr.',
      'Monto ($)'
    ];

    const headerRow = ws.addRow(headersSimple);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF294D6D' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF294D6D' } },
        bottom: { style: 'thin', color: { argb: 'FF294D6D' } },
        left: { style: 'thin', color: { argb: 'FF294D6D' } },
        right: { style: 'thin', color: { argb: 'FF294D6D' } }
      };
    });

    // Anchos de columnas simplificados
    ws.columns = [
      { width: 12 },  // Fecha
      { width: 12 },  // Centro Costo
      { width: 35 },  // Detalle
      { width: 14 },  // OC
      { width: 14 },  // HES
      { width: 30 },  // Dirección
      { width: 14 },  // Comuna
      { width: 14 },  // Ciudad
      { width: 18 },  // Atención Sr
      { width: 14 },  // Monto
    ];

    // Primera fila con ejemplo
    const exampleRow = ws.addRow([
      fechaHoy,
      '00007',
      `OT 00007 (OCA) SSTT, ${mesActual}`,
      'OC 42189111',
      'HES 1003449089',
      'Av. Presidente Riesco 5435',
      'Las Condes',
      'Santiago',
      'Luis Soto',
      5856250
    ]);
    exampleRow.font = { color: { argb: 'FF888888' }, italic: true };
    exampleRow.alignment = { vertical: 'middle' };
    exampleRow.height = 20;

    // Filas vacías para llenar
    for (let i = 0; i < 19; i++) {
      const emptyRow = ws.addRow([fechaHoy, '', '', '', '', '', '', '', '', '']);
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
    configSheet.getCell('B7').value = '';
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
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF294D6D' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF294D6D' } },
        bottom: { style: 'thin', color: { argb: 'FF294D6D' } },
        left: { style: 'thin', color: { argb: 'FF294D6D' } },
        right: { style: 'thin', color: { argb: 'FF294D6D' } }
      };
    });

    ws.columns = [
      { width: 12 }, { width: 12 }, { width: 35 }, { width: 40 }, { width: 11 }, { width: 4 },
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 30 }, { width: 18 }, { width: 20 },
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 12 }, { width: 10 }
    ];

    // Fila de ejemplo
    const exampleRow = ws.addRow([
      fechaHoy, '00007', 'Control de Calidad y Asistencia Técnica',
      'Compañía General de Electricidad S.A', '76411321', '7',
      'Av. Presidente Riesco 5435, Piso 15', 'Las Condes', 'Santiago',
      'Distribución de Energía Eléctrica', 'Luis Soto', 'Roberto Jamett',
      `OT 00007 (OCA) SSTT, ${mesActual}`, 'OC 42189111', 'HES 1003449089',
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
  instrucciones.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF294D6D' } };
  instrucciones.getRow(1).height = 30;
  instrucciones.addRow([]);

  if (config) {
    instrucciones.addRow(['DATOS YA CONFIGURADOS (no necesita ingresarlos):', '']);
    instrucciones.getRow(3).font = { bold: true, color: { argb: 'FF28A745' } };
    instrucciones.addRow(['✓ Empresa:', config.empresa]);
    instrucciones.addRow(['✓ RUT:', `${config.rutNumero}-${config.rutDv}`]);
    instrucciones.addRow(['✓ Jefe de Proyecto:', config.jefeProy]);
    instrucciones.addRow(['✓ Condición de Pago:', `${config.condicionPago} días`]);
    instrucciones.addRow(['✓ División:', 'Control de Calidad y Asistencia Técnica']);
    instrucciones.addRow([]);
  }

  const pasos = config ? [
    ['SOLO DEBE COMPLETAR:', ''],
    ['•', 'Centro de Costo'],
    ['•', 'Detalle (OT) - Ejemplo: OT 00007 (OCA) SSTT, Enero 2026'],
    ['•', 'Orden de Compra (OC)'],
    ['•', 'HES'],
    ['•', 'Dirección, Comuna, Ciudad'],
    ['•', 'Atención Sr. (contacto del cliente)'],
    ['•', 'Monto (solo números, sin puntos)'],
    ['', ''],
    ['PASOS:', ''],
    ['1.', 'Complete los campos en cada fila'],
    ['2.', 'Agregue más filas si necesita más facturas'],
    ['3.', 'Guarde y suba el archivo a la aplicación'],
  ] : [
    ['PASOS A SEGUIR:', ''],
    ['1.', 'La fila 5 tiene un ejemplo - puede editarla o eliminarla'],
    ['2.', 'Agregue una fila por cada factura'],
    ['3.', 'El RUT debe ir SIN puntos, DV en columna separada'],
    ['4.', 'El monto debe ser solo números'],
    ['5.', 'Guarde y suba el archivo'],
    ['', ''],
    ['CAMPOS OBLIGATORIOS:', ''],
    ['•', 'Empresa, RUT, Monto, HES u OC'],
  ];

  pasos.forEach((paso) => {
    const row = instrucciones.addRow(paso);
    if (paso[0] === 'SOLO DEBE COMPLETAR:' || paso[0] === 'PASOS:' || paso[0] === 'PASOS A SEGUIR:' || paso[0] === 'CAMPOS OBLIGATORIOS:') {
      row.font = { bold: true, color: { argb: 'FF294D6D' } };
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
export async function parsearDatosExcel(buffer: ArrayBuffer): Promise<FacturaData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Datos Facturas');
  if (!ws) throw new Error('No se encontró la hoja "Datos Facturas"');

  const facturas: FacturaData[] = [];
  const ordenesCompra = new Set<string>();
  const hesSet = new Set<string>();
  const errores: string[] = [];

  // Verificar si hay datos de configuración prellenados
  const configSheet = workbook.getWorksheet('Config');
  let configData: PlantillaConfig | null = null;
  let division = '';
  let giro = '';

  if (configSheet) {
    // Leer datos de configuración
    const getConfigValue = (row: number): string => {
      try {
        return configSheet.getCell(`B${row}`).value?.toString() || '';
      } catch {
        return '';
      }
    };

    configData = {
      empresa: getConfigValue(1),
      rutNumero: getConfigValue(2),
      rutDv: getConfigValue(3),
      jefeProy: getConfigValue(4),
      condicionPago: (parseInt(getConfigValue(5)) || 30) as 30 | 60 | 90
    };
    division = getConfigValue(6) || 'Control de Calidad y Asistencia Técnica';
    giro = getConfigValue(7);
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
        // Plantilla simplificada: columnas reducidas
        // Fecha(1), CentroCosto(2), Detalle(3), OC(4), HES(5), Direccion(6), Comuna(7), Ciudad(8), AtencionSr(9), Monto(10)
        const monto = getNumber(10);
        const ordenCompra = getValue(4);
        const hes = getValue(5);

        // Solo procesar filas con monto
        if (monto > 0) {
          // Validar duplicados
          if (ordenCompra && ordenesCompra.has(ordenCompra)) {
            errores.push(`Fila ${rowNumber}: OC "${ordenCompra}" duplicada`);
          } else if (ordenCompra) {
            ordenesCompra.add(ordenCompra);
          }

          if (hes && hesSet.has(hes)) {
            errores.push(`Fila ${rowNumber}: HES "${hes}" duplicado`);
          } else if (hes) {
            hesSet.add(hes);
          }

          facturas.push({
            fecha,
            centroCosto: getValue(2),
            division: division,
            empresa: configData.empresa,
            rutNumero: configData.rutNumero,
            rutDv: configData.rutDv,
            direccion: getValue(6),
            comuna: getValue(7),
            ciudad: getValue(8),
            giro: giro,
            atencionSr: getValue(9),
            jefeProy: configData.jefeProy,
            detalle: getValue(3),
            ordenCompra,
            hes,
            contacto: '',
            monto,
            condicionPago: configData.condicionPago
          });
        }
      } else {
        // Plantilla completa: todas las columnas
        // Solo procesar filas con datos
        if (getValue(4)) { // Si tiene empresa
          const ordenCompra = getValue(14);
          const hes = getValue(15);

          // Validar duplicados de OC
          if (ordenCompra) {
            if (ordenesCompra.has(ordenCompra)) {
              errores.push(`Fila ${rowNumber}: OC "${ordenCompra}" duplicada`);
            } else {
              ordenesCompra.add(ordenCompra);
            }
          }

          // Validar duplicados de HES
          if (hes) {
            if (hesSet.has(hes)) {
              errores.push(`Fila ${rowNumber}: HES "${hes}" duplicado`);
            } else {
              hesSet.add(hes);
            }
          }

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

  // Si hay errores, lanzar excepción con todos los errores
  if (errores.length > 0) {
    throw new Error(errores.join('\n'));
  }

  return facturas;
}
