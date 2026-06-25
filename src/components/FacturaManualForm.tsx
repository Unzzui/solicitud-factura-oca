'use client';

import { useState, useMemo, useEffect } from 'react';
import { CLIENTES, JEFES_PROYECTO, CONDICIONES_PAGO, Cliente, EMPRESAS_OCA, EmpresaOCA, DIVISIONES, filtrarClientes, usaLclConformidad } from '@/lib/data';
import { FacturaData, TipoPlantilla } from '@/lib/excelGenerator';

interface FacturaManualFormProps {
  onAgregarFactura: (factura: FacturaData) => void;
  onActualizarFactura?: (factura: FacturaData) => void;
  onCerrar: () => void;
  facturaEditar?: FacturaData | null;
}

export default function FacturaManualForm({ onAgregarFactura, onActualizarFactura, onCerrar, facturaEditar }: FacturaManualFormProps) {
  const modoEdicion = !!facturaEditar;

  // Estados para los selectores con búsqueda
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Cliente | null>(null);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('');
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);

  const[showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const [jefeProyecto, setJefeProyecto] = useState('');
  const [busquedaJefe, setBusquedaJefe] = useState('');
  const [showJefeDropdown, setShowJefeDropdown] = useState(false);

  // Empresa OCA emisora - por defecto Servicios Técnicos
  const [empresaOCA, setEmpresaOCA] = useState<EmpresaOCA>(EMPRESAS_OCA[0]);
  // Tipo de plantilla por factura - por defecto la nueva
  const [tipoPlantilla, setTipoPlantilla] = useState<TipoPlantilla>('nueva');

  // Estados para los demás campos
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [centroCosto, setCentroCosto] = useState('');
  const [division, setDivision] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [giro, setGiro] = useState('');
  const [atencionSr, setAtencionSr] = useState('');
  const [detalle, setDetalle] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [hes, setHes] = useState('');
  const [contacto, setContacto] = useState('');
  const [monto, setMonto] = useState('');
  const [condicionPago, setCondicionPago] = useState<30 | 60 | 90>(30);

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (facturaEditar) {
      // Buscar cliente por RUT
      const cliente = CLIENTES.find(c => c.rut === facturaEditar.rutNumero);
      if (cliente) {
        setEmpresaSeleccionada(cliente);
        setBusquedaEmpresa(cliente.nombre);
      } else {
        // Si no se encuentra en la lista, crear uno temporal
        setBusquedaEmpresa(facturaEditar.empresa);
      }

      setJefeProyecto(facturaEditar.jefeProy);
      setBusquedaJefe(facturaEditar.jefeProy);
      setFecha(facturaEditar.fecha instanceof Date
        ? facturaEditar.fecha.toISOString().split('T')[0]
        : new Date(facturaEditar.fecha).toISOString().split('T')[0]);
      setCentroCosto(facturaEditar.centroCosto);
      setDivision(facturaEditar.division);
      setDireccion(facturaEditar.direccion);
      setComuna(facturaEditar.comuna);
      setCiudad(facturaEditar.ciudad);
      setGiro(facturaEditar.giro);
      setAtencionSr(facturaEditar.atencionSr);
      setDetalle(facturaEditar.detalle);
      setOrdenCompra(facturaEditar.ordenCompra);
      setHes(facturaEditar.hes);
      setContacto(facturaEditar.contacto);
      setMonto(facturaEditar.monto.toLocaleString('es-CL'));
      setCondicionPago(facturaEditar.condicionPago as 30 | 60 | 90);
      // Cargar empresa OCA si existe
      if (facturaEditar.empresaOCA) {
        const ocaEncontrada = EMPRESAS_OCA.find(e => e.id === facturaEditar.empresaOCA?.id);
        if (ocaEncontrada) {
          setEmpresaOCA(ocaEncontrada);
        }
      }
      // Cargar tipo de plantilla
      if (facturaEditar.tipoPlantilla) {
        setTipoPlantilla(facturaEditar.tipoPlantilla);
      }
    }
  }, [facturaEditar]);

  const empresasFiltradas = useMemo(
    () => filtrarClientes(busquedaEmpresa),
    [busquedaEmpresa]
  );

  const jefesFiltrados = useMemo(() => {
    if (!busquedaJefe) return JEFES_PROYECTO;
    const busqueda = busquedaJefe.toLowerCase();
    return JEFES_PROYECTO.filter(j => j.toLowerCase().includes(busqueda));
  }, [busquedaJefe]);

  const handleSelectEmpresa = (cliente: Cliente) => {
    setEmpresaSeleccionada(cliente);
    setBusquedaEmpresa(cliente.nombre);
    setCondicionPago(cliente.condicionPago);
    // Auto-rellenar campos de ubicación
    setDireccion(cliente.direccion || '');
    setComuna(cliente.comuna || '');
    setCiudad(cliente.ciudad || '');
    setGiro(cliente.giro || '');
    setShowEmpresaDropdown(false);
    setShowDivisionDropdown(false);
  };

  const handleSelectJefe = (jefe: string) => {
    setJefeProyecto(jefe);
    setBusquedaJefe(jefe);
    setShowJefeDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaSeleccionada || !jefeProyecto || !monto) {
      return;
    }

    const factura: FacturaData = {
      fecha: new Date(fecha),
      centroCosto,
      division,
      empresa: empresaSeleccionada.nombre,
      rutNumero: empresaSeleccionada.rut,
      rutDv: empresaSeleccionada.dv,
      direccion,
      comuna,
      ciudad,
      giro,
      atencionSr,
      jefeProy: jefeProyecto,
      detalle,
      ordenCompra,
      hes,
      contacto,
      monto: parseInt(monto.replace(/[^\d]/g, ''), 10),
      condicionPago,
      empresaOCA: {
        id: empresaOCA.id,
        nombre: empresaOCA.nombre,
        rut: empresaOCA.rut,
        dv: empresaOCA.dv,
        direccion: empresaOCA.direccion
      },
      tipoPlantilla
    };

    if (modoEdicion && onActualizarFactura) {
      onActualizarFactura(factura);
    } else {
      onAgregarFactura(factura);
      limpiarFormulario();
    }
  };

  const limpiarFormulario = () => {
    setCentroCosto('');
    setDivision('');
    setDireccion('');
    setComuna('');
    setCiudad('');
    setGiro('');
    setAtencionSr('');
    setDetalle('');
    setOrdenCompra('');
    setHes('');
    setContacto('');
    setMonto('');
    // No resetear empresaOCA para mantener la selección entre facturas
  };

  const puedeAgregar = empresaSeleccionada && jefeProyecto && monto;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${modoEdicion ? 'from-amber-500 to-amber-400' : 'from-oca-blue to-oca-blue-light'} px-4 sm:px-6 py-3 sm:py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {modoEdicion ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                )}
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">{modoEdicion ? 'Editar Factura' : 'Nueva Factura'}</h3>
              <p className="text-white/70 text-xs sm:text-sm hidden sm:block">{modoEdicion ? 'Modifique los datos de la factura' : 'Complete los datos de la factura'}</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {/* Selector de Empresa OCA emisora */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Empresa OCA emisora
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EMPRESAS_OCA.map((oca) => (
              <button
                key={oca.id}
                type="button"
                onClick={() => setEmpresaOCA(oca)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  empresaOCA.id === oca.id
                    ? 'border-oca-blue bg-oca-blue-lighter'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className={`block font-medium text-sm ${
                  empresaOCA.id === oca.id ? 'text-oca-blue' : 'text-gray-800'
                }`}>
                  {oca.nombreCorto}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  RUT: {oca.rut}-{oca.dv}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selector de tipo de plantilla */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Formato de la solicitud
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoPlantilla('nueva')}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                tipoPlantilla === 'nueva'
                  ? 'border-oca-blue bg-oca-blue-lighter'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`block font-medium text-sm ${
                tipoPlantilla === 'nueva' ? 'text-oca-blue' : 'text-gray-800'
              }`}>
                Plantilla nueva
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Formato actual
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTipoPlantilla('antigua')}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                tipoPlantilla === 'antigua'
                  ? 'border-oca-blue bg-oca-blue-lighter'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`block font-medium text-sm ${
                tipoPlantilla === 'antigua' ? 'text-oca-blue' : 'text-gray-800'
              }`}>
                Plantilla antigua
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Formato legacy
              </span>
            </button>
          </div>
        </div>

        {/* Sección: Datos principales */}
        <div className="mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-oca-blue text-white rounded-full flex items-center justify-center text-xs">1</span>
            Datos del Cliente
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* Empresa */}
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Empresa <span className="text-oca-red">*</span>
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
                  onBlur={() => setTimeout(() => setShowEmpresaDropdown(false), 200)}
                  placeholder="Buscar empresa..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue transition-colors text-sm sm:text-base"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {showEmpresaDropdown && empresasFiltradas.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {empresasFiltradas.map((cliente) => (
                    <button
                      key={`${cliente.rut}-${cliente.nombre}`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* RUT (solo lectura) */}
              {empresaSeleccionada && (
                <div className="animate-fade-in">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-oca-blue-lighter border border-oca-blue/20 rounded-lg text-gray-800 font-medium text-sm sm:text-base">
                    {empresaSeleccionada.rut}-{empresaSeleccionada.dv}
                  </div>
                </div>
              )}

              {/* Jefe de Proyecto */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Jefe de Proyecto <span className="text-oca-red">*</span>
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
                    onBlur={() => setTimeout(() => setShowJefeDropdown(false), 200)}
                    placeholder="Buscar jefe..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue transition-colors text-sm sm:text-base"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {showJefeDropdown && jefesFiltrados.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
            </div>
          </div>
        </div>

        {/* Sección: Ubicación */}
        <div className="mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-oca-blue text-white rounded-full flex items-center justify-center text-xs">2</span>
            Ubicación
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Ejemplo 1234"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Comuna</label>
              <input
                type="text"
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                placeholder="Providencia"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Santiago"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Giro</label>
              <input
                type="text"
                value={giro}
                onChange={(e) => setGiro(e.target.value)}
                placeholder="Servicios empresariales"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Sección: Detalles de la factura */}
        <div className="mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-oca-blue text-white rounded-full flex items-center justify-center text-xs">3</span>
            Detalles
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Centro Costo</label>
              <input
                type="text"
                value={centroCosto}
                onChange={(e) => setCentroCosto(e.target.value)}
                placeholder="00001"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">División</label>
              <button
                type="button"
                onClick={() => setShowDivisionDropdown(!showDivisionDropdown)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base text-left bg-white flex items-center justify-between"
              >
                <span className={division ? 'text-gray-800' : 'text-gray-400'}>
                  {division || 'Seleccionar división'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDivisionDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {DIVISIONES.map((div) => (
                    <button
                      key={div.codigo}
                      type="button"
                      onClick={() => {
                        setDivision(div.nombre);
                        setShowDivisionDropdown(false);
                      }}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left hover:bg-oca-blue-lighter transition-colors ${
                        division === div.nombre ? 'bg-oca-blue-lighter' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-800 text-sm">{div.nombre}</span>
                      <span className="block text-xs text-gray-500">{div.codigo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Detalle (OT)
                <span className="ml-2 text-[10px] sm:text-xs text-gray-400 font-normal">Enter para salto de línea</span>
              </label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="OT 00001 (OCA) SSTT, Enero 2026"
                rows={2}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base resize-y min-h-[42px]"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {usaLclConformidad(empresaSeleccionada?.nombre ?? '') ? 'Conformidad' : 'OC'}
              </label>
              <input
                type="text"
                value={ordenCompra}
                onChange={(e) => setOrdenCompra(e.target.value)}
                placeholder={usaLclConformidad(empresaSeleccionada?.nombre ?? '') ? 'Número de conformidad' : '12345678'}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {usaLclConformidad(empresaSeleccionada?.nombre ?? '') ? 'LCL' : 'HES'}
              </label>
              <input
                type="text"
                value={hes}
                onChange={(e) => setHes(e.target.value)}
                placeholder={usaLclConformidad(empresaSeleccionada?.nombre ?? '') ? 'Número de conformidad' : '1234567890'}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Atención Sr.</label>
              <input
                type="text"
                value={atencionSr}
                onChange={(e) => setAtencionSr(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Nombre del contacto"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Sección: Pago */}
        <div className="mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 sm:w-6 sm:h-6 bg-oca-blue text-white rounded-full flex items-center justify-center text-xs">4</span>
            Pago
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Monto ($) <span className="text-oca-red">*</span>
              </label>
              <input
                type="text"
                value={monto}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  setMonto(val ? parseInt(val, 10).toLocaleString('es-CL') : '');
                }}
                placeholder="1.000.000"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oca-blue focus:border-oca-blue text-base sm:text-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Condición de Pago</label>
              <div className="flex gap-1.5 sm:gap-2">
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
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={!puedeAgregar}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
              puedeAgregar
                ? modoEdicion
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {modoEdicion ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              )}
            </svg>
            {modoEdicion ? 'Guardar Cambios' : 'Agregar Solicitud de Factura'}
          </button>
          {!modoEdicion && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors text-sm sm:text-base"
            >
              Limpiar
            </button>
          )}
          {modoEdicion && (
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors text-sm sm:text-base"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
