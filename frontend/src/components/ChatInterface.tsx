'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/app/dashboard/context';

const PLACEHOLDER = {
  es: 'Dictar caso clínico, consultar historial o pedir presupuesto... (Enter para enviar)',
  en: 'Dictate a clinical case, query history or request an estimate... (Enter to send)',
};

const EMPTY_HINT = {
  es: 'Intenta: "Busca el historial de un paciente, genera una receta o cotiza un material dental."',
  en: 'Try: "Search a patient\'s history, generate a prescription or quote a dental material."',
};

const SEND_LABEL = { es: 'ENVIAR', en: 'SEND' };
const BADGE_LABEL = { es: 'AGENTE GEMINI · ACTIVO', en: 'GEMINI AGENT · ACTIVE' };
const TITLE = { es: 'CONSOLA DE AGENTE CLÍNICO', en: 'CLINICAL AGENT CONSOLE' };
const AGENT_LABEL = { es: 'AGENTE IA', en: 'AI AGENT' };
const ERROR_LABEL = { es: 'ERROR DEL SISTEMA', en: 'SYSTEM ERROR' };

// ---------------------------------------------------------------------------
// Extractor de texto compatible con AI SDK v4 y v5
// Soporta: m.content (string), m.content (array), m.parts (array)
// ---------------------------------------------------------------------------
function extractText(m: any): string {
  // Caso de error directo en el objeto de mensaje
  if (m.error) {
    const errText = typeof m.error === 'string' ? m.error : (m.error.message || JSON.stringify(m.error));
    return `[ERROR CLÍNICO]: ${errText}`;
  }

  // Caso 1: content es un string simple (SDK v3/v4 clásico)
  if (typeof m.content === 'string' && m.content.trim()) {
    return m.content;
  }

  // Caso 2: content es un array de partes (SDK v5)
  if (Array.isArray(m.content)) {
    // Si hay un part de error, extraerlo de inmediato
    const errorPart = m.content.find((p: any) => p.type === 'error');
    if (errorPart) {
      return `[ERROR CLÍNICO]: ${errorPart.errorText || errorPart.error?.message || JSON.stringify(errorPart)}`;
    }

    const texts = m.content
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text || '')
      .join('');
    if (texts.trim()) return texts;
  }

  // Caso 3: m.parts es un array (formato mixto de SDK v5)
  if (Array.isArray(m.parts)) {
    // Si hay un part de error, extraerlo de inmediato
    const errorPart = m.parts.find((p: any) => p.type === 'error');
    if (errorPart) {
      return `[ERROR CLÍNICO]: ${errorPart.errorText || errorPart.error?.message || JSON.stringify(errorPart)}`;
    }

    const texts = m.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text || '')
      .join('');
    if (texts.trim()) return texts;
  }

  return '';
}

// ---------------------------------------------------------------------------
// Renderizado mínimo de Markdown inline (links y saltos de línea)
// ---------------------------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode[] {
  // Regex para [texto](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const result: React.ReactNode[] = [];
  let lastIdx = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Texto antes del link
    if (match.index > lastIdx) {
      const before = text.slice(lastIdx, match.index);
      // Preservar saltos de línea como <br/>
      before.split('\n').forEach((line, i, arr) => {
        result.push(<span key={`t-${match!.index}-${i}`}>{line}</span>);
        if (i < arr.length - 1) result.push(<br key={`br-${match!.index}-${i}`} />);
      });
    }
    // El link
    result.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-600 dark:text-blue-400 font-bold hover:opacity-80"
      >
        {match[1]}
      </a>
    );
    lastIdx = match.index + match[0].length;
  }

  // Texto restante después del último link
  if (lastIdx < text.length) {
    const after = text.slice(lastIdx);
    after.split('\n').forEach((line, i, arr) => {
      result.push(<span key={`end-${i}`}>{line}</span>);
      if (i < arr.length - 1) result.push(<br key={`end-br-${i}`} />);
    });
  }

  return result.length ? result : [<span key="plain">{text}</span>];
}

// Input max length guard — prevent oversized payloads reaching the LLM
const MAX_INPUT_LENGTH = 2000;

export default function ChatInterface() {
  const { lang } = useDashboard();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const append = useCallback(async (message: { role: string; content: string }) => {
    const userMsg = {
      ...message,
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, lang })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const data = await response.json();

      if (data.newMessages && Array.isArray(data.newMessages)) {
        // Enriquecer cada mensaje ReAct intermedio con un ID robusto para React
        const enrichedNewMsgs = data.newMessages.map((m: any) => ({
          ...m,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        }));
        setMessages(prev => [...prev, ...enrichedNewMsgs]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.text || '[Action Completed without message]',
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        }]);
      }
    } catch (err: any) {
      console.error('[ChatInterface] Error:', err);
      setError({ message: err.message });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `[ERROR CLÍNICO]: ${err.message}`,
        id: Math.random().toString(36).substring(7)
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // Cleanup toast timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = useCallback((e?: React.FormEvent, promptOverride?: string) => {
    e?.preventDefault();
    const content = promptOverride !== undefined ? promptOverride : input;
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    // Guard: reject oversized inputs to prevent token abuse
    if (trimmed.length > MAX_INPUT_LENGTH) {
      setToastMessage(
        lang === 'es'
          ? `ENTRADA DEMASIADO LARGA (máx. ${MAX_INPUT_LENGTH} caracteres).`
          : `INPUT TOO LONG (max ${MAX_INPUT_LENGTH} chars).`
      );
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, 3000);
      return;
    }

    append({ role: 'user', content: trimmed });
    setInput('');
  }, [append, input, isLoading, lang]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const action = customEvent.detail?.action;
      if (!action || isLoading) return;

      // Disparar Toast de Confirmación Visual con Glassmorphism
      const displayAction = action.replace(/_/g, ' ');
      setToastMessage(lang === 'es' ? `PROCESANDO ACCIÓN RÁPIDA: ${displayAction}...` : `PROCESSING QUICK ACTION: ${displayAction}...`);
      
      // Store timer ref for proper cleanup (prevent memory leaks)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, 2500);

      let prompt = '';
      if (lang === 'es') {
        if (action === 'NUEVA RECETA') {
          prompt = '[Acción Rápida]: El doctor ha solicitado emitir una NUEVA RECETA. Como asistente de Odonto-Oracle, inicia un diálogo profesional clínico. Pregunta al doctor amigablemente para qué paciente es la receta (puedes sugerir a pacientes conocidos como Carlos Slim), qué medicamentos/dosis requiere, cuál es el diagnóstico o motivo, y recuérdale que validarás alergias críticas en el expediente.';
        } else if (action === 'BUSCAR MATERIAL') {
          prompt = '[Acción Rápida]: El doctor ha solicitado BUSCAR MATERIAL o cotizar insumos dentales. Como asistente de Odonto-Oracle, saluda profesionalmente y consulta qué material o equipo odontológico específico desea cotizar (ej. resina Z350 de 3M) y bajo qué región geográfica (México - MX o Estados Unidos - US) para escanear el mercado.';
        } else if (action === 'NOTIFICAR PACIENTE') {
          prompt = '[Acción Rápida]: El doctor ha solicitado NOTIFICAR PACIENTE. Pregunta cordialmente qué mensaje desea enviar al paciente, cuál es el destinatario o número de teléfono, y qué canal prefiere emplear (WhatsApp o SMS) para programar la entrega.';
        } else if (action === 'VER HISTORIAL') {
          prompt = '[Acción Rápida]: El doctor ha solicitado VER HISTORIAL clínico de un expediente. Pídele de manera atenta el nombre completo o ID clínico del paciente a buscar para extraer sus antecedentes médicos, medicamentos actuales, enfermedades crónicas y signos vitales.';
        }
      } else {
        if (action === 'NEW PRESCRIPTION' || action === 'NUEVA RECETA') {
          prompt = '[Quick Action]: The doctor requested a NEW PRESCRIPTION. As the Odonto-Oracle assistant, initiate a professional clinical dialogue. Ask the doctor which patient it is for (you can suggest known patients like Carlos Slim), what medication/dosage is needed, the diagnosis or reason, and let them know you will validate any critical allergies.';
        } else if (action === 'SEARCH MATERIAL' || action === 'BUSCAR MATERIAL') {
          prompt = '[Quick Action]: The doctor requested to SEARCH MATERIAL or quote dental supplies. As Odonto-Oracle, greet them professionally and ask which specific dental material or equipment they would like to quote (e.g. 3M Z350 resin) and in which geographical region (Mexico - MX or United States - US).';
        } else if (action === 'NOTIFY PATIENT' || action === 'NOTIFICAR PACIENTE') {
          prompt = '[Quick Action]: The doctor requested to NOTIFY PATIENT. Kindly ask what message they want to send, to which patient or phone number, and which communication channel they prefer to use (WhatsApp or SMS).';
        } else if (action === 'VIEW HISTORY' || action === 'VER HISTORIAL') {
          prompt = '[Quick Action]: The doctor requested to VIEW HISTORY of a clinical record. Kindly ask for the patient\'s full name or clinical ID to retrieve their background, current medications, chronic illnesses, and vitals.';
        }
      }

      if (prompt) {
        setInput(prompt);
        handleSubmitRef.current(undefined, prompt);
      }
    };

    window.addEventListener('trigger-quick-action', handleQuickAction);
    return () => {
      window.removeEventListener('trigger-quick-action', handleQuickAction);
    };
  }, [lang, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative border-2 border-slate-900 dark:border-zinc-800 bg-white dark:bg-black flex flex-col min-h-[500px]">
      {/* Toast de Confirmación Visual Premium con Glassmorphism */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/90 dark:bg-zinc-950/90 border-2 border-amber-500/80 px-6 py-3 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400">
              {toastMessage}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'} transition-colors`} />
          <span className="text-[10px] font-black uppercase tracking-widest">{TITLE[lang]}</span>
        </div>
        <span className="text-[9px] font-black px-3 py-1 bg-slate-900 text-white dark:bg-zinc-800 uppercase tracking-widest">
          {BADGE_LABEL[lang]}
        </span>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px]">

        {/* Estado vacío */}
        {messages.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
            <div className="w-16 h-16 border-2 border-slate-900 dark:border-white flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-center max-w-xs">{EMPTY_HINT[lang]}</p>
          </div>
        )}

        {/* Error global */}
        {error && (
          <div className="border-2 border-rose-500 bg-rose-50 dark:bg-transparent p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">{ERROR_LABEL[lang]}</p>
            <p className="text-xs text-rose-500">{error.message}</p>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((m: any, idx: number) => {
          // Ignorar mensajes que no sean de usuario o asistente
          if (m.role !== 'user' && m.role !== 'assistant') return null;

          // Extraer texto de forma robusta (soporta SDK v4 y v5)
          const text = extractText(m);

          // Si el mensaje no tiene texto legible (solo llamadas a herramientas), no renderizar burbuja
          if (!text && m.role === 'assistant') return null;

          const isError = text.startsWith('[ERROR CLÍNICO]:');
          const displayText = isError ? text.replace('[ERROR CLÍNICO]:', '').trim() : text;

          return (
            <div key={m.id ?? `msg-${idx}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] border-2 p-4 ${
                m.role === 'user'
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black'
                  : isError
                    ? 'border-rose-500 bg-rose-50 dark:bg-zinc-950 text-rose-800 dark:text-rose-400'
                    : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100'
              }`}>
                {/* Etiqueta del agente / error */}
                {m.role === 'assistant' && (
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${
                    isError ? 'text-rose-500' : 'text-slate-400 dark:text-zinc-500'
                  }`}>
                    {isError ? ERROR_LABEL[lang] : AGENT_LABEL[lang]}
                  </p>
                )}
                {/* Texto del mensaje — el asistente soporta Markdown inline (links) */}
                <div className="text-xs leading-relaxed font-semibold">
                  {m.role === 'assistant' ? renderMarkdown(displayText) : displayText}
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicador de carga */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t-2 border-slate-900 dark:border-zinc-800 flex gap-4 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER[lang]}
          rows={2}
          maxLength={MAX_INPUT_LENGTH}
          disabled={isLoading}
          className="flex-1 bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 focus:border-slate-900 dark:focus:border-white px-4 py-3 text-xs font-bold outline-none transition-all resize-none disabled:opacity-40 placeholder:text-slate-300 dark:placeholder:text-zinc-700"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={isLoading || !input.trim()}
          className="px-8 py-3 bg-slate-900 text-white dark:bg-white dark:text-black font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 self-stretch flex items-center justify-center cursor-pointer"
        >
          {SEND_LABEL[lang]}
        </button>
      </div>
    </div>
  );
}
