'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { DashboardProvider, useDashboard } from './context';

const t = {
  es: {
    chat: 'Chat Clínico',
    patients: 'Pacientes',
    calendar: 'Calendario',
    settings: 'Ajustes',
    portal: 'PORTAL CLÍNICO',
    collapse: 'Colapsar',
    expand: 'Expandir',
    footer: 'Odonto-Oracle CDSS — Desarrollado por Marcos Gael Hernández Cruz',
  },
  en: {
    chat: 'Clinical Chat',
    patients: 'Patients',
    calendar: 'Calendar',
    settings: 'Settings',
    portal: 'CLINICAL PORTAL',
    collapse: 'Collapse',
    expand: 'Expand',
    footer: 'Odonto-Oracle CDSS — Developed by Marcos Gael Hernández Cruz',
  },
};

const icons = {
  chat: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  patients: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  cross: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v20M2 12h20" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
};

const navLinks = [
  { href: '/dashboard', key: 'chat', icon: icons.chat, accent: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-zinc-800' },
  { href: '/dashboard/pacientes', key: 'patients', icon: icons.patients, accent: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-zinc-800' },
  { href: '/dashboard/calendario', key: 'calendar', icon: icons.calendar, accent: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-zinc-800' },
  { href: '/dashboard/ajustes', key: 'settings', icon: icons.settings, accent: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-zinc-800' },
];

function Sidebar({ 
  collapsed, 
  setCollapsed, 
  onLinkClick 
}: { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void; 
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { lang } = useDashboard();
  const labels = t[lang];

  return (
    <aside className={`relative flex flex-col h-full transition-all duration-300 ease-in-out ${collapsed ? 'w-[68px]' : 'w-60'} bg-white dark:bg-black border-r border-slate-200 dark:border-zinc-800`}>
      <div className="flex items-center justify-between px-4 h-20 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-slate-900 dark:border-white flex items-center justify-center">
            {icons.cross}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-black uppercase tracking-tighter">Odonto-Oracle</p>
              <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{labels.portal}</p>
            </div>
          )}
        </div>
        {onLinkClick && (
          <button 
            onClick={onLinkClick} 
            className="lg:hidden p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all text-slate-800 dark:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navLinks.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.key} 
              href={link.href} 
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-4 py-3 border transition-all ${isActive ? `${link.bg} border-slate-900 dark:border-white font-black` : 'border-transparent text-slate-500 dark:text-zinc-400 hover:border-slate-200 dark:hover:border-zinc-800 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <span className={isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}>{link.icon}</span>
              {!collapsed && <span className="text-xs uppercase tracking-widest">{labels[link.key as keyof typeof labels]}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-3 border border-slate-200 dark:border-zinc-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">
          {collapsed ? icons.chevronRight : icons.chevronLeft}
        </button>
      </div>
    </aside>
  );
}

function DashboardHeader({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { lang, setLang, isDark, toggleDark } = useDashboard();
  const labels = t[lang];

  return (
    <header className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 flex-shrink-0 relative z-40">
      <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 border border-slate-200 dark:border-zinc-800">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500 hidden sm:block">
        Odonto-Oracle <span className="mx-2 text-slate-200 dark:text-zinc-800">/</span> {labels.portal}
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex border border-slate-200 dark:border-zinc-800 p-1">
          <button onClick={() => setLang('es')} className={`px-2 py-1 text-[10px] font-black transition-all ${lang === 'es' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-400'}`}>ES</button>
          <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-black transition-all ${lang === 'en' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'text-slate-400'}`}>EN</button>
        </div>
        <button onClick={toggleDark} className="p-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">
          {isDark ? icons.sun : icons.moon}
        </button>
        <div className="border-l border-slate-200 dark:border-zinc-800 pl-4 h-8 flex items-center">
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 rounded-none' } }} />
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardProvider>
      <div className="w-full h-screen flex flex-col bg-white dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden">
        
        {/* Mobile Sidebar overlay/drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer Container */}
            <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-black border-r border-slate-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-left duration-300">
              <Sidebar collapsed={false} setCollapsed={() => {}} onLinkClick={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-1 overflow-hidden h-full">
          <div className="hidden lg:flex flex-col h-full">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          </div>
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <DashboardHeader mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-zinc-950">
              <div className="p-4 sm:p-6 lg:p-8 min-h-full flex flex-col">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}

function Footer() {
  const { lang } = useDashboard();
  return (
    <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-black">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600 text-center">{t[lang].footer}</p>
    </footer>
  );
}
