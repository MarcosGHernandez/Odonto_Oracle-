'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../context';
import { AddPatientForm } from '@/components/AddPatientLogic';
import { useAuth } from '@clerk/nextjs';

const BACKEND_URL = '/api/proxy';

const t = {
  es: {
    title: 'GESTIÓN DE PACIENTES',
    subtitle: 'DIRECTORIO CLÍNICO · ACTIVO',
    searchPlaceholder: 'BUSCAR POR NOMBRE O ID...',
    newPatient: 'NUEVO PACIENTE',
    total: 'TOTAL',
    cols: ['NOMBRE COMPLETO', 'ID CLÍNICO', 'ALERGIAS', 'TELÉFONO', 'HISTORIAL', 'ACCIÓN'],
    ver: 'VER',
    noResults: 'SIN RESULTADOS.',
    loading: 'CARGANDO DIRECTORIO...',
    errorFetch: 'No se pudo cargar la lista de pacientes. Verifica la conexión con el backend.',
  },
  en: {
    title: 'PATIENT MANAGEMENT',
    subtitle: 'CLINICAL DIRECTORY · ACTIVE',
    searchPlaceholder: 'SEARCH BY NAME OR ID...',
    newPatient: 'NEW PATIENT',
    total: 'TOTAL',
    cols: ['FULL NAME', 'CLINICAL ID', 'ALLERGIES', 'PHONE', 'HISTORY', 'ACTION'],
    ver: 'VIEW',
    noResults: 'NO RESULTS.',
    loading: 'LOADING DIRECTORY...',
    errorFetch: 'Could not load patient list. Verify backend connection.',
  },
};

interface Paciente {
  _id: string;
  clinica_id: string;
  paciente_id: string;
  nombre: string;
  alergias?: string;
  historial_medico?: string;
  telefono?: string;
  email?: string;
}

export default function PacientesPage() {
  const { lang } = useDashboard();
  const labels = t[lang];

  const { orgId, userId } = useAuth();
  const clinicaId = orgId || userId || 'OO-CLINIC-001';

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);

  // ---------------------------------------------------------------------------
  // Carga de datos — reutilizable como callback para el refresh post-registro
  // ---------------------------------------------------------------------------
  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/pacientes/${clinicaId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPacientes(data.pacientes ?? []);
      } else {
        setFetchError(data.message ?? labels.errorFetch);
      }
    } catch (err: any) {
      setFetchError(`${labels.errorFetch} (${err.message})`);
    } finally {
      setLoading(false);
    }
  }, [labels.errorFetch, clinicaId]);

  // Carga inicial
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // ---------------------------------------------------------------------------
  // Filtro local por búsqueda
  // ---------------------------------------------------------------------------
  const filtered = pacientes.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.paciente_id?.toLowerCase().includes(search.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{labels.title}</h1>
        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 tracking-[0.3em]">{labels.subtitle}</p>
      </div>

      {/* Barra de búsqueda y acción */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full bg-white dark:bg-black border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">
            {labels.total}: <span className="text-slate-900 dark:text-white">{filtered.length}</span>
          </span>
          <button
            onClick={() => {
              setSelectedPatient(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            {labels.newPatient}
          </button>
        </div>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="border-2 border-slate-200 dark:border-zinc-800 py-16 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-zinc-700 animate-pulse">{labels.loading}</p>
        </div>
      )}

      {/* Error de fetch */}
      {!loading && fetchError && (
        <div className="border-2 border-rose-500 bg-rose-50 dark:bg-transparent p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">ERROR DE CONEXION</p>
          <p className="text-xs text-rose-500">{fetchError}</p>
        </div>
      )}

      {/* Tabla */}
      {!loading && !fetchError && (
        <div className="border-2 border-slate-900 dark:border-zinc-800 overflow-x-auto">
          {/* Cabecera */}
          <div className="hidden lg:grid grid-cols-6 bg-slate-900 dark:bg-zinc-900">
            {labels.cols.map(col => (
              <div key={col} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white dark:text-zinc-400">
                {col}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-zinc-700">{labels.noResults}</p>
            </div>
          ) : (
            filtered.map((p, i) => (
              <div
                key={p._id}
                className={`grid grid-cols-1 lg:grid-cols-6 border-b border-slate-200 dark:border-zinc-800 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-black' : 'bg-slate-50/30 dark:bg-zinc-950'}`}
              >
                {/* Nombre */}
                <div className="px-6 py-5 flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-slate-900 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                    {p.nombre?.charAt(0) ?? '?'}
                  </div>
                  <span className="text-xs font-bold">{p.nombre}</span>
                </div>
                {/* ID Clínico */}
                <div className="px-6 py-5 flex items-center">
                  <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 font-mono">{p.paciente_id}</span>
                </div>
                {/* Alergias */}
                <div className="px-6 py-5 flex items-center">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 truncate max-w-[160px]" title={p.alergias}>
                    {p.alergias || '—'}
                  </span>
                </div>
                {/* Teléfono */}
                <div className="px-6 py-5 flex items-center">
                  <span className="text-[10px] font-bold text-slate-900 dark:text-white font-mono">{p.telefono || '—'}</span>
                </div>
                {/* Historial (resumen) */}
                <div className="px-6 py-5 flex items-center">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[200px]" title={p.historial_medico}>
                    {p.historial_medico ? p.historial_medico.slice(0, 50) + '...' : '—'}
                  </span>
                </div>
                {/* Acción */}
                <div className="px-6 py-5 flex items-center">
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`${BACKEND_URL}/pacientes/${clinicaId}/${p.paciente_id}`);
                        if (res.ok) {
                          const data = await res.json();
                          if (data.status === 'success' && data.paciente) {
                            setSelectedPatient(data.paciente);
                          } else {
                            setSelectedPatient(p);
                          }
                        } else {
                          setSelectedPatient(p);
                        }
                      } catch (err) {
                        console.error('Error fetching fresh patient file:', err);
                        setSelectedPatient(p);
                      }
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 border-2 border-slate-900 dark:border-zinc-700 text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                  >
                    {labels.ver}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de nuevo paciente / editar paciente */}
      {isModalOpen && (
        <AddPatientForm
          clinicaId={clinicaId}
          initialData={selectedPatient}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPatient(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedPatient(null);
            fetchPacientes(); // Refresh reactivo sin recargar la página
          }}
        />
      )}
    </div>
  );
}
