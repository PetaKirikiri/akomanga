/**
 * OpenAI key resolution (web app — no extension chrome.storage).
 * Parity with Pūrākau env + localStorage fallback.
 */
const STORAGE_KEY_OPENAI = 'akomanga_openaiApiKey';

export async function getOpenAIApiKey(): Promise<string> {
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();

  if (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) {
    const key = process.env.VITE_OPENAI_API_KEY;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  }
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    if (key && typeof key === 'string' && key.trim()) return key.trim();
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const key = window.localStorage.getItem(STORAGE_KEY_OPENAI);
    if (key && key.trim()) return key.trim();
  }

  return '';
}

export function setOpenAIApiKey(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_OPENAI, trimmed);
  }
}
