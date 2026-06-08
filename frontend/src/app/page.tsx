'use client';

import { useState, useEffect } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const t = {
  es: {
    portal: 'PORTAL CLÍNICO V1.0',
    access: 'Acceso Clínico',
    doctor: 'Odontólogo Responsable',
    node: 'Panel de Control',
    precision: 'ASISTENTE',
    medicine: 'CLÍNICO DENTAL',
    description: 'El primer copiloto inteligente para consultorios dentales. Automatiza el expediente clínico, gestiona citas sin colisiones y cotiza insumos clínicos en tiempo real.',
    authNow: 'Ingresar al Portal',
    goDashboard: 'Ir al Tablero Clínico',
    features: [
      { label: 'Expediente Clínico', color: 'bg-blue-50 text-blue-600' },
      { label: 'Citas sin Colisiones', color: 'bg-green-50 text-green-600' },
      { label: 'Recetas e Historial', color: 'bg-rose-50 text-rose-600' },
      { label: 'Cotizador de Insumos', color: 'bg-yellow-50 text-yellow-700' },
    ],
    terminal: 'Consola Operativa',
    agent: 'Asistente Clínico Inteligente',
    inventory: 'Cotizador y Comparador Dental',
    compliance: 'Cumplimiento HIPAA / Normativa',
    logs: 'Registros del Sistema',
  },
  en: {
    portal: 'CLINICAL PORTAL V1.0',
    access: 'Clinical Access',
    doctor: 'Responsible Dentist',
    node: 'Control Panel',
    precision: 'CLINICAL',
    medicine: 'DENTAL ASSISTANT',
    description: 'The first intelligent copilot for dental practices. Automate clinical records, manage conflict-free scheduling, and quote dental supplies in real-time.',
    authNow: 'Enter Portal',
    goDashboard: 'Go to Clinical Dashboard',
    features: [
      { label: 'Clinical Charting', color: 'bg-blue-50 text-blue-600' },
      { label: 'Conflict-Free Scheduling', color: 'bg-green-50 text-green-600' },
      { label: 'PDF Prescriptions', color: 'bg-rose-50 text-rose-600' },
      { label: 'Dental Supply Pricing', color: 'bg-yellow-50 text-yellow-700' },
    ],
    terminal: 'Operating Console',
    agent: 'Intelligent Clinical Assistant',
    inventory: 'Dental Supply Quotes',
    compliance: 'HIPAA / Regulatory Compliance',
    logs: 'System Logs',
  }
};


export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const labels = t[lang];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white font-sans transition-colors duration-500">
      
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 dark:border-zinc-900 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-slate-900 dark:border-white flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter">Odonto-Oracle</h1>
              <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 -mt-1 tracking-[0.2em]">{labels.portal}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Selector de Idioma */}
            <div className="flex border border-slate-200 dark:border-zinc-800 p-1">
              <button onClick={() => setLang('es')} className={`px-2 py-1 text-[10px] font-black transition-all ${lang === 'es' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-400 hover:text-slate-900'}`}>ES</button>
              <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-black transition-all ${lang === 'en' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-400 hover:text-slate-900'}`}>EN</button>
            </div>

            {/* Toggle de Tema */}
            <button 
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {isDark ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="text-[11px] font-black tracking-widest px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-80 transition-all uppercase cursor-pointer">
                  {labels.access}
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center gap-4 pl-6 border-l border-slate-100 dark:border-zinc-900">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-tight">{labels.doctor}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">{labels.node}</p>
                </div>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="w-12 h-1 bg-slate-900 dark:bg-white" />
            <h2 className="text-6xl sm:text-7xl font-black leading-[0.85] uppercase tracking-tighter">
              {labels.precision} <br />
              <span className="text-slate-300 dark:text-zinc-800 transition-colors">{labels.medicine}</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-zinc-400 max-w-sm leading-tight font-medium">
              {labels.description}
            </p>

            <Show when="signed-out">
              <div className="pt-4">
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="group flex items-center gap-4 bg-slate-900 dark:bg-white text-white dark:text-black font-black py-5 px-10 transition-all text-xs uppercase tracking-[0.3em] hover:gap-8 cursor-pointer">
                    {labels.authNow}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </SignInButton>
              </div>
            </Show>
            <Show when="signed-in">
              <div className="pt-4">
                <Link href="/dashboard" className="group flex items-center gap-4 bg-slate-900 dark:bg-white text-white dark:text-black font-black py-5 px-10 transition-all text-xs uppercase tracking-[0.3em] hover:gap-8 cursor-pointer border border-slate-900 dark:border-white">
                  {labels.goDashboard}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </Show>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {labels.features.map((f, i) => (
              <div key={i} className={`p-8 border border-slate-100 dark:border-zinc-900 ${f.color.split(' ')[0]} dark:bg-black transition-colors min-h-[180px] flex flex-col justify-between`}>
                <div className={`w-8 h-8 border ${f.color.split(' ')[1].replace('text-', 'border-')} dark:border-zinc-800 flex items-center justify-center ${f.color.split(' ')[1]} dark:text-white`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${f.color.split(' ')[1]} dark:text-white`}>{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Show when="signed-in">
          <div className="mt-20 border-t border-slate-100 dark:border-zinc-900 pt-12 space-y-6">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{labels.terminal}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/dashboard" className="p-8 bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-between hover:opacity-90 transition-all cursor-pointer">
                <span className="text-xl font-black uppercase">{labels.agent}</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              <Link href="/dashboard" className="p-8 border-2 border-slate-900 dark:border-zinc-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all cursor-pointer">
                <span className="text-xl font-black uppercase">{labels.inventory}</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </div>
          </div>
        </Show>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100 dark:border-zinc-900 flex justify-between items-center text-[9px] font-black text-slate-400 dark:text-zinc-600 uppercase tracking-[0.4em]">
        <div>© 2026 Odonto-Oracle / Developed by Marcos Hernández / Secure Environment</div>
        <div className="flex gap-12">
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">{labels.compliance}</a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">{labels.logs}</a>
        </div>
      </footer>
    </div>
  );
}
