import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black p-6">
      {/* Decoración minimalista de fondo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-5 dark:opacity-10">
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 border-2 border-slate-900 dark:border-white rounded-full translate-x-[50%] translate-y-[50%]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex w-12 h-12 border-2 border-slate-900 dark:border-white items-center justify-center mb-4">
            <svg className="w-6 h-6 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Odonto-Oracle</h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Registro de Nuevo Profesional</p>
        </div>

        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "rounded-none border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-none",
              headerTitle: "text-slate-900 dark:text-white font-black uppercase tracking-tight",
              headerSubtitle: "text-slate-500 dark:text-zinc-400 text-xs",
              socialButtonsBlockButton: "rounded-none border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900",
              formButtonPrimary: "rounded-none bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 font-bold uppercase tracking-widest text-xs py-3",
              formFieldInput: "rounded-none border-slate-200 dark:border-zinc-800 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white transition-all",
              footerActionLink: "text-slate-900 dark:text-white font-bold hover:underline",
              identityPreviewText: "text-slate-900 dark:text-white",
            }
          }}
        />
      </div>
    </div>
  );
}
