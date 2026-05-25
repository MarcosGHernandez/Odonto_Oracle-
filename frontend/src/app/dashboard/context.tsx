'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'es' | 'en';

type DashboardContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  toggleDark: () => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('es');
  const [isDark, setIsDark] = useState(false);

  // Cargar tema e idioma desde localStorage al montar
  useEffect(() => {
    const savedTheme = localStorage.getItem('odonto-theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
    }
    const savedLang = localStorage.getItem('odonto-lang') as Lang;
    if (savedLang === 'es' || savedLang === 'en') {
      setLang(savedLang);
    }
  }, []);

  // Sincronizar clase .dark con el documento y localStorage
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('odonto-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('odonto-theme', 'light');
    }
  }, [isDark]);

  // Sincronizar idioma con localStorage
  useEffect(() => {
    localStorage.setItem('odonto-lang', lang);
  }, [lang]);

  const toggleDark = () => setIsDark(!isDark);

  return (
    <DashboardContext.Provider value={{ lang, setLang, isDark, setIsDark, toggleDark }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
