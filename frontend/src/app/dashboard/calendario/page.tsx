'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../context';
import { useAuth } from '@clerk/nextjs';

const BACKEND_URL = '/api/proxy';

const t = {
  es: {
    title: 'AGENDA DE CITAS',
    subtitle: 'CALENDARIO CLÍNICO · TIEMPO REAL',
    loading: 'CARGANDO CITAS...',
    errorFetch: 'No se pudo cargar la agenda. Verifica la conexión con el backend.',
    monthly: 'MENSUAL',
    weekly: 'SEMANAL',
    noAppointments: 'Sin citas agendadas.',
    today: 'HOY',
    prev: 'ANTERIOR',
    next: 'SIGUIENTE',
    detailTitle: 'DETALLES DE LA CITA',
    patient: 'PACIENTE',
    time: 'HORA',
    diagnostic: 'DIAGNÓSTICO',
        treatment: 'TRATAMIENTO',
    notes: 'NOTAS ADICIONALES',
    patientId: 'ID PACIENTE',
    closeDetail: 'CERRAR',
    selectDay: 'SELECCIONA UN DÍA PARA VER CITAS',
    days: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'],
    months: [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ],
    status: 'ESTADO',
    completed: 'COMPLETADA',
    pending: 'PENDIENTE',
    markCompleted: 'COMPLETAR CITA',
    historyTitle: 'HISTORIAL DE CITAS COMPLETADAS',
    noHistory: 'Sin citas completadas en el historial.',
    completeModalTitle: 'REGISTRAR Y COMPLETAR CONSULTA',
    saveComplete: 'REGISTRAR CONSULTA'
  },
  en: {
    title: 'APPOINTMENTS AGENDA',
    subtitle: 'CLINICAL CALENDAR · REAL-TIME',
    loading: 'LOADING APPOINTMENTS...',
    errorFetch: 'Could not load agenda. Verify backend connection.',
    monthly: 'MONTHLY',
    weekly: 'WEEKLY',
    noAppointments: 'No appointments scheduled.',
    today: 'TODAY',
    prev: 'PREV',
    next: 'NEXT',
    detailTitle: 'APPOINTMENT DETAILS',
    patient: 'PATIENT',
    time: 'TIME',
    diagnostic: 'DIAGNOSIS',
    treatment: 'TREATMENT',
    notes: 'ADDITIONAL NOTES',
    patientId: 'PATIENT ID',
    closeDetail: 'CLOSE',
    selectDay: 'SELECT A DAY TO VIEW APPOINTMENTS',
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    months: [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ],
    status: 'STATUS',
    completed: 'COMPLETED',
    pending: 'PENDING',
    markCompleted: 'COMPLETE APPOINTMENT',
    historyTitle: 'COMPLETED APPOINTMENTS HISTORY',
    noHistory: 'No completed appointments in history.',
    completeModalTitle: 'RECORD & COMPLETE CONSULTATION',
    saveComplete: 'RECORD CONSULTATION'
  }
};

interface Cita {
  _id: string;
  clinica_id: string;
  paciente_id: string;
  nombre_paciente: string;
  fecha_consulta: string;
  diagnostico?: string;
  tratamiento?: string;
  notas_adicionales?: string;
  estado?: string;
  fecha_completada?: string;
}

export default function CalendarioPage() {
  const { lang } = useDashboard();
  const labels = t[lang];

  const { orgId, userId } = useAuth();
  const clinicaId = orgId || userId || 'OO-CLINIC-001';

  // State
  const [appointments, setAppointments] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');

  // Navegación de Fecha
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeAppointment, setActiveAppointment] = useState<Cita | null>(null);

  // Estados del Formulario y Modal Interactivo
  const [newAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAppointmentId, setEditAppointmentId] = useState('');
  const [formPatientId, setFormPatientId] = useState('');
  const [formManualPatientId, setFormManualPatientId] = useState('');
  const [formFecha, setFormFecha] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [formHora, setFormHora] = useState('09:00');
  const [formDiagnostico, setFormDiagnostico] = useState('');
  const [formTratamiento, setFormTratamiento] = useState('');
  const [formNotas, setFormNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados y Handlers para Cierre/Completado de consulta
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeDiagnostico, setCompleteDiagnostico] = useState('');
  const [completeTratamiento, setCompleteTratamiento] = useState('');
  const [completeNotas, setCompleteNotas] = useState('');

  const handleCompleteClick = () => {
    if (!activeAppointment) return;
    setCompleteDiagnostico(activeAppointment.diagnostico || '');
    setCompleteTratamiento(activeAppointment.tratamiento || '');
    setCompleteNotas(activeAppointment.notas_adicionales || '');
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${BACKEND_URL}/tools/complete_appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          appointment_id: activeAppointment._id,
          diagnostico: completeDiagnostico,
          tratamiento: completeTratamiento,
          notas_adicionales: completeNotas
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === 'success') {
        setToastMessage(lang === 'es' ? '¡CONSULTA COMPLETADA Y REGISTRADA!' : 'CONSULTATION COMPLETED & RECORDED!');
        
        // Actualizar activeAppointment en caliente
        setActiveAppointment({
          ...activeAppointment,
          estado: 'completada',
          diagnostico: completeDiagnostico,
          tratamiento: completeTratamiento,
          notas_adicionales: completeNotas
        });

        setCompleteModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(data.message || (lang === 'es' ? 'Error al completar cita.' : 'Failed to complete appointment.'));
      }
    } catch (err: any) {
      alert(`${lang === 'es' ? 'Error al conectar con backend' : 'Backend connection error'}: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const handleModifyClick = () => {
    if (!activeAppointment) return;
    setIsEditing(true);
    setEditAppointmentId(activeAppointment._id);
    
    // Buscar si existe en patients para pre-seleccionar
    const pExist = patients.some(p => p.paciente_id === activeAppointment.paciente_id);
    if (pExist) {
      setFormPatientId(activeAppointment.paciente_id);
      setFormManualPatientId('');
    } else {
      setFormPatientId('MANUAL');
      setFormManualPatientId(activeAppointment.paciente_id);
    }
    
    setFormFecha(getAppointmentDateString(activeAppointment.fecha_consulta));
    setFormHora(getAppointmentTimeString(activeAppointment.fecha_consulta));
    setFormDiagnostico(activeAppointment.diagnostico || '');
    setFormTratamiento(activeAppointment.tratamiento || '');
    setFormNotas(activeAppointment.notas_adicionales || '');
    setNewAppointmentModalOpen(true);
  };

  const handleCancelClick = async () => {
    if (!activeAppointment) return;
    const confirmCancel = window.confirm(
      lang === 'es' 
        ? '¿Estás seguro de que deseas cancelar esta cita?' 
        : 'Are you sure you want to cancel this appointment?'
    );
    if (!confirmCancel) return;

    try {
      const res = await fetch(`${BACKEND_URL}/tools/cancel_appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          appointment_id: activeAppointment._id
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') {
        setToastMessage(lang === 'es' ? '¡CITA CANCELADA CON ÉXITO!' : 'APPOINTMENT CANCELED!');
        setActiveAppointment(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(data.message || 'Error');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch appointments
  useEffect(() => {
    const fetchAgenda = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // cache-busting: ?t=... garantiza fetch fresco en cada montaje/tab-switch
        const res = await fetch(
          `${BACKEND_URL}/clinica/agenda/${clinicaId}?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status === 'success') {
          setAppointments(data.agenda ?? []);
        } else {
          setFetchError(data.message ?? labels.errorFetch);
        }
      } catch (err: any) {
        setFetchError(`${labels.errorFetch} (${err.message})`);
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, lang, refreshTrigger]);


  // Cargar lista de pacientes
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const res = await fetch(
          `${BACKEND_URL}/pacientes/${clinicaId}?t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setPatients(data.pacientes ?? []);
          }
        }
      } catch (err) {
        console.error("Error loading patients:", err);
      } finally {
        setLoadingPatients(false);
      }
    };
    if (clinicaId) {
      loadPatients();
    }
  }, [clinicaId]);

  // Efecto del Toast Notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Form submission handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validar ID del paciente
    const patientId = formPatientId === 'MANUAL' || formPatientId === '' ? formManualPatientId : formPatientId;
    if (!patientId) {
      alert(lang === 'es' ? 'Por favor ingresa un ID de paciente.' : 'Please enter a patient ID.');
      setSubmitting(false);
      return;
    }

    const payload = isEditing 
      ? {
          clinica_id: clinicaId,
          appointment_id: editAppointmentId,
          fecha_consulta: `${formFecha} ${formHora}`,
          diagnostico: formDiagnostico,
          tratamiento: formTratamiento,
          notas_adicionales: formNotas,
        }
      : {
          clinica_id: clinicaId,
          paciente_id: patientId,
          fecha_consulta: `${formFecha} ${formHora}`,
          diagnostico: formDiagnostico,
          tratamiento: formTratamiento,
          notas_adicionales: formNotas,
        };

    const endpoint = isEditing ? '/tools/modify_appointment' : '/tools/schedule_appointment';

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.status === 'success') {
        setToastMessage(
          isEditing
            ? (lang === 'es' ? '¡CITA MODIFICADA CON ÉXITO!' : 'APPOINTMENT MODIFIED!')
            : (lang === 'es' ? '¡CITA GUARDADA CON ÉXITO!' : 'APPOINTMENT BOOKED!')
        );
        
        // Si estamos modificando, actualizar activeAppointment en caliente
        if (isEditing) {
          const matchedPatient = patients.find(p => p.paciente_id === patientId);
          setActiveAppointment({
            _id: editAppointmentId,
            clinica_id: clinicaId,
            paciente_id: patientId,
            nombre_paciente: matchedPatient ? matchedPatient.nombre : patientId,
            fecha_consulta: `${formFecha} ${formHora}`,
            diagnostico: formDiagnostico,
            tratamiento: formTratamiento,
            notas_adicionales: formNotas
          });
        }
        
        // Reset form & states
        setNewAppointmentModalOpen(false);
        setIsEditing(false);
        setEditAppointmentId('');
        setFormPatientId('');
        setFormManualPatientId('');
        setFormDiagnostico('');
        setFormTratamiento('');
        setFormNotas('');
        
        // Actualizar vista al día de la cita
        const [y, m, d] = formFecha.split('-').map(Number);
        const newAppDate = new Date(y, m - 1, d);
        setCurrentDate(newAppDate);
        setSelectedDate(newAppDate);

        // Trigger list reload
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(data.message || (lang === 'es' ? 'Error al guardar.' : 'Save failed.'));
      }
    } catch (err: any) {
      alert(`${lang === 'es' ? 'Error al conectar con backend' : 'Backend connection error'}: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers de Fecha
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    // Map Sunday (0) to 6, Monday (1) to 0, etc.
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getAppointmentDateString = (fechaStr: string) => {
    if (!fechaStr) return '';
    return fechaStr.replace('T', ' ').split(' ')[0];
  };

  const getAppointmentTimeString = (fechaStr: string) => {
    if (!fechaStr) return '--:--';
    const normalized = fechaStr.replace('T', ' ');
    const parts = normalized.split(' ');
    if (parts.length > 1) {
      const timeParts = parts[1].split(':');
      return timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : parts[1];
    }
    return '--:--';
  };

  // Agrupar citas por fecha YYYY-MM-DD
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Cita[]> = {};
    appointments.forEach(app => {
      const dStr = getAppointmentDateString(app.fecha_consulta);
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(app);
    });
    return map;
  }, [appointments]);

  // Navegar Meses
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Generar cuadrícula mensual
  const monthCells = useMemo(() => {
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const totalDays = getDaysInMonth(year, month);
    const prevMonthTotalDays = getDaysInMonth(year, month - 1);

    const cells = [];

    // Celdas del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const cellDate = new Date(year, month - 1, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: false,
        date: cellDate,
        dateStr: formatDateString(cellDate)
      });
    }

    // Celdas del mes actual
    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(year, month, i);
      cells.push({
        dayNum: i,
        isCurrentMonth: true,
        date: cellDate,
        dateStr: formatDateString(cellDate)
      });
    }

    // Completar celdas hasta múltiplo de 7
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const cellDate = new Date(year, month + 1, i);
      cells.push({
        dayNum: i,
        isCurrentMonth: false,
        date: cellDate,
        dateStr: formatDateString(cellDate)
      });
    }

    return cells;
  }, [year, month]);

  // Generar cuadrícula semanal
  const weekCells = useMemo(() => {
    // Encontrar el lunes de la semana de currentDate
    const currentDay = currentDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + distanceToMonday);

    const cells = [];
    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(monday);
      cellDate.setDate(monday.getDate() + i);
      cells.push({
        date: cellDate,
        dateStr: formatDateString(cellDate)
      });
    }
    return cells;
  }, [currentDate]);

  // Navegar Semanas
  const handlePrevWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  };

  // Citas del día seleccionado
  const selectedDateStr = useMemo(() => formatDateString(selectedDate), [selectedDate]);
  const selectedAppointments = useMemo(() => {
    return appointmentsByDate[selectedDateStr] ?? [];
  }, [appointmentsByDate, selectedDateStr]);

  return (
    <div className="space-y-8 flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{labels.title}</h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 tracking-[0.3em] uppercase">{labels.subtitle}</p>
        </div>

        <button
          onClick={() => {
            setFormFecha(formatDateString(selectedDate));
            setNewAppointmentModalOpen(true);
          }}
          className="px-6 py-3 bg-slate-950 text-white dark:bg-white dark:text-black font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-all border border-transparent shadow-md self-start sm:self-center"
        >
          {lang === 'es' ? 'AGENDAR CITA' : 'BOOK APPOINTMENT'}
        </button>

        {/* Controles de Vista */}
        <div className="flex border border-slate-200 dark:border-zinc-800 p-1 bg-white dark:bg-black w-fit self-start sm:self-center">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all uppercase ${
              viewMode === 'monthly'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {labels.monthly}
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all uppercase ${
              viewMode === 'weekly'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {labels.weekly}
          </button>
        </div>
      </div>

      {/* Controles del Navegador */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-4 py-2 border-2 border-slate-950 dark:border-zinc-700 hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-black text-[9px] font-black uppercase tracking-widest transition-all"
          >
            {labels.today}
          </button>
          <div className="flex border border-slate-200 dark:border-zinc-800 p-1 bg-white dark:bg-black">
            <button
              onClick={viewMode === 'monthly' ? handlePrevMonth : handlePrevWeek}
              className="px-3 py-1 text-xs font-black border-r border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-white transition-all"
            >
              &larr;
            </button>
            <button
              onClick={viewMode === 'monthly' ? handleNextMonth : handleNextWeek}
              className="px-3 py-1 text-xs font-black hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-800 dark:text-white transition-all"
            >
              &rarr;
            </button>
          </div>
        </div>

        <h2 className="text-sm font-black tracking-[0.25em] uppercase text-slate-900 dark:text-white">
          {viewMode === 'monthly'
            ? `${labels.months[month]} ${year}`
            : `SEMANA DE ${labels.months[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
        </h2>
      </div>

      {/* Grid y Sidebar Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1">
        {/* Calendario Cuadrícula */}
        <div className="xl:col-span-3 flex flex-col">
          {/* Cabecera de Días */}
          <div className="grid grid-cols-7 border-t border-x border-slate-900 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900">
            {labels.days.map(d => (
              <div key={d} className="py-3 text-center text-[9px] font-black uppercase tracking-widest text-white dark:text-zinc-400">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="border-2 border-slate-900 dark:border-zinc-800 py-32 text-center flex-1 flex items-center justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 animate-pulse">
                {labels.loading}
              </p>
            </div>
          ) : fetchError ? (
            <div className="border-2 border-rose-500 bg-rose-50 dark:bg-transparent p-6 text-center flex-1 flex flex-col items-center justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">ERROR</p>
              <p className="text-xs text-rose-500 max-w-md">{fetchError}</p>
            </div>
          ) : viewMode === 'monthly' ? (
            /* Vista Mensual */
            <div className="grid grid-cols-7 border-l border-t border-slate-900 dark:border-zinc-800 bg-slate-200 dark:bg-zinc-950">
              {monthCells.map((cell, idx) => {
                const dayApps = appointmentsByDate[cell.dateStr] ?? [];
                const isSelected = formatDateString(selectedDate) === cell.dateStr;
                const isTodayStr = formatDateString(new Date()) === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      setActiveAppointment(null);
                      setFormFecha(cell.dateStr);
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(cell.date);
                      setActiveAppointment(null);
                      setFormFecha(cell.dateStr);
                      setNewAppointmentModalOpen(true);
                    }}
                    className={`min-h-[100px] sm:min-h-[120px] p-2 border-r border-b border-slate-900 dark:border-zinc-800 cursor-pointer flex flex-col justify-between transition-all group ${
                      cell.isCurrentMonth
                        ? 'bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-zinc-900/30'
                        : 'bg-slate-50/50 dark:bg-zinc-950 text-slate-300 dark:text-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-900/10'
                    } ${isSelected ? 'ring-2 ring-slate-950 dark:ring-white z-10' : ''}`}
                  >
                    {/* Número de Día */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-black ${
                          isTodayStr
                            ? 'w-5 h-5 bg-slate-950 text-white dark:bg-white dark:text-black flex items-center justify-center rounded-none font-black font-mono'
                            : cell.isCurrentMonth
                              ? 'text-slate-900 dark:text-zinc-400 font-mono'
                              : 'text-slate-300 dark:text-zinc-700 font-mono'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {dayApps.length > 0 && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 border border-slate-900 dark:border-zinc-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white">
                          {dayApps.length}
                        </span>
                      )}
                    </div>

                    {/* Mini Citas */}
                    <div className="flex-1 flex flex-col justify-end space-y-1 overflow-hidden">
                      {dayApps.slice(0, 2).map((app) => (
                        <div
                          key={app._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.date);
                            setActiveAppointment(app);
                          }}
                          className={`hover:text-white dark:hover:text-black border text-[8px] px-1 py-0.5 font-bold uppercase tracking-wider truncate rounded-none max-w-full cursor-pointer transition-all ${
                            app.estado === 'completada'
                              ? 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-900/60 opacity-50 line-through text-slate-400 dark:text-zinc-600'
                              : 'bg-slate-100 hover:bg-slate-900 dark:bg-zinc-900 dark:hover:bg-white border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300'
                          }`}
                          title={`${getAppointmentTimeString(app.fecha_consulta)} - ${app.nombre_paciente} ${
                            app.estado === 'completada' ? (lang === 'es' ? '(COMPLETADA)' : '(COMPLETED)') : ''
                          }`}
                        >
                          <span className="font-mono text-slate-400 dark:text-zinc-600 mr-1">
                            {getAppointmentTimeString(app.fecha_consulta)}
                          </span>
                          {app.nombre_paciente}
                        </div>
                      ))}
                      {dayApps.length > 2 && (
                        <div className="text-[7px] font-black tracking-widest text-slate-400 uppercase text-right">
                          + {dayApps.length - 2} MÁS
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista Semanal */
            <div className="grid grid-cols-7 border-l border-t border-slate-900 dark:border-zinc-800 bg-slate-200 dark:bg-zinc-950 flex-1">
              {weekCells.map((cell, idx) => {
                const dayApps = appointmentsByDate[cell.dateStr] ?? [];
                const isSelected = formatDateString(selectedDate) === cell.dateStr;
                const isTodayStr = formatDateString(new Date()) === cell.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      setActiveAppointment(null);
                      setFormFecha(cell.dateStr);
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(cell.date);
                      setActiveAppointment(null);
                      setFormFecha(cell.dateStr);
                      setNewAppointmentModalOpen(true);
                    }}
                    className={`min-h-[400px] p-3 border-r border-b border-slate-900 dark:border-zinc-800 cursor-pointer flex flex-col justify-between transition-all bg-white dark:bg-black hover:bg-slate-50 dark:hover:bg-zinc-900/30 ${
                      isSelected ? 'ring-2 ring-slate-950 dark:ring-white z-10' : ''
                    }`}
                  >
                    {/* Encabezado Día */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2 mb-3">
                      <span
                        className={`text-[10px] font-black font-mono flex items-center justify-center ${
                          isTodayStr
                            ? 'w-6 h-6 bg-slate-950 text-white dark:bg-white dark:text-black'
                            : 'text-slate-900 dark:text-zinc-400'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      {dayApps.length > 0 && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 border border-slate-900 dark:border-zinc-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white">
                          {dayApps.length}
                        </span>
                      )}
                    </div>

                    {/* Citas Verticales */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[350px] scrollbar-thin">
                      {dayApps.map((app) => (
                        <div
                          key={app._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.date);
                            setActiveAppointment(app);
                          }}
                          className={`border text-[8px] p-2 font-bold uppercase tracking-wider rounded-none transition-all flex flex-col gap-1 ${
                            app.estado === 'completada'
                              ? 'bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-900/40 opacity-50 text-slate-400 dark:text-zinc-600 line-through'
                              : 'bg-slate-100 hover:bg-slate-900 hover:text-white dark:bg-zinc-900 dark:hover:bg-white dark:hover:text-black border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-300'
                          }`}
                        >
                          <span className="font-mono text-[8px] font-black border-b border-slate-200 dark:border-zinc-800 pb-0.5 mb-0.5">
                            {getAppointmentTimeString(app.fecha_consulta)} {app.estado === 'completada' && '[OK]'}
                          </span>
                          <span className="truncate">{app.nombre_paciente}</span>
                          <span className="text-[7px] text-slate-400 dark:text-zinc-500 font-normal truncate">
                            {app.estado === 'completada' ? (lang === 'es' ? 'COMPLETADA' : 'COMPLETED') : (app.diagnostico || 'Consulta general')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar de Detalles y Citas del Día */}
        <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black p-6 flex flex-col justify-between min-h-[400px]">
          {/* Cabecera Sidebar */}
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-zinc-900 pb-4 flex flex-col gap-3">
              <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-zinc-500 uppercase text-slate-900 dark:text-white">
                {selectedDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <button
                onClick={() => {
                  setFormFecha(formatDateString(selectedDate));
                  setNewAppointmentModalOpen(true);
                }}
                className="w-full py-2 bg-slate-950 text-white dark:bg-white dark:text-black font-black text-[9px] tracking-widest uppercase hover:opacity-90 transition-all border border-transparent"
              >
                {lang === 'es' ? 'AGENDAR EN ESTA FECHA' : 'BOOK ON THIS DATE'}
              </button>
            </div>

            {/* Listado de Citas del Día — siempre visible */}
            <div className="space-y-3">
              <span className="text-[9px] font-black tracking-widest text-slate-900 dark:text-white uppercase">
                {lang === 'es' ? 'CITAS DEL DÍA' : "TODAY'S APPOINTMENTS"} ({selectedAppointments.length})
              </span>

              {selectedAppointments.length === 0 ? (
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 py-4 text-center border border-dashed border-slate-200 dark:border-zinc-800">
                  {labels.noAppointments}
                </p>
              ) : (
                <div className="space-y-1 overflow-y-auto max-h-[200px] pr-1">
                  {selectedAppointments.map(app => (
                    <button
                      key={app._id}
                      onClick={() => setActiveAppointment(activeAppointment?._id === app._id ? null : app)}
                      className={`w-full text-left p-2.5 border transition-all group ${
                        activeAppointment?._id === app._id
                          ? 'border-slate-950 dark:border-white bg-slate-900 dark:bg-white'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-950 dark:hover:border-white bg-slate-50 dark:bg-zinc-950/20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[8px] font-mono font-black ${
                          activeAppointment?._id === app._id ? 'text-white dark:text-black' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}>
                          {getAppointmentTimeString(app.fecha_consulta)}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black block truncate uppercase tracking-widest ${
                        activeAppointment?._id === app._id ? 'text-white dark:text-black' : 'text-slate-900 dark:text-white'
                      }`}>
                        {app.nombre_paciente}
                      </span>
                      <span className={`text-[9px] truncate block mt-0.5 ${
                        activeAppointment?._id === app._id ? 'text-slate-300 dark:text-zinc-600' : 'text-slate-400'
                      }`}>
                        {app.diagnostico || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detalle de Cita Seleccionada */}
            {activeAppointment && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t border-slate-200 dark:border-zinc-800 pt-4">
                <span className="text-[9px] font-black tracking-widest text-slate-900 dark:text-white uppercase block border-b border-slate-200 dark:border-zinc-800 pb-2">
                  {labels.detailTitle}
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.patient}</label>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-white block uppercase mt-0.5">
                      {activeAppointment.nombre_paciente}
                    </span>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.patientId}</label>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 block mt-0.5">
                      {activeAppointment.paciente_id}
                    </span>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.status}</label>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 border block mt-1 w-fit ${
                      activeAppointment.estado === 'completada'
                        ? 'border-emerald-600 bg-emerald-50/10 text-emerald-600 dark:text-emerald-500'
                        : 'border-amber-600 bg-amber-50/10 text-amber-600 dark:text-amber-500'
                    }`}>
                      {activeAppointment.estado === 'completada' ? labels.completed : labels.pending}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.time}</label>
                      <span className="text-[10px] font-bold text-slate-950 dark:text-white block font-mono mt-0.5">
                        {getAppointmentTimeString(activeAppointment.fecha_consulta)}
                      </span>
                    </div>
                  </div>

                  {activeAppointment.diagnostico && (
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.diagnostic}</label>
                      <span className="text-[10px] text-slate-800 dark:text-zinc-300 block bg-slate-50 dark:bg-zinc-950/40 p-2 border border-slate-100 dark:border-zinc-900 mt-0.5 whitespace-pre-line">
                        {activeAppointment.diagnostico}
                      </span>
                    </div>
                  )}

                  {activeAppointment.tratamiento && (
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.treatment}</label>
                      <span className="text-[10px] text-slate-800 dark:text-zinc-300 block bg-slate-50 dark:bg-zinc-950/40 p-2 border border-slate-100 dark:border-zinc-900 mt-0.5 whitespace-pre-line">
                        {activeAppointment.tratamiento}
                      </span>
                    </div>
                  )}

                  {activeAppointment.notas_adicionales && (
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{labels.notes}</label>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block bg-slate-50/50 dark:bg-zinc-950/20 p-2 border border-slate-100 dark:border-zinc-900/60 mt-0.5 whitespace-pre-line">
                        {activeAppointment.notas_adicionales}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón Completar Consulta */}
                {activeAppointment.estado !== 'completada' && (
                  <button
                    onClick={handleCompleteClick}
                    className="w-full py-2 border-2 border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest transition-all mb-2"
                  >
                    {labels.markCompleted}
                  </button>
                )}

                {/* Botones de Acción CRUD */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleModifyClick}
                    className="flex-1 py-2 border-2 border-slate-700 dark:border-zinc-600 bg-slate-700 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    {lang === 'es' ? 'MODIFICAR' : 'MODIFY'}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    className="flex-1 py-2 border-2 border-rose-600 hover:bg-rose-600 text-rose-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    {lang === 'es' ? 'CANCELAR CITA' : 'CANCEL'}
                  </button>
                </div>

                <button
                  onClick={() => setActiveAppointment(null)}
                  className="w-full py-2 border border-slate-200 dark:border-zinc-800 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-500 transition-all"
                >
                  {labels.closeDetail}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Interactivo de Agendamiento */}
      {newAppointmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border-2 border-slate-950 dark:border-white max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
            <div className="border-b border-slate-200 dark:border-zinc-900 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black tracking-tighter text-slate-955 dark:text-white uppercase">
                  {isEditing
                    ? (lang === 'es' ? 'MODIFICAR CITA' : 'MODIFY APPOINTMENT')
                    : (lang === 'es' ? 'AGENDAR NUEVA CITA' : 'SCHEDULE APPOINTMENT')}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em] uppercase">
                  {lang === 'es' ? 'REGISTRO DE AGENDAMIENTO CLÍNICO' : 'INTERACTIVE BOOKING'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setNewAppointmentModalOpen(false);
                  setIsEditing(false);
                  setEditAppointmentId('');
                  setFormPatientId('');
                  setFormManualPatientId('');
                  setFormDiagnostico('');
                  setFormTratamiento('');
                  setFormNotas('');
                }}
                className="text-slate-450 hover:text-slate-950 dark:hover:text-white font-mono text-sm font-black p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Paciente */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'PACIENTE EN DIRECTORIO' : 'PATIENT IN DIRECTORY'}
                </label>
                {loadingPatients ? (
                  <div className="text-[9px] text-slate-400 animate-pulse">
                    {lang === 'es' ? 'CARGANDO PACIENTES...' : 'LOADING PACIENTS...'}
                  </div>
                ) : (
                  <select
                    value={formPatientId}
                    onChange={(e) => {
                      setFormPatientId(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-black border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- {lang === 'es' ? 'SELECCIONA PACIENTE' : 'SELECT PATIENT'} --</option>
                    {patients.map(p => (
                      <option key={p.paciente_id} value={p.paciente_id}>
                        {p.nombre} ({p.paciente_id})
                      </option>
                    ))}
                    <option value="MANUAL">-- {lang === 'es' ? 'INGRESO MANUAL / NUEVO ID' : 'MANUAL ENTRY'} --</option>
                  </select>
                )}
              </div>

              {/* Campo manual si selecciona MANUAL o si la lista está vacía */}
              {(formPatientId === 'MANUAL' || formPatientId === '') && (
                <div className="space-y-1 animate-in slide-in-from-top-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    {lang === 'es' ? 'ID PACIENTE MANUAL (Ej: P-CSLIM001)' : 'MANUAL PATIENT ID'}
                  </label>
                  <input
                    type="text"
                    value={formManualPatientId}
                    onChange={(e) => setFormManualPatientId(e.target.value.toUpperCase())}
                    placeholder="P-XXXXXX"
                    className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] font-mono tracking-widest uppercase focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                    required={formPatientId === 'MANUAL' || formPatientId === ''}
                  />
                </div>
              )}

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    {lang === 'es' ? 'FECHA (YYYY-MM-DD)' : 'DATE'}
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] font-mono tracking-widest uppercase focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                    {lang === 'es' ? 'HORA (HH:MM)' : 'TIME'}
                  </label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] font-mono tracking-widest uppercase focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Diagnóstico / Motivo */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'DIAGNÓSTICO PRELIMINAR / MOTIVO' : 'DIAGNOSIS / REASON'}
                </label>
                <textarea
                  value={formDiagnostico}
                  onChange={(e) => setFormDiagnostico(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Dolor agudo en molar inferior' : 'e.g., Acute molar pain'}
                  rows={2}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Tratamiento */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'TRATAMIENTO PLANEADO' : 'PLANNED TREATMENT'}
                </label>
                <input
                  type="text"
                  value={formTratamiento}
                  onChange={(e) => setFormTratamiento(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Endodoncia molar 36' : 'e.g., Root canal'}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                />
              </div>

              {/* Notas Adicionales */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'NOTAS ADICIONALES' : 'ADDITIONAL NOTES'}
                </label>
                <textarea
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Paciente hipertenso controlado' : 'e.g., Hypertensive'}
                  rows={2}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setNewAppointmentModalOpen(false)}
                  className="flex-1 py-3 border border-slate-900 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-950 text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {submitting 
                    ? (lang === 'es' ? 'GUARDANDO...' : 'SAVING...') 
                    : (lang === 'es' ? 'GUARDAR CITA' : 'BOOK APPOINTMENT')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Citas Completadas */}
      <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-900 pb-3">
          <div>
            <h2 className="text-sm font-black tracking-widest text-slate-900 dark:text-white uppercase">{labels.historyTitle}</h2>
            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em] uppercase">
              {lang === 'es' ? 'REGISTRO CRONOLÓGICO DE CONSULTAS CONCLUIDAS' : 'CHRONOLOGICAL LOG OF COMPLETED SESSIONS'}
            </p>
          </div>
          <span className="text-[10px] font-mono font-black px-2 py-0.5 border border-slate-900 dark:border-zinc-700 bg-slate-900 dark:bg-zinc-800 text-white">
            {appointments.filter(app => app.estado === 'completada').length}
          </span>
        </div>

        {appointments.filter(app => app.estado === 'completada').length === 0 ? (
          <p className="text-[10px] text-slate-450 dark:text-zinc-550 text-center py-6 border border-dashed border-slate-200 dark:border-zinc-800">
            {labels.noHistory}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[300px] pr-1">
            {appointments
              .filter(app => app.estado === 'completada')
              .sort((a, b) => new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime())
              .map(app => (
                <div 
                  key={app._id}
                  className="border border-slate-200 dark:border-zinc-800 p-4 space-y-3 bg-slate-50/50 dark:bg-zinc-950/20 hover:border-slate-950 dark:hover:border-white transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white truncate max-w-[70%]">
                        {app.nombre_paciente}
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-900 px-1 py-0.5 border border-slate-200 dark:border-zinc-800/80">
                        {getAppointmentDateString(app.fecha_consulta)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{labels.diagnostic}</span>
                      <span className="text-[9px] text-slate-800 dark:text-zinc-300 block line-clamp-2 uppercase">
                        {app.diagnostico || '—'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{labels.treatment}</span>
                      <span className="text-[9px] text-slate-800 dark:text-zinc-300 block line-clamp-2 uppercase">
                        {app.tratamiento || '—'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const [y, m, d] = getAppointmentDateString(app.fecha_consulta).split('-').map(Number);
                      const appDate = new Date(y, m - 1, d);
                      setSelectedDate(appDate);
                      setActiveAppointment(app);
                      
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full mt-2 py-1.5 border border-slate-900 dark:border-zinc-700 hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-black text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    {lang === 'es' ? 'VER EN DETALLE' : 'VIEW DETAILS'}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal de Cierre y Registro de Consulta */}
      {completeModalOpen && activeAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border-2 border-slate-950 dark:border-white max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
            <div className="border-b border-slate-200 dark:border-zinc-900 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black tracking-tighter text-slate-955 dark:text-white uppercase">
                  {labels.completeModalTitle}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 tracking-[0.2em] uppercase">
                  {lang === 'es' ? 'REGISTRO CLÍNICO FINAL DE CONSULTA' : 'FINAL CONSULTATION REPORT'}
                </p>
              </div>
              <button 
                onClick={() => setCompleteModalOpen(false)}
                className="text-slate-450 hover:text-slate-950 dark:hover:text-white font-mono text-sm font-black p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              {/* Información del Paciente (Solo Lectura) */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'PACIENTE A REGISTRAR' : 'PATIENT TO RECORD'}
                </span>
                <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white block">
                  {activeAppointment.nombre_paciente}
                </span>
                <span className="text-[9px] font-mono text-slate-500 block">
                  {activeAppointment.paciente_id} | {activeAppointment.fecha_consulta}
                </span>
              </div>

              {/* Diagnóstico Final */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'DIAGNÓSTICO CLÍNICO FINAL' : 'FINAL CLINICAL DIAGNOSIS'}
                </label>
                <textarea
                  value={completeDiagnostico}
                  onChange={(e) => setCompleteDiagnostico(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Pulpitis irreversible en órgano dental 36' : 'e.g., Irreversible pulpitis'}
                  rows={2}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Tratamiento Realizado */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'TRATAMIENTO ODONTOLÓGICO REALIZADO' : 'DENTAL TREATMENT PERFORMED'}
                </label>
                <input
                  type="text"
                  value={completeTratamiento}
                  onChange={(e) => setCompleteTratamiento(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Pulpectomía y obturación provisional' : 'e.g., Pulpectomy and obturation'}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Notas de Cierre Adicionales */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'es' ? 'OBSERVACIONES Y NOTAS DE CIERRE' : 'CLOSING OBSERVATIONS & NOTES'}
                </label>
                <textarea
                  value={completeNotas}
                  onChange={(e) => setCompleteNotas(e.target.value)}
                  placeholder={lang === 'es' ? 'Ej: Se receta analgésico por 3 días. Próxima cita en 1 semana.' : 'e.g., Analgesics prescribed'}
                  rows={2}
                  className="w-full bg-transparent border border-slate-300 dark:border-zinc-800 p-2 text-base lg:text-[10px] uppercase tracking-wider focus:outline-none focus:border-slate-950 dark:focus:border-white text-slate-900 dark:text-white"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="flex-1 py-3 border border-slate-900 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {lang === 'es' ? 'CANCELAR' : 'CANCEL'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {submitting 
                    ? (lang === 'es' ? 'REGISTRANDO...' : 'RECORDING...') 
                    : labels.saveComplete}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-950 text-white dark:bg-white dark:text-black border-2 border-black dark:border-white px-6 py-4 shadow-2xl animate-in slide-in-from-top-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-none bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-black tracking-widest uppercase">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
