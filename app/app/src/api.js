import { CONFIG } from "./config";

async function request(path, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${CONFIG.API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensaje || data.error || `Error ${res.status}`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Tiempo de espera agotado");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export const getEstado = () => request("/estado");

export const getEventos = (limite = CONFIG.EVENTS_LIMIT) => request(`/eventos?limite=${limite}`);

export const abrirPuerta = (pin) => request("/abrir", { method: "POST", body: JSON.stringify({ pin }) });

// Las fechas llegan en UTC; se muestran en hora de Perú (UTC-5, sin horario de verano).
export function horaPeru(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const p = new Date(d.getTime() - 5 * 3600 * 1000);
  const z = (n) => String(n).padStart(2, "0");
  return `${z(p.getUTCDate())}/${z(p.getUTCMonth() + 1)}/${p.getUTCFullYear()} ${z(p.getUTCHours())}:${z(p.getUTCMinutes())}:${z(p.getUTCSeconds())}`;
}
