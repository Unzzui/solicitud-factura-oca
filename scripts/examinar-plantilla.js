const ExcelJS = require('exceljs');
const fs = require('fs');

async function examinar() {
  const buffer = fs.readFileSync('/home/unzzui/Proyectos/Data_OCA/data/Solicitud Facturación OCA Servicios Tecnicos HES 1003449089.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.getWorksheet('Factura');

  // Revisar todas las filas hasta la 50
  for (let rowNum = 1; rowNum <= 50; rowNum++) {
    const row = ws.getRow(rowNum);
    let rowData = [];
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const val = cell.value;
      if (val !== null && val !== undefined) {
        rowData.push(cell.address + ':' + String(val).substring(0, 25));
      }
    });
    if (rowData.length > 0) {
      console.log('Fila ' + rowNum + ': ' + rowData.join(' | '));
    }
  }
}

examinar();
