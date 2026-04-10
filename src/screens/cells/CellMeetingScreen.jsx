// CellMeetingScreen.js (estilo AddBooks)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getAuth } from "@react-native-firebase/auth";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import Section from "../../components/Section";

// ============================================================================
// Design Tokens (mantidos)
// ============================================================================
const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",

    bg: "#F5F7FB",
    card: "#FFFFFF",
    surface: "#FFFFFF",
    backgroundAlt: "#F1F4FA",

    text: "#333F42",
    textMuted: "#707D80",

    border: "#DFE1E1",
    outline: "#DFE1E1",

    tint: "#E3F7FC",
    danger: "#F95F5C",
  },
  radius: { sm: 12, md: 14, lg: 18, card: 18, pill: 999 },
  space: (n) => n * 8,
};

// ============================================================================
// Helpers
// ============================================================================
function pad2(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "00";
  return String(v).padStart(2, "0");
}

function formatBRDate(date) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(date);
  } catch {
    const d = new Date(date);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
}

function normalizeTimeInput(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  const hOnly = s.match(/^(\d{1,2})h$/);
  if (hOnly) return `${pad2(hOnly[1])}:00`;
  const onlyNum = s.match(/^(\d{1,2})$/);
  if (onlyNum) return `${pad2(onlyNum[1])}:00`;
  const hhmmLoose = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (hhmmLoose) return `${pad2(hhmmLoose[1])}:${pad2(hhmmLoose[2])}`;
  return raw;
}

function isValidTimeHHMM(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map((x) => Number(x));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function makeLocalId(prefix = "v") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function normalizePhone(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim();
}

// ============================================================================
// Fetch helper com logs
// ============================================================================
async function authedFetch(path, { method = "GET", body, signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;
  console.log("🌐 [authedFetch] =>", { method, url, body, auth: token ? "Bearer ***" : null });

  const res = await fetch(url, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  console.log("🌐 [authedFetch] <=", { status: res.status, ok: res.ok, data });

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Erro ao comunicar com o servidor (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// ============================================================================
// UI helpers (estilo AddBooks)
// ============================================================================
function Pill({ icon, label, active, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        ui.pill,
        active && ui.pillActive,
        disabled && { opacity: 0.6 },
        style,
      ]}
    >
      {!!icon && (
        <Icon
          name={icon}
          size={14}
          color={active ? DS.colors.primaryDark : DS.colors.textMuted}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[ui.pillTxt, active && ui.pillTxtActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Btn({ label, icon, onPress, variant = "primary", disabled, loading, style }) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isDanger = variant === "danger";

  const bg = isPrimary ? DS.colors.primary : "transparent";
  const border = isPrimary ? "transparent" : isDanger ? DS.colors.danger : DS.colors.border;
  const txt = isPrimary ? "#fff" : isDanger ? DS.colors.danger : DS.colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        ui.btn,
        { backgroundColor: bg, borderColor: border },
        isSecondary && { backgroundColor: DS.colors.tint, borderColor: DS.colors.tint },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : DS.colors.primaryDark} />
      ) : (
        <>
          {!!icon && <Icon name={icon} size={18} color={txt} />}
          <Text style={[ui.btnTxt, { color: txt }, !!icon && { marginLeft: 8 }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function MiniNotice({ icon = "info", text, tone = "muted" }) {
  const color = tone === "danger" ? DS.colors.danger : DS.colors.textMuted;
  return (
    <View style={ui.noticeRow}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[ui.noticeTxt, { color }]}>{text}</Text>
    </View>
  );
}

function DividerLine({ style }) {
  return <View style={[ui.divider, style]} />;
}

function CheckBubble({ checked }) {
  return (
    <View style={[styles.checkBubble, checked && styles.checkBubbleOn]}>
      <Icon
        name={checked ? "check" : "radio-button-unchecked"}
        size={16}
        color={checked ? "#fff" : DS.colors.textMuted}
      />
    </View>
  );
}


// ============================================================================
// Screen
// ============================================================================
export default function CellMeetingScreen({ route, navigation }) {
  const authCtx = useAuth();
  const cellId = route?.params?.id || route?.params?.cellId || null;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [cell, setCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [meetingDate, setMeetingDate] = useState(() => new Date());
  const [meetingTime, setMeetingTime] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [presenceQuery, setPresenceQuery] = useState("");
  const [presentMemberIds, setPresentMemberIds] = useState([]);

  const [visitors, setVisitors] = useState([]);
  const [presentVisitorIds, setPresentVisitorIds] = useState([]);

  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorError, setVisitorError] = useState("");

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Toast simples (estilo AddBooks: overlay leve)
  const [toast, setToast] = useState({ visible: false, text: "", tone: "ok" });
  const toastTimer = useRef(null);
  const showToast = useCallback((text, tone = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, tone });
    toastTimer.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setToast({ visible: false, text: "", tone: "ok" });
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const loadCell = useCallback(
    async (mode = "load") => {
      if (!cellId) {
        setError("ID da célula não foi enviado (route.params).");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError("");

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);

      try {
        const data = await authedFetch(`/cells/${cellId}`, { signal: controller.signal }, authCtx);
        if (!mountedRef.current) return;

        setCell(data);
        if (!meetingTime && data?.meetingTime) setMeetingTime(String(data.meetingTime));
      } catch (e) {
        if (!mountedRef.current) return;
        const msg =
          e?.name === "AbortError"
            ? "Tempo esgotado ao carregar (timeout)."
            : e?.message || "Erro ao carregar encontro.";
        setError(msg);
      } finally {
        clearTimeout(t);
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cellId, authCtx, meetingTime]
  );

  useEffect(() => {
    loadCell("load");
  }, [loadCell]);

  const members = useMemo(() => {
    const arr = Array.isArray(cell?.members) ? cell.members : [];
    return arr
      .map((m) => ({
        id: m.id,
        fullName: m.fullName || "Membro",
        phone: m.phone || null,
      }))
      .filter((m) => !!m.id);
  }, [cell]);

  const filteredMembers = useMemo(() => {
    const term = String(presenceQuery || "").trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const hay = [m.fullName, m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [members, presenceQuery]);

  const filteredVisitors = useMemo(() => {
    const term = String(presenceQuery || "").trim().toLowerCase();
    if (!term) return visitors;
    return visitors.filter((v) => {
      const hay = [v.name, v.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [visitors, presenceQuery]);

  const presentCount = useMemo(
    () => (presentMemberIds?.length || 0) + (presentVisitorIds?.length || 0),
    [presentMemberIds, presentVisitorIds]
  );

  const myRole =
    authCtx?.membership?.role ||
    authCtx?.me?.role ||
    authCtx?.role ||
    authCtx?.userRole ||
    null;

  const canManageByRole = useMemo(() => {
    if (!myRole) return false;
    return ["OWNER", "ADMIN", "LEADER"].includes(String(myRole).toUpperCase());
  }, [myRole]);

  const myMemberId =
    authCtx?.me?.memberId ||
    authCtx?.memberId ||
    authCtx?.activeMemberId ||
    null;

  const canManageByLeader = useMemo(() => {
    if (!myMemberId) return false;
    return myMemberId === cell?.leaderId || myMemberId === cell?.viceLeaderId;
  }, [myMemberId, cell?.leaderId, cell?.viceLeaderId]);

  const canManage = canManageByRole || canManageByLeader;

  const meetingDateLabel = useMemo(() => {
    const d = formatBRDate(meetingDate);
    const t = String(meetingTime || "").trim();
    if (t) return `${d} • ${t}`;
    return d;
  }, [meetingDate, meetingTime]);

  const togglePresenceMember = useCallback(
    (memberId) => {
      if (!canManage) return;
      setPresentMemberIds((prev) => {
        const has = prev.includes(memberId);
        return has ? prev.filter((x) => x !== memberId) : [...prev, memberId];
      });
    },
    [canManage]
  );

  const togglePresenceVisitor = useCallback(
    (visitorId) => {
      if (!canManage) return;
      setPresentVisitorIds((prev) => {
        const has = prev.includes(visitorId);
        return has ? prev.filter((x) => x !== visitorId) : [...prev, visitorId];
      });
    },
    [canManage]
  );

  const markAllFiltered = useCallback(() => {
    if (!canManage) return;

    const memberIds = filteredMembers.map((m) => m.id);
    const visitorIds = filteredVisitors.map((v) => v.id);

    setPresentMemberIds((prev) => {
      const set = new Set(prev);
      memberIds.forEach((id) => set.add(id));
      return Array.from(set);
    });

    setPresentVisitorIds((prev) => {
      const set = new Set(prev);
      visitorIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }, [canManage, filteredMembers, filteredVisitors]);

  const clearAll = useCallback(() => {
    if (!canManage) return;
    setPresentMemberIds([]);
    setPresentVisitorIds([]);
  }, [canManage]);

  const addVisitor = useCallback(() => {
    if (!canManage) return;

    const n = String(visitorName || "").trim();
    const p = normalizePhone(visitorPhone);

    setVisitorError("");

    if (n.length < 2) {
      setVisitorError("Informe o nome do visitante (mínimo 2 caracteres).");
      return;
    }
    if (!p) {
      setVisitorError("Informe o telefone do visitante.");
      return;
    }

    setVisitors((prev) => {
      const already = prev.some(
        (v) => v.name.trim().toLowerCase() === n.toLowerCase() && String(v.phone || "").trim() === p
      );
      if (already) {
        setVisitorError("Este visitante já foi adicionado.");
        return prev;
      }
      return [...prev, { id: makeLocalId("vis"), name: n, phone: p }];
    });

    setVisitorName("");
    setVisitorPhone("");
    Keyboard.dismiss();
  }, [canManage, visitorName, visitorPhone]);

  const removeVisitor = useCallback(
    (visitorId) => {
      if (!canManage) return;
      setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
      setPresentVisitorIds((prev) => prev.filter((x) => x !== visitorId));
      showToast("Visitante removido.", "ok");
    },
    [canManage, showToast]
  );

  const onSaveReport = useCallback(async () => {
    if (!cellId || saving) return;

    if (!canManage) {
      showToast("Apenas líder/vice ou admin pode salvar relatório.", "danger");
      return;
    }

    if (!isValidTimeHHMM(meetingTime)) {
      showToast("Horário inválido. Use HH:MM (ex: 20:00).", "danger");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        notes: String(notes || "").trim() || null,
        presentMemberIds,
        meetingDate: meetingDate ? meetingDate.toISOString() : new Date().toISOString(),
        meetingTime: String(meetingTime || "").trim() || null,
        visitors: visitors.map((v) => ({
          name: v.name,
          phone: v.phone,
          present: presentVisitorIds.includes(v.id),
        })),
      };

      console.log("📝 [CellMeeting] saveReport payload =>", payload);
      await authedFetch(`/cells/${cellId}/meetings`, { method: "POST", body: payload }, authCtx);

      showToast("Relatório salvo com sucesso!", "ok");

      // ✅ sair da página após mostrar o toast
      setTimeout(() => {
        if (!mountedRef.current) return;
        navigation?.goBack?.();
      }, 900);
    } catch (e) {
      showToast(e?.message || "Erro ao salvar relatório.", "danger");
    } finally {
      setSaving(false);
    }
  }, [
    cellId,
    saving,
    canManage,
    notes,
    presentMemberIds,
    meetingDate,
    meetingTime,
    authCtx,
    visitors,
    presentVisitorIds,
    showToast,
    navigation,
  ]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: DS.colors.textMuted }}>Carregando encontro...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="always"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCell("refresh")} />}
        >
          {!!error && (
            <View style={[styles.card, { borderColor: "#FFD6D6", backgroundColor: "#FFF7F7" }]}>
              <Text style={styles.sectionTitle}>Não foi possível abrir</Text>
              <Text style={styles.smallMuted}>{error}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Btn label="Voltar" variant="secondary" onPress={() => navigation?.goBack?.()} style={{ flex: 1 }} />
                <Btn label="Tentar novamente" onPress={() => loadCell("load")} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {!!cell && (
            <View style={styles.card}>
              <Text style={styles.headline}>Encontro</Text>
              <Text style={styles.smallMuted}>Célula: {cell?.name || cellId}</Text>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionTitle}>Data do encontro</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setShowDatePicker(true)}
                  style={styles.selectRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectTitle} numberOfLines={1}>
                      {meetingDateLabel}
                    </Text>
                    <Text style={styles.smallMuted} numberOfLines={1}>
                      Toque para alterar a data
                    </Text>
                  </View>

                  <View style={styles.iconPill}>
                    <Icon name="event" size={18} color={DS.colors.primaryDark} />
                  </View>
                </TouchableOpacity>

                <TextInput
                  value={meetingTime}
                  onChangeText={(v) => setMeetingTime(normalizeTimeInput(v))}
                  placeholder="Hora (opcional) HH:MM"
                  placeholderTextColor={DS.colors.textMuted}
                  style={styles.input}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                />

                {!isValidTimeHHMM(meetingTime) ? (
                  <MiniNotice icon="error-outline" tone="danger" text="Horário inválido. Use 00:00 até 23:59." />
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Icon name="groups" size={14} color={DS.colors.text} />
                  <Text style={styles.metaChipTxt}>{members.length} membros</Text>
                </View>

                <View style={styles.metaChip}>
                  <Icon name="person-add-alt-1" size={14} color={DS.colors.text} />
                  <Text style={styles.metaChipTxt}>{visitors.length} visitantes</Text>
                </View>

                <View style={[styles.metaChip, { backgroundColor: DS.colors.tint, borderColor: DS.colors.tint }]}>
                  <Icon name="check-circle" size={14} color={DS.colors.primaryDark} />
                  <Text style={[styles.metaChipTxt, { color: DS.colors.primaryDark }]}>{presentCount} presentes</Text>
                </View>

                {!canManage ? (
                  <View style={[styles.metaChip, { borderColor: "#FFD6D6", backgroundColor: "#FFF1F1" }]}>
                    <Icon name="lock" size={14} color={DS.colors.danger} />
                    <Text style={[styles.metaChipTxt, { color: DS.colors.danger }]}>Somente líder/admin</Text>
                  </View>
                ) : (
                  <View style={[styles.metaChip, { borderColor: "#CFF5EF", backgroundColor: "#ECFBF9" }]}>
                    <Icon name="verified" size={14} color={DS.colors.accent} />
                    <Text style={[styles.metaChipTxt, { color: DS.colors.accent }]}>Permissão OK</Text>
                  </View>
                )}
              </View>

              <DividerLine style={{ marginTop: 12 }} />

              <Text style={[styles.smallMuted, { marginTop: 10 }]}>
                Marque presença e preencha o relatório na mesma tela.
              </Text>
            </View>
          )}

          {/* =========================
              PRESENÇA
          ========================== */}
          <Section title="Presença">
            <View style={styles.card}>
              <TextInput
                value={presenceQuery}
                onChangeText={setPresenceQuery}
                placeholder="Buscar participante..."
                placeholderTextColor={DS.colors.textMuted}
                style={styles.input}
              />

              {canManage ? (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Btn label="Marcar todos (filtro)" variant="secondary" onPress={markAllFiltered} style={{ flex: 1 }} />
                  <Btn label="Limpar" variant="secondary" onPress={clearAll} style={{ flex: 1 }} />
                </View>
              ) : (
                <MiniNotice
                  icon="visibility"
                  text="Você pode visualizar a presença, mas só líder/vice/admin pode editar."
                />
              )}

              {/* ========= MEMBROS ========= */}
              <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Membros</Text>

              {filteredMembers.length === 0 ? (
                <Text style={styles.smallMuted}>Nenhum membro encontrado.</Text>
              ) : (
                filteredMembers.map((m) => {
                  const checked = presentMemberIds.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.9}
                      onPress={() => togglePresenceMember(m.id)}
                      disabled={!canManage}
                      style={[styles.row, checked && styles.rowChecked]}

                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        <CheckBubble checked={checked} />

                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {m.fullName}
                          </Text>
                          <Text style={styles.smallMuted} numberOfLines={1}>
                            {checked ? "Presente" : "Ausente"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* ========= VISITANTES ========= */}
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Visitantes</Text>

              <View style={styles.box}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    value={visitorName}
                    onChangeText={(v) => {
                      setVisitorError("");
                      setVisitorName(v);
                    }}
                    placeholder="Nome do visitante"
                    placeholderTextColor={DS.colors.textMuted}
                    style={[styles.input, { flex: 1.2 }]}
                    editable={canManage}
                  />

                  <TextInput
                    value={visitorPhone}
                    onChangeText={(v) => {
                      setVisitorError("");
                      setVisitorPhone(v);
                    }}
                    placeholder="Telefone"
                    placeholderTextColor={DS.colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "phone-pad"}
                    editable={canManage}
                  />
                </View>

                {!!visitorError ? (
                  <MiniNotice icon="error-outline" tone="danger" text={visitorError} />
                ) : null}

                <Btn
                  label="Adicionar visitante"
                  icon="person-add-alt-1"
                  onPress={addVisitor}
                  disabled={!canManage}
                  style={{ marginTop: 10 }}
                />
              </View>

              {filteredVisitors.length === 0 ? (
                <Text style={[styles.smallMuted, { marginTop: 10 }]}>
                  {visitors.length ? "Nenhum visitante no filtro." : "Nenhum visitante adicionado."}
                </Text>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {filteredVisitors.map((v) => {
                    const checked = presentVisitorIds.includes(v.id);
                    return (
                      <View key={v.id} style={styles.row}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => togglePresenceVisitor(v.id)}
                          disabled={!canManage}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                        >
                          <CheckBubble checked={checked} />

                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {v.name}
                            </Text>
                            <Text style={styles.smallMuted} numberOfLines={1}>
                              {v.phone || "Sem telefone"}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {canManage ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => removeVisitor(v.id)}
                            style={styles.trashBtn}
                          >
                            <Icon name="delete-outline" size={20} color={DS.colors.danger} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Section>

          {/* =========================
              RELATÓRIO
          ========================== */}
          <Section title="Relatório">
            <View style={styles.card}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Tema, versículo, pedidos de oração..."
                placeholderTextColor={DS.colors.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                editable={canManage}
              />

              <Btn
                label="Salvar relatório"
                icon="save"
                onPress={onSaveReport}
                loading={saving}
                disabled={!canManage || saving || !isValidTimeHHMM(meetingTime)}
                style={{ marginTop: 12 }}
              />

              {!canManage ? (
                <Text style={[styles.smallMuted, { marginTop: 10 }]}>
                  Apenas o líder/vice da célula ou administradores podem salvar relatório.
                </Text>
              ) : null}
            </View>
          </Section>

          <View style={{ height: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker ? (
        <DateTimePicker
          value={meetingDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            if (Platform.OS !== "ios") setShowDatePicker(false);
            if (event?.type === "dismissed") return;
            if (selectedDate) setMeetingDate(selectedDate);
          }}
        />
      ) : null}

      {Platform.OS === "ios" && showDatePicker ? (
        <View style={styles.iosPickerFooter}>
          <Btn label="OK" onPress={() => setShowDatePicker(false)} style={{ flex: 1 }} />
        </View>
      ) : null}

      {toast.visible ? (
        <View style={[styles.toast, toast.tone === "danger" && { borderColor: "#FFD6D6" }]}>
          <Icon
            name={toast.tone === "danger" ? "error-outline" : "check-circle"}
            size={18}
            color={toast.tone === "danger" ? DS.colors.danger : DS.colors.accent}
          />
          <Text style={styles.toastTxt} numberOfLines={2}>
            {toast.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: DS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.card,
  },
  pillActive: {
    borderColor: DS.colors.tint,
    backgroundColor: DS.colors.tint,
  },
  pillTxt: { color: DS.colors.textMuted, fontWeight: "900", fontSize: 12 },
  pillTxtActive: { color: DS.colors.primaryDark },

  btn: {
    height: 44,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { fontWeight: "900", fontSize: 14 },

  noticeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  noticeTxt: { fontWeight: "700" },

  divider: { height: 1, backgroundColor: DS.colors.border, opacity: 0.9 },

  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: DS.colors.primary,
    borderColor: DS.colors.primary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },

  card: {
    borderRadius: DS.radius.card,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.card,
    padding: 14,
    marginBottom: 14,
  },

  headline: { fontSize: 20, fontWeight: "900", color: DS.colors.text },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: DS.colors.text, marginBottom: 6 },
  smallMuted: { color: DS.colors.textMuted, fontWeight: "700" },

  selectRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectTitle: { fontWeight: "900", color: DS.colors.text },

  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.tint,
    borderWidth: 1,
    borderColor: DS.colors.tint,
  },

  input: {
    marginTop: 10,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.card,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: DS.colors.text,
    fontWeight: "800",
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: DS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.backgroundAlt,
  },
  metaChipTxt: { color: DS.colors.textMuted, fontWeight: "900" },

  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: { fontWeight: "900", color: DS.colors.text },

  box: {
    marginTop: 10,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.outline,
    backgroundColor: DS.colors.surface,
    padding: 12,
  },

  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    backgroundColor: "#FFF7F7",
  },

  iosPickerFooter: {
    padding: 12,
    backgroundColor: DS.colors.bg,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
  },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: DS.radius.card,
    borderWidth: 1,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 4,
  },
  toastTxt: { color: DS.colors.text, fontWeight: "800", flex: 1 },
  checkBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    backgroundColor: DS.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBubbleOn: {
    backgroundColor: DS.colors.primary,
    borderColor: DS.colors.primary,
  },
  rowChecked: {
    borderColor: DS.colors.tint,
    backgroundColor: "#F6FDFF", // bem leve
  },

});
