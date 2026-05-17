// src/context/AuthContext.jsx
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
import {
  getPermissions,
  normalizeRole,
  normalizeExtraPermissions,
} from "../utils/permissions";

const AuthContext = createContext(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

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

function resolveRoleFromMe(data) {
  const rawRole = String(
    data?.membership?.role ??
      data?.activeMembership?.role ??
      data?.myRole ??
      data?.role ??
      "MEMBER"
  );

  return {
    rawRole,
    resolvedRole: normalizeRole(rawRole),
  };
}

function resolveExtraPermissionsFromMe(data) {
  const rawExtras =
    data?.membership?.extraPermissions ??
    data?.activeMembership?.extraPermissions ??
    data?.extraPermissions ??
    {};

  return {
    rawExtras,
    resolvedExtras: normalizeExtraPermissions(rawExtras),
  };
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

  const res = await fetch(url, { method, headers, body: resolvedBody });

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

// ─── AuthProvider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);

  const [memberRole, setMemberRole] = useState("MEMBER");
  const [extraPerms, setExtraPerms] = useState({});
  const [churchStatus, setChurchStatus] = useState("checking");

  const app = getApp();
  const a = getAuth(app);

  // ── Permissões calculadas ─────────────────────────────────────────────────
  // OWNER sempre recebe todas as permissões pelo getPermissions().
  const permissions = useMemo(() => {
    const resolvedRole = normalizeRole(memberRole);

    if (resolvedRole === "OWNER") {
      return getPermissions("OWNER", {});
    }

    return getPermissions(resolvedRole, extraPerms);
  }, [memberRole, extraPerms]);

  const isOwner = normalizeRole(memberRole) === "OWNER" || !!permissions?.isOwner;
  const isAdmin = isOwner || !!permissions?.isAdmin;
  const isLeader = isAdmin || !!permissions?.isLeader;

  // ─── getToken ─────────────────────────────────────────────────────────────

  async function getToken(forceRefresh = false) {
    const current = a.currentUser;
    if (!current) return null;
    return getIdToken(current, forceRefresh);
  }

  // ─── apiFetchAuth ─────────────────────────────────────────────────────────

  async function apiFetchAuth(path, opts = {}) {
    const token = await getToken(false);
    if (!token) throw new Error("Usuário não autenticado (token ausente).");
    return apiFetch(path, { ...opts, token, debug: __DEV__ });
  }

  // ─── applyMeData ───────────────────────────────────────────────────────────
  // Centraliza a atualização do contexto para refreshMe e refreshPermissions.

  function applyMeData(data) {
    setMe(data ?? null);

    const activeChurchId = data?.activeChurchId;
    setChurchStatus(activeChurchId ? "ready" : "needs_church");

    const { rawRole, resolvedRole } = resolveRoleFromMe(data);
    const { rawExtras, resolvedExtras } = resolveExtraPermissionsFromMe(data);

    setMemberRole(resolvedRole);

    // OWNER não precisa de extraPermissions.
    // Isto evita que null, {} ou alguma chave false bloqueie o responsável.
    setExtraPerms(resolvedRole === "OWNER" ? {} : resolvedExtras);

    if (__DEV__) {
      console.log("[AuthContext] applyMeData =>", {
        userId: data?.id,
        activeChurchId,
        membership: data?.membership,
        rawRole,
        resolvedRole,
        isOwner: resolvedRole === "OWNER",
        rawExtraPermissions: rawExtras,
        resolvedExtraPermissions: resolvedExtras,
      });
    }

    return {
      rawRole,
      resolvedRole,
      rawExtras,
      resolvedExtras,
    };
  }

  // ─── refreshMe ─────────────────────────────────────────────────────────────

  async function refreshMe() {
    const current = a.currentUser;

    if (!current) {
      setMe(null);
      setMemberRole("MEMBER");
      setExtraPerms({});
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

      applyMeData(data);

      return data;
    } catch (err) {
      console.log("🔥 /users/me error =>", err?.message || err);
      throw err;
    } finally {
      setMeLoading(false);
    }
  }

  // ─── refreshPermissions ───────────────────────────────────────────────────

  async function refreshPermissions() {
    const current = a.currentUser;
    if (!current) return null;

    try {
      const token = await getIdToken(current, false);

      const data = await apiFetch("/users/me", {
        method: "GET",
        token,
        debug: __DEV__,
      });

      applyMeData(data);

      return data;
    } catch (e) {
      console.log("[AuthContext] refreshPermissions error:", e?.message || e);
      return null;
    }
  }

  // ─── setActiveChurchId ────────────────────────────────────────────────────

  async function setActiveChurchId(churchId) {
    const id = churchId ? String(churchId) : null;
    if (!id) throw new Error("churchId inválido.");

    await apiFetchAuth("/users/me/active-church", {
      method: "PATCH",
      body: { churchId: id },
    });

    await refreshMe();

    return id;
  }

  // ─── onAuthStateChanged ───────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(a, async (u) => {
      setUser(u ?? null);

      if (initializing) {
        setInitializing(false);
      }

      if (!u) {
        setMe(null);
        setMemberRole("MEMBER");
        setExtraPerms({});
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

  // ─── signOut ──────────────────────────────────────────────────────────────

  const doSignOut = async () => {
    try {
      setUser(null);
      setMe(null);
      setMemberRole("MEMBER");
      setExtraPerms({});
      setChurchStatus("checking");
      await fbSignOut(a);
    } finally {
      setMe(null);
      setMemberRole("MEMBER");
      setExtraPerms({});
      setChurchStatus("checking");
    }
  };

  // ─── Context value ────────────────────────────────────────────────────────

  const value = useMemo(() => {
    const activeChurchId = me?.activeChurchId ?? null;
    const resolvedRole = normalizeRole(memberRole);

    return {
      // Estado base
      initializing,
      user,
      me,
      meLoading,
      churchStatus,
      activeChurchId,

      // Role e permissões
      role: resolvedRole,
      memberRole: resolvedRole,
      extraPermissions: extraPerms,
      permissions,
      isOwner,
      isAdmin,
      isLeader,

      // Atalho de permissão.
      // OWNER retorna true para qualquer permissão, inclusive alguma chave nova
      // que uma tela ainda não tenha sido adicionada ao PERMISSION_KEYS.
      can: (permKey) => {
        if (resolvedRole === "OWNER") return true;
        return !!permissions?.[permKey];
      },

      // Ações
      refreshMe,
      refreshPermissions,
      setActiveChurchId,
      getToken,
      apiFetchAuth,

      // Legado
      setRole: (r) => setMemberRole(normalizeRole(r)),

      // Auth
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

      resetPassword: (email) => sendPasswordResetEmail(a, normalizeEmail(email)),

      updateProfile: async ({ displayName, photoURL } = {}) => {
        const current = a.currentUser;
        if (!current) return null;

        const payload = {};

        if (displayName !== undefined) {
          payload.displayName = String(displayName).trim();
        }

        if (photoURL !== undefined) {
          payload.photoURL = String(photoURL).trim();
        }

        await fbUpdateProfile(current, payload);
        await current.reload();

        setUser(a.currentUser);

        await refreshMe();

        return a.currentUser;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initializing,
    user,
    me,
    meLoading,
    churchStatus,
    memberRole,
    extraPerms,
    permissions,
    isOwner,
    isAdmin,
    isLeader,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider />");
  }

  return ctx;
}