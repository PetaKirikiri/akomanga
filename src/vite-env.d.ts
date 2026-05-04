/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_AI4THAI_API_KEY: string;
  readonly VITE_GOOGLE_TTS_API_KEY: string;
  /** Optional — same-origin `/panui` when unset; legacy full-app URL e.g. https://purakau.nz */
  readonly VITE_PURAKAU_APP_URL?: string;
  /** Optional — overrides Pānui base for dev/staging (full origin or same-origin override) */
  readonly VITE_PANUI_APP_URL?: string;
  /** Optional — local/dev override; production defaults to same-origin /mata */
  readonly VITE_MATA_APP_URL?: string;
  /** Optional — local/dev override; production defaults to same-origin /maumahara */
  readonly VITE_MAUMAHARA_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
