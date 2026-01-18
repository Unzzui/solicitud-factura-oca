'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  generarFactura,
  generarPlantillaDatos,
  parsearDatosExcel,
  FacturaData,
  PlantillaConfig
} from '@/lib/excelGenerator';
import PlantillaConfigModal from '@/components/PlantillaConfigModal';
import FacturaManualForm from '@/components/FacturaManualForm';

type ModoIngreso = 'excel' | 'manual';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [facturas, setFacturas] = useState<FacturaData[]>([]);
  const [plantillaBuffer, setPlantillaBuffer] = useState<ArrayBuffer | null>(null);
  const [progress, setProgress] = useState(0);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [modoIngreso, setModoIngreso] = useState<ModoIngreso>('excel');
  const [showFormularioManual, setShowFormularioManual] = useState(false);
  const [facturaEditandoIndex, setFacturaEditandoIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/plantilla_factura.xlsx')
      .then(res => res.arrayBuffer())
      .then(buffer => setPlantillaBuffer(buffer))
      .catch(() => setError('Error cargando la plantilla base'));
  }, []);

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
      const datos = await parsearDatosExcel(buffer);

      if (datos.length === 0) {
        throw new Error('No se encontraron datos en el archivo');
      }

      setFacturas(datos);
      setStatus(`Se encontraron ${datos.length} facturas para generar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando archivo');
      setFacturas([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generarTodas = async () => {
    if (!plantillaBuffer || facturas.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < facturas.length; i++) {
        const factura = facturas[i];
        setStatus(`Generando factura ${i + 1} de ${facturas.length}...`);
        setProgress(Math.round(((i + 1) / facturas.length) * 100));

        const blob = await generarFactura(plantillaBuffer, factura);
        // Generar nombre con nomenclatura HES/OC
        let identificador = `F${i + 1}`;
        if (factura.hes) {
          const hesNumero = factura.hes.replace(/^HES\s*/i, '');
          identificador = `HES_${hesNumero}`;
        } else if (factura.ordenCompra) {
          const ocNumero = factura.ordenCompra.replace(/^OC\s*/i, '');
          identificador = `OC_${ocNumero}`;
        }
        const nombreArchivo = `Solicitud_Factura_${identificador}.xlsx`;

        zip.file(nombreArchivo, blob);
      }

      setStatus('Comprimiendo archivos...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const fecha = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `Facturas_OCA_${fecha}.zip`);

      setStatus(`${facturas.length} facturas generadas exitosamente`);
      setFacturas([]);
      setProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando facturas');
    } finally {
      setIsProcessing(false);
    }
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

  return (
    <div className="min-h-screen">
      {/* Header con gradiente OCA */}
      <header className="header-gradient text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo_horizontal.svg"
              alt="OCA Global"
              width={160}
              height={45}
            />
            <div className="hidden sm:block h-8 w-px bg-white/30" />
            <span className="hidden sm:block text-white/80 text-sm font-medium">
              Control de Calidad y Servicios Técnicos
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Title Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Generador de Solicitudes de Facturación
          </h1>
          <p className="text-gray-500">
            Genera múltiples solicitudes de factura de forma automática
          </p>
        </div>

        {/* Toggle de modo de ingreso */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="bg-gray-100 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setModoIngreso('excel')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                modoIngreso === 'excel'
                  ? 'bg-white text-oca-blue shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cargar Excel
            </button>
            <button
              onClick={() => setModoIngreso('manual')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                modoIngreso === 'manual'
                  ? 'bg-white text-oca-blue shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Manual
            </button>
          </div>
        </div>

        {/* Steps Container */}
        <div className="space-y-6">
          {/* Modo Excel */}
          {modoIngreso === 'excel' && (
            <>
              {/* Paso 1 */}
              <div className="card p-6 animate-fade-in">
                <div className="flex items-start gap-5">
                  <div className="step-number step-number-active">1</div>
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      Descarga la plantilla de datos
                    </h2>
                    <p className="text-gray-500 mb-5 text-sm leading-relaxed">
                      Descarga el archivo Excel y completa los datos de las facturas que necesitas generar.
                      Puedes agregar tantas filas como facturas necesites. La plantilla incluye instrucciones
                      y un ejemplo para guiarte.
                    </p>
                    <button
                      onClick={() => setShowPlantillaModal(true)}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar Plantilla Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-start gap-5">
                  <div className="step-number step-number-active">2</div>
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      Sube el archivo con los datos
                    </h2>
                    <p className="text-gray-500 mb-5 text-sm">
                      Una vez completados los datos, sube el archivo aquí para generar las facturas automáticamente.
                    </p>

                    {/* Drop zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        dropzone
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
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-oca-blue text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium mb-1">
                          Arrastra el archivo aquí
                        </p>
                        <p className="text-gray-400 text-sm">
                          o haz clic para seleccionar
                        </p>
                        <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
                <div className="card p-8 text-center">
                  <div className="w-20 h-20 bg-oca-blue-lighter rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-oca-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Ingreso Manual de Facturas
                  </h2>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Agrega facturas una por una con autocompletado de empresa, RUT y jefe de proyecto.
                    Ideal para pocas facturas o cuando necesitas mayor control.
                  </p>
                  <button
                    onClick={() => setShowFormularioManual(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar Nueva Factura
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
            <div className="card p-6 animate-fade-in border-2 border-emerald-200">
              <div className="flex items-start gap-5">
                <div className="step-number step-number-success">3</div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Listo para generar
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">
                        Se encontraron <strong className="text-emerald-600">{facturas.length}</strong> facturas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Monto Total</p>
                      <p className="text-2xl font-bold text-gray-800">
                        ${totalMonto.toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-slate-50 rounded-lg p-4 mb-5 max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-header">#</th>
                          <th className="table-header">Empresa</th>
                          <th className="table-header">HES/OC</th>
                          <th className="table-header">Pago</th>
                          <th className="table-header text-right">Monto</th>
                          <th className="table-header"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturas.map((f, i) => (
                          <tr key={i} className="table-row group">
                            <td className="table-cell text-gray-400 font-medium">{i + 1}</td>
                            <td className="table-cell font-medium text-gray-700">
                              {f.empresa.length > 30 ? f.empresa.substring(0, 30) + '...' : f.empresa}
                            </td>
                            <td className="table-cell">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-oca-blue-lighter text-oca-blue">
                                {(() => {
                                  const valor = f.hes || f.ordenCompra || '-';
                                  // Extraer solo el número, quitando prefijos HES/OC
                                  return valor.replace(/^(HES|OC)\s*/i, '');
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

                  {/* Progress bar */}
                  {isProcessing && progress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Generando facturas...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-oca-blue to-oca-blue-light transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={generarTodas}
                      disabled={isProcessing}
                      className="btn-success inline-flex items-center gap-2"
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
                          Generar {facturas.length} Facturas
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setModoIngreso('manual');
                        setShowFormularioManual(true);
                      }}
                      disabled={isProcessing}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Agregar Otra
                    </button>
                    <button
                      onClick={() => setFacturas([])}
                      disabled={isProcessing}
                      className="btn-secondary"
                    >
                      Limpiar Todo
                    </button>
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

        {/* Info Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-wrap justify-center items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Vencimiento: 30/60/90 días configurable</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Descarga en formato ZIP</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Excel o ingreso manual</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/logoOcaHorizontal.svg"
              alt="OCA Global"
              width={120}
              height={32}
            />
            <span className="text-xs text-gray-400">
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
    </div>
  );
}
