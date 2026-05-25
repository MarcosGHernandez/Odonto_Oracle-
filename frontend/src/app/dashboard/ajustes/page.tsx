'use client';

import { useState, useEffect } from 'react';
import { useDashboard } from '../context';
import { useAuth } from '@clerk/nextjs';

const BACKEND_URL = 'http://127.0.0.1:8000';

const t = {
  es: {
    title: 'AJUSTES DEL SISTEMA',
    subtitle: 'CONFIGURACIÓN DE LA CLÍNICA',
    profileCard: 'PERFIL DEL CONSULTORIO',
    prefsCard: 'PREFERENCIAS DEL SISTEMA',
    nombre: 'NOMBRE DEL CONSULTORIO',
    nombreDoctor: 'NOMBRE DEL DOCTOR RESPONSABLE',
    especialidad: 'ESPECIALIDAD',
    region: 'REGIÓN PARA SCRAPER DE PRECIOS',
    canal: 'CANAL DE NOTIFICACIÓN PREFERIDO',
    saveProfile: 'GUARDAR PERFIL',
    savePrefs: 'GUARDAR PREFERENCIAS',
    saved: 'CAMBIOS GUARDADOS',
    loading: 'CARGANDO CONFIGURACIÓN...',
    regiones: { MX: 'México (MX)', US: 'Estados Unidos (US)' },
    canales: { email: 'Email (Resend / SMTP)' },
    telefonoContacto: 'TELÉFONO DE CONTACTO (WHATSAPP DE PACIENTES)',
  },
  en: {
    title: 'SYSTEM SETTINGS',
    subtitle: 'CLINIC CONFIGURATION',
    profileCard: 'OFFICE PROFILE',
    prefsCard: 'SYSTEM PREFERENCES',
    nombre: 'OFFICE NAME',
    nombreDoctor: 'ATTENDING DOCTOR NAME',
    especialidad: 'SPECIALTY',
    region: 'REGION FOR PRICE SCRAPER',
    canal: 'PREFERRED NOTIFICATION CHANNEL',
    saveProfile: 'SAVE PROFILE',
    savePrefs: 'SAVE PREFERENCES',
    saved: 'CHANGES SAVED',
    loading: 'LOADING CONFIGURATION...',
    regiones: { MX: 'Mexico (MX)', US: 'United States (US)' },
    canales: { email: 'Email (Resend / SMTP)' },
    telefonoContacto: 'CLINIC CONTACT PHONE (PATIENT WHATSAPP)',
  },
};

export default function AjustesPage() {
  const { lang } = useDashboard();
  const labels = t[lang];

  // Multi-tenant: use Clerk's orgId or userId as the clinic identifier
  const { orgId, userId } = useAuth();
  const clinicaId = orgId || userId || 'OO-CLINIC-001';

  const [profile, setProfile] = useState({ nombre: 'Clínica Dental Oaxaca', nombreDoctor: '', especialidad: 'Odontología General' });
  const [prefs, setPrefs] = useState({
    region: 'MX',
    canal: 'email',
    twilio_whatsapp_number: 'whatsapp:+14155238886',
    twilio_sms_number: '+14155238886',
    telefono_contacto: '+529511234567'
  });
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/settings?clinica_id=${clinicaId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.settings) {
            setProfile({
              nombre: data.settings.nombre_clinica || 'Clínica Dental Oaxaca',
              nombreDoctor: data.settings.nombre_doctor || '',
              especialidad: data.settings.especialidad || 'Odontología General'
            });
            setPrefs({
              region: data.settings.region_scraper || 'MX',
              canal: data.settings.canal_notificacion || 'email',
              twilio_whatsapp_number: data.settings.twilio_whatsapp_number || 'whatsapp:+14155238886',
              twilio_sms_number: data.settings.twilio_sms_number || '+14155238886',
              telefono_contacto: data.settings.telefono_contacto || '+529511234567'
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar configuraciones:', err);
      } finally {
        setLoading(false);
      }
    };
    if (clinicaId) {
      fetchSettings();
    }
  }, [clinicaId]);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          nombre_clinica: profile.nombre,
          nombre_doctor: profile.nombreDoctor,
          especialidad: profile.especialidad
        })
      });
      if (res.ok) {
        setSavedProfile(true);
        setTimeout(() => setSavedProfile(false), 2500);
      }
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    }
  };

  const handleSavePrefs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: clinicaId,
          region_scraper: prefs.region,
          canal_notificacion: prefs.canal,
          twilio_whatsapp_number: prefs.twilio_whatsapp_number,
          twilio_sms_number: prefs.twilio_sms_number,
          telefono_contacto: prefs.telefono_contacto
        })
      });
      if (res.ok) {
        setSavedPrefs(true);
        setTimeout(() => setSavedPrefs(false), 2500);
      }
    } catch (err) {
      console.error('Error al guardar preferencias:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{labels.title}</h1>
        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 tracking-[0.3em] uppercase">{labels.subtitle}</p>
        {/* Clinic identifier badge */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono font-black tracking-widest text-slate-500 dark:text-zinc-400 uppercase">
            {lang === 'es' ? 'ID DE CLÍNICA' : 'CLINIC ID'}: {clinicaId}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8">
          <div className="w-4 h-4 border-2 border-slate-900 dark:border-white border-t-transparent animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.loading}</span>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tarjeta: Perfil del Consultorio */}
          <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-300">{labels.profileCard}</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.nombre}
                </label>
                <input
                  type="text"
                  value={profile.nombre}
                  onChange={e => setProfile({ ...profile, nombre: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.nombreDoctor}
                </label>
                <input
                  type="text"
                  value={profile.nombreDoctor}
                  onChange={e => setProfile({ ...profile, nombreDoctor: e.target.value })}
                  placeholder={lang === 'es' ? 'Ej. Dr. Juan Pérez' : 'e.g. Dr. John Smith'}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.especialidad}
                </label>
                <input
                  type="text"
                  value={profile.especialidad}
                  onChange={e => setProfile({ ...profile, especialidad: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                className={`w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all ${savedProfile ? 'bg-emerald-600 text-white border-2 border-emerald-600' : 'bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 border-2 border-slate-900 dark:border-white'}`}
              >
                {savedProfile ? labels.saved : labels.saveProfile}
              </button>
            </div>
          </div>

          {/* Tarjeta: Preferencias del Sistema */}
          <div className="border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-zinc-800 bg-slate-900 dark:bg-zinc-900">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-300">{labels.prefsCard}</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.region}
                </label>
                <div className="flex border-2 border-slate-200 dark:border-zinc-800">
                  {(Object.entries(labels.regiones) as [string, string][]).map(([val, display]) => (
                    <button
                      key={val}
                      onClick={() => setPrefs({ ...prefs, region: val })}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${prefs.region === val ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      {display}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.canal}
                </label>
                <div className="space-y-2">
                  {(Object.entries(labels.canales) as [string, string][]).map(([val, display]) => (
                    <button
                      key={val}
                      disabled
                      className="w-full flex items-center justify-between px-4 py-3 border-2 border-slate-900 dark:border-white bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest cursor-not-allowed opacity-80"
                    >
                      {display}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teléfono de contacto clínico para derivar paciente a WhatsApp manual */}
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">
                  {labels.telefonoContacto}
                </label>
                <input
                  type="text"
                  value={prefs.telefono_contacto}
                  onChange={e => setPrefs({ ...prefs, telefono_contacto: e.target.value })}
                  placeholder="e.g. +529511234567"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleSavePrefs}
                className={`w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all ${savedPrefs ? 'bg-emerald-600 text-white border-2 border-emerald-600' : 'bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 border-2 border-slate-900 dark:border-white'}`}
              >
                {savedPrefs ? labels.saved : labels.savePrefs}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
