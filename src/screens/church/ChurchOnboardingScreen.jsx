import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  ScrollView,
  Pressable,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  ActivityIndicator,
  Avatar,
  Divider,
  Icon,
  Surface,
  Text,
  TextInput,
  useTheme,
  Snackbar,
  TouchableRipple,
} from "react-native-paper";
import { getAuth } from "@react-native-firebase/auth";

import { createChurch } from "../../services/churchService";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Fetch autenticado — usa AuthContext como fonte primária do token ─────────
// Padrão idêntico ao CellsManageScreen, CellDetailsScreen, ChurchProfile etc.
async function authedFetch(path, authCtx, { method = "GET", body } = {}) {
  const token =
    authCtx?.token ||
    (typeof authCtx?.getToken === "function" ? await authCtx.getToken() : null) ||
    (await getAuth().currentUser?.getIdToken?.());

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(Array.isArray(msg) ? msg.join(", ") : msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Constantes fixas do Design Manual ──────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const MUTED       = "#9198B5";
const BORDER      = "#E4E6F0";
const SUCCESS     = "#2DBF8A";
const SUCCESS_LIGHT = "#E8F9F3";
const WARNING     = "#F5A623";

// Dados estáticos fora do componente
const FILTER_PILLS = [
  { icon: "map-marker",          label: "Perto de mim"  },
  { icon: "filter-variant",      label: "Filtros"        },
  { icon: "information-outline", label: "Como funciona"  },
];

function keyExtractor(item) {
  return String(item.id);
}

function slugify(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes definidos NO NÍVEL DO MÓDULO (fora do componente pai).
// Não chamam hooks — recebem tudo via props. Padrão do Design Manual.
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({ label, icon, active, onPress }) {
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <View style={styles.tabBtnInner}>
        <Icon
          source={icon}
          size={15}
          color={active ? BRAND_BLUE : "rgba(255,255,255,0.65)"}
        />
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
          {label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

function ChurchCard({ item, onPress, surfaceColor }) {
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.churchCard, { backgroundColor: surfaceColor }]}
    >
      <View>
        <View style={[styles.cardStrip, { backgroundColor: BRAND_BLUE }]} />
        <View style={styles.churchCardBody}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              {item.photoUrl ? (
                <Avatar.Image
                  size={44}
                  source={{ uri: item.photoUrl }}
                  style={styles.churchAvatar}
                />
              ) : (
                <View style={styles.churchAvatarFallback}>
                  <Icon source="church" size={22} color={BRAND_BLUE} />
                </View>
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.churchName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.churchMeta} numberOfLines={1}>
                  {item.city ?? "-"} • {item.state ?? "-"}
                </Text>
              </View>
            </View>
            <Icon source="chevron-right" size={20} color={MUTED} />
          </View>

          <View style={styles.rowWrap}>
            <View style={[
              styles.pill,
              { backgroundColor: item.isPublic ? SUCCESS_LIGHT : BRAND_LIGHT },
            ]}>
              <View style={[
                styles.pillDot,
                { backgroundColor: item.isPublic ? SUCCESS : BRAND_BLUE },
              ]} />
              <Text style={[
                styles.pillText,
                { color: item.isPublic ? SUCCESS : BRAND_BLUE },
              ]}>
                {item.isPublic ? "Pública" : "Privada"}
              </Text>
            </View>

            <View style={[
              styles.pill,
              { backgroundColor: item.requiresApproval ? "#FEF5E7" : SUCCESS_LIGHT },
            ]}>
              <View style={[
                styles.pillDot,
                { backgroundColor: item.requiresApproval ? WARNING : SUCCESS },
              ]} />
              <Text style={[
                styles.pillText,
                { color: item.requiresApproval ? WARNING : SUCCESS },
              ]}>
                {item.requiresApproval ? "Aprovação" : "Entrada direta"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

function EmptyState({ onCreatePress }) {
  return (
    <View style={[styles.emptyState, { borderColor: BORDER }]}>
      <View style={styles.emptyIcon}>
        <Icon source="church-outline" size={28} color={BRAND_BLUE} />
      </View>
      <Text style={styles.emptyTitle}>Nenhuma igreja encontrada</Text>
      <Text style={styles.emptyDesc}>
        Tente outro termo, use "Código" ou crie uma nova.
      </Text>
      <TouchableRipple borderless style={styles.emptyBtn} onPress={onCreatePress}>
        <Text style={styles.emptyBtnText}>+ Criar minha igreja</Text>
      </TouchableRipple>
    </View>
  );
}

function InfoRow({ icon, label, value, color }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: color + "18" }]}>
        <Icon source={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, loading, color }) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled || loading}
      borderless
      style={[
        styles.primaryBtn,
        { backgroundColor: color, opacity: disabled || loading ? 0.55 : 1 },
      ]}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.primaryBtnText}>{label}</Text>
      }
    </TouchableRipple>
  );
}

function TextLinkButton({ label, onPress }) {
  return (
    <TouchableRipple borderless style={styles.textBtn} onPress={onPress}>
      <Text style={styles.textBtnLabel}>{label}</Text>
    </TouchableRipple>
  );
}

const ListSeparator = () => <View style={{ height: 12 }} />;

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal — todos os hooks chamados no topo, incondicionalmente
// ─────────────────────────────────────────────────────────────────────────────

export default function ChurchOnboardingScreen({ navigation }) {
  const theme = useTheme();
  const authCtx = useAuth();

  // tc centralizado — padrão do Design Manual
  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  // ── State (todos incondicionais no topo) ──
  const [tab,           setTab]           = useState("search");
  const [q,             setQ]             = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [churches,      setChurches]      = useState([]);
  const [code,          setCode]          = useState("");
  const [loadingCode,   setLoadingCode]   = useState(false);
  const [newName,       setNewName]       = useState("");
  const [newCity,       setNewCity]       = useState("");
  const [newState,      setNewState]      = useState("");
  const [creating,      setCreating]      = useState(false);
  const [snack,         setSnack]         = useState({ visible: false, text: "" });

  // ── Campos opcionais da aba Criar ──────────────────────────────────────────
  const [newPhone,      setNewPhone]      = useState("");
  const [newEmail,      setNewEmail]      = useState("");
  const [newSite,       setNewSite]       = useState("");
  const [newAbout,      setNewAbout]      = useState("");
  const [newTimes,      setNewTimes]      = useState("");
  const [newZip,        setNewZip]        = useState("");
  const [newStreet,     setNewStreet]     = useState("");
  const [newNumber,     setNewNumber]     = useState("");
  const [newDistrict,   setNewDistrict]   = useState("");
  const [newInstagram,  setNewInstagram]  = useState("");
  const [newYoutube,    setNewYoutube]    = useState("");
  const [showOptional,  setShowOptional]  = useState(true);

  const showError   = useCallback((text) => setSnack({ visible: true, text: String(text || "") }), []);
  const dismissSnack = useCallback(() => setSnack({ visible: false, text: "" }), []);

  // ── Busca com debounce ──
  useEffect(() => {
    let alive = true;
    const term = q.trim();
    const t = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const qs = term ? `?q=${encodeURIComponent(term)}` : "";
        const data = await authedFetch(`/churches/public${qs}`, authCtx);
        if (!alive) return;
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data)
              ? data.data
              : [];
        setChurches(items);
      } catch (e) {
        if (alive) showError(e?.message || "Erro ao buscar igrejas. Verifique sua conexão.");
      } finally {
        if (alive) setLoadingSearch(false);
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q, authCtx, showError]);

  // ── Navegação ──
  const goToHomeTab = useCallback(() => {
    const parent = navigation.getParent?.();
    if (parent?.reset) {
      parent.reset({ index: 0, routes: [{ name: "HomeTab" }] });
      return;
    }
    navigation.navigate("HomeTab");
  }, [navigation]);

  const handleOpenChurch = useCallback((church) => {
    navigation.navigate("ChurchPublicProfile", { church });
  }, [navigation]);

  // ── Ações ──
  const handleJoinByCode = useCallback(async () => {
    if (!code.trim()) return;
    try {
      setLoadingCode(true);
      showError("Fluxo por código ainda não implementado no backend.");
    } catch (e) {
      showError(e?.message || "Erro ao entrar com código.");
    } finally {
      setLoadingCode(false);
    }
  }, [code, showError]);

  const handleCreateChurch = useCallback(async () => {
    const name = newName.trim();
    const city = newCity.trim();
    const uf   = newState.trim().toUpperCase();
    if (!name) return showError("Informe o nome da igreja.");
    if (!city) return showError("Informe a cidade.");
    if (!uf || uf.length !== 2) return showError("Informe a UF (2 letras).");
    try {
      setCreating(true);
      const baseSlug = slugify(name);
      const basePayload = {
        name, city, state: uf, isPublic: true,
        phone:        newPhone.trim()     || null,
        email:        newEmail.trim()     || null,
        site:         newSite.trim()      || null,
        about:        newAbout.trim()     || null,
        serviceTimes: newTimes.trim()     || null,
        address: (newZip || newStreet || newNumber || newDistrict) ? {
          zip:      newZip.trim()      || null,
          street:   newStreet.trim()   || null,
          number:   newNumber.trim()   || null,
          district: newDistrict.trim() || null,
          city,
          stateUF:  uf,
        } : undefined,
        social: (newInstagram || newYoutube) ? {
          instagram: newInstagram.trim() || null,
          youtube:   newYoutube.trim()   || null,
        } : undefined,
      };
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = attempt === 0
          ? baseSlug
          : `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
        try {
          await createChurch({ ...basePayload, slug });
          goToHomeTab();
          return;
        } catch (e) {
          lastErr = e;
          const msg = String(e?.message || e);
          if (msg.includes("Slug já em uso") || msg.includes("409")) continue;
          throw e;
        }
      }
      throw lastErr || new Error("Não foi possível gerar um slug único.");
    } catch (e) {
      showError(e?.message || "Erro ao criar igreja.");
    } finally {
      setCreating(false);
    }
  }, [newName, newCity, newState, newPhone, newEmail, newSite, newAbout, newTimes,
      newZip, newStreet, newNumber, newDistrict, newInstagram, newYoutube,
      goToHomeTab, showError]);

  // renderItem estável — evita recriar função a cada render
  const renderChurchItem = useCallback(({ item }) => (
    <ChurchCard
      item={item}
      surfaceColor={tc.surface}
      onPress={() => handleOpenChurch(item)}
    />
  ), [tc.surface, handleOpenChurch]);

  const renderEmptySearch = useCallback(() => (
    <EmptyState onCreatePress={() => setTab("create")} />
  ), []);

  const goSearch = useCallback(() => setTab("search"), []);
  const goCreate = useCallback(() => setTab("create"), []);

  const toggleOptional = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowOptional((v) => !v);
  }, []);

  const canCreate = Boolean(newName.trim() && newCity.trim() && newState.trim());
  const clearQ    = useCallback(() => setQ(""), []);

  // ── Render ──
  return (
    <View style={[styles.container, { backgroundColor: BG }]}>

      {/* ── Hero (NAVY fixo — Design Manual) ── */}
      <View style={styles.hero}>
        <View style={[styles.blob, {
          width: 220, height: 220, top: -70, right: -60,
          backgroundColor: "rgba(255,255,255,0.07)",
        }]} />
        <View style={[styles.blob, {
          width: 140, height: 140, bottom: -80, left: -40,
          backgroundColor: "rgba(255,255,255,0.05)",
        }]} />

        <View style={styles.heroContent}>
          <View style={styles.heroIconWrap}>
            <Icon source="church" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreet}>Bem-vindo ao ChurchApp</Text>
            <Text style={styles.heroTitle}>Vincule sua igreja</Text>
            <Text style={styles.heroMeta}>Entre em uma existente ou crie uma nova</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TabButton label="Buscar" icon="magnify"             active={tab === "search"} onPress={() => setTab("search")} />
          <TabButton label="Código" icon="qrcode"              active={tab === "code"}   onPress={() => setTab("code")}   />
          <TabButton label="Criar"  icon="plus-circle-outline" active={tab === "create"} onPress={() => setTab("create")} />
        </View>
      </View>

      {/* ══ ABA BUSCAR ══ */}
      {tab === "search" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBox, { backgroundColor: tc.surface }]}>
            <TextInput
              mode="outlined"
              label="Buscar igreja"
              placeholder="Nome, cidade, estado..."
              value={q}
              onChangeText={setQ}
              left={<TextInput.Icon icon="magnify" color={MUTED} />}
              right={q
                ? <TextInput.Icon icon="close-circle" color={MUTED} onPress={clearQ} />
                : null
              }
              outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
              style={{ backgroundColor: BG }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              <View style={styles.filterRow}>
                {FILTER_PILLS.map((f) => (
                  <TouchableRipple
                    key={f.label}
                    borderless
                    style={styles.filterPill}
                    onPress={() => {}}
                  >
                    <View style={styles.filterPillInner}>
                      <Icon source={f.icon} size={12} color={BRAND_BLUE} />
                      <Text style={styles.filterPillText}>{f.label}</Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
            {loadingSearch ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={BRAND_BLUE} />
                <Text style={styles.loadingText}>Buscando igrejas...</Text>
              </View>
            ) : (
              <FlatList
                data={churches}
                keyExtractor={keyExtractor}
                ItemSeparatorComponent={ListSeparator}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                renderItem={renderChurchItem}
                ListEmptyComponent={renderEmptySearch}
              />
            )}
          </View>
        </View>
      )}

      {/* ══ ABA CÓDIGO ══ */}
      {tab === "code" && (
        <ScrollView
          contentContainerStyle={styles.tabContent}
          showsVerticalScrollIndicator={false}
        >
          <Surface
            style={[styles.sectionCard, { backgroundColor: tc.surface }]}
            elevation={0}
          >
            <View style={[styles.sectionStrip, { backgroundColor: BRAND_BLUE }]} />
            <View style={styles.sectionBody}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: BRAND_LIGHT }]}>
                  <Icon source="qrcode" size={20} color={BRAND_BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Entrar com código</Text>
                  <Text style={styles.sectionDesc}>
                    Digite o código de convite fornecido pela sua igreja.
                  </Text>
                </View>
              </View>

              <Divider style={[styles.divider, { backgroundColor: BORDER }]} />

              <TextInput
                mode="outlined"
                label="Código de convite"
                placeholder="Ex: ABCD-1234"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                left={<TextInput.Icon icon="qrcode" color={BRAND_BLUE} />}
                outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                style={{ backgroundColor: BG }}
              />

              <PrimaryButton
                label="Entrar"
                onPress={handleJoinByCode}
                disabled={!code.trim()}
                loading={loadingCode}
                color={BRAND_BLUE}
              />
              <TextLinkButton label="Buscar pelo nome" onPress={goSearch} />
            </View>
          </Surface>

          <InfoRow
            icon="information-outline"
            label="Como obter o código"
            value="Peça ao responsável pela sua igreja no app."
            color={BRAND_BLUE}
          />
        </ScrollView>
      )}

      {/* ══ ABA CRIAR ══ */}
      {tab === "create" && (
        <ScrollView
          contentContainerStyle={styles.tabContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card principal — campos obrigatórios */}
          <Surface
            style={[styles.sectionCard, { backgroundColor: tc.surface }]}
            elevation={0}
          >
            <View style={[styles.sectionStrip, { backgroundColor: SUCCESS }]} />
            <View style={styles.sectionBody}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: SUCCESS_LIGHT }]}>
                  <Icon source="church" size={20} color={SUCCESS} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Criar igreja</Text>
                  <Text style={styles.sectionDesc}>
                    Você ficará como responsável (owner) e poderá aprovar membros.
                  </Text>
                </View>
              </View>

              <Divider style={[styles.divider, { backgroundColor: BORDER }]} />

              <TextInput
                mode="outlined"
                label="Nome da igreja *"
                value={newName}
                onChangeText={setNewName}
                left={<TextInput.Icon icon="church" color={SUCCESS} />}
                outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                style={{ backgroundColor: BG }}
              />

              <View style={styles.cityRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    mode="outlined"
                    label="Cidade *"
                    value={newCity}
                    onChangeText={setNewCity}
                    left={<TextInput.Icon icon="map-marker" color={MUTED} />}
                    outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                    style={{ backgroundColor: BG }}
                  />
                </View>
                <View style={{ width: 88 }}>
                  <TextInput
                    mode="outlined"
                    label="UF *"
                    value={newState}
                    onChangeText={setNewState}
                    autoCapitalize="characters"
                    maxLength={2}
                    outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                    style={{ backgroundColor: BG }}
                  />
                </View>
              </View>

              <View style={styles.infoBadge}>
                <Icon source="shield-check-outline" size={14} color={BRAND_BLUE} />
                <Text style={styles.infoBadgeText}>
                  Sua igreja ficará como pública por padrão. Você pode alterar nas configurações.
                </Text>
              </View>
            </View>
          </Surface>

          {/* Acordeão — campos opcionais */}
          <Surface style={[styles.sectionCard, { backgroundColor: tc.surface }]} elevation={0}>
            <View style={[styles.sectionStrip, { backgroundColor: BRAND_BLUE }]} />

            {/* Header do acordeão */}
            <TouchableRipple onPress={toggleOptional} style={styles.accordionHeader}>
              <View style={styles.accordionHeaderInner}>
                <View style={[styles.sectionIcon, { backgroundColor: BRAND_LIGHT }]}>
                  <Icon source="plus-circle-outline" size={20} color={BRAND_BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Detalhes opcionais</Text>
                  <Text style={styles.sectionDesc}>
                    Preencha o que quiser agora ou depois nas configurações.
                  </Text>
                </View>
                <Icon
                  source={showOptional ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={MUTED}
                />
              </View>
            </TouchableRipple>

            {/* Corpo expansível */}
            {showOptional && (
              <View style={styles.accordionBody}>

                {/* ── Contato ── */}
                <View style={styles.optSubHeader}>
                  <View style={[styles.optSubIcon, { backgroundColor: SUCCESS_LIGHT }]}>
                    <Icon source="phone-outline" size={14} color={SUCCESS} />
                  </View>
                  <Text style={styles.optSubTitle}>CONTATO</Text>
                </View>

                <TextInput
                  mode="outlined"
                  label="Telefone"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                  left={<TextInput.Icon icon="phone-outline" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />
                <TextInput
                  mode="outlined"
                  label="E-mail"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="email-outline" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />
                <TextInput
                  mode="outlined"
                  label="Site"
                  value={newSite}
                  onChangeText={setNewSite}
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholder="https://suaigreja.com"
                  left={<TextInput.Icon icon="web" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />

                <Divider style={[styles.divider, { backgroundColor: BORDER, marginVertical: 4 }]} />

                {/* ── Sobre ── */}
                <View style={styles.optSubHeader}>
                  <View style={[styles.optSubIcon, { backgroundColor: BRAND_LIGHT }]}>
                    <Icon source="information-outline" size={14} color={BRAND_BLUE} />
                  </View>
                  <Text style={styles.optSubTitle}>SOBRE</Text>
                </View>

                <TextInput
                  mode="outlined"
                  label="Sobre a igreja"
                  value={newAbout}
                  onChangeText={setNewAbout}
                  multiline
                  numberOfLines={3}
                  placeholder="Uma família para pertencer..."
                  left={<TextInput.Icon icon="text" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />

                <Divider style={[styles.divider, { backgroundColor: BORDER, marginVertical: 4 }]} />

                {/* ── Endereço ── */}
                <View style={styles.optSubHeader}>
                  <View style={[styles.optSubIcon, { backgroundColor: "#FDECEF" }]}>
                    <Icon source="map-marker-outline" size={14} color="#E85D75" />
                  </View>
                  <Text style={styles.optSubTitle}>ENDEREÇO</Text>
                </View>

                <TextInput
                  mode="outlined"
                  label="CEP"
                  value={newZip}
                  onChangeText={setNewZip}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="mailbox-outline" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />
                <TextInput
                  mode="outlined"
                  label="Bairro"
                  value={newDistrict}
                  onChangeText={setNewDistrict}
                  autoCapitalize="words"
                  left={<TextInput.Icon icon="home-city-outline" color={MUTED} />}
                  outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                  style={{ backgroundColor: BG }}
                />
                <View style={styles.cityRow}>
                  <View style={{ flex: 3 }}>
                    <TextInput
                      mode="outlined"
                      label="Rua"
                      value={newStreet}
                      onChangeText={setNewStreet}
                      autoCapitalize="words"
                      outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                      style={{ backgroundColor: BG }}
                    />
                  </View>
                  <View style={{ width: 80 }}>
                    <TextInput
                      mode="outlined"
                      label="Nº"
                      value={newNumber}
                      onChangeText={setNewNumber}
                      keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                      outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
                      style={{ backgroundColor: BG }}
                    />
                  </View>
                </View>

              </View>
            )}
          </Surface>

          {/* Botões */}
          <View style={styles.createActions}>
            <PrimaryButton
              label="Criar e continuar"
              onPress={handleCreateChurch}
              disabled={!canCreate}
              loading={creating}
              color={SUCCESS}
            />
            <TextLinkButton label="Já existe? Buscar igreja" onPress={goSearch} />
          </View>

          <InfoRow
            icon="account-group-outline"
            label="Membros"
            value="Você poderá aprovar ou recusar solicitações de entrada."
            color={SUCCESS}
          />
          <InfoRow
            icon="cog-outline"
            label="Configurações"
            value="Altere nome, foto, visibilidade e permissões a qualquer hora."
            color={MUTED}
          />
        </ScrollView>
      )}

      <Snackbar
        visible={snack.visible}
        onDismiss={dismissSnack}
        duration={3000}
        style={{ backgroundColor: NAVY }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>{snack.text}</Text>
      </Snackbar>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 36 : 22,
    overflow: "hidden",
  },
  blob: { position: "absolute", borderRadius: 999 },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 2,
    paddingBottom: 16,
  },
  heroIconWrap: {
    width: 48, height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center", justifyContent: "center",
  },
  heroGreet: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  heroMeta:  { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    zIndex: 2,
  },
  tabBtn: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  tabBtnActive: {
    backgroundColor: "#fff",
    ...Platform.select({
      ios:     { shadowColor: NAVY, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  tabBtnInner: { alignItems: "center", gap: 3 },
  tabLabel:       { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.65)", textAlign: "center" },
  tabLabelActive: { color: BRAND_BLUE },

  // Search box
  searchBox: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios:     { shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  filterPill: { borderRadius: 999, backgroundColor: BRAND_LIGHT },
  filterPillInner: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 5,
  },
  filterPillText: { fontSize: 11, fontWeight: "700", color: BRAND_BLUE },

  // Church card
  churchCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cardStrip:            { height: 4 },
  churchCardBody:       { padding: 14, gap: 10 },
  churchAvatarFallback: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: BRAND_LIGHT, alignItems: "center", justifyContent: "center",
  },
  churchAvatar: { borderRadius: 14 },
  churchName:   { fontSize: 14, fontWeight: "900", color: NAVY, letterSpacing: -0.2 },
  churchMeta:   { fontSize: 12, color: MUTED, marginTop: 2 },

  // Pills
  pill:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillDot:  { width: 6, height: 6, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: "800" },

  // Loading
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, minHeight: 140 },
  loadingText: { fontSize: 13, color: MUTED, fontWeight: "600" },

  // Empty state
  emptyState: {
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 24,
    gap: 8,
    marginTop: 12,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: NAVY },
  emptyDesc:  { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 20 },
  emptyBtn:   { marginTop: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: BRAND_LIGHT },
  emptyBtnText: { fontSize: 12, fontWeight: "800", color: BRAND_BLUE },

  // Section card (abas Código e Criar)
  tabContent:   { padding: 16, gap: 12, paddingBottom: 40 },
  sectionCard:  { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER },
  sectionStrip: { height: 4 },
  sectionBody:  { padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sectionIcon:   { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionTitle:  { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  sectionDesc:   { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 18 },
  divider:       { height: 1, marginVertical: 4 },

  // Info badge
  infoBadge: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    backgroundColor: BRAND_LIGHT, borderRadius: 12, padding: 10,
  },
  infoBadgeText: { flex: 1, fontSize: 11.5, color: BRAND_BLUE, lineHeight: 17, fontWeight: "600" },

  // Info row
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  infoIcon:  { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: MUTED },
  infoValue: { fontSize: 13, fontWeight: "600", color: NAVY, marginTop: 1 },

  // City row
  cityRow: { flexDirection: "row", gap: 10 },

  // Acordeão — campos opcionais
  accordionHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  accordionHeaderInner: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  accordionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  optSubHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4,
  },
  optSubIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  optSubTitle: {
    fontSize: 10, fontWeight: "800", letterSpacing: 1.2,
    color: MUTED, textTransform: "uppercase",
  },

  // Botões da aba criar (fora do card)
  createActions: { gap: 4 },

  // Primary button
  primaryBtn:     { borderRadius: 16, paddingVertical: 13, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Text button
  textBtn:      { alignItems: "center", paddingVertical: 8, borderRadius: 12 },
  textBtnLabel: { fontSize: 13, fontWeight: "700", color: BRAND_BLUE },

  // Helpers
  row:        { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowWrap:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});