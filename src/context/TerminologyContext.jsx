// src/context/TerminologyContext.jsx
//
// Carrega os termos personalizados da igreja (/churches/:id/terminology)
// e disponibiliza para todo o app via hook useTerms().
//
// USO:
//   const { t } = useTerms();
//   <Text>{t.cell}</Text>          → "Grupos" (ou "Células" se não personalizado)
//   <Text>{t.cellPlural}</Text>    → "Grupos" (alias de t.cell)
//   <Text>{t.member}</Text>        → "Congregados"
//
// Os valores retornados sempre têm a primeira letra maiúscula.
// Para minúscula: t.cell.toLowerCase()
// Para plural automático: use t.cell diretamente (a própria igreja define o plural)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "./AuthContext";

// ─── Defaults — espelha exatamente TERMINOLOGY_DEFAULTS do backend ────────────
const DEFAULTS = {
  cell:        "Células",
  cellMeeting: "Reunião",
  cellLeader:  "Líder",
  ministry:    "Ministério",
  member:      "Membro",
  news:        "Avisos",
  schedule:    "Escala",
  pastor:      "Pastor",
};

const TerminologyContext = createContext({
  terms:   DEFAULTS,
  t:       DEFAULTS,
  loading: false,
  reload:  () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TerminologyProvider({ children }) {
  const { activeChurchId, churchStatus } = useAuth();
  const [terms,   setTerms]   = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchTerms = useCallback(async (churchId) => {
    if (!churchId) {
      setTerms(DEFAULTS);
      return;
    }

    // Cancela fetch anterior se ainda estiver pendente
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const fbUser = getAuth().currentUser;
      if (!fbUser) return;

      const token = await getIdToken(fbUser, false);
      const res = await global.fetch(
        `${API_BASE_URL}/churches/${churchId}/terminology`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      // Merge com defaults — garante que chaves ausentes na API não quebram o app
      setTerms({ ...DEFAULTS, ...data });
    } catch (e) {
      if (e?.name === "AbortError") return; // fetch cancelado intencionalmente
      console.warn("[TerminologyContext] erro ao carregar termos:", e?.message);
      // Mantém os defaults em caso de erro — app não quebra
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega sempre que a igreja ativa mudar e o status for "ready"
  useEffect(() => {
    if (churchStatus !== "ready") return;
    fetchTerms(activeChurchId);

    return () => {
      abortRef.current?.abort();
    };
  }, [activeChurchId, churchStatus, fetchTerms]);

  const value = {
    terms,
    t: terms,           // alias curto: const { t } = useTerms()
    loading,
    reload: () => fetchTerms(activeChurchId),
  };

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
//
// const { t } = useTerms();
//
// Campos disponíveis em `t`:
//   t.cell        → "Células" | "Grupos" | "GPs" …
//   t.cellMeeting → "Reunião" | "Encontro" | "Culto" …
//   t.cellLeader  → "Líder"   | "Anfitrião" …
//   t.ministry    → "Ministério" | "Departamento" …
//   t.member      → "Membro" | "Congregado" …
//   t.news        → "Avisos" | "Informes" …
//   t.schedule    → "Escala" | "Serviço" …
//   t.pastor      → "Pastor" | "Bispo" …

export function useTerms() {
  return useContext(TerminologyContext);
}