'use client';

import { useMemo } from 'react';
import Modal from './Modal';
import type { FacturaData } from '@/lib/excelGenerator';
import {
  DuplicadoGrupo,
  duplicadoKey,
  detectarDuplicados
} from '@/lib/validations';
import { usaLclConformidad } from '@/lib/data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  facturas: FacturaData[];
  aprobaciones: Set<string>;
  onAprobar: (key: string) => void;
  onDesaprobar: (key: string) => void;
  onEditarFactura: (index: number) => void;
  onGenerar: () => void;
}

// Etiqueta legible para el tipo: para Enel se prefiere LCL/Conformidad
function etiquetaTipo(grupo: DuplicadoGrupo, empresa: string): string {
  const usaLcl = usaLclConformidad(empresa);
  if (grupo.tipo === 'OC') return usaLcl ? 'Conformidad' : 'OC';
  return usaLcl ? 'LCL' : 'HES';
}

export default function ValidacionDuplicadosModal({
  isOpen,
  onClose,
  facturas,
  aprobaciones,
  onAprobar,
  onDesaprobar,
  onEditarFactura,
  onGenerar
}: Props) {
  const grupos = useMemo(() => detectarDuplicados(facturas), [facturas]);
  const pendientes = grupos.filter(g => !aprobaciones.has(duplicadoKey(g)));
  const aprobados = grupos.filter(g => aprobaciones.has(duplicadoKey(g)));
  const puedeGenerar = pendientes.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verificar duplicados">
      <div className="space-y-4">
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
            <p className="text-sm text-gray-600">
              Se encontraron <strong>{grupos.length}</strong> valor(es) repetido(s).
              Marca cada caso como <em>intencional</em> o ve a corregir la factura.
            </p>

            {pendientes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Pendientes ({pendientes.length})
                </h4>
                {pendientes.map(grupo => (
                  <GrupoCard
                    key={duplicadoKey(grupo)}
                    grupo={grupo}
                    facturas={facturas}
                    estado="pendiente"
                    onAprobar={() => onAprobar(duplicadoKey(grupo))}
                    onDesaprobar={() => onDesaprobar(duplicadoKey(grupo))}
                    onEditarFactura={(i) => {
                      onClose();
                      onEditarFactura(i);
                    }}
                  />
                ))}
              </div>
            )}

            {aprobados.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Marcados como intencionales ({aprobados.length})
                </h4>
                {aprobados.map(grupo => (
                  <GrupoCard
                    key={duplicadoKey(grupo)}
                    grupo={grupo}
                    facturas={facturas}
                    estado="aprobado"
                    onAprobar={() => onAprobar(duplicadoKey(grupo))}
                    onDesaprobar={() => onDesaprobar(duplicadoKey(grupo))}
                    onEditarFactura={(i) => {
                      onClose();
                      onEditarFactura(i);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row gap-2">
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
            {puedeGenerar ? 'Generar facturas' : `Quedan ${pendientes.length} por resolver`}
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

interface GrupoCardProps {
  grupo: DuplicadoGrupo;
  facturas: FacturaData[];
  estado: 'pendiente' | 'aprobado';
  onAprobar: () => void;
  onDesaprobar: () => void;
  onEditarFactura: (index: number) => void;
}

function GrupoCard({ grupo, facturas, estado, onAprobar, onDesaprobar, onEditarFactura }: GrupoCardProps) {
  const primera = facturas[grupo.indices[0]];
  const etiqueta = etiquetaTipo(grupo, primera?.empresa ?? '');
  const isAprobado = estado === 'aprobado';

  return (
    <div className={`border rounded-lg p-3 ${isAprobado ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isAprobado ? 'text-emerald-700' : 'text-amber-700'}`}>
            {etiqueta} repetida
          </p>
          <p className="text-sm font-mono text-gray-800 mt-0.5 break-all">{grupo.valor}</p>
        </div>
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
            className="text-xs px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex-shrink-0"
          >
            Marcar OK
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        {grupo.indices.map(idx => {
          const f = facturas[idx];
          if (!f) return null;
          return (
            <li key={idx} className="flex items-center justify-between gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
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
    </div>
  );
}
