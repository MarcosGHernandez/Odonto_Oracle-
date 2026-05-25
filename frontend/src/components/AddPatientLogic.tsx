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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';

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
        ? 'No se pudo conectar al backend en 127.0.0.1:8000. Verifica que uvicorn esté corriendo.'
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
// Componente principal del formulario
// ---------------------------------------------------------------------------

interface AddPatientFormProps {
  clinicaId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any; // Paciente existente para edición
}

// Sub-componente para renderizar la tarjeta de cada documento
// Sub-componente para renderizar la tarjeta de cada documento
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
          href={doc.url}
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
          className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 mb-1 transition-colors"
        >
          <span>{lang === 'es' ? 'Contenido del Documento' : 'Document Content'}</span>
          <svg
            className={`w-3 h-3 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
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
                {/* Historial de Documentos Archivados */}
                {initialData?.documentos && initialData.documentos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {initialData.documentos.map((doc: any, idx: number) => (
                      <DocumentoCard key={idx} doc={doc} lang={lang} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
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
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border-2 border-slate-900 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all cursor-pointer text-center"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer text-center"
                >
                  {loading ? labels.loading : labels.submit}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer text-center"
              >
                {lang === 'es' ? 'CERRAR EXPEDIENTE' : 'CLOSE FILE'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
