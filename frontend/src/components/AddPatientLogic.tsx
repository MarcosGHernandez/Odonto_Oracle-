'use client';

import { useState } from 'react';
import { useDashboard } from '@/app/dashboard/context';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PatientFormData {
  nombre: string;
  telefono: string;
  email: string;
  clinica_id: string;
  paciente_id?: string;
  // Datos clínicos extendidos
  fecha_nacimiento: string;
  alergias: string;
  medicamentos_actuales: string;
  enfermedades_cronicas: string;
  historial_medico: string;
  // Signos vitales
  presion_arterial: string;
  frecuencia_cardiaca: string;
  peso_kg: string;
  estatura_cm: string;
}

interface PatientFormState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook de lógica
// ---------------------------------------------------------------------------

export function useAddPatient() {
  const [state, setState] = useState<PatientFormState>({
    loading: false,
    success: false,
    error: null,
  });

  const handleSubmitPaciente = async (data: PatientFormData) => {
    if (!data.nombre.trim()) {
      setState(s => ({ ...s, error: 'El nombre del paciente es obligatorio.' }));
      return;
    }
    if (!data.clinica_id.trim()) {
      setState(s => ({ ...s, error: 'El clinica_id es obligatorio para el aislamiento Multi-Tenant.' }));
      return;
    }

    setState({ loading: true, success: false, error: null });

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api/proxy';

      const response = await fetch(`${backendUrl}/webhook/paciente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: data.clinica_id,
          paciente_id: data.paciente_id, // Si existe hace update, si es null crea nuevo
          nombre: data.nombre,
          telefono: data.telefono,
          email: data.email,
          fecha_nacimiento: data.fecha_nacimiento,
          alergias: data.alergias,
          medicamentos_actuales: data.medicamentos_actuales,
          enfermedades_cronicas: data.enfermedades_cronicas,
          historial_medico: data.historial_medico,
          vitales: {
            presion_arterial: data.presion_arterial,
            frecuencia_cardiaca: data.frecuencia_cardiaca,
            peso_kg: data.peso_kg,
            estatura_cm: data.estatura_cm,
          },
        }),
      });

      const text = await response.text();

      if (!response.ok || text.startsWith('System Error')) {
        setState({ loading: false, success: false, error: text });
        return;
      }

      setState({ loading: false, success: true, error: null });
    } catch (err: any) {
      const msg = err?.message?.includes('Failed to fetch')
        ? 'No se pudo conectar al backend en 127.0.0.1:8080. Verifica que uvicorn esté corriendo.'
        : `Error inesperado al registrar el paciente: ${err?.message ?? 'Desconocido'}`;
      setState({ loading: false, success: false, error: msg });
    }
  };

  const resetState = () => setState({ loading: false, success: false, error: null });

  return { ...state, handleSubmitPaciente, resetState };
}

// ---------------------------------------------------------------------------
// Etiquetas UI
// ---------------------------------------------------------------------------

const LABELS = {
  es: {
    title: 'REGISTRAR NUEVO PACIENTE',
    sections: {
      datos: 'DATOS PERSONALES',
      clinico: 'INFORMACIÓN CLÍNICA',
      vitales: 'SIGNOS VITALES',
    },
    fields: {
      nombre: 'NOMBRE COMPLETO',
      telefono: 'TELÉFONO',
      email: 'EMAIL',
      fecha_nacimiento: 'FECHA DE NACIMIENTO',
      alergias: 'ALERGIAS CONOCIDAS',
      medicamentos_actuales: 'MEDICAMENTOS ACTUALES',
      enfermedades_cronicas: 'ENFERMEDADES CRÓNICAS',
      historial_medico: 'NOTAS DE HISTORIAL MÉDICO',
      presion_arterial: 'PRESIÓN ARTERIAL (ej. 120/80)',
      frecuencia_cardiaca: 'FREC. CARDÍACA (lpm)',
      peso_kg: 'PESO (kg)',
      estatura_cm: 'ESTATURA (cm)',
    },
    submit: 'REGISTRAR PACIENTE',
    cancel: 'CANCELAR',
    loading: 'REGISTRANDO...',
    success: 'PACIENTE REGISTRADO CON ÉXITO',
  },
  en: {
    title: 'REGISTER NEW PATIENT',
    sections: {
      datos: 'PERSONAL DATA',
      clinico: 'CLINICAL INFORMATION',
      vitales: 'VITAL SIGNS',
    },
    fields: {
      nombre: 'FULL NAME',
      telefono: 'PHONE',
      email: 'EMAIL',
      fecha_nacimiento: 'DATE OF BIRTH',
      alergias: 'KNOWN ALLERGIES',
      medicamentos_actuales: 'CURRENT MEDICATIONS',
      enfermedades_cronicas: 'CHRONIC CONDITIONS',
      historial_medico: 'MEDICAL HISTORY NOTES',
      presion_arterial: 'BLOOD PRESSURE (e.g. 120/80)',
      frecuencia_cardiaca: 'HEART RATE (bpm)',
      peso_kg: 'WEIGHT (kg)',
      estatura_cm: 'HEIGHT (cm)',
    },
    submit: 'REGISTER PATIENT',
    cancel: 'CANCEL',
    loading: 'REGISTERING...',
    success: 'PATIENT REGISTERED SUCCESSFULLY',
  },
};

// ---------------------------------------------------------------------------
// Sub-componente: Sección de formulario
// ---------------------------------------------------------------------------

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500">{title}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Campo de texto
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  textarea,
  rows = 3,
}: {
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  textarea?: boolean;
  rows?: number;
}) {
  const baseClass =
    'w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all disabled:opacity-40 placeholder:text-slate-300 dark:placeholder:text-zinc-700 placeholder:font-normal';

  return (
    <div className="space-y-1">
      <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`${baseClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Modal de generación de receta manual
// ---------------------------------------------------------------------------

interface GenerarRecetaModalProps {
  paciente: any;
  clinicaId: string;
  lang: 'es' | 'en';
  onClose: () => void;
  onSuccess: (url: string) => void;
}

function GenerarRecetaModal({ paciente, clinicaId, lang, onClose, onSuccess }: GenerarRecetaModalProps) {
  const [tipoDoc, setTipoDoc] = useState<'receta' | 'presupuesto' | 'tratamiento'>('receta');
  const [diagnostico, setDiagnostico] = useState('');
  const [contenido, setContenido] = useState('');
  const [idioma, setIdioma] = useState(lang === 'en' ? 'en' : 'es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TIPO_LABELS: Record<string, { es: string; en: string }> = {
    receta:      { es: 'Receta Médica',       en: 'Medical Prescription' },
    presupuesto: { es: 'Presupuesto Dental',  en: 'Dental Estimate' },
    tratamiento: { es: 'Plan de Tratamiento', en: 'Treatment Plan' },
  };

  const contenidoLabel = {
    receta:      { es: 'MEDICAMENTOS Y DOSIS', en: 'MEDICATIONS & DOSAGE' },
    presupuesto: { es: 'PARTIDAS DEL PRESUPUESTO', en: 'ESTIMATE ITEMS' },
    tratamiento: { es: 'PROCEDIMIENTOS DEL PLAN', en: 'TREATMENT PROCEDURES' },
  }[tipoDoc];

  const handleGenerar = async () => {
    if (!diagnostico.trim()) {
      setError(lang === 'es' ? 'El diagnóstico es obligatorio.' : 'Diagnosis is required.');
      return;
    }
    if (!contenido.trim()) {
      setError(lang === 'es' ? 'El contenido clínico es obligatorio.' : 'Clinical content is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contenido_medico = `Diagnóstico: ${diagnostico}\n\n${TIPO_LABELS[tipoDoc][lang === 'en' ? 'en' : 'es']}: ${contenido}`;

      const res = await fetch('/api/proxy/tools/pdf_generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_documento: tipoDoc,
          datos_paciente: {
            ...paciente,
            clinica_id: clinicaId,
          },
          contenido_medico,
          idioma,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // El backend devuelve { status, url_descarga, message }
      const url = data?.url_descarga || data?.data?.url_descarga || '';
      if (!url) {
        throw new Error(data?.message || (lang === 'es' ? 'No se obtuvo URL de descarga.' : 'No download URL received.'));
      }

      onSuccess(url);
    } catch (err: any) {
      setError(err.message || (lang === 'es' ? 'Error al generar el documento.' : 'Error generating document.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-black border-2 border-slate-900 dark:border-zinc-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-zinc-700 bg-slate-900 dark:bg-zinc-900 flex justify-between items-center flex-shrink-0">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
              {lang === 'es' ? 'GENERACIÓN MANUAL DE DOCUMENTO' : 'MANUAL DOCUMENT GENERATION'}
            </p>
            <p className="text-[11px] font-black uppercase tracking-widest text-white mt-0.5">
              {paciente?.nombre?.toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-60 transition-opacity cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Tipo de documento */}
          <div className="space-y-2">
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
              {lang === 'es' ? 'TIPO DE DOCUMENTO' : 'DOCUMENT TYPE'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['receta', 'presupuesto', 'tratamiento'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoDoc(t)}
                  className={`py-2.5 text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                    tipoDoc === t
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500 hover:border-slate-900 dark:hover:border-zinc-500'
                  }`}
                >
                  {TIPO_LABELS[t][lang === 'en' ? 'en' : 'es']}
                </button>
              ))}
            </div>
          </div>

          {/* Idioma */}
          <div className="space-y-2">
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
              {lang === 'es' ? 'IDIOMA DEL DOCUMENTO' : 'DOCUMENT LANGUAGE'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'es', label: 'Español' },
                { val: 'en', label: 'English' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIdioma(val)}
                  className={`py-2 text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                    idioma === val
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500 hover:border-slate-600 dark:hover:border-zinc-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
              {lang === 'es' ? 'DIAGNÓSTICO CLÍNICO' : 'CLINICAL DIAGNOSIS'} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={diagnostico}
              onChange={e => setDiagnostico(e.target.value)}
              disabled={loading}
              placeholder={lang === 'es' ? 'Ej: Caries profunda en molar 36 con compromiso pulpar...' : 'E.g: Deep caries on molar 36 with pulp compromise...'}
              className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all disabled:opacity-40 placeholder:text-slate-300 dark:placeholder:text-zinc-700 placeholder:font-normal resize-y"
            />
          </div>

          {/* Contenido clínico */}
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
              {contenidoLabel?.[lang === 'en' ? 'en' : 'es']} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              disabled={loading}
              placeholder={
                tipoDoc === 'receta'
                  ? (lang === 'es' ? 'Ej: Amoxicilina 500mg — 1 cápsula cada 8 hrs por 7 días...' : 'E.g: Amoxicillin 500mg — 1 capsule every 8hrs for 7 days...')
                  : tipoDoc === 'presupuesto'
                    ? (lang === 'es' ? 'Ej: Extracción dental $800, Resina anterior $1,200...' : 'E.g: Tooth extraction $800, Anterior resin $1,200...')
                    : (lang === 'es' ? 'Ej: Sesión 1 — Endodoncia molar 36. Sesión 2 — Corona...' : 'E.g: Session 1 — Endodontics molar 36. Session 2 — Crown...')
              }
              className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all disabled:opacity-40 placeholder:text-slate-300 dark:placeholder:text-zinc-700 placeholder:font-normal resize-y"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="border-2 border-rose-500 bg-rose-50 dark:bg-transparent px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">ERROR</p>
              <p className="text-xs text-rose-500">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t-2 border-slate-100 dark:border-zinc-900 flex-shrink-0 bg-white dark:bg-black">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 border-2 border-slate-900 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all cursor-pointer text-center disabled:opacity-40"
          >
            {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
          </button>
          <button
            type="button"
            onClick={handleGenerar}
            disabled={loading}
            className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer text-center flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {lang === 'es' ? 'GENERANDO...' : 'GENERATING...'}
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {lang === 'es' ? 'GENERAR DOCUMENTO' : 'GENERATE DOCUMENT'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente para renderizar la tarjeta de cada documento
// ---------------------------------------------------------------------------

interface AddPatientFormProps {
  clinicaId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any; // Paciente existente para edición
}

function DocumentoCard({ doc, lang }: { doc: any; lang: 'es' | 'en' }) {
  const [expanded, setExpanded] = useState(false);
  
  const docTipo = doc.tipo || doc.nombre || 'documento';
  const isReceta = docTipo.toLowerCase().includes('receta');
  const isPresupuesto = docTipo.toLowerCase().includes('presupuesto') || docTipo.toLowerCase().includes('cotizacion') || docTipo.toLowerCase().includes('cotización') || docTipo.toLowerCase().includes('estimado');
  const isTratamiento = docTipo.toLowerCase().includes('tratamiento') || docTipo.toLowerCase().includes('plan');
  
  // Colores e iconos temáticos
  let badgeColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/80';
  let badgeLabel = docTipo.toUpperCase();
  
  if (isReceta) {
    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80';
    badgeLabel = lang === 'es' ? 'RECETA MÉDICA' : 'PRESCRIPTION';
  } else if (isPresupuesto) {
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border-amber-200 dark:border-amber-800/80';
    badgeLabel = lang === 'es' ? 'PRESUPUESTO DENTAL' : 'ESTIMATE';
  } else if (isTratamiento) {
    badgeColor = 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-400 border-sky-200 dark:border-sky-800/80';
    badgeLabel = lang === 'es' ? 'PLAN DE TRATAMIENTO' : 'TREATMENT PLAN';
  }

  // Normalizar y reescribir dinámicamente puertos obsoletos (8000) a puerto activo (8080)
  let downloadUrl = doc.url || '';
  if (downloadUrl.includes('localhost:8000')) {
    downloadUrl = downloadUrl.replace('localhost:8000', 'localhost:8080');
  } else if (downloadUrl.includes('127.0.0.1:8000')) {
    downloadUrl = downloadUrl.replace('127.0.0.1:8000', '127.0.0.1:8080');
  }

  return (
    <div className="backdrop-blur-md bg-slate-50/30 dark:bg-zinc-900/30 border-2 border-slate-900 dark:border-zinc-800 p-4 transition-all duration-300 hover:shadow-lg flex flex-col gap-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black border px-2 py-0.5 tracking-wider ${badgeColor}`}>
            {badgeLabel}
          </span>
          <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500">
            {doc.fecha || '—'}
          </span>
        </div>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-85 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {lang === 'es' ? 'DESCARGAR' : 'DOWNLOAD'}
        </a>
      </div>
      
      {/* Vista previa del contenido */}
      <div className="border-t border-dashed border-slate-200 dark:border-zinc-800 pt-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex justify-between items-center text-left cursor-pointer group"
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 transition-colors">
            {lang === 'es' ? 'CONTENIDO CLÍNICO' : 'CLINICAL CONTENT'}
          </span>
          <svg
            className={`w-3 h-3 text-slate-400 dark:text-zinc-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expanded ? (
          <div className="bg-slate-50 dark:bg-zinc-950/80 p-3 mt-2 border border-slate-200 dark:border-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
            {doc.contenido || 'Sin contenido registrado.'}
          </div>
        ) : (
          <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 truncate">
            {doc.contenido || 'Sin contenido registrado.'}
          </p>
        )}
      </div>
    </div>
  );
}

export function AddPatientForm({ clinicaId, onClose, onSuccess, initialData }: AddPatientFormProps) {
  const { lang } = useDashboard();
  const labels = LABELS[lang];
  const { loading, success, error, handleSubmitPaciente, resetState } = useAddPatient();
  
  const [activeTab, setActiveTab] = useState<'expediente' | 'documentos'>('expediente');
  const [deleting, setDeleting] = useState(false);

  // --- Estado del modal de generación de receta manual ---
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  const [recetaGenerada, setRecetaGenerada] = useState<{ url: string; tipo: string } | null>(null);

  const handleDelete = async () => {
    if (!initialData?.paciente_id) return;
    
    const confirmMsg = lang === 'es'
      ? `¿Estás seguro de que deseas eliminar permanentemente el expediente de ${initialData.nombre}? Esta acción eliminará en cascada todas sus citas y no se puede deshacer.`
      : `Are you sure you want to permanently delete the clinical file of ${initialData.nombre}? This will delete all their appointments in cascade and cannot be undone.`;
      
    if (!window.confirm(confirmMsg)) return;
    
    setDeleting(true);
    try {
      const response = await fetch('/api/proxy/tools/delete_patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          paciente_id: initialData.paciente_id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          alert(lang === 'es' ? 'Expediente eliminado con éxito.' : 'File deleted successfully.');
          onSuccess?.();
          handleClose();
        } else {
          alert(data.message || 'Error');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      alert(lang === 'es' ? `Error al eliminar: ${err.message}` : `Error deleting: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const [form, setForm] = useState({
    nombre: initialData?.nombre || '',
    telefono: initialData?.telefono || '',
    email: initialData?.email || '',
    fecha_nacimiento: initialData?.fecha_nacimiento || '',
    // Clínico
    alergias: initialData?.alergias || '',
    medicamentos_actuales: initialData?.medicamentos_actuales || '',
    enfermedades_cronicas: initialData?.enfermedades_cronicas || '',
    historial_medico: initialData?.historial_medico || '',
    // Vitales
    presion_arterial: initialData?.vitales?.presion_arterial || '',
    frecuencia_cardiaca: initialData?.vitales?.frecuencia_cardiaca || '',
    peso_kg: initialData?.vitales?.peso_kg || '',
    estatura_cm: initialData?.vitales?.estatura_cm || '',
  });

  const set = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'expediente') return;
    await handleSubmitPaciente({ 
        ...form, 
        clinica_id: clinicaId, 
        paciente_id: initialData?.paciente_id 
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (success) {
    setTimeout(() => { onSuccess?.(); handleClose(); }, 1500);
  }

  // Título dinámico
  const modalTitle = initialData 
    ? (lang === 'es' ? `EXPEDIENTE: ${initialData.nombre.toUpperCase()}` : `FILE: ${initialData.nombre.toUpperCase()}`)
    : labels.title;

  return (
    <>
      {/* Modal principal del expediente */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-black border-2 border-slate-900 dark:border-zinc-800 max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">

          {/* Header fijo */}
          <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{modalTitle}</span>
            <button onClick={handleClose} className="text-white hover:opacity-60 transition-opacity cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Control de Pestañas (si es paciente existente) */}
          {initialData && (
            <div className="flex border-b-2 border-slate-900 dark:border-zinc-800 flex-shrink-0 bg-slate-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setActiveTab('expediente')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-r-2 border-slate-900 dark:border-zinc-800 transition-all cursor-pointer ${
                  activeTab === 'expediente'
                    ? 'bg-white dark:bg-black text-slate-900 dark:text-white border-b-2 border-b-slate-900 dark:border-b-white'
                    : 'text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900'
                }`}
              >
                {lang === 'es' ? 'Expediente Clínico' : 'Clinical File'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documentos')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  activeTab === 'documentos'
                    ? 'bg-white dark:bg-black text-slate-900 dark:text-white border-b-2 border-b-slate-900 dark:border-b-white'
                    : 'text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900'
                }`}
              >
                {lang === 'es' ? 'Historial de Documentos' : 'Document History'} ({initialData.documentos?.length || 0})
              </button>
            </div>
          )}

          {/* Contenido con scroll */}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-6">
              
              {activeTab === 'expediente' ? (
                <div className="space-y-8">
                  {/* Alertas */}
                  {success && (
                    <div className="border-2 border-emerald-500 bg-emerald-50 dark:bg-transparent px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{labels.success}</p>
                    </div>
                  )}
                  {error && (
                    <div className="border-2 border-rose-500 bg-rose-50 dark:bg-transparent px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">ERROR</p>
                      <p className="text-xs text-rose-500">{error}</p>
                    </div>
                  )}

                  {/* Sección 1: Datos personales */}
                  <FormSection title={labels.sections.datos}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Field label={labels.fields.nombre} required value={form.nombre} onChange={set('nombre')} disabled={loading || success} />
                      </div>
                      <Field label={labels.fields.telefono} type="tel" value={form.telefono} onChange={set('telefono')} disabled={loading || success} />
                      <Field label={labels.fields.email} type="email" value={form.email} onChange={set('email')} disabled={loading || success} />
                      <Field label={labels.fields.fecha_nacimiento} type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} disabled={loading || success} />
                    </div>
                  </FormSection>

                  {/* Sección 2: Información clínica */}
                  <FormSection title={labels.sections.clinico}>
                    <Field label={labels.fields.alergias} value={form.alergias} onChange={set('alergias')} disabled={loading || success} placeholder="Penicilina, látex, AINE..." textarea rows={2} />
                    <Field label={labels.fields.medicamentos_actuales} value={form.medicamentos_actuales} onChange={set('medicamentos_actuales')} disabled={loading || success} placeholder="Metformina 500mg, Losartán 50mg..." textarea rows={2} />
                    <Field label={labels.fields.enfermedades_cronicas} value={form.enfermedades_cronicas} onChange={set('enfermedades_cronicas')} disabled={loading || success} placeholder="Diabetes Tipo 2, Hipertensión..." textarea rows={2} />
                    <Field label={labels.fields.historial_medico} value={form.historial_medico} onChange={set('historial_medico')} disabled={loading || success} placeholder="Observaciones clínicas relevantes..." textarea rows={3} />
                  </FormSection>

                  {/* Sección 3: Signos vitales */}
                  <FormSection title={labels.sections.vitales}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Field label={labels.fields.presion_arterial} value={form.presion_arterial} onChange={set('presion_arterial')} disabled={loading || success} placeholder="120/80" />
                      <Field label={labels.fields.frecuencia_cardiaca} type="number" value={form.frecuencia_cardiaca} onChange={set('frecuencia_cardiaca')} disabled={loading || success} placeholder="72" />
                      <Field label={labels.fields.peso_kg} type="number" value={form.peso_kg} onChange={set('peso_kg')} disabled={loading || success} placeholder="70" />
                      <Field label={labels.fields.estatura_cm} type="number" value={form.estatura_cm} onChange={set('estatura_cm')} disabled={loading || success} placeholder="170" />
                    </div>
                  </FormSection>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Banner de receta recién generada */}
                  {recetaGenerada && (
                    <div className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                          {lang === 'es' ? 'DOCUMENTO GENERADO EXITOSAMENTE' : 'DOCUMENT GENERATED SUCCESSFULLY'}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5 font-semibold">
                          {recetaGenerada.tipo.toUpperCase()}
                        </p>
                      </div>
                      <a
                        href={recetaGenerada.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 px-4 py-2 bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {lang === 'es' ? 'ABRIR PDF' : 'OPEN PDF'}
                      </a>
                    </div>
                  )}

                  {/* Historial de Documentos Archivados */}
                  {initialData?.documentos && initialData.documentos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {initialData.documentos.map((doc: any, idx: number) => (
                        <DocumentoCard key={idx} doc={doc} lang={lang} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                      <svg className="w-12 h-12 text-slate-400 dark:text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                        {lang === 'es' ? 'No hay documentos archivados en este expediente.' : 'No archived documents in this file.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer fijo con acciones condicionales */}
            <div className="flex gap-4 p-6 border-t-2 border-slate-100 dark:border-zinc-900 flex-shrink-0 bg-white dark:bg-black">
              {activeTab === 'expediente' ? (
                <>
                  {initialData && (
                    <button
                      type="button"
                      disabled={loading || deleting}
                      onClick={handleDelete}
                      className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-center disabled:opacity-40"
                    >
                      {deleting ? (lang === 'es' ? 'ELIMINANDO...' : 'DELETING...') : (lang === 'es' ? 'ELIMINAR' : 'DELETE')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 border-2 border-slate-900 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all cursor-pointer text-center"
                  >
                    {labels.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success || deleting}
                    className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer text-center"
                  >
                    {loading ? labels.loading : (initialData ? (lang === 'es' ? 'GUARDAR' : 'SAVE') : labels.submit)}
                  </button>
                </>
              ) : (
                <div className="w-full flex gap-3">
                  {/* Botón de generar receta manual */}
                  {initialData && (
                    <button
                      type="button"
                      onClick={() => setShowRecetaModal(true)}
                      className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {lang === 'es' ? 'GENERAR DOCUMENTO' : 'GENERATE DOCUMENT'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 border-2 border-slate-900 dark:border-zinc-700 text-white bg-transparent dark:text-zinc-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all cursor-pointer text-center text-slate-900"
                  >
                    {lang === 'es' ? 'CERRAR EXPEDIENTE' : 'CLOSE FILE'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Modal de generación manual de receta/presupuesto/tratamiento */}
      {showRecetaModal && initialData && (
        <GenerarRecetaModal
          paciente={initialData}
          clinicaId={clinicaId}
          lang={lang}
          onClose={() => setShowRecetaModal(false)}
          onSuccess={(url) => {
            setRecetaGenerada({ url, tipo: lang === 'es' ? 'Documento clínico generado' : 'Clinical document generated' });
            setShowRecetaModal(false);
          }}
        />
      )}
    </>
  );
}
