import { getApp } from "@react-native-firebase/app";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
// import { API_BASE_URL } from "../../src/config/api";

const API_BASE_URL = "192.168.1.12:3000";

function maskToken(t = "") {
  const s = String(t || "");
  return s.length > 18 ? `${s.slice(0, 8)}...${s.slice(-8)}` : "***";
}

async function apiFetch(path, { method = "GET", body, authRequired = false } = {}) {
  const app = getApp();
  const a = getAuth(app);

  let token;
  if (authRequired) {
    const u = a.currentUser;
    if (!u) throw new Error("Usuário não autenticado.");
    token = await getIdToken(u, true); // ✅ modular (remove warning)
  }

  const url = `${API_BASE_URL}${path}`;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  if (__DEV__) {
    console.log("➡️ churchService", method, url, {
      Authorization: token ? `Bearer ${maskToken(token)}` : undefined,
      body: body ?? null,
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text().catch(() => "");
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw || null;
  }

  if (__DEV__) {
    console.log("⬅️ churchService", method, url, res.status, data);
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export function searchChurches(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/churches/public${qs}`, { method: "GET" });
}

export function createChurch(payload) {
  return apiFetch(`/churches`, { method: "POST", body: payload, authRequired: true });
}

export function joinChurch(churchId) {
  return apiFetch(`/churches/${churchId}/join`, { method: "POST", authRequired: true });
}

// Se quiser no futuro:
// export function joinByInviteCode(code) {
//   return apiFetch(`/churches/invite/${encodeURIComponent(code)}`, { method: "POST", authRequired: true });
// }
