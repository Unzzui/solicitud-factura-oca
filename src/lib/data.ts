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
    condicionPago: 30
  },
  {
    nombre: 'Enel Distribución Chile S.A',
    rut: '96800570',
    dv: '7',
    direccion: 'Santa Rosa 76, Piso 9',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30
  },
  {
    nombre: 'Enel Colina S.A.',
    rut: '96783910',
    dv: '8',
    direccion: 'Santa Rosa 76, Piso 9',
    comuna: 'Santiago',
    ciudad: 'Santiago',
    giro: 'Distribución de Energía Eléctrica',
    condicionPago: 30
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
  'Tomas Koren'
].sort();

// Condiciones de pago disponibles
export const CONDICIONES_PAGO = [30, 60, 90] as const;
