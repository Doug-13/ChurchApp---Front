import { apiFetch } from "../../src/config/api";

export const searchChurches = (q = "") =>
  apiFetch(`/churches/public${q ? `?q=${encodeURIComponent(q)}` : ""}}`);

export const createChurch = (payload) =>
  apiFetch("/churches", { method: "POST", body: payload, authRequired: true });

export const joinChurch = (churchId) =>
  apiFetch(`/churches/${churchId}/join`, { method: "POST", authRequired: true });