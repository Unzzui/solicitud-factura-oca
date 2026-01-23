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
        // Generar nombre con nomenclatura LCL/HES/OC
        let identificador = `F${i + 1}`;
        const esEnel = factura.empresa.toLowerCase().includes('enel');
        if (factura.hes) {
          const numero = factura.hes.replace(/^(HES|LCL)\s*/i, '');
          identificador = esEnel ? `LCL_${numero}` : `HES_${numero}`;
        } else if (factura.ordenCompra) {
          const ocNumero = factura.ordenCompra.replace(/^OC\s*/i, '');
          identificador = `OC_${ocNumero}`;
        }
        // Abreviar nombre de empresa para evitar caracteres especiales
        let empresaAbrev = factura.empresa;
        if (factura.empresa.toLowerCase().includes('compañía general de electricidad')) {
          empresaAbrev = 'CGE';
        } else if (esEnel) {
          empresaAbrev = 'ENEL';
        } else {
          empresaAbrev = factura.empresa.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
        }
        const nombreArchivo = `Solicitud_Factura_${empresaAbrev}_${identificador}.xlsx`;

        zip.file(nombreArchivo, blob);
      }

      setStatus('Comprimiendo archivos...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const fecha = new Date().toISOString().split('T')[0];
      saveAs(zipBlob, `Solicitud_Factura_OCA_${fecha}.zip`);

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
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        {/* Title Section */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
            Generador de Solicitudes de Facturación
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Genera múltiples solicitudes de factura de forma automática
          </p>
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
                      Descarga el archivo Excel y completa los datos de las facturas que necesitas generar.
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

                  {/* Preview - Cards on mobile, Table on desktop */}
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-4 mb-4 sm:mb-5 max-h-64 overflow-y-auto">
                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-2">
                      {facturas.map((f, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow min-w-0">
                              <p className="font-medium text-gray-800 text-sm truncate">{f.empresa}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-oca-blue-lighter text-oca-blue">
                                  {(() => {
                                    const esEnel = f.empresa.toLowerCase().includes('enel');
                                    const valor = f.hes || f.ordenCompra || '-';
                                    const numero = valor.replace(/^(HES|LCL|OC)\s*/i, '');
                                    if (f.hes) return esEnel ? `LCL ${numero}` : numero;
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
                        {facturas.map((f, i) => (
                          <tr key={i} className="table-row group">
                            <td className="table-cell text-gray-400 font-medium">{i + 1}</td>
                            <td className="table-cell font-medium text-gray-700">
                              {f.empresa.length > 30 ? f.empresa.substring(0, 30) + '...' : f.empresa}
                            </td>
                            <td className="table-cell">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-oca-blue-lighter text-oca-blue">
                                {(() => {
                                  const esEnel = f.empresa.toLowerCase().includes('enel');
                                  const valor = f.hes || f.ordenCompra || '-';
                                  const numero = valor.replace(/^(HES|LCL|OC)\s*/i, '');
                                  if (f.hes) return esEnel ? `LCL ${numero}` : numero;
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

                  {/* Progress bar */}
                  {isProcessing && progress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-1">
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
                        onClick={() => setFacturas([])}
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

        {/* Info Footer */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>30/60/90 días</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Descarga ZIP</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Excel o manual</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="w-full text-center"
        style={{
          background: 'linear-gradient(to bottom, #0b3356 0%, #020a11 100%)',
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
    </div>
  );
}
