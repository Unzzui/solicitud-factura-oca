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
      <div className="space-y-4">
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <svg className="w-8 h-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-700">Sin duplicados</p>
            <p className="text-xs text-gray-400 mt-1">
              {facturas.length} solicitudes verificadas
            </p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="flex items-baseline gap-4 text-sm text-gray-600">
              <span>
                <span className="text-lg font-medium text-gray-900">{grupos.length}</span>
                <span className="ml-1 text-xs text-gray-400">duplicados</span>
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-medium text-gray-900">{pendientesTotal.length}</span>
                <span className="ml-1 text-xs text-gray-400">pendientes</span>
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-medium text-gray-900">{aprobadosTotal.length}</span>
                <span className="ml-1 text-xs text-gray-400">aprobados</span>
              </span>
            </div>

            {/* Aceptar todos + nota de HES */}
            {pendientesTotal.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  La OC suele repetirse de forma legítima (varios EP sobre la misma OC).
                  La <span className="text-gray-900 font-medium">HES/LCL normalmente no debería repetirse</span> —
                  verifícalas antes de aceptar en masa.
                </p>
                <button
                  onClick={aprobarTodos}
                  className="w-full py-1.5 px-3 rounded border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Aceptar los {pendientesTotal.length} pendientes
                </button>
              </div>
            )}

            {/* Buscador */}
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar OC / HES / LCL…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              <div className="flex gap-1">
                <FilterChip active={filtroTipo === 'todos'} onClick={() => setFiltroTipo('todos')}>
                  Todos · {grupos.length}
                </FilterChip>
                <FilterChip active={filtroTipo === 'OC'} onClick={() => setFiltroTipo('OC')}>
                  OC · {conteosOC}
                </FilterChip>
                <FilterChip active={filtroTipo === 'HES'} onClick={() => setFiltroTipo('HES')}>
                  HES/LCL · {conteosHES}
                </FilterChip>
              </div>
              <span className="hidden sm:block w-px h-4 bg-gray-200" />
              <div className="flex gap-1">
                <FilterChip active={filtroEstado === 'pendientes'} onClick={() => setFiltroEstado('pendientes')}>
                  Pendientes
                </FilterChip>
                <FilterChip active={filtroEstado === 'aprobados'} onClick={() => setFiltroEstado('aprobados')}>
                  Aprobados
                </FilterChip>
                <FilterChip active={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')}>
                  Todos
                </FilterChip>
              </div>
            </div>

            {/* Acciones masivas */}
            {(pendientesVisibles.length > 0 || aprobadosVisibles.length > 0) && (
              <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                <span>{gruposFiltrados.length} visible(s)</span>
                <div className="flex-1" />
                {pendientesVisibles.length > 0 && (
                  <button
                    onClick={aprobarVisibles}
                    className="px-2.5 py-1 rounded text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Aceptar visibles ({pendientesVisibles.length})
                  </button>
                )}
                {aprobadosVisibles.length > 0 && (
                  <button
                    onClick={desaprobarVisibles}
                    className="px-2.5 py-1 rounded text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Desmarcar visibles ({aprobadosVisibles.length})
                  </button>
                )}
              </div>
            )}

            {/* Lista */}
            {gruposFiltrados.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                Sin resultados
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-[50vh] overflow-y-auto">
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

        <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onClose();
              if (puedeGenerar) onGenerar();
            }}
            disabled={!puedeGenerar}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
              puedeGenerar
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {puedeGenerar ? 'Generar facturas' : `Quedan ${pendientesTotal.length} por resolver`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
      className={`px-2.5 py-1 rounded transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100'
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

  return (
    <div className={isAprobado ? 'bg-gray-50/60' : ''}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-700 flex-shrink-0"
          aria-label={isExpanded ? 'Ocultar facturas' : 'Ver facturas'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 w-12 flex-shrink-0">
          {etiqueta}
        </span>
        <span className={`text-sm font-mono break-all flex-1 min-w-0 ${isAprobado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {grupo.valor}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
          ×{grupo.indices.length}
        </span>
        {isAprobado ? (
          <button
            onClick={onDesaprobar}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            Desmarcar
          </button>
        ) : (
          <button
            onClick={onAprobar}
            className="text-xs px-2.5 py-1 rounded text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            Aceptar
          </button>
        )}
      </div>
      {isExpanded && (
        <ul className="px-3 pb-2 pl-9 space-y-0.5">
          {grupo.indices.map(idx => {
            const f = facturas[idx];
            if (!f) return null;
            return (
              <li key={idx} className="flex items-center justify-between gap-2 text-xs py-0.5">
                <div className="min-w-0 flex-grow text-gray-500">
                  <span className="text-gray-300">#{idx + 1}</span>{' '}
                  <span className="text-gray-700">{f.empresa}</span>
                  {f.centroCosto && <span> · OT {f.centroCosto}</span>}
                  <span> · ${f.monto.toLocaleString('es-CL')}</span>
                </div>
                <button
                  onClick={() => onEditarFactura(idx)}
                  className="text-gray-500 hover:text-gray-900 hover:underline flex-shrink-0"
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
