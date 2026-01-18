'use client';

import { useState, useMemo } from 'react';
import Modal from './Modal';
import { CLIENTES, JEFES_PROYECTO, CONDICIONES_PAGO, Cliente } from '@/lib/data';
import { PlantillaConfig } from '@/lib/excelGenerator';

interface PlantillaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDescargarConDatos: (config: PlantillaConfig) => void;
  onDescargarVacia: () => void;
}

export default function PlantillaConfigModal({
  isOpen,
  onClose,
  onDescargarConDatos,
  onDescargarVacia
}: PlantillaConfigModalProps) {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Cliente | null>(null);
  const [jefeProyecto, setJefeProyecto] = useState<string>('');
  const [condicionPago, setCondicionPago] = useState<30 | 60 | 90>(30);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('');
  const [busquedaJefe, setBusquedaJefe] = useState('');
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [showJefeDropdown, setShowJefeDropdown] = useState(false);

  const empresasFiltradas = useMemo(() => {
    if (!busquedaEmpresa) return CLIENTES;
    const busqueda = busquedaEmpresa.toLowerCase();
    return CLIENTES.filter(c =>
      c.nombre.toLowerCase().includes(busqueda) ||
      c.rut.includes(busqueda)
    );
  }, [busquedaEmpresa]);

  const jefesFiltrados = useMemo(() => {
    if (!busquedaJefe) return JEFES_PROYECTO;
    const busqueda = busquedaJefe.toLowerCase();
    return JEFES_PROYECTO.filter(j => j.toLowerCase().includes(busqueda));
  }, [busquedaJefe]);

  const handleSelectEmpresa = (cliente: Cliente) => {
    setEmpresaSeleccionada(cliente);
    setBusquedaEmpresa(cliente.nombre);
    setCondicionPago(cliente.condicionPago);
    setShowEmpresaDropdown(false);
  };

  const handleSelectJefe = (jefe: string) => {
    setJefeProyecto(jefe);
    setBusquedaJefe(jefe);
    setShowJefeDropdown(false);
  };

  const handleDescargarConDatos = () => {
    if (!empresaSeleccionada || !jefeProyecto) return;

    onDescargarConDatos({
      empresa: empresaSeleccionada.nombre,
      rutNumero: empresaSeleccionada.rut,
      rutDv: empresaSeleccionada.dv,
      jefeProy: jefeProyecto,
      condicionPago
    });
    resetForm();
    onClose();
  };

  const handleDescargarVacia = () => {
    onDescargarVacia();
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEmpresaSeleccionada(null);
    setJefeProyecto('');
    setCondicionPago(30);
    setBusquedaEmpresa('');
    setBusquedaJefe('');
  };

  const puedeDescargar = empresaSeleccionada && jefeProyecto;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Plantilla">
      <div className="space-y-4 sm:space-y-5">
        {/* Selector de Empresa */}
        <div className="relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Empresa a facturar
          </label>
          <div className="relative">
            <input
              type="text"
              value={busquedaEmpresa}
              onChange={(e) => {
                setBusquedaEmpresa(e.target.value);
                setShowEmpresaDropdown(true);
                if (!e.target.value) setEmpresaSeleccionada(null);
              }}
              onFocus={() => setShowEmpresaDropdown(true)}
              placeholder="Buscar empresa..."
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue transition-colors text-sm sm:text-base"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {showEmpresaDropdown && empresasFiltradas.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 sm:max-h-48 overflow-y-auto">
              {empresasFiltradas.map((cliente) => (
                <button
                  key={cliente.rut}
                  type="button"
                  onClick={() => handleSelectEmpresa(cliente)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left hover:bg-oca-blue-lighter transition-colors flex flex-col sm:flex-row sm:justify-between sm:items-center ${
                    empresaSeleccionada?.rut === cliente.rut ? 'bg-oca-blue-lighter' : ''
                  }`}
                >
                  <span className="font-medium text-gray-800 text-sm">{cliente.nombre}</span>
                  <span className="text-xs sm:text-sm text-gray-500">{cliente.rut}-{cliente.dv}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RUT (solo lectura) */}
        {empresaSeleccionada && (
          <div className="animate-fade-in">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              RUT
            </label>
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium text-sm sm:text-base">
              {empresaSeleccionada.rut}-{empresaSeleccionada.dv}
            </div>
          </div>
        )}

        {/* Selector de Jefe de Proyecto */}
        <div className="relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Jefe de Proyecto
          </label>
          <div className="relative">
            <input
              type="text"
              value={busquedaJefe}
              onChange={(e) => {
                setBusquedaJefe(e.target.value);
                setShowJefeDropdown(true);
                if (!e.target.value) setJefeProyecto('');
              }}
              onFocus={() => setShowJefeDropdown(true)}
              placeholder="Buscar jefe..."
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue transition-colors text-sm sm:text-base"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          {showJefeDropdown && jefesFiltrados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 sm:max-h-48 overflow-y-auto">
              {jefesFiltrados.map((jefe) => (
                <button
                  key={jefe}
                  type="button"
                  onClick={() => handleSelectJefe(jefe)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left hover:bg-oca-blue-lighter transition-colors ${
                    jefeProyecto === jefe ? 'bg-oca-blue-lighter' : ''
                  }`}
                >
                  <span className="font-medium text-gray-800 text-sm">{jefe}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selector de Condición de Pago */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Condición de Pago
          </label>
          <div className="flex gap-2 sm:gap-3">
            {CONDICIONES_PAGO.map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setCondicionPago(dias)}
                className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg font-medium transition-all text-sm sm:text-base ${
                  condicionPago === dias
                    ? 'bg-oca-blue text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dias}d
              </button>
            ))}
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200 pt-4 sm:pt-5">
          {/* Botones de acción */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <button
              onClick={handleDescargarConDatos}
              disabled={!puedeDescargar}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                puedeDescargar
                  ? 'bg-oca-blue text-white hover:bg-oca-blue-dark shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Prellenada
            </button>

            <button
              onClick={handleDescargarVacia}
              className="w-full py-2 sm:py-2.5 px-4 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors text-xs sm:text-sm"
            >
              O descargar plantilla vacía
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
