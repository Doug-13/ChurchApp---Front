import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  getIdToken,
} from "@react-native-firebase/auth";
import { API_BASE_URL } from "../config/api";

const AuthContext = createContext(null);

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

// ✅ DEV
const DEV_FORCE_ADMIN = true;
const DEV_ROLE = "admin";

function maskToken(t = "") {
  const s = String(t || "");
  if (!s) return "";
  return s.length > 18 ? `${s.slice(0, 8)}...${s.slice(-8)}` : "***";
}

function isJsonString(v) {
  return typeof v === "string";
}

function shouldAttachBody(method) {
  const m = String(method || "GET").toUpperCase();
  return !["GET", "HEAD"].includes(m);
}

async function apiFetch(
  path,
  { method = "GET", token, body, debug = false } = {}
) {
  const url = `${API_BASE_URL}${path}`;

  const hasBody = body !== undefined && body !== null && shouldAttachBody(method);

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  };

  // ✅ CORREÇÃO: evita JSON.stringify duplo
  // - Se body for string => usa como está
  // - Se body for objeto => JSON.stringify
  const resolvedBody = hasBody
    ? isJsonString(body)
      ? body
      : JSON.stringify(body)
    : undefined;

  if (debug) {
    console.log("➡️ API REQUEST:", {
      method,
      url,
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${maskToken(token)}` : undefined,
      },
      body: hasBody ? body : null,
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body: resolvedBody,
  });

  const raw = await res.text().catch(() => "");
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw || null;
  }

  if (debug) {
    console.log("⬅️ API RESPONSE:", {
      method,
      url,
      status: res.status,
      ok: res.ok,
      data,
    });
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

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);

  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);

  const [role, setRole] = useState(DEV_FORCE_ADMIN ? DEV_ROLE : "member");
  const [churchStatus, setChurchStatus] = useState("checking");

  const app = getApp();
  const a = getAuth(app);

  // ✅ helper: token (para usar nas telas)
  async function getToken(forceRefresh = false) {
    const current = a.currentUser;
    if (!current) return null;
    return getIdToken(current, forceRefresh);
  }

  // ✅ helper: fetch já autenticado (para usar nas telas)
  async function apiFetchAuth(path, opts = {}) {
    const token = await getToken(false);
    if (!token) throw new Error("Usuário não autenticado (token ausente).");
    return apiFetch(path, { ...opts, token, debug: __DEV__ });
  }

  async function refreshMe() {
    const current = a.currentUser;
    if (!current) {
      setMe(null);
      setChurchStatus("checking");
      return null;
    }

    setMeLoading(true);
    try {
      const token = await getIdToken(current, true);

      const data = await apiFetch("/users/me", {
        method: "GET",
        token,
        debug: __DEV__,
      });

      setMe(data ?? null);

      const activeChurchId = data?.activeChurchId;
      setChurchStatus(activeChurchId ? "ready" : "needs_church");

      if (DEV_FORCE_ADMIN) setRole(DEV_ROLE);

      return data;
    } catch (err) {
      console.log("🔥 /users/me error =>", err?.message || err);
      throw err;
    } finally {
      setMeLoading(false);
    }
  }

  // ✅ setter: trocar igreja ativa (backend + refreshMe)
  async function setActiveChurchId(churchId) {
    const id = churchId ? String(churchId) : null;
    if (!id) throw new Error("churchId inválido.");

    // ⚠️ ajuste o endpoint se o seu for diferente
    await apiFetchAuth("/users/me/active-church", {
      method: "PATCH",
      body: { churchId: id }, // ✅ agora pode ser objeto sem risco de duplicar stringify
    });

    await refreshMe();
    return id;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(a, async (u) => {
      setUser(u ?? null);

      if (initializing) setInitializing(false);
      if (DEV_FORCE_ADMIN) setRole(DEV_ROLE);

      if (!u) {
        setMe(null);
        setChurchStatus("checking");
        return;
      }

      setChurchStatus("checking");
      try {
        await refreshMe();
      } catch {
        setChurchStatus("needs_church");
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSignOut = async () => {
    try {
      setUser(null);
      setMe(null);
      setChurchStatus("checking");
      if (!DEV_FORCE_ADMIN) setRole("member");

      await fbSignOut(a);
    } finally {
      setMe(null);
      setChurchStatus("checking");
    }
  };

  const value = useMemo(() => {
    const isAdmin = role === "admin";

    // ✅ EXPOSTO NO CONTEXT:
    const activeChurchId = me?.activeChurchId ?? null;

    return {
      initializing,
      user,
      me,
      meLoading,
      churchStatus,
      refreshMe,

      role,
      isAdmin,
      setRole,

      // ✅ helpers
      activeChurchId,
      setActiveChurchId,
      getToken,
      apiFetchAuth,

      signUp: async (email, password, name) => {
        const e = normalizeEmail(email);
        const cred = await createUserWithEmailAndPassword(a, e, password);

        const n = String(name || "").trim();
        if (n) {
          await fbUpdateProfile(cred.user, { displayName: n });
          await cred.user.reload();
        }

        await refreshMe();
        return cred;
      },

      signIn: async (email, password) => {
        const e = normalizeEmail(email);
        const cred = await signInWithEmailAndPassword(a, e, password);
        await refreshMe();
        return cred;
      },

      signOut: doSignOut,
      logout: doSignOut,

      resetPassword: (email) =>
        sendPasswordResetEmail(a, normalizeEmail(email)),

      updateProfile: async ({ displayName, photoURL } = {}) => {
        const current = a.currentUser;
        if (!current) return null;

        const payload = {};
        if (displayName !== undefined)
          payload.displayName = String(displayName).trim();
        if (photoURL !== undefined) payload.photoURL = String(photoURL).trim();

        await fbUpdateProfile(current, payload);
        await current.reload();

        setUser(a.currentUser);
        await refreshMe();
        return a.currentUser;
      },
    };
  }, [initializing, user, me, meLoading, churchStatus, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider />");
  return ctx;
}