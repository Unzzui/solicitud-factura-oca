// Base de datos de clientes
export interface Cliente {
  nombre: string;
  rut: string;
  dv: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  giro?: string;
  condicionPago: 30 | 60 | 90;
  aliases?: string[];
  // true cuando la empresa usa nomenclatura LCL/Conformidad en lugar de HES/OC (caso Enel)
  usaConformidad?: boolean;
}

export const DIVISIONES = [
  { nombre: 'Control de Calidad y Asistencia Técnica', codigo: 'DCAT' },
];

// OT considerada "principal" — sus OC/Conformidad NO se validan como duplicadas
// porque varias solicitudes legítimamente comparten la misma OC bajo esta OT.
export const OT_PRINCIPAL = '7';
// Cantidad de dígitos a la que se rellena el centro de costo en las plantillas (00007)
export const OT_PADDING = 5;

// Normaliza un centro de costo a su número (sin ceros a la izquierda)
export function normalizarOT(centroCosto: string): string {
  if (!centroCosto) return '';
  return centroCosto.trim().replace(/^0+/, '');
}

// Verifica si el centro de costo corresponde a una OT específica (default OT principal)
export function esOT(centroCosto: string, ot: string = OT_PRINCIPAL): boolean {
  if (!centroCosto) return false;
  return normalizarOT(centroCosto) === normalizarOT(ot);
}

// Genera el ejemplo de detalle: "OT 00007 (OCA) SSTT, <mes>"
export function generarDetalleEjemplo(
  centroCosto: string = OT_PRINCIPAL,
  mes: string
): string {
  const padded = centroCosto.padStart(OT_PADDING, '0');
  return `OT ${padded} (OCA) SSTT, ${mes}`;
}

export const CLIENTES: Cliente[] = [
  {
    nombre: 'Compañía General de Electricidad S.A',
    rut: '76411321',
    dv: '7',
    direccion: 'Av. Presidente Riesco 5435, Piso 15',
    comuna: 'Las Condes',
    ciudad: 'Santiago',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30,
    aliases: ['CGE']
  },
  {
    nombre: 'Enel Distribución Chile S.A',
    rut: '96800570',
    dv: '7',
    direccion: 'Santa Rosa 76, Piso 9',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30,
    aliases: ['ENEL'],
    usaConformidad: true
  },
  {
    nombre: 'Enel Colina S.A.',
    rut: '96783910',
    dv: '8',
    direccion: 'Santa Rosa 76, Piso 9',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30,
    aliases: ['ENEL'],
    usaConformidad: true
  },
  {
    nombre: 'Metrogas S.A.',
    rut: '96722460',
    dv: 'K',
    direccion: 'El Regidor 66',
    comuna: 'Las Condes',
    ciudad: 'Santiago',
    giro: 'Distribución de Gas Natural',
    condicionPago: 30
  },
  {
    nombre: 'Gasco GLP S.A.',
    rut: '96568740',
    dv: '8',
    direccion: 'Santo Domingo 1061',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Distribución de Gas Licuado',
    condicionPago: 30
  },
  {
    nombre: 'Gasco Magallanes',
    rut: '90310000',
    dv: '1',
    direccion: 'Av. Bulnes 01855',
    comuna: 'Punta Arenas',
    ciudad: 'Punta Arenas',
    giro: 'Distribución de Gas',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Antofagasta S.A.',
    rut: '76418976',
    dv: '0',
    direccion: 'Av. Argentina 600',
    comuna: 'Antofagasta',
    ciudad: 'Antofagasta',
    giro: 'Servicios Sanitarios',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Magallanes S.A.',
    rut: '76215628',
    dv: '8',
    direccion: 'Av. Bulnes 01309',
    comuna: 'Punta Arenas',
    ciudad: 'Punta Arenas',
    giro: 'Servicios Sanitarios',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Andinas S.A.',
    rut: '61808000',
    dv: '5',
    direccion: 'Av. Presidente Balmaceda 1398',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Servicios Sanitarios',
    condicionPago: 30
  },
  {
    nombre: 'Essbio S.A',
    rut: '76833300',
    dv: '9',
    direccion: 'Diagonal Pedro Aguirre Cerda 1129',
    comuna: 'Concepción',
    ciudad: 'Concepción',
    giro: 'Servicios Sanitarios',
    condicionPago: 30
  },
  {
    nombre: 'WOM S.A.',
    rut: '78921690',
    dv: '8',
    direccion: 'Av. Providencia 1760',
    comuna: 'Providencia',
    ciudad: 'Santiago',
    giro: 'Telecomunicaciones',
    condicionPago: 30
  },
  {
    nombre: 'Transformadores Tusan S.A.',
    rut: '86386700',
    dv: '2',
    direccion: 'Av. Gladys Marín 6030',
    comuna: 'Estación Central',
    ciudad: 'Santiago',
    giro: 'Fabricación de Transformadores',
    condicionPago: 30
  },
  {
    nombre: 'Empresa Eléctrica de Magallanes S.A.',
    rut: '88221200',
    dv: '9',
    direccion: 'Av. Bulnes 0631',
    comuna: 'Punta Arenas',
    ciudad: 'Punta Arenas',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30
  },
  {
    nombre: 'Logística y Bodegajes Schiappacasse Ltda.',
    rut: '77826220',
    dv: '7',
    direccion: 'Camino Lo Boza 2680',
    comuna: 'Pudahuel',
    ciudad: 'Santiago',
    giro: 'Logística y Almacenamiento',
    condicionPago: 30
  },
  {
    nombre: 'STLI SPA',
    rut: '77826220',
    dv: '7',
    direccion: 'Camino Lo Boza 2680',
    comuna: 'Pudahuel',
    ciudad: 'Santiago',
    giro: 'Servicios de Logística',
    condicionPago: 30
  },
  {
    nombre: 'Transportes Andina Refrescos Limitada',
    rut: '78861790',
    dv: '9',
    direccion: 'Panamericana Norte 5001',
    comuna: 'Conchalí',
    ciudad: 'Santiago',
    giro: 'Transporte de Carga',
    condicionPago: 30
  },
  {
    nombre: 'Comercial Kaufmann S.A',
    rut: '96572360',
    dv: '9',
    direccion: 'Av. Américo Vespucio 1292',
    comuna: 'Pudahuel',
    ciudad: 'Santiago',
    giro: 'Comercialización de Vehículos',
    condicionPago: 30
  },
  {
    nombre: 'OCA Valvenor',
    rut: '77548190',
    dv: '0',
    direccion: 'Los Industriales 981',
    comuna: 'San Joaquín',
    ciudad: 'Santiago',
    giro: 'Servicios de Inspección',
    condicionPago: 30
  }
];

// Lista de jefes de proyecto
export const JEFES_PROYECTO: string[] = [
  'Roberto Jamett',
  'Sergio Benitez Ortega',
  'Patricio Jara Gutierrez',
  'Carlos Alvarez',
  'Juan Carlos Rojas',
  'Manuel Bravo',
  'Felipe Tobar',
  'Francisco Pimentel',
  'Wilson Cáceres Bustamante',
  'Jonathan Turra',
  'Lila Vives',
  'Nadia Garrido',
  'Freddy Suarez',
  'Felipe Vielma',
  'Diego Bravo'
].sort();

// Condiciones de pago disponibles
export const CONDICIONES_PAGO = [30, 60, 90] as const;

// Empresas OCA emisoras de factura
export interface EmpresaOCA {
  id: 'ensayos' | 'servicios_tecnicos';
  nombre: string;
  nombreCorto: string;
  rut: string;
  dv: string;
  direccion: string;
}

// Busca un cliente por nombre exacto (case-insensitive) o por RUT
export function findClienteByEmpresa(empresa: string): Cliente | undefined {
  if (!empresa) return undefined;
  const normalized = empresa.trim().toLowerCase();
  return CLIENTES.find(
    c => c.nombre.toLowerCase() === normalized || c.rut === empresa.trim()
  );
}

// Devuelve la abreviación de la empresa para usarse en nombres de archivo.
// Prioriza el primer alias del cliente; cae a un substring saneado del nombre.
export function getEmpresaAbreviada(empresa: string): string {
  const cliente = findClienteByEmpresa(empresa);
  const alias = cliente?.aliases?.[0];
  if (alias) return alias;
  return (empresa || 'EMPRESA')
    .substring(0, 15)
    .replace(/[^a-zA-Z0-9]/g, '_');
}

// Indica si la empresa usa la nomenclatura LCL/Conformidad (Enel) en lugar de HES/OC
export function usaLclConformidad(empresa: string): boolean {
  const cliente = findClienteByEmpresa(empresa);
  if (cliente?.usaConformidad !== undefined) return cliente.usaConformidad;
  // Fallback para empresas que no estén en la lista pero contengan "enel"
  return (empresa || '').toLowerCase().includes('enel');
}

// Filtro compartido para los inputs de búsqueda de empresa en los modales
export function filtrarClientes(busqueda: string): Cliente[] {
  if (!busqueda) return CLIENTES;
  const q = busqueda.toLowerCase();
  return CLIENTES.filter(
    c =>
      c.nombre.toLowerCase().includes(q) ||
      c.rut.includes(q) ||
      (c.aliases?.some(a => a.toLowerCase().includes(q)) ?? false)
  );
}

export const EMPRESAS_OCA: EmpresaOCA[] = [
  {
    id: 'servicios_tecnicos',
    nombre: 'OCA GLOBAL SERVICIOS TECNICOS CHILE, S.A.',
    nombreCorto: 'Servicios Técnicos',
    rut: '77851467',
    dv: '2',
    direccion: 'PEDRO DE VALDIVIA 291 90 PROVIDENCIA, Chile'
  },
  {
    id: 'ensayos',
    nombre: 'OCA ENSAYOS, INSPECCIONES Y CERTIFICACIONES CHILE, S.A.',
    nombreCorto: 'OCA Ensayos',
    rut: '76390033',
    dv: '9',
    direccion: 'PEDRO DE VALDIVIA 291 90 PISO 9 PROVIDENCIA, Chile'
  }
];
