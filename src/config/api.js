// src/config/api.js

import axios from "axios";
import { getApp } from "@react-native-firebase/app";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import auth from "@react-native-firebase/auth";

// ─── Configuração única de ambiente ───────────────────────────
const MODE = "local"; // 'local' | 'online'

export const API_BASE_URL =
  MODE === "local"
    ? "http://192.168.1.47:3000"
    : "https://churchapp-back.onrender.com";

// ─── Instância Axios (para quem usa axios) ─────────────────────
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── apiFetch (para quem usa fetch nativo) ─────────────────────
function maskToken(t = "") {
  const s = String(t || "");
  return s.length > 18 ? `${s.slice(0, 8)}...${s.slice(-8)}` : "***";
}

export async function apiFetch(path, { method = "GET", body, authRequired = false } = {}) {
  const a = getAuth(getApp());
  let token;

  if (authRequired) {
    const u = a.currentUser;
    if (!u) throw new Error("Usuário não autenticado.");
    token = await getIdToken(u, true);
  }

  const url = `${API_BASE_URL}${path}`;
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  if (__DEV__) {
    console.log("➡️ apiFetch", method, url, {
      Authorization: token ? `Bearer ${maskToken(token)}` : undefined,
      body: body ?? null,
    });
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      `Falha de conexão: ${url}. Verifique backend, IP, porta e firewall.`
    );
  }

  const raw = await res.text().catch(() => "");
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw || null; }

  if (__DEV__) console.log("⬅️ apiFetch", method, url, res.status, data);

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} - ${msg}`);
  }

  return data;
}

// ─── Upload multipart (para uploadService) ────────────────────
export async function uploadFile(file) {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.type });

  const res = await fetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }

  return res.json();
}