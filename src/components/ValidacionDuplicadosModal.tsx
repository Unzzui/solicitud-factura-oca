'use client';

import { useMemo, useState } from 'react';
import Modal from './Modal';
import type { FacturaData } from '@/lib/excelGenerator';
import {
  DuplicadoGrupo,
  duplicadoKey,
  detectarDuplicados,
  TipoDuplicado
} from '@/lib/validations';
import { usaLclConformidad } from '@/lib/data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  facturas: FacturaData[];
  aprobaciones: Set<string>;
  onAprobar: (key: string) => void;
  onDesaprobar: (key: string) => void;
  onAprobarMultiples?: (keys: string[]) => void;
  onDesaprobarMultiples?: (keys: string[]) => void;
  onEditarFactura: (index: number) => void;
  onGenerar: () => void;
}

type FiltroTipo = 'todos' | 'OC' | 'HES';
type FiltroEstado = 'pendientes' | 'aprobados' | 'todos';

// Etiqueta legible para el tipo: para Enel se prefiere LCL/Conformidad
function etiquetaTipo(tipo: TipoDuplicado, empresa: string): string {
  const usaLcl = usaLclConformidad(empresa);
  if (tipo === 'OC') return usaLcl ? 'Conformidad' : 'OC';
  return usaLcl ? 'LCL' : 'HES';
}

export default function ValidacionDuplicadosModal({
  isOpen,
  onClose,
  facturas,
  aprobaciones,
  onAprobar,
  onDesaprobar,
  onAprobarMultiples,
  onDesaprobarMultiples,
  onEditarFactura,
  onGenerar
}: Props) {
  const grupos = useMemo(() => detectarDuplicados(facturas), [facturas]);
  const pendientesTotal = grupos.filter(g => !aprobaciones.has(duplicadoKey(g)));
  const aprobadosTotal = grupos.filter(g => aprobaciones.has(duplicadoKey(g)));
  const puedeGenerar = pendientesTotal.length === 0;

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('pendientes');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const gruposFiltrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    return grupos.filter(g => {
      if (filtroTipo !== 'todos' && g.tipo !== filtroTipo) return false;
      const aprobado = aprobaciones.has(duplicadoKey(g));
      if (filtroEstado === 'pendientes' && aprobado) return false;
      if (filtroEstado === 'aprobados' && !aprobado) return false;
      if (q && !g.valor.includes(q)) return false;
      return true;
    });
  }, [grupos, busqueda, filtroTipo, filtroEstado, aprobaciones]);

  const pendientesVisibles = gruposFiltrados.filter(g => !aprobaciones.has(duplicadoKey(g)));
  const aprobadosVisibles = gruposFiltrados.filter(g => aprobaciones.has(duplicadoKey(g)));

  const aprobarVisibles = () => {
    const keys = pendientesVisibles.map(duplicadoKey);
    if (keys.length === 0) return;
    if (onAprobarMultiples) onAprobarMultiples(keys);
    else keys.forEach(onAprobar);
  };

  const desaprobarVisibles = () => {
    const keys = aprobadosVisibles.map(duplicadoKey);
    if (keys.length === 0) return;
    if (onDesaprobarMultiples) onDesaprobarMultiples(keys);
    else keys.forEach(onDesaprobar);
  };

  const aprobarTodos = () => {
    const keys = pendientesTotal.map(duplicadoKey);
    if (keys.length === 0) return;
    if (onAprobarMultiples) onAprobarMultiples(keys);
    else keys.forEach(onAprobar);
  };

  const toggleExpandido = (key: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const conteosOC = grupos.filter(g => g.tipo === 'OC').length;
  const conteosHES = grupos.filter(g => g.tipo === 'HES').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verificar duplicados">
      <div className="space-y-3">
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-gray-800">Sin duplicados</p>
            <p className="text-sm text-gray-500 mt-1">
              Ninguna OC ni HES/LCL se repite entre las {facturas.length} solicitudes cargadas.
            </p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-gray-800">{grupos.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Total</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-amber-700">{pendientesTotal.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-amber-600">Pendientes</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-emerald-700">{aprobadosTotal.length}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-600">Aprobados</div>
              </div>
            </div>

            {/* Aceptar todos + nota de HES */}
            {pendientesTotal.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
                  </svg>
                  <div>
                    <strong>Revisa especialmente las HES/LCL:</strong> la OC suele repetirse de
                    forma legítima (varios EP sobre la misma OC), pero la <strong>HES/LCL
                    normalmente no debería repetirse</strong>. Verifica cada una antes de aceptar
                    en masa.
                  </div>
                </div>
                <button
                  onClick={aprobarTodos}
                  className="w-full py-2 px-3 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Aceptar todos ({pendientesTotal.length}) — ya verifiqué las HES/LCL
                </button>
              </div>
            )}

            {/* Buscador */}
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número de OC / HES / LCL…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-oca-blue focus:border-oca-blue"
            />

            {/* Filtros */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <FilterChip active={filtroTipo === 'todos'} onClick={() => setFiltroTipo('todos')}>
                Todos ({grupos.length})
              </FilterChip>
              <FilterChip active={filtroTipo === 'OC'} onClick={() => setFiltroTipo('OC')}>
                OC ({conteosOC})
              </FilterChip>
              <FilterChip active={filtroTipo === 'HES'} onClick={() => setFiltroTipo('HES')}>
                HES/LCL ({conteosHES})
              </FilterChip>
              <span className="w-px bg-gray-200 mx-1" />
              <FilterChip active={filtroEstado === 'pendientes'} onClick={() => setFiltroEstado('pendientes')}>
                Pendientes
              </FilterChip>
              <FilterChip active={filtroEstado === 'aprobados'} onClick={() => setFiltroEstado('aprobados')}>
                Aprobados
              </FilterChip>
              <FilterChip active={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')}>
                Ver todos
              </FilterChip>
            </div>

            {/* Acciones masivas */}
            {(pendientesVisibles.length > 0 || aprobadosVisibles.length > 0) && (
              <div className="flex flex-wrap gap-2 items-center text-xs bg-gray-50 rounded-lg p-2">
                <span className="text-gray-500">
                  {gruposFiltrados.length} visible(s)
                </span>
                <div className="flex-1" />
                {pendientesVisibles.length > 0 && (
                  <button
                    onClick={aprobarVisibles}
                    className="px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
                  >
                    Marcar OK los {pendientesVisibles.length} visibles
                  </button>
                )}
                {aprobadosVisibles.length > 0 && (
                  <button
                    onClick={desaprobarVisibles}
                    className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-white transition-colors font-medium"
                  >
                    Desmarcar {aprobadosVisibles.length} visibles
                  </button>
                )}
              </div>
            )}

            {/* Lista */}
            {gruposFiltrados.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                No hay duplicados que coincidan con el filtro.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {gruposFiltrados.map(grupo => {
                  const key = duplicadoKey(grupo);
                  return (
                    <GrupoFila
                      key={key}
                      grupo={grupo}
                      facturas={facturas}
                      isAprobado={aprobaciones.has(key)}
                      isExpanded={expandidos.has(key)}
                      onToggleExpand={() => toggleExpandido(key)}
                      onAprobar={() => onAprobar(key)}
                      onDesaprobar={() => onDesaprobar(key)}
                      onEditarFactura={(i) => {
                        onClose();
                        onEditarFactura(i);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="border-t border-gray-200 pt-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onClose();
              if (puedeGenerar) onGenerar();
            }}
            disabled={!puedeGenerar}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm ${
              puedeGenerar
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {puedeGenerar ? 'Generar facturas' : `Quedan ${pendientesTotal.length} por resolver`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors text-sm"
          >
            Volver
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FilterChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-oca-blue text-white border-oca-blue'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

interface GrupoFilaProps {
  grupo: DuplicadoGrupo;
  facturas: FacturaData[];
  isAprobado: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAprobar: () => void;
  onDesaprobar: () => void;
  onEditarFactura: (index: number) => void;
}

function GrupoFila({
  grupo,
  facturas,
  isAprobado,
  isExpanded,
  onToggleExpand,
  onAprobar,
  onDesaprobar,
  onEditarFactura
}: GrupoFilaProps) {
  const primera = facturas[grupo.indices[0]];
  const etiqueta = etiquetaTipo(grupo.tipo, primera?.empresa ?? '');
  const colorBorde = isAprobado ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40';
  const colorTipo = isAprobado ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100';

  return (
    <div className={`border rounded-lg ${colorBorde}`}>
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label={isExpanded ? 'Ocultar facturas' : 'Ver facturas'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${colorTipo} flex-shrink-0`}>
          {etiqueta}
        </span>
        <span className="text-sm font-mono text-gray-800 break-all flex-1 min-w-0">
          {grupo.valor}
        </span>
        <span className="text-xs text-gray-500 flex-shrink-0">
          ×{grupo.indices.length}
        </span>
        {isAprobado ? (
          <button
            onClick={onDesaprobar}
            className="text-xs px-2 py-1 rounded text-emerald-700 hover:bg-emerald-100 transition-colors flex-shrink-0"
          >
            Desmarcar
          </button>
        ) : (
          <button
            onClick={onAprobar}
            className="text-xs px-2.5 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex-shrink-0"
          >
            OK
          </button>
        )}
      </div>
      {isExpanded && (
        <ul className="border-t border-gray-200/60 px-2 py-1.5 space-y-1">
          {grupo.indices.map(idx => {
            const f = facturas[idx];
            if (!f) return null;
            return (
              <li key={idx} className="flex items-center justify-between gap-2 text-xs px-1 py-1">
                <div className="min-w-0 flex-grow">
                  <span className="text-gray-400">#{idx + 1}</span>{' '}
                  <span className="font-medium text-gray-800">{f.empresa}</span>
                  {f.centroCosto && (
                    <span className="text-gray-500"> · OT {f.centroCosto}</span>
                  )}
                  <span className="text-gray-500"> · ${f.monto.toLocaleString('es-CL')}</span>
                </div>
                <button
                  onClick={() => onEditarFactura(idx)}
                  className="text-oca-blue hover:underline flex-shrink-0"
                >
                  Editar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
