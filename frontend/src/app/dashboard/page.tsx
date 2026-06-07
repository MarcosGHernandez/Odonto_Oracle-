'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useDashboard } from './context';
import ChatInterface from '@/components/ChatInterface';
import { useAuth } from '@clerk/nextjs';

const BACKEND_URL = '/api/proxy';

const t = {
  es: {
    welcome: 'PANEL DE CONTROL',
    subtitle: 'RESUMEN DE ACTIVIDAD CLÍNICA · EN VIVO',
    thisWeek: 'ESTA SEMANA',
    today: 'HOY',
    quickTitle: 'ACCIONES RÁPIDAS',
    quick: [
      { label: 'NUEVA RECETA',       color: 'bg-rose-50 text-rose-600',     dark: 'dark:bg-rose-950/20 dark:text-rose-400' },
      { label: 'BUSCAR MATERIAL',    color: 'bg-blue-50 text-blue-600',     dark: 'dark:bg-blue-950/20 dark:text-blue-400' },
      { label: 'NOTIFICAR PACIENTE', color: 'bg-emerald-50 text-emerald-600', dark: 'dark:bg-emerald-950/20 dark:text-emerald-400' },
      { label: 'VER HISTORIAL',      color: 'bg-amber-50 text-amber-600',   dark: 'dark:bg-amber-950/20 dark:text-amber-400' },
    ],
    upcomingTitle: 'PRÓXIMAS CITAS',
    noAppointments: 'Sin citas próximas.',
    loading: 'CARGANDO...',
    clinicId: 'ID DE CLÍNICA',
  },
  en: {
    welcome: 'CONTROL DASHBOARD',
    subtitle: 'CLINICAL ACTIVITY SUMMARY · LIVE',
    thisWeek: 'THIS WEEK',
    today: 'TODAY',
    quickTitle: 'QUICK ACTIONS',
    quick: [
      { label: 'NEW PRESCRIPTION', color: 'bg-rose-50 text-rose-600',     dark: 'dark:bg-rose-950/20 dark:text-rose-400' },
      { label: 'SEARCH MATERIAL',  color: 'bg-blue-50 text-blue-600',     dark: 'dark:bg-blue-950/20 dark:text-blue-400' },
      { label: 'NOTIFY PATIENT',   color: 'bg-emerald-50 text-emerald-600', dark: 'dark:bg-emerald-950/20 dark:text-emerald-400' },
      { label: 'VIEW HISTORY',     color: 'bg-amber-50 text-amber-600',   dark: 'dark:bg-amber-950/20 dark:text-amber-400' },
    ],
    upcomingTitle: 'UPCOMING APPOINTMENTS',
    noAppointments: 'No upcoming appointments.',
    loading: 'LOADING...',
    clinicId: 'CLINIC ID',
  },
};

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

interface KpiDef {
  labelEs: string;
  labelEn: string;
  value: number;
  color: string;
  borderColor: string;
  icon: ReactNode;
  note?: string;
}

function KpiCard({ kpi, lang }: { kpi: KpiDef; lang: 'es' | 'en' }) {
  const count = useCountUp(kpi.value);
  return (
    <div className={`relative p-5 border-2 ${kpi.borderColor} bg-white dark:bg-black animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 leading-tight">
          {lang === 'es' ? kpi.labelEs : kpi.labelEn}
        </p>
        <div className={`w-8 h-8 flex items-center justify-center border ${kpi.borderColor} ${kpi.color}`}>
          {kpi.icon}
        </div>
      </div>
      <p className={`text-4xl font-black leading-none ${kpi.color}`}>{count}</p>
      {kpi.note && (
        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600 mt-2">
          {kpi.note}
        </p>
      )}
      {/* Live indicator dot */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </div>
  );
}

function getAppointmentTimeString(fechaStr: string) {
  if (!fechaStr) return '--:--';
  const normalized = fechaStr.replace('T', ' ');
  const parts = normalized.split(' ');
  if (parts.length > 1) {
    const timeParts = parts[1].split(':');
    return timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : parts[1];
  }
  return '--:--';
}

function getAppointmentDateStr(fechaStr: string) {
  if (!fechaStr) return '';
  return fechaStr.replace('T', ' ').split(' ')[0];
}

export default function DashboardPage() {
  const { lang } = useDashboard();
  const labels = t[lang];

  const { orgId, userId } = useAuth();
  const clinicaId = orgId || userId || 'OO-CLINIC-001';

  const friendlyClinicaId = clinicaId === 'OO-CLINIC-001'
    ? clinicaId
    : `${clinicaId.startsWith('org_') ? 'OO-ORG-' : 'OO-CLINIC-'}${clinicaId.replace('user_', '').replace('org_', '').substring(0, 6).toUpperCase()}`;

  const [metricas, setMetricas] = useState({
    pacientes_atendidos: 0,
    presupuestos_generados: 0,
    recetas_emitidas: 0,
    alertas_clinicas: 0,
  });
  const [agenda, setAgenda] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  // Fetch real metrics
  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/clinica/metricas?clinica_id=${clinicaId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setMetricas({
              pacientes_atendidos: data.pacientes_atendidos ?? 0,
              presupuestos_generados: data.presupuestos_generados ?? 0,
              recetas_emitidas: data.recetas_emitidas ?? 0,
              alertas_clinicas: data.alertas_clinicas ?? 0,
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar métricas clínicas:', err);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetricas();
    const interval = setInterval(fetchMetricas, 30000);
    return () => clearInterval(interval);
  }, [clinicaId]);

  // Fetch real agenda
  useEffect(() => {
    const fetchAgenda = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/clinica/agenda/${clinicaId}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setAgenda(data.agenda ?? []);
          }
        }
      } catch (err) {
        console.error('Error al cargar agenda:', err);
      } finally {
        setLoadingAgenda(false);
      }
    };
    fetchAgenda();
  }, [clinicaId]);

  // Compute weekly appointments
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday = 0
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyAppointments = agenda.filter(app => {
    const d = new Date(getAppointmentDateStr(app.fecha_consulta));
    return d >= startOfWeek && d <= endOfWeek;
  });

  const todayStr = now.toISOString().split('T')[0];
  const todayAppointments = agenda.filter(app => getAppointmentDateStr(app.fecha_consulta) === todayStr);

  // Upcoming: next 5 appointments from today onward
  const upcoming = agenda
    .filter(app => getAppointmentDateStr(app.fecha_consulta) >= todayStr)
    .sort((a, b) => a.fecha_consulta.localeCompare(b.fecha_consulta))
    .slice(0, 5);

  const kpis: KpiDef[] = [
    {
      labelEs: 'Pacientes Registrados',
      labelEn: 'Registered Patients',
      value: metricas.pacientes_atendidos,
      color: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-200 dark:border-rose-900',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      labelEs: 'Citas Esta Semana',
      labelEn: 'Appointments This Week',
      value: weeklyAppointments.length,
      color: 'text-violet-600 dark:text-violet-400',
      borderColor: 'border-violet-200 dark:border-violet-900',
      note: lang === 'es' ? `${todayAppointments.length} hoy` : `${todayAppointments.length} today`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      labelEs: 'Documentos Generados',
      labelEn: 'Documents Generated',
      value: metricas.presupuestos_generados + metricas.recetas_emitidas,
      color: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-900',
      note: lang === 'es'
        ? `${metricas.recetas_emitidas} recetas · ${metricas.presupuestos_generados} presupuestos`
        : `${metricas.recetas_emitidas} rx · ${metricas.presupuestos_generados} estimates`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      labelEs: 'Alertas Clínicas',
      labelEn: 'Clinical Alerts',
      value: metricas.alertas_clinicas,
      color: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-900',
      note: lang === 'es' ? 'Pacientes con alergias activas' : 'Patients with active allergies',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{labels.welcome}</h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 tracking-[0.3em] uppercase">{labels.subtitle}</p>
        </div>
        {/* Clinic identity badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 self-start sm:self-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono font-black tracking-widest text-slate-500 dark:text-zinc-400 uppercase">
            {labels.clinicId}: {friendlyClinicaId}
          </span>
        </div>
      </div>

      {/* KPIs — 100% real data */}
      {loadingMetrics || loadingAgenda ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 border-2 border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <KpiCard key={i} kpi={kpi} lang={lang} />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Chat con Gemini */}
        <div className="lg:col-span-2">
          <ChatInterface />
        </div>

        {/* Panel derecho: Próximas citas + Acciones rápidas */}
        <div className="space-y-4">
          {/* Próximas citas reales */}
          <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-white dark:text-zinc-300">
                {labels.upcomingTitle}
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {loadingAgenda ? (
                <p className="text-[9px] text-slate-400 animate-pulse uppercase tracking-widest text-center py-4">{labels.loading}</p>
              ) : upcoming.length === 0 ? (
                <p className="text-[9px] text-slate-400 dark:text-zinc-600 py-4 text-center border border-dashed border-slate-200 dark:border-zinc-800">
                  {labels.noAppointments}
                </p>
              ) : (
                upcoming.map((app, i) => {
                  const isToday = getAppointmentDateStr(app.fecha_consulta) === todayStr;
                  return (
                    <div
                      key={app._id ?? i}
                      className={`flex items-start gap-3 p-2.5 border transition-all ${
                        isToday
                          ? 'border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/20'
                          : 'border-slate-100 dark:border-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex-shrink-0 text-center min-w-[36px]">
                        <span className={`text-[8px] font-mono font-black block ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`}>
                          {getAppointmentTimeString(app.fecha_consulta)}
                        </span>
                        {isToday && (
                          <span className="text-[7px] font-black uppercase bg-violet-600 text-white px-1 py-0.5 block mt-0.5">
                            {lang === 'es' ? 'HOY' : 'TODAY'}
                          </span>
                        )}
                        {!isToday && (
                          <span className="text-[7px] font-mono text-slate-300 dark:text-zinc-700 block">
                            {getAppointmentDateStr(app.fecha_consulta).slice(5)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white block truncate uppercase tracking-tight">
                          {app.nombre_paciente ?? app.paciente_id}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 truncate block">
                          {app.diagnostico || (lang === 'es' ? 'Consulta general' : 'General consultation')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-white dark:text-zinc-300">{labels.quickTitle}</h3>
            </div>
            <div className="p-4 space-y-2">
              {labels.quick.map((q, i) => {
                const [bg, text] = q.color.split(' ');
                return (
                  <button
                    key={i}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('trigger-quick-action', { detail: { action: q.label } }));
                    }}
                    className={`w-full text-left p-3.5 border-2 border-transparent hover:border-slate-900 dark:hover:border-white ${bg} ${q.dark} dark:bg-black transition-all flex items-center justify-between group`}
                  >
                    <span className={`text-[9px] font-black tracking-widest ${text} dark:text-white`}>{q.label}</span>
                    <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
