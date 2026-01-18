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
    condicionPago: 30
  },
  {
    nombre: 'Enel Distribución Chile S.A',
    rut: '96800570',
    dv: '7',
    condicionPago: 30
  },
  {
    nombre: 'Enel Colina S.A.',
    rut: '96783910',
    dv: '8',
    condicionPago: 30
  },
  {
    nombre: 'Metrogas S.A.',
    rut: '96722460',
    dv: 'K',
    condicionPago: 30
  },
  {
    nombre: 'Gasco GLP S.A.',
    rut: '96568740',
    dv: '8',
    condicionPago: 30
  },
  {
    nombre: 'Gasco Magallanes',
    rut: '90310000',
    dv: '1',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Antofagasta S.A.',
    rut: '76418976',
    dv: '0',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Magallanes S.A.',
    rut: '76215628',
    dv: '8',
    condicionPago: 30
  },
  {
    nombre: 'Aguas Andinas S.A.',
    rut: '61808000',
    dv: '5',
    condicionPago: 30
  },
  {
    nombre: 'Essbio S.A',
    rut: '76833300',
    dv: '9',
    condicionPago: 30
  },
  {
    nombre: 'WOM S.A.',
    rut: '78921690',
    dv: '8',
    condicionPago: 30
  },
  {
    nombre: 'Transformadores Tusan S.A.',
    rut: '86386700',
    dv: '2',
    condicionPago: 30
  },
  {
    nombre: 'Empresa Eléctrica de Magallanes S.A.',
    rut: '88221200',
    dv: '9',
    condicionPago: 30
  },
  {
    nombre: 'Logística y Bodegajes Schiappacasse Ltda.',
    rut: '77826220',
    dv: '7',
    condicionPago: 30
  },
  {
    nombre: 'STLI SPA',
    rut: '77826220',
    dv: '7',
    condicionPago: 30
  },
  {
    nombre: 'Transportes Andina Refrescos Limitada',
    rut: '78861790',
    dv: '9',
    condicionPago: 30
  },
  {
    nombre: 'Comercial Kaufmann S.A',
    rut: '96572360',
    dv: '9',
    condicionPago: 30
  },
  {
    nombre: 'OCA Valvenor',
    rut: '77548190',
    dv: '0',
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
  'Juan Carlos Rojas Mena',
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
