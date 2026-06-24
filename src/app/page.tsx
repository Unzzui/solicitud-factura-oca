'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  generarFactura,
  generarPlantillaDatos,
  parsearDatosExcel,
  FacturaData,
  PlantillaConfig,
  TipoPlantilla
} from '@/lib/excelGenerator';
import { getEmpresaAbreviada, usaLclConformidad } from '@/lib/data';
import { detectarDuplicados, duplicadoKey } from '@/lib/validations';
import PlantillaConfigModal from '@/components/PlantillaConfigModal';
import FacturaManualForm from '@/components/FacturaManualForm';
import ValidacionDuplicadosModal from '@/components/ValidacionDuplicadosModal';

type ModoIngreso = 'excel' | 'manual';

const STORAGE_KEY_FACTURAS = 'oca:facturas-pendientes';
const STORAGE_KEY_CONFIG = 'oca:configuracion-excel';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [facturas, setFacturas] = useState<FacturaData[]>([]);
  const [plantillaNuevaBuffer, setPlantillaNuevaBuffer] = useState<ArrayBuffer | null>(null);
  const [plantillaAntiguaBuffer, setPlantillaAntiguaBuffer] = useState<ArrayBuffer | null>(null);
  const [progress, setProgress] = useState(0);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [modoIngreso, setModoIngreso] = useState<ModoIngreso>('excel');
  const [showFormularioManual, setShowFormularioManual] = useState(false);
  const [facturaEditandoIndex, setFacturaEditandoIndex] = useState<number | null>(null);
  const [configuracionExcel, setConfiguracionExcel] = useState<PlantillaConfig | null>(null);
  const [persistHidratado, setPersistHidratado] = useState(false);
  const [showValidacionModal, setShowValidacionModal] = useState(false);
  const [duplicadosAprobados, setDuplicadosAprobados] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/plantilla_factura.xlsx')
      .then(res => res.arrayBuffer())
      .then(buffer => setPlantillaNuevaBuffer(buffer))
      .catch(() => setError('Error cargando la plantilla base'));
    fetch('/plantilla_antigua_factura.xlsx')
      .then(res => res.arrayBuffer())
      .then(buffer => setPlantillaAntiguaBuffer(buffer))
      .catch(() => { /* opcional */ });
  }, []);

  // Hidratar facturas y configuración desde localStorage al montar
  useEffect(() => {
    try {
      const rawFacturas = localStorage.getItem(STORAGE_KEY_FACTURAS);
      if (rawFacturas) {
        const parsed = JSON.parse(rawFacturas) as FacturaData[];
        // Revivir Date en cada factura
        const restauradas = parsed.map(f => ({ ...f, fecha: new Date(f.fecha) }));
        setFacturas(restauradas);
      }
      const rawConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (rawConfig) {
        setConfiguracionExcel(JSON.parse(rawConfig) as PlantillaConfig);
      }
    } catch {
      // localStorage corrupto: ignorar silenciosamente y arrancar limpio
    } finally {
      setPersistHidratado(true);
    }
  }, []);

  // Persistir cambios después de la hidratación (evita pisar con [] en el primer render)
  useEffect(() => {
    if (!persistHidratado) return;
    try {
      if (facturas.length > 0) {
        localStorage.setItem(STORAGE_KEY_FACTURAS, JSON.stringify(facturas));
      } else {
        localStorage.removeItem(STORAGE_KEY_FACTURAS);
      }
    } catch { /* cuota llena u otro */ }
  }, [facturas, persistHidratado]);

  useEffect(() => {
    if (!persistHidratado) return;
    try {
      if (configuracionExcel) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configuracionExcel));
      } else {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
      }
    } catch { /* cuota llena u otro */ }
  }, [configuracionExcel, persistHidratado]);

  const descargarPlantilla = async (config?: PlantillaConfig) => {
    setStatus('Generando plantilla...');
    try {
      const blob = await generarPlantillaDatos(config);
      const nombreArchivo = config
        ? `plantilla_facturacion_${config.empresa.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
        : 'plantilla_datos_facturacion.xlsx';
      saveAs(blob, nombreArchivo);
      setStatus(config
        ? `Plantilla prellenada para ${config.empresa} descargada`
        : 'Plantilla descargada correctamente');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setError('Error generando plantilla');
    }
  };

  const handleDescargarConDatos = (config: PlantillaConfig) => {
    descargarPlantilla(config);
  };

  const handleDescargarVacia = () => {
    descargarPlantilla();
  };

  const handleAgregarFacturaManual = (factura: FacturaData) => {
    setFacturas(prev => [...prev, factura]);
    setStatus(`Factura agregada. Total: ${facturas.length + 1} facturas`);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleEliminarFactura = (index: number) => {
    setFacturas(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditarFactura = (index: number) => {
    setFacturaEditandoIndex(index);
    setModoIngreso('manual');
    setShowFormularioManual(true);
  };

  const handleActualizarFactura = (facturaActualizada: FacturaData) => {
    if (facturaEditandoIndex !== null) {
      setFacturas(prev => prev.map((f, i) => i === facturaEditandoIndex ? facturaActualizada : f));
      setFacturaEditandoIndex(null);
      setShowFormularioManual(false);
      setStatus('Factura actualizada correctamente');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleCerrarFormulario = () => {
    setShowFormularioManual(false);
    setFacturaEditandoIndex(null);
  };

  const procesarArchivo = async (file: File) => {
    setError('');
    setStatus('Leyendo archivo...');
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const resultado = await parsearDatosExcel(buffer);

      if (resultado.facturas.length === 0) {
        throw new Error('No se encontraron datos en el archivo');
      }

      setFacturas(resultado.facturas);
      setConfiguracionExcel(resultado.configuracion);

      // Mostrar mensaje con info de empresa OCA si está configurada
      const empresaOCAInfo = resultado.configuracion?.empresaOCA?.nombre
        ? ` (Emisor: ${resultado.configuracion.empresaOCA.id === 'ensayos' ? 'OCA Ensayos' : 'Servicios Técnicos'})`
        : '';
      setStatus(`Se encontraron ${resultado.facturas.length} facturas para generar${empresaOCAInfo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando archivo');
      setFacturas([]);
      setConfiguracionExcel(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Duplicados detectados y los que aún no fueron aprobados manualmente
  const duplicadosDetectados = useMemo(() => detectarDuplicados(facturas), [facturas]);
  const duplicadosPendientes = useMemo(
    () => duplicadosDetectados.filter(d => !duplicadosAprobados.has(duplicadoKey(d))),
    [duplicadosDetectados, duplicadosAprobados]
  );

  // Limpia aprobaciones cuyos grupos ya no existen (porque el usuario editó/eliminó)
  useEffect(() => {
    if (duplicadosAprobados.size === 0) return;
    const vigentes = new Set(duplicadosDetectados.map(d => duplicadoKey(d)));
    let necesitaPoda = false;
    duplicadosAprobados.forEach(k => { if (!vigentes.has(k)) necesitaPoda = true; });
    if (necesitaPoda) {
      const podadas = new Set<string>();
      duplicadosAprobados.forEach(k => { if (vigentes.has(k)) podadas.add(k); });
      setDuplicadosAprobados(podadas);
    }
  }, [duplicadosDetectados, duplicadosAprobados]);

  const handleAprobarDuplicado = (key: string) => {
    setDuplicadosAprobados(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleDesaprobarDuplicado = (key: string) => {
    setDuplicadosAprobados(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const generarTodasInterno = async () => {
    if (facturas.length === 0) return;
    if (!plantillaNuevaBuffer) {
      setError('Plantilla nueva no disponible');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      // Ordenar facturas por número de OT (centroCosto) ascendente para que el zip salga ordenado
      const facturasOrdenadas = [...facturas].sort((a, b) => {
        const numA = parseInt((a.centroCosto || '').replace(/\D/g, ''), 10);
        const numB = parseInt((b.centroCosto || '').replace(/\D/g, ''), 10);
        const safeA = Number.isFinite(numA) ? numA : Number.MAX_SAFE_INTEGER;
        const safeB = Number.isFinite(numB) ? numB : Number.MAX_SAFE_INTEGER;
        if (safeA !== safeB) return safeA - safeB;
        return (a.centroCosto || '').localeCompare(b.centroCosto || '');
      });

      for (let i = 0; i < facturasOrdenadas.length; i++) {
        const factura = facturasOrdenadas[i];
        setStatus(`Generando factura ${i + 1} de ${facturasOrdenadas.length}...`);
        setProgress(Math.round(((i + 1) / facturasOrdenadas.length) * 100));

        const tipo: TipoPlantilla = factura.tipoPlantilla || 'nueva';
        const bufferUsado = tipo === 'antigua' ? plantillaAntiguaBuffer : plantillaNuevaBuffer;
        if (!bufferUsado) {
          throw new Error(`Plantilla ${tipo} no disponible`);
        }

        const blob = await generarFactura(bufferUsado, factura, tipo);
        // Generar nombre con nomenclatura LCL/HES/OC
        let identificador = `F${i + 1}`;
        const usaLcl = usaLclConformidad(factura.empresa);
        if (factura.hes) {
          const numero = factura.hes.replace(/^(HES|LCL)\s*/i, '');
          identificador = usaLcl ? `LCL_${numero}` : `HES_${numero}`;
        } else if (factura.ordenCompra) {
          const ocNumero = factura.ordenCompra.replace(/^OC\s*/i, '');
          identificador = `OC_${ocNumero}`;
        }
        const empresaAbrev = getEmpresaAbreviada(factura.empresa);
        const nombreArchivo = `Solicitud_Factura_${empresaAbrev}_${identificador}.xlsx`;

        // Agrupar por carpeta según el número de OT (centroCosto)
        const otNumero = (factura.centroCosto || '').replace(/\D/g, '');
        const otCarpeta = otNumero ? `OT_${otNumero.replace(/^0+/, '') || '0'}` : 'OT_sin_numero';

        zip.file(`${otCarpeta}/${nombreArchivo}`, blob);
      }

      setStatus('Comprimiendo archivos...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const fecha = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `Solicitud_Factura_OCA_${fecha}.zip`);

      setStatus(`${facturas.length} facturas generadas exitosamente`);
      setFacturas([]);
      setConfiguracionExcel(null);
      setDuplicadosAprobados(new Set());
      setProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando facturas');
    } finally {
      setIsProcessing(false);
    }
  };

  // Botón "Generar" del usuario: si hay duplicados pendientes, abre el modal
  // en vez de generar directamente.
  const generarTodas = () => {
    if (duplicadosPendientes.length > 0) {
      setShowValidacionModal(true);
      return;
    }
    generarTodasInterno();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      procesarArchivo(file);
    } else {
      setError('Por favor sube un archivo Excel (.xlsx)');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const totalMonto = facturas.reduce((sum, f) => sum + f.monto, 0);

  // Agrupa facturas por OT (centro de costo) preservando el índice original.
  // Permite que los handlers de editar/eliminar sigan recibiendo el índice real.
  const facturasPorOT = useMemo(() => {
    type FacturaConIndice = { factura: FacturaData; index: number };
    const groups = new Map<string, FacturaConIndice[]>();
    facturas.forEach((factura, index) => {
      const raw = (factura.centroCosto || '').replace(/\D/g, '');
      const key = raw ? (raw.replace(/^0+/, '') || '0') : 'sin_numero';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ factura, index });
    });
    return new Map(
      [...groups.entries()].sort((a, b) => {
        const na = a[0] === 'sin_numero' ? Number.MAX_SAFE_INTEGER : parseInt(a[0], 10);
        const nb = b[0] === 'sin_numero' ? Number.MAX_SAFE_INTEGER : parseInt(b[0], 10);
        return na - nb;
      })
    );
  }, [facturas]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header con gradiente OCA */}
      <header className="header-gradient text-white shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <Image
              src="/logo_horizontal.svg"
              alt="OCA Global"
              width={160}
              height={45}
              className="w-[120px] sm:w-[160px] h-auto"
            />
            <div className="hidden md:block h-8 w-px bg-white/30" />
            <span className="hidden md:block text-white/80 text-sm font-medium">
              Control de Calidad y Servicios Técnicos
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl flex-grow w-full">
        {/* Title Section */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
            Generador de Solicitudes de Facturación
          </h1>
        </div>

        {/* Toggle de modo de ingreso */}
        <div className="flex justify-center mb-6 sm:mb-8 animate-fade-in">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex w-full sm:w-auto">
            <button
              onClick={() => setModoIngreso('excel')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
                modoIngreso === 'excel'
                  ? 'bg-white text-oca-blue shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden xs:inline">Cargar</span> Excel
            </button>
            <button
              onClick={() => setModoIngreso('manual')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${
                modoIngreso === 'manual'
                  ? 'bg-white text-oca-blue shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden xs:inline">Agregar</span> Manual
            </button>
          </div>
        </div>

        {/* Steps Container */}
        <div className="space-y-6">
          {/* Modo Excel */}
          {modoIngreso === 'excel' && (
            <>
              {/* Paso 1 */}
              <div className="card p-4 sm:p-6 animate-fade-in">
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="step-number step-number-active text-sm sm:text-lg w-8 h-8 sm:w-12 sm:h-12">1</div>
                  <div className="flex-grow min-w-0">
                    <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                      Descarga la plantilla de datos
                    </h2>
                    <p className="text-gray-500 mb-3 sm:mb-5 text-xs sm:text-sm leading-relaxed">
                      Descarga el archivo Excel y completa los datos de las solicitudes de facturas que necesitas generar.
                      <span className="hidden sm:inline"> Puedes agregar tantas filas como facturas necesites. La plantilla incluye instrucciones
                      y un ejemplo para guiarte.</span>
                    </p>
                    <button
                      onClick={() => setShowPlantillaModal(true)}
                      className="btn-primary inline-flex items-center gap-2 text-sm sm:text-base px-3 sm:px-6 py-2 sm:py-2.5 w-full sm:w-auto justify-center"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar Plantilla
                    </button>
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="step-number step-number-active text-sm sm:text-lg w-8 h-8 sm:w-12 sm:h-12">2</div>
                  <div className="flex-grow min-w-0">
                    <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                      Sube el archivo con los datos
                    </h2>
                    <p className="text-gray-500 mb-3 sm:mb-5 text-xs sm:text-sm">
                      Una vez completados los datos, sube el archivo aquí para generar las facturas.
                    </p>

                    {/* Drop zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        dropzone p-4 sm:p-8
                        ${isDragging ? 'dropzone-active' : 'dropzone-default'}
                        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 transition-colors ${isDragging ? 'bg-oca-blue text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">
                          <span className="hidden sm:inline">Arrastra el archivo aquí</span>
                          <span className="sm:hidden">Toca para seleccionar</span>
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">
                          o haz clic para seleccionar
                        </p>
                        <span className="mt-2 sm:mt-3 inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Solo archivos .xlsx
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Modo Manual */}
          {modoIngreso === 'manual' && (
            <div className="animate-fade-in">
              {!showFormularioManual ? (
                <div className="card p-5 sm:p-8 text-center">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-oca-blue-lighter rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-7 h-7 sm:w-10 sm:h-10 text-oca-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                    Ingreso Manual de Facturas
                  </h2>
                  <p className="text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                    Agrega facturas una por una con autocompletado de empresa, RUT y jefe de proyecto.
                  </p>
                  <button
                    onClick={() => setShowFormularioManual(true)}
                    className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar Nueva Solicitud de Factura
                  </button>

                  {facturas.length > 0 && (
                    <p className="mt-4 text-sm text-emerald-600 font-medium">
                      Ya tienes {facturas.length} factura(s) agregada(s)
                    </p>
                  )}
                </div>
              ) : (
                <FacturaManualForm
                  onAgregarFactura={handleAgregarFacturaManual}
                  onActualizarFactura={handleActualizarFactura}
                  onCerrar={handleCerrarFormulario}
                  facturaEditar={facturaEditandoIndex !== null ? facturas[facturaEditandoIndex] : null}
                />
              )}
            </div>
          )}

          {/* Paso 3 - Solo visible cuando hay facturas */}
          {facturas.length > 0 && (
            <div className="card p-4 sm:p-6 animate-fade-in border-2 border-emerald-200">
              <div className="flex items-start gap-3 sm:gap-5">
                <div className="step-number step-number-success text-sm sm:text-lg w-8 h-8 sm:w-12 sm:h-12 hidden sm:flex">3</div>
                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div>
                      <h2 className="text-base sm:text-xl font-semibold text-gray-800">
                        Listo para generar
                      </h2>
                      <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        <strong className="text-emerald-600">{facturas.length}</strong> factura(s)
                      </p>
                    </div>
                    <div className="text-left sm:text-right bg-emerald-50 sm:bg-transparent rounded-lg p-2 sm:p-0">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Monto Total</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800">
                        ${totalMonto.toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>

                  {/* Info de empresa OCA emisora */}
                  {configuracionExcel?.empresaOCA && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-oca-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-oca-blue">Empresa emisora:</span>
                        <span className="text-xs sm:text-sm text-gray-700">
                          {configuracionExcel.empresaOCA.id === 'ensayos' ? 'OCA Ensayos' : 'Servicios Técnicos'}
                        </span>
                        <span className="text-xs text-gray-500">
                          (RUT {configuracionExcel.empresaOCA.rut}-{configuracionExcel.empresaOCA.dv})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Preview - Cards on mobile, Table on desktop */}
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-4 mb-4 sm:mb-5 max-h-64 overflow-y-auto">
                    {/* Mobile Cards */}
                    {[...facturasPorOT.entries()].map(([otKey, items]) => {
                      const otLabel = otKey === 'sin_numero' ? 'Sin OT' : `OT ${otKey}`;
                      const subtotal = items.reduce((sum, it) => sum + it.factura.monto, 0);
                      return (
                        <div key={otKey} className="mb-4 last:mb-0">
                          {/* Encabezado de grupo */}
                          <div className="flex items-center justify-between bg-oca-blue-lighter border border-oca-blue/20 rounded-md px-3 py-1.5 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-oca-blue">{otLabel}</span>
                              <span className="text-xs text-gray-500">
                                · {items.length} solicitud{items.length > 1 ? 'es' : ''}
                              </span>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-700">
                              ${subtotal.toLocaleString('es-CL')}
                            </span>
                          </div>

                          {/* Mobile Cards */}
                          <div className="sm:hidden space-y-2">
                            {items.map(({ factura: f, index: i }) => (
                              <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-grow min-w-0">
                                    <p className="font-medium text-gray-800 text-sm truncate">{f.empresa}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-oca-blue-lighter text-oca-blue">
                                        {(() => {
                                          const usaLcl = usaLclConformidad(f.empresa);
                                          const valor = f.hes || f.ordenCompra || '-';
                                          const numero = valor.replace(/^(HES|LCL|OC)\s*/i, '');
                                          if (f.hes) return usaLcl ? `LCL ${numero}` : numero;
                                          return numero;
                                        })()}
                                      </span>
                                      <span className="text-xs text-gray-400">{f.condicionPago}d</span>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-semibold text-gray-800 text-sm">${f.monto.toLocaleString('es-CL')}</p>
                                    <div className="flex gap-1 mt-1 justify-end">
                                      <button
                                        onClick={() => handleEditarFactura(i)}
                                        className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded transition-all"
                                      >
                                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleEliminarFactura(i)}
                                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded transition-all"
                                      >
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table */}
                          <table className="w-full hidden sm:table">
                            <thead>
                              <tr>
                                <th className="table-header">#</th>
                                <th className="table-header">Empresa</th>
                                <th className="table-header">LCL/HES/OC</th>
                                <th className="table-header">Pago</th>
                                <th className="table-header text-right">Monto</th>
                                <th className="table-header"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(({ factura: f, index: i }) => (
                                <tr key={i} className="table-row group">
                                  <td className="table-cell text-gray-400 font-medium">{i + 1}</td>
                                  <td className="table-cell font-medium text-gray-700">
                                    {f.empresa.length > 30 ? f.empresa.substring(0, 30) + '...' : f.empresa}
                                  </td>
                                  <td className="table-cell">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-oca-blue-lighter text-oca-blue">
                                      {(() => {
                                        const usaLcl = usaLclConformidad(f.empresa);
                                        const valor = f.hes || f.ordenCompra || '-';
                                        const numero = valor.replace(/^(HES|LCL|OC)\s*/i, '');
                                        if (f.hes) return usaLcl ? `LCL ${numero}` : numero;
                                        return numero;
                                      })()}
                                    </span>
                                  </td>
                                  <td className="table-cell text-gray-500 text-sm">
                                    {f.condicionPago}d
                                  </td>
                                  <td className="table-cell text-right font-semibold text-gray-800">
                                    ${f.monto.toLocaleString('es-CL')}
                                  </td>
                                  <td className="table-cell">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                      <button
                                        onClick={() => handleEditarFactura(i)}
                                        className="p-1 hover:bg-amber-100 rounded transition-all"
                                        title="Editar factura"
                                      >
                                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleEliminarFactura(i)}
                                        className="p-1 hover:bg-red-100 rounded transition-all"
                                        title="Eliminar factura"
                                      >
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Banner de duplicados pendientes */}
                  {duplicadosPendientes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowValidacionModal(true)}
                      className="w-full mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg p-3 text-left transition-colors"
                    >
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
                      </svg>
                      <div className="flex-grow text-xs sm:text-sm">
                        <p className="font-semibold text-amber-800">
                          {duplicadosPendientes.length} valor(es) repetido(s) por verificar
                        </p>
                        <p className="text-amber-700 mt-0.5">
                          Toca para revisarlos. Necesitas marcar cada caso como intencional o corregirlo antes de generar.
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Progress bar */}
                  {isProcessing && progress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-1">
                        <span>Generando facturas...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={generarTodas}
                      disabled={isProcessing}
                      className="btn-success inline-flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-2.5"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generando...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Generar {facturas.length} Factura{facturas.length > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={() => setShowValidacionModal(true)}
                        disabled={isProcessing}
                        className="btn-secondary inline-flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm sm:text-base py-2.5 sm:py-2.5"
                        title="Revisar OC y HES/LCL duplicados"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verificar
                      </button>
                      <button
                        onClick={() => {
                          setModoIngreso('manual');
                          setShowFormularioManual(true);
                        }}
                        disabled={isProcessing}
                        className="btn-primary inline-flex items-center justify-center gap-2 flex-1 sm:flex-none text-sm sm:text-base py-2.5 sm:py-2.5"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="hidden sm:inline">Agregar Otra</span>
                        <span className="sm:hidden">Agregar</span>
                      </button>
                      <button
                        onClick={() => {
                          setFacturas([]);
                          setConfiguracionExcel(null);
                          setDuplicadosAprobados(new Set());
                        }}
                        disabled={isProcessing}
                        className="btn-secondary flex-1 sm:flex-none text-sm sm:text-base py-2.5 sm:py-2.5"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {status && !error && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center gap-3 bg-oca-blue-lighter border border-oca-blue/20 rounded-lg p-4">
              <div className="flex-shrink-0 w-8 h-8 bg-oca-blue rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-oca-blue font-medium">{status}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-oca-red-light border border-oca-red/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-oca-red rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="text-oca-red-dark font-semibold mb-1">Error de validación</p>
                  <ul className="text-oca-red-dark text-sm space-y-1">
                    {error.split('\n').map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-oca-red mt-0.5">•</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer
        className="w-full text-center"
        style={{
          background: 'linear-gradient(to bottom, #111111 0%, #000000 100%)',
          padding: '3em 0'
        }}
      >
        <div className="container mx-auto px-4 sm:p x-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Image
              src="/logo_horizontal.svg"
              alt="OCA Global"
              width={180}
              height={48}
              className="w-[140px] sm:w-[180px] h-auto"
            />
              <div className="hidden md:block h-8 w-px bg-white/30" />
            <span className="text-xs text-white text-center">
              OCA Global Servicios Técnicos Chile S.A.
            </span>
          </div>
        </div>
      </footer>

      {/* Modal de configuración de plantilla */}
      <PlantillaConfigModal
        isOpen={showPlantillaModal}
        onClose={() => setShowPlantillaModal(false)}
        onDescargarConDatos={handleDescargarConDatos}
        onDescargarVacia={handleDescargarVacia}
      />

      {/* Modal de verificación de duplicados */}
      <ValidacionDuplicadosModal
        isOpen={showValidacionModal}
        onClose={() => setShowValidacionModal(false)}
        facturas={facturas}
        aprobaciones={duplicadosAprobados}
        onAprobar={handleAprobarDuplicado}
        onDesaprobar={handleDesaprobarDuplicado}
        onEditarFactura={handleEditarFactura}
        onGenerar={generarTodasInterno}
      />
    </div>
  );
}
