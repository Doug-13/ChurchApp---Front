import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Platform,
  Linking,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Button,
  Avatar,
  IconButton,
  ActivityIndicator,
  Portal,
  Modal,
  Searchbar,
  Snackbar,
  Divider,
  Surface,
  TouchableRipple,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Design System ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const BORDER      = "#E4E6F0";
const MUTED       = "#9198B5";

// ─── Permissões ───────────────────────────────────────────────────────────────
function isAdminOrOwner(role) {
  const r = String(role || "").toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

function isLeaderOfCell(cell, me) {
  if (!cell || !me) return false;
  const myId  = me?.id  || me?.uid  || null;
  const myUid = me?.uid || me?.id   || null;
  const leaderUserId = cell?.leader?.userId || cell?.leader?.id || null;
  const leaderId     = cell?.leaderId || null;
  if (!myId && !myUid) return false;
  return (
    (leaderUserId && (leaderUserId === myId || leaderUserId === myUid)) ||
    (leaderId     && (leaderId     === myId || leaderId     === myUid))
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withAlpha(hex, alphaHex = "18") {
  const h = String(hex || "").trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(h)) return hex;
  const clean = h.startsWith("#") ? h.slice(1) : h;
  return `#${clean}${alphaHex}`;
}

function isHttpUrl(u) {
  return /^https?:\/\/\S+/i.test(String(u || "").trim());
}

function pickPhotoUrl(item) {
  return (
    item?.photoUrl   ||
    item?.photoURL   ||
    item?.avatarUrl  ||
    item?.user?.photoUrl  ||
    item?.user?.photoURL  ||
    item?.user?.avatarUrl ||
    null
  );
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] || "";
  const last  = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

/**
 * Monta uma string de endereço legível a partir dos campos da célula.
 * Retorna null se não tiver nada.
 */
function buildAddressString(cell) {
  if (!cell) return null;
  const parts = [
    cell.street && cell.number
      ? `${cell.street}, ${cell.number}`
      : cell.street || null,
    cell.complement || null,
    cell.neighborhood || null,
    cell.city || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Abre o endereço no app de mapas nativo.
 * iOS → Apple Maps | Android → Google Maps / qualquer app registrado
 */
function openInMaps(address) {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
  });
  Linking.canOpenURL(url).then((supported) => {
    if (supported) {
      Linking.openURL(url);
    } else {
      // fallback para Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    }
  });
}

/**
 * Gera URL do mapa estático OpenStreetMap (sem necessidade de API key).
 * Usamos a API do staticmap.openstreetmap.de como imagem embutida.
 */
function buildStaticMapUrl(address, width = 640, height = 200) {
  if (!address) return null;
  const encoded = encodeURIComponent(address);
  // Nominatim geocode → não serve imagem; usamos Maps.co staticmap (gratuito, sem key)
  // Alternativa sem key: openstreetmap via geoapify
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${encoded}&zoom=15&size=${width}x${height}&maptype=mapnik&markers=${encoded},red-pushpin`;
}

async function authedFetch(path, { method = "GET", body, signal } = {}, authCtx) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Erro ${res.status}.`;
    const err = new Error(msg);
    err.status  = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ─── Modal de seleção de membro ───────────────────────────────────────────────
function MemberCascadeModal({ visible, onDismiss, items, loading, selectedIds = [], onPick }) {
  const [q, setQ] = useState("");

  useEffect(() => { if (!visible) setQ(""); }, [visible]);

  const filtered = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    const base = Array.isArray(items) ? items : [];
    const available = base.filter((m) => !selectedIds.includes(m.id));
    if (!term) return available;
    return available.filter((m) =>
      [m.fullName, m.phone].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [items, q, selectedIds]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalSheet}
      >
        <View style={styles.modalHandle} />
        <View style={[styles.modalStrip, { backgroundColor: BRAND }]} />

        <View style={{ padding: 20, gap: 14 }}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Adicionar membro</Text>
            <IconButton icon="close" onPress={onDismiss} style={{ margin: 0 }} iconColor={MUTED} />
          </View>

          <Searchbar
            placeholder="Buscar membro..."
            value={q}
            onChangeText={setQ}
            style={styles.searchBar}
            inputStyle={{ color: NAVY }}
            iconColor={MUTED}
            placeholderTextColor={MUTED}
          />

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={BRAND} />
              <Text style={styles.mutedText}>Carregando membros...</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <View style={[styles.emptyState, { marginTop: 0 }]}>
                  <Text style={styles.emptyTitle}>Nenhum membro disponível</Text>
                  <Text style={styles.mutedText}>Todos já fazem parte desta célula.</Text>
                </View>
              ) : (
                filtered.map((m) => (
                  <TouchableRipple
                    key={m.id}
                    onPress={() => onPick(m)}
                    borderless
                    style={styles.memberPickRow}
                  >
                    <View style={styles.memberPickInner}>
                      {isHttpUrl(m.photoUrl) ? (
                        <Avatar.Image size={42} source={{ uri: m.photoUrl }} />
                      ) : (
                        <Avatar.Text
                          size={42}
                          label={initials(m.fullName)}
                          color="#fff"
                          style={{ backgroundColor: BRAND }}
                        />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{m.fullName}</Text>
                        {!!m.phone && (
                          <Text style={styles.memberMeta} numberOfLines={1}>{m.phone}</Text>
                        )}
                      </View>
                      <View style={[styles.addChip, { backgroundColor: BRAND_LIGHT }]}>
                        <Text style={[styles.addChipText, { color: BRAND }]}>Adicionar</Text>
                      </View>
                    </View>
                  </TouchableRipple>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function ModalInfoRow({ icon, label, value, accentColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: withAlpha(accentColor || BRAND, "18") }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Linha de membro ──────────────────────────────────────────────────────────
function MemberRow({ member, accentColor }) {
  const photoUrl = pickPhotoUrl(member);

  return (
    <View style={styles.memberRowWrap}>
      <View style={[styles.memberBar, { backgroundColor: accentColor || BRAND }]} />
      {isHttpUrl(photoUrl) ? (
        <Avatar.Image size={42} source={{ uri: photoUrl }} />
      ) : (
        <Avatar.Text
          size={42}
          label={initials(member.fullName || member.name)}
          color="#fff"
          style={{ backgroundColor: accentColor || BRAND }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.fullName || member.name || member.user?.name || "Membro"}
        </Text>
        <Text style={styles.memberMeta} numberOfLines={1}>
          {member.phone || member.user?.email || "Sem telefone"}
        </Text>
      </View>
    </View>
  );
}

// ─── Card de Endereço com Mapa ────────────────────────────────────────────────
function AddressCard({ cell, accentColor }) {
  const address = buildAddressString(cell);
  const hasAddress = !!address;

  // Campos extras opcionais
  const reference = cell?.reference || null;
  const complement = cell?.complement || null;

  if (!hasAddress && !reference) return null;

  // URL do mapa estático via Google Maps Static (sem key, embed público)
  // Usa o endpoint público do Maps que não exige key para imagem simples
  const mapImageUrl = hasAddress
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=15&size=640x200&scale=2&maptype=roadmap&markers=color:0x4158D0%7C${encodeURIComponent(address)}&style=feature:all%7Celement:geometry%7Ccolor:0xF5F6FA&style=feature:road%7Celement:geometry%7Ccolor:0xE4E6F0&style=feature:poi%7Cvisibility:off`
    : null;

  // Fallback: imagem iframe embed do OSM via thumbs (não precisa de key)
  const osmEmbedUrl = hasAddress
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
    : null;

  return (
    <View style={{ marginTop: 18 }}>
      {/* Header da seção */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Localização</Text>
      </View>

      <Surface elevation={0} style={styles.addressCard}>
        {/* Mapa estático — toca para abrir no app de mapas */}
        {hasAddress && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => openInMaps(address)}
            style={styles.mapContainer}
          >
            {/* Imagem do mapa estático */}
            <Image
              source={{
                uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(address)}&zoom=15&size=640x200&maptype=mapnik`,
              }}
              style={styles.mapImage}
              resizeMode="cover"
            />

            {/* Overlay com pin e "Abrir no Maps" */}
            <View style={styles.mapOverlay}>
              <View style={[styles.mapPinBadge, { backgroundColor: accentColor || BRAND }]}>
                <Text style={styles.mapPinIcon}>📍</Text>
                <Text style={styles.mapPinText}>Abrir no Maps</Text>
              </View>
            </View>

            {/* Gradiente sutil no rodapé do mapa */}
            <View style={styles.mapGradient} />
          </TouchableOpacity>
        )}

        {/* Detalhes do endereço */}
        <View style={{ padding: 16, gap: 12 }}>
          {hasAddress && (
            <ModalInfoRow
              icon="📍"
              label="ENDEREÇO"
              value={address}
              accentColor={accentColor}
            />
          )}

          {!!reference && (
            <>
              <Divider style={{ backgroundColor: BORDER }} />
              <ModalInfoRow
                icon="🏷️"
                label="REFERÊNCIA"
                value={reference}
                accentColor={accentColor}
              />
            </>
          )}

          {/* Botão "Como chegar" */}
          {hasAddress && (
            <TouchableRipple
              onPress={() => openInMaps(address)}
              borderless
              style={[
                styles.directionsBtn,
                { backgroundColor: withAlpha(accentColor || BRAND, "12"), borderColor: accentColor || BRAND },
              ]}
            >
              <View style={styles.directionsBtnInner}>
                <Text style={{ fontSize: 16 }}>🗺️</Text>
                <Text style={[styles.directionsBtnText, { color: accentColor || BRAND }]}>
                  Como chegar
                </Text>
              </View>
            </TouchableRipple>
          )}
        </View>
      </Surface>
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function CellDetailsScreen({ navigation, route }) {
  const authCtx = useAuth();

  const cellId =
    route?.params?.id     ||
    route?.params?.cellId ||
    route?.params?.cell?.id ||
    null;

  const [cell,        setCell]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState("");

  const me     = authCtx?.me || null;
  const myRole = authCtx?.myRole || me?.role || authCtx?.role || null;

  const isAdminOwner = isAdminOrOwner(myRole);
  const isLeaderHere = useMemo(() => isLeaderOfCell(cell, me), [cell, me]);
  const canEdit        = isAdminOwner || isLeaderHere;
  const canViewActions = isAdminOwner || isLeaderHere;

  const [addOpen,              setAddOpen]              = useState(false);
  const [churchMembers,        setChurchMembers]        = useState([]);
  const [churchMembersLoading, setChurchMembersLoading] = useState(false);
  const [snack, setSnack] = useState({ visible: false, text: "" });

  const loadCell = useCallback(async (mode = "load") => {
    if (!cellId) {
      setError("ID da célula não foi enviado na navegação.");
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
      setCell(data);
    } catch (e) {
      const msg =
        e?.name === "AbortError"
          ? "Tempo esgotado ao carregar a célula."
          : e?.message || "Erro ao carregar célula.";
      setError(msg);
    } finally {
      clearTimeout(t);
      setLoading(false);
      setRefreshing(false);
    }
  }, [cellId, authCtx]);

  useFocusEffect(
    useCallback(() => { loadCell("load"); }, [loadCell])
  );

  const churchId = cell?.churchId || authCtx?.activeChurch?.id || null;

  const memberIdsInCell = useMemo(() => {
    return (Array.isArray(cell?.members) ? cell.members : [])
      .map((m) => m.id)
      .filter(Boolean);
  }, [cell]);

  const loadChurchMembers = useCallback(async () => {
    if (!churchId) { setChurchMembers([]); return; }
    setChurchMembersLoading(true);
    try {
      const data = await authedFetch(
        `/members?churchId=${encodeURIComponent(churchId)}`, {}, authCtx
      );
      const list = Array.isArray(data) ? data : data?.items || data?.members || [];
      const normalized = list
        .map((x) => ({
          id:       x.id,
          fullName: x.fullName || x.name || "Membro",
          phone:    x.phone || null,
          photoUrl: x.photoUrl || null,
        }))
        .filter((m) => !!m.id)
        .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
      setChurchMembers(normalized);
    } catch (e) {
      setChurchMembers([]);
      setSnack({ visible: true, text: e?.message || "Erro ao carregar membros." });
    } finally {
      setChurchMembersLoading(false);
    }
  }, [churchId, authCtx]);

  useEffect(() => {
    if (addOpen) loadChurchMembers();
  }, [addOpen, loadChurchMembers]);

  const addMemberToCell = useCallback(async (member) => {
    if (!cellId || !member?.id) return;
    try {
      await authedFetch(
        `/cells/${cellId}/members`,
        { method: "POST", body: { memberId: member.id } },
        authCtx
      );
      setSnack({ visible: true, text: "Membro adicionado à célula!" });
      setAddOpen(false);
      await loadCell("refresh");
    } catch (e) {
      setSnack({ visible: true, text: e?.message || "Erro ao adicionar membro." });
    }
  }, [cellId, authCtx, loadCell]);

  const accentColor = cell?.templateColor || BRAND;
  const accentLight = withAlpha(accentColor, "18");

  const meetingLabel = useMemo(() => {
    const d = cell?.meetingDay  ? String(cell.meetingDay)  : "";
    const t = cell?.meetingTime ? String(cell.meetingTime) : "";
    if (d && t) return `${d} às ${t}`;
    return d || t || "Reunião não definida";
  }, [cell]);

  const memberCount = cell?._count?.members ?? cell?.members?.length ?? 0;

  if (loading) {
    return (
      <View style={styles.centeredFull}>
        <Surface elevation={0} style={styles.loadingCard}>
          <ActivityIndicator color={BRAND} size="large" />
          <Text style={[styles.mutedText, { marginTop: 12 }]}>Carregando célula...</Text>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCell("refresh")}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Erro ─────────────────────────────────────────────────────────── */}
        {!!error && (
          <Surface elevation={0} style={styles.errorCard}>
            <Text style={styles.errorTitle}>Não foi possível carregar</Text>
            <Text style={[styles.mutedText, { marginTop: 4 }]}>{error}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.btnOutline}
                textColor={BRAND}
              >
                Voltar
              </Button>
              <Button
                mode="contained"
                onPress={() => loadCell("load")}
                style={styles.btnContained}
                buttonColor={BRAND}
              >
                Tentar novamente
              </Button>
            </View>
          </Surface>
        )}

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        {!!cell && (
          <Surface elevation={2} style={styles.heroCard}>
            <View style={[styles.heroStrip, { backgroundColor: accentColor }]} />

            <View style={{ padding: 16, gap: 14 }}>
              {/* Cabeçalho */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Surface
                  elevation={0}
                  style={[styles.cellAvatar, { backgroundColor: accentLight, borderColor: accentColor }]}
                >
                  {isHttpUrl(cell?.photoUrl) ? (
                    <Image
                      source={{ uri: cell.photoUrl.trim() }}
                      style={{ width: "100%", height: "100%", borderRadius: 999 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 22 }}>👥</Text>
                  )}
                </Surface>

                <View style={{ flex: 1 }}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {cell?.name || "Célula"}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: accentLight }]}>
                    <View style={[styles.pillDot, { backgroundColor: accentColor }]} />
                    <Text style={[styles.pillText, { color: accentColor }]}>
                      {meetingLabel}
                    </Text>
                  </View>
                </View>

                {canEdit && (
                  <TouchableRipple
                    onPress={() => setAddOpen(true)}
                    borderless
                    style={[styles.addBtn, { backgroundColor: accentLight }]}
                  >
                    <Text style={{ fontSize: 20 }}>➕</Text>
                  </TouchableRipple>
                )}
              </View>

              {!!cell?.description && (
                <Text style={[styles.mutedText, { lineHeight: 20 }]}>
                  {cell.description}
                </Text>
              )}

              <Divider style={{ backgroundColor: BORDER }} />

              <ModalInfoRow
                icon="👤"
                label="LÍDER"
                value={cell?.leader?.fullName || "Não definido"}
                accentColor={accentColor}
              />
              {!!cell?.viceLeader?.fullName && (
                <ModalInfoRow
                  icon="🤝"
                  label="VICE-LÍDER"
                  value={cell.viceLeader.fullName}
                  accentColor={accentColor}
                />
              )}

              <Divider style={{ backgroundColor: BORDER }} />

              {/* Botões de ação */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                {canEdit && (
                  <Button
                    mode="contained"
                    icon="pencil-outline"
                    onPress={() =>
                      navigation.navigate("CellCreate", {
                        cellId,
                        id: cellId,
                        mode: "edit",
                        cell,
                      })
                    }
                    style={[styles.btnContained, { flex: 1 }]}
                    buttonColor={accentLight}
                    textColor={accentColor}
                  >
                    Editar
                  </Button>
                )}

                {canViewActions && (
                  <Button
                    mode="outlined"
                    icon="file-document-outline"
                    onPress={() => navigation.navigate("CellReports", { id: cellId })}
                    style={[styles.btnOutline, { flex: 1 }]}
                    textColor={BRAND}
                  >
                    Relatórios
                  </Button>
                )}

                {canViewActions && (
                  <Button
                    mode="contained"
                    icon="calendar-check-outline"
                    onPress={() => navigation.navigate("CellMeeting", { id: cellId })}
                    style={[styles.btnContained, { flex: 1 }]}
                    buttonColor={accentColor}
                  >
                    Encontro
                  </Button>
                )}
              </View>
            </View>
          </Surface>
        )}

        {/* ── Seção de Localização ─────────────────────────────────────────── */}
        {!!cell && <AddressCard cell={cell} accentColor={accentColor} />}

        {/* ── Seção de membros ─────────────────────────────────────────────── */}
        {!!cell && (
          <View style={{ marginTop: 18 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Membros</Text>
              <View style={[styles.countChip, { backgroundColor: accentLight }]}>
                <Text style={[styles.countChipText, { color: accentColor }]}>
                  {memberCount}
                </Text>
              </View>
            </View>

            <Surface elevation={0} style={styles.membersCard}>
              {Array.isArray(cell?.members) && cell.members.length > 0 ? (
                cell.members.map((m, i) => (
                  <View key={m.id}>
                    <MemberRow member={m} accentColor={accentColor} />
                    {i < cell.members.length - 1 && (
                      <Divider style={{ backgroundColor: BORDER, marginLeft: 64 }} />
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 32, textAlign: "center" }}>👥</Text>
                  <Text style={styles.emptyTitle}>Nenhum membro ainda</Text>
                  <Text style={styles.mutedText}>
                    {canEdit
                      ? "Adicione o primeiro membro à esta célula."
                      : "Nenhum membro cadastrado nesta célula."}
                  </Text>
                  {canEdit && (
                    <TouchableRipple
                      onPress={() => setAddOpen(true)}
                      borderless
                      style={[
                        styles.emptyAddBtn,
                        { backgroundColor: accentLight, borderColor: accentColor },
                      ]}
                    >
                      <Text style={[styles.emptyAddText, { color: accentColor }]}>
                        + Adicionar membro
                      </Text>
                    </TouchableRipple>
                  )}
                </View>
              )}
            </Surface>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {canEdit && (
        <MemberCascadeModal
          visible={addOpen}
          onDismiss={() => setAddOpen(false)}
          items={churchMembers}
          loading={churchMembersLoading}
          selectedIds={memberIdsInCell}
          onPick={addMemberToCell}
        />
      )}

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, text: "" })}
        duration={2400}
        style={{ backgroundColor: NAVY }}
      >
        {snack.text}
      </Snackbar>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content:   { padding: 16, paddingBottom: 16, gap: 12 },

  centeredFull: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  loadingCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },

  heroCard: {
    borderRadius: 20,
    backgroundColor: SURFACE,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  heroStrip: { height: 4 },
  heroName:  { fontSize: 20, fontWeight: "900", color: NAVY, letterSpacing: -0.5 },

  cellAvatar: {
    width: 52, height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },

  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    marginTop: 5,
  },
  pillDot: { width: 6, height: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "700" },

  addBtn: {
    width: 40, height: 40,
    borderRadius: 999,
    alignItems: "center", justifyContent: "center",
  },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 36, height: 36,
    borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  infoLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: MUTED },
  infoValue: { fontSize: 14, fontWeight: "600", color: NAVY },

  btnOutline:   { borderRadius: 999, borderColor: BORDER },
  btnContained: { borderRadius: 999 },

  errorCard: {
    borderRadius: 20,
    backgroundColor: "#FEF5F5",
    borderWidth: 1.5,
    borderColor: "#E84D4D",
    borderStyle: "dashed",
    padding: 20,
  },
  errorTitle: { fontSize: 16, fontWeight: "900", color: NAVY },

  // ── Endereço / Mapa ────────────────────────────────────────────────────────
  addressCard: {
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  mapContainer: {
    width: "100%",
    height: 160,
    backgroundColor: "#E8EAF6",
    overflow: "hidden",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  mapPinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...Platform.select({
      ios:     { shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
  mapPinIcon: { fontSize: 14 },
  mapPinText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  mapGradient: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 48,
    // Efeito de fade sutil no rodapé do mapa (sem LinearGradient)
    backgroundColor: "transparent",
  },

  directionsBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  directionsBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
  },
  directionsBtnText: { fontSize: 13, fontWeight: "800" },

  // ── Seção / membros ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12, paddingHorizontal: 2,
  },
  sectionTitle:  { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  countChip:     { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  countChipText: { fontSize: 12, fontWeight: "800" },

  membersCard: {
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  memberRowWrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  memberBar: { width: 3, alignSelf: "stretch", borderRadius: 999, flexShrink: 0 },
  memberName: { fontSize: 13, fontWeight: "800", color: NAVY, letterSpacing: -0.2 },
  memberMeta: { fontSize: 12, color: MUTED, marginTop: 2 },

  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: NAVY },
  emptyAddBtn: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingHorizontal: 20, paddingVertical: 10,
    marginTop: 4,
  },
  emptyAddText: { fontSize: 13, fontWeight: "800" },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalSheet: {
    justifyContent: "flex-end",
    margin: 0,
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    overflow: "hidden",
  },
  modalHandle: {
    width: 44, height: 5,
    borderRadius: 999,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 12,
  },
  modalStrip:     { height: 4, marginTop: 6 },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle:     { fontSize: 18, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },

  searchBar: {
    borderRadius: 14,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 0,
  },

  memberPickRow:   { borderRadius: 18, marginBottom: 8, overflow: "hidden" },
  memberPickInner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
  },
  addChip:     { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  addChipText: { fontSize: 11, fontWeight: "800" },

  mutedText: { fontSize: 13, color: MUTED, lineHeight: 20 },
});