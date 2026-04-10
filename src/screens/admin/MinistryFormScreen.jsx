import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

// ✅ useAuth SEMPRE dentro do componente (nunca no topo do arquivo)
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = [
  { hex: "#4F46E5", name: "Índigo" },
  { hex: "#06B6D4", name: "Ciano" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#F59E0B", name: "Âmbar" },
  { hex: "#EF4444", name: "Vermelho" },
  { hex: "#8B5CF6", name: "Roxo" },
  { hex: "#EC4899", name: "Rosa" },
  { hex: "#14B8A6", name: "Teal" },
];

const MINISTRY_TEMPLATES = [
  { key: "louvor", label: "Louvor", icon: "music", color: "#8B5CF6" },
  { key: "ensino", label: "Ensino", icon: "book-open-variant", color: "#4F46E5" },
  { key: "familia", label: "Família", icon: "home-heart", color: "#10B981" },
  { key: "infantil", label: "Infantil", icon: "teddy-bear", color: "#F59E0B" },
  { key: "midia", label: "Mídia", icon: "camera-outline", color: "#EF4444" },
  { key: "recepcao", label: "Recepção", icon: "handshake-outline", color: "#06B6D4" },
  { key: "intercessao", label: "Intercessão", icon: "hands-pray", color: "#EC4899" },
  { key: "jovens", label: "Jovens", icon: "account-group-outline", color: "#14B8A6" },
];

const ROLE_CATEGORIES = [
  { key: "lideranca", label: "Liderança" },
  { key: "operacao", label: "Operação / Apoio" },
  { key: "tecnica", label: "Técnica / Comunicação" },
  { key: "ministerio", label: "Ministérios gerais" },
  { key: "louvor", label: "Louvor" },
];

const CHURCH_ROLE_OPTIONS = [
  { key: "lider", label: "Líder", icon: "account-star-outline", category: "lideranca" },
  { key: "vice_lider", label: "Vice-líder", icon: "account-star", category: "lideranca" },

  { key: "recepcao", label: "Recepção", icon: "handshake-outline", category: "operacao" },
  { key: "acolhimento", label: "Acolhimento", icon: "account-heart-outline", category: "operacao" },
  { key: "estacionamento", label: "Estacionamento", icon: "car-outline", category: "operacao" },
  { key: "cantina", label: "Cantina", icon: "coffee-outline", category: "operacao" },
  { key: "seguranca", label: "Segurança", icon: "shield-outline", category: "operacao" },
  { key: "limpeza", label: "Limpeza", icon: "broom", category: "operacao" },
  { key: "diaconia", label: "Diaconia", icon: "account-tie-outline", category: "operacao" },

  { key: "som", label: "Som", icon: "volume-high", category: "tecnica" },
  { key: "midia", label: "Mídia / Projeção", icon: "projector-screen-outline", category: "tecnica" },
  { key: "transmissao", label: "Transmissão", icon: "broadcast", category: "tecnica" },
  { key: "fotografia", label: "Fotografia", icon: "camera-outline", category: "tecnica" },

  { key: "infantil", label: "Infantil", icon: "teddy-bear", category: "ministerio" },
  { key: "ensino", label: "Ensino", icon: "book-open-variant", category: "ministerio" },
  { key: "intercessao", label: "Intercessão", icon: "hands-pray", category: "ministerio" },

  { key: "voz", label: "Voz", icon: "microphone-outline", category: "louvor" },
  { key: "backvocal", label: "Back vocal", icon: "microphone-variant", category: "louvor" },
  { key: "guitarra", label: "Guitarra", icon: "guitar-electric", category: "louvor" },
  { key: "baixo", label: "Baixo", icon: "guitar-acoustic", category: "louvor" },
  { key: "bateria", label: "Bateria", icon: "music-circle-outline", category: "louvor" },
  { key: "teclado", label: "Teclado", icon: "piano", category: "louvor" },
];

const OTHER_TEMPLATE_KEY = "__other_template__";
const OTHER_ROLE_KEY = "__other_role__";

// ============================================================================
// UI PARTS
// ============================================================================

function SectionHeader({ title, subtitle, action }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 26, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "800" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

function DropdownDisplay({ icon, label, disabled }) {
  const theme = useTheme();
  return (
    <Surface
      elevation={0}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        height: 46,
        justifyContent: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon source={icon} size={20} color={theme.colors.primary} />
        <Text numberOfLines={1} style={{ fontWeight: "800", flex: 1 }}>
          {label}
        </Text>
        <Icon source="chevron-down" size={22} color={theme.colors.onSurfaceVariant} />
      </View>
    </Surface>
  );
}

function DropdownAnchor({ icon, label, onPress, disabled }) {
  return (
    <View collapsable={false}>
      <Pressable onPress={onPress} disabled={disabled}>
        <View pointerEvents="none">
          <DropdownDisplay icon={icon} label={label} disabled={disabled} />
        </View>
      </Pressable>
    </View>
  );
}

function ColorSelector({ colors, selectedColor, onSelectColor }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
      {colors.map((c) => {
        const selected = selectedColor === c.hex;
        return (
          <Pressable
            key={c.hex}
            onPress={() => onSelectColor(c.hex)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.hex,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: selected ? theme.colors.primary : "transparent",
              transform: [{ scale: selected ? 1.06 : 1 }],
            }}
          >
            {selected ? <Icon source="check" size={22} color="#fff" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyState({ icon, title, description }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 36,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceVariant,
        borderWidth: 2,
        borderColor: theme.colors.outlineVariant,
        borderStyle: "dashed",
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Icon source={icon} size={30} color={theme.colors.onSurfaceVariant} />
      </View>

      <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 6, textAlign: "center" }}>
        {title}
      </Text>

      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>{description}</Text>
    </View>
  );
}

function MemberCard({ member, onRemove }) {
  const theme = useTheme();
  const initials = (member.userName || "?").slice(0, 2).toUpperCase();

  return (
    <Surface
      elevation={0}
      style={{
        borderRadius: 14,
        padding: 14,
        backgroundColor: theme.colors.surfaceVariant,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar.Text
          size={46}
          label={initials}
          style={{ backgroundColor: theme.colors.primaryContainer }}
          color={theme.colors.primary}
          labelStyle={{ fontWeight: "900" }}
        />

        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800" }}>
            {member.userName}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{member.role}</Text>
        </View>

        <IconButton icon="trash-can-outline" iconColor={theme.colors.error} onPress={onRemove} />
      </View>
    </Surface>
  );
}

// ============================================================================
// ✅ HOOK SAFE: USERS DA IGREJA (sempre chamado, sem condição)
// ============================================================================

function useChurchUsers({ churchId, enabled, q, apiGet }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const reqIdRef = useRef(0);

  const reload = async () => {
    const currentReqId = ++reqIdRef.current;

    setLoading(true);
    setError(null);
    setNextCursor(null);

    try {
      if (!enabled || !churchId) {
        setItems([]);
        return;
      }

      const take = 40;
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      const term = (q || "").trim();
      if (term) qs.set("q", term);

      const json = await apiGet(`/churches/${churchId}/users?${qs.toString()}`);
      if (currentReqId !== reqIdRef.current) return;

      setItems(Array.isArray(json?.items) ? json.items : []);
      setNextCursor(json?.nextCursor ?? null);
    } catch (e) {
      if (currentReqId !== reqIdRef.current) return;
      setItems([]);
      setNextCursor(null);
      setError(String(e?.message || e));
    } finally {
      if (currentReqId === reqIdRef.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading) return;

    const currentReqId = ++reqIdRef.current;

    setLoading(true);
    setError(null);

    try {
      if (!enabled || !churchId || !nextCursor) return;

      const take = 40;
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      const term = (q || "").trim();
      if (term) qs.set("q", term);
      qs.set("cursor", nextCursor);

      const json = await apiGet(`/churches/${churchId}/users?${qs.toString()}`);
      if (currentReqId !== reqIdRef.current) return;

      const newItems = Array.isArray(json?.items) ? json.items : [];
      const newNext = json?.nextCursor ?? null;

      setItems((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]));
        for (const u of newItems) map.set(u.id, u);
        return Array.from(map.values());
      });

      setNextCursor(newNext);
    } catch (e) {
      if (currentReqId !== reqIdRef.current) return;
      setError(String(e?.message || e));
    } finally {
      if (currentReqId === reqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, churchId]);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      reload();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, enabled, churchId]);

  return { items, loading, error, nextCursor, reload, loadMore };
}

// ============================================================================
// MAIN
// ============================================================================

export default function MinistryFormScreen(props) {
  // ✅ useAuth SEMPRE dentro do componente
  const { activeChurchId, activeChurch, apiFetchAuth } = useAuth();
  const churchId = activeChurchId || activeChurch?.id || null;

  // ✅ apiGet usando apiFetchAuth do context (sem API_BASE_URL / auth() aqui)
  const apiGet = React.useCallback(
    (path) => apiFetchAuth(path, { method: "GET" }),
    [apiFetchAuth]
  );

  // ✅ POST/PATCH para salvar
  const apiPost = React.useCallback(
    (path, body) =>
      apiFetchAuth(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    [apiFetchAuth]
  );

  const apiPatch = React.useCallback(
    (path, body) =>
      apiFetchAuth(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    [apiFetchAuth]
  );

  const theme = useTheme();
  const styles = createStyles(theme);

  const navigation = props?.navigation ?? null;
  const route = props?.route ?? null;
  const params = route?.params ?? {};
  const editingId = params?.id ?? null;

  const roleGroups = useMemo(() => {
    return ROLE_CATEGORIES.map((cat) => ({
      ...cat,
      items: CHURCH_ROLE_OPTIONS.filter((r) => r.category === cat.key),
    })).filter((g) => g.items.length > 0);
  }, []);

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [nameLocked, setNameLocked] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0].hex);
  const [icon, setIcon] = useState("layers-outline");

  const [members, setMembers] = useState([]);

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [customTemplateLabel, setCustomTemplateLabel] = useState("");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserSnapshot, setSelectedUserSnapshot] = useState(null);

  const [userQuery, setUserQuery] = useState("");

  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [customRole, setCustomRole] = useState("");

  const {
    items: churchUsers,
    loading: usersLoading,
    error: usersError,
    nextCursor: usersNextCursor,
    loadMore: loadMoreUsers,
  } = useChurchUsers({
    churchId,
    enabled: showAddDialog,
    q: userQuery,
    apiGet,
  });

  // ✅ Carrega o ministério quando estiver editando
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!editingId || !churchId) return;

      setLoading(true);
      try {
        const json = await apiGet(`/churches/${churchId}/ministries/${editingId}`);
        if (!alive) return;

        setName(json?.name ?? "");
        setNameLocked(Boolean((json?.name ?? "").trim()));
        setDescription(json?.description ?? "");
        setColor(json?.color ?? COLORS[0].hex);
        setIcon(json?.icon ?? "layers-outline");

        if (json?.templateKey) {
          setTemplateKey(json.templateKey);
          setCustomTemplateLabel("");
        } else {
          setTemplateKey(OTHER_TEMPLATE_KEY);
          setCustomTemplateLabel(json?.customTypeLabel ?? "");
        }

        setMembers(Array.isArray(json?.members) ? json.members : []);
      } catch (e) {
        alert(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, churchId]);

  const membersCount = members.length;

  const selectedTemplate = useMemo(() => {
    return MINISTRY_TEMPLATES.find((t) => t.key === templateKey) || null;
  }, [templateKey]);

  const isCustomTemplate = templateKey === OTHER_TEMPLATE_KEY;

  const typeLabel = isCustomTemplate
    ? customTemplateLabel.trim()
      ? customTemplateLabel.trim()
      : "Outro (personalizado)"
    : selectedTemplate?.label || "Selecionar tipo";

  const typeIcon = isCustomTemplate ? "pencil-outline" : selectedTemplate?.icon || "shape-outline";

  const availableToPick = useMemo(() => {
    const picked = new Set(members.map((m) => m.userId));
    return (churchUsers || []).filter((u) => u?.id && !picked.has(u.id));
  }, [churchUsers, members]);

  const selectedUser = selectedUserSnapshot;

  function validate() {
    if (!name.trim()) return "Informe o nome do ministério.";
    return null;
  }

  function applyTemplate(t) {
    setTemplateKey(t.key);
    setCustomTemplateLabel("");
    setIcon(t.icon);
    setColor(t.color);
    if (!nameLocked) setName(t.label);
  }

  // ✅ Salvar (POST criar / PATCH editar)
  async function onSave() {
    const err = validate();
    if (err) return alert(err);
    if (!churchId) return alert("Selecione uma igreja ativa.");

    const templateKeyFinal = isCustomTemplate ? null : (selectedTemplate?.key ?? null);
    const customTypeLabelFinal = isCustomTemplate ? (customTemplateLabel.trim() || null) : null;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon: icon.trim() || null,
      templateKey: templateKeyFinal,
      customTypeLabel: customTypeLabelFinal,
      members: (members || []).map((m) => ({
        userId: m.userId,
        role: (m.role || "").trim(),
      })),
    };

    setLoading(true);
    try {
      let saved;
      if (editingId) {
        saved = await apiPatch(`/churches/${churchId}/ministries/${editingId}`, payload);
      } else {
        saved = await apiPost(`/churches/${churchId}/ministries`, payload);
      }

      console.log("MINISTRY SAVED =>", saved);
      navigation?.goBack?.();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function openAddDialog() {
    if (!churchId) {
      alert("Selecione uma igreja ativa antes de adicionar membros.");
      return;
    }
    setSelectedUserId(null);
    setSelectedUserSnapshot(null);
    setUserQuery("");
    setSelectedRoleKey("");
    setCustomRole("");
    setUserMenuOpen(false);
    setRoleMenuOpen(false);
    setShowAddDialog(true);
  }

  function closeAddDialog() {
    setUserMenuOpen(false);
    setRoleMenuOpen(false);
    setShowAddDialog(false);
  }

  function handleRemoveMember(userId) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  function handleAddMember() {
    if (!selectedUserId || !selectedUserSnapshot) return alert("Selecione um membro.");

    if (members.find((m) => m.userId === selectedUserId)) {
      return alert("Este usuário já foi adicionado.");
    }

    let roleFinal = "";
    if (selectedRoleKey === OTHER_ROLE_KEY) {
      roleFinal = customRole.trim();
      if (!roleFinal) return alert("Informe a função (Outro).");
    } else {
      const roleObj = CHURCH_ROLE_OPTIONS.find((r) => r.key === selectedRoleKey);
      roleFinal = roleObj?.label || "";
      if (!roleFinal) return alert("Selecione uma função.");
    }

    setMembers((prev) => [
      ...prev,
      { userId: selectedUserSnapshot.id, userName: selectedUserSnapshot.name, role: roleFinal },
    ]);

    setSelectedUserId(null);
    setSelectedUserSnapshot(null);
    setSelectedRoleKey("");
    setCustomRole("");
    setUserMenuOpen(false);
    setRoleMenuOpen(false);
    setShowAddDialog(false);
  }

  function closeThen(closeFn, afterFn) {
    closeFn();
    requestAnimationFrame(() => afterFn());
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            {editingId ? "Editar ministério" : "Novo ministério"}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon source="account-group" size={18} color={theme.colors.primary} />
              <Text style={styles.statText}>
                {membersCount} {membersCount === 1 ? "membro" : "membros"}
              </Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={styles.statText}>
                {COLORS.find((c) => c.hex === color)?.name || "Cor"}
              </Text>
            </View>
          </View>

          {!churchId ? (
            <Surface style={[styles.previewBox, { marginTop: 10 }]} elevation={0}>
              <Icon source="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={{ flex: 1, color: theme.colors.error }}>
                Nenhuma igreja ativa no contexto. Defina activeChurchId no seu context.
              </Text>
            </Surface>
          ) : null}
        </View>

        {/* Preview */}
        <Card mode="elevated" style={styles.previewCard} elevation={2}>
          <View style={[styles.previewTint, { backgroundColor: color }]} />
          <Card.Content style={styles.previewContent}>
            <View style={[styles.previewIcon, { backgroundColor: color }]}>
              <Icon source={icon || "layers-outline"} size={30} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={styles.previewTitle} numberOfLines={1}>
                {name.trim() || "Nome do ministério"}
              </Text>
              <Text style={styles.previewDesc} numberOfLines={2}>
                {description.trim() || "Descrição opcional"}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Tipo do ministério */}
        <SectionHeader
          title="Tipo do ministério"
          subtitle="Ao selecionar, define ícone/cor e sugere nome se estiver vazio."
        />

        <Card mode="outlined" style={styles.blockCard}>
          <Card.Content style={{ gap: 10 }}>
            <Menu
              visible={templateMenuOpen}
              onDismiss={() => setTemplateMenuOpen(false)}
              anchor={
                <DropdownAnchor icon={typeIcon} label={typeLabel} onPress={() => setTemplateMenuOpen(true)} />
              }
            >
              {MINISTRY_TEMPLATES.map((t) => (
                <Menu.Item
                  key={t.key}
                  title={t.label}
                  leadingIcon={t.icon}
                  onPress={() => closeThen(() => setTemplateMenuOpen(false), () => applyTemplate(t))}
                />
              ))}

              <Menu.Item
                title="Outro (personalizado)"
                leadingIcon="pencil-outline"
                onPress={() =>
                  closeThen(() => setTemplateMenuOpen(false), () => {
                    setTemplateKey(OTHER_TEMPLATE_KEY);
                    setCustomTemplateLabel("");
                    if (!nameLocked) setName("");
                  })
                }
              />
            </Menu>

            {isCustomTemplate ? (
              <TextInput
                mode="outlined"
                label="Tipo personalizado"
                placeholder="Ex.: Casais, Missões, Ação Social..."
                value={customTemplateLabel}
                onChangeText={(txt) => {
                  setCustomTemplateLabel(txt);
                  if (!nameLocked) setName(txt);
                }}
                left={<TextInput.Icon icon="pencil-outline" />}
              />
            ) : null}
          </Card.Content>
        </Card>

        {/* Informações */}
        <SectionHeader title="Informações básicas" subtitle="Personalize o nome e a descrição." />

        <View style={{ gap: 14 }}>
          <TextInput
            mode="outlined"
            label="Nome do ministério"
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              setNameLocked(Boolean(txt.trim()));
            }}
            left={<TextInput.Icon icon="badge-account-outline" />}
          />
          <TextInput
            mode="outlined"
            label="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            left={<TextInput.Icon icon="text-long" />}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Cor */}
        <SectionHeader title="Cor do ministério" subtitle="Escolha uma cor para identificar facilmente." />
        <ColorSelector colors={COLORS} selectedColor={color} onSelectColor={setColor} />

        {/* Equipe */}
        <SectionHeader
          title="Equipe"
          subtitle="Adicione integrantes e defina funções."
          action={
            <Button mode="contained" icon="plus" onPress={openAddDialog} compact disabled={!churchId}>
              Adicionar
            </Button>
          }
        />

        {membersCount === 0 ? (
          <EmptyState
            icon="account-multiple-plus-outline"
            title="Nenhum membro ainda"
            description="Adicione integrantes e defina as funções de cada um na equipe."
          />
        ) : (
          <View>
            {members.map((m) => (
              <MemberCard key={m.userId} member={m} onRemove={() => handleRemoveMember(m.userId)} />
            ))}
          </View>
        )}

        {/* Salvar */}
        <Button
          mode="contained"
          icon="check"
          onPress={onSave}
          loading={loading}
          disabled={loading || !churchId}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          {editingId ? "Salvar alterações" : "Criar ministério"}
        </Button>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Modal: Add Member */}
      <Portal>
        <Dialog visible={showAddDialog} onDismiss={closeAddDialog} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Adicionar integrante</Dialog.Title>

          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              Selecione um membro da sua igreja e defina a função que ele terá neste ministério.
            </Text>

            <TextInput
              mode="outlined"
              label="Buscar membro"
              value={userQuery}
              onChangeText={setUserQuery}
              placeholder="Digite o nome..."
              left={<TextInput.Icon icon="magnify" />}
              style={{ marginBottom: 14 }}
            />

            {/* Membro */}
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.dialogLabel}>Membro</Text>

              <Menu
                visible={userMenuOpen}
                onDismiss={() => setUserMenuOpen(false)}
                anchor={
                  <DropdownAnchor
                    icon={selectedUser ? "account-check" : "account-outline"}
                    label={selectedUser?.name || (usersLoading ? "Carregando..." : "Selecionar membro")}
                    onPress={() => {
                      setRoleMenuOpen(false);
                      setUserMenuOpen(true);
                    }}
                    disabled={!churchId}
                  />
                }
              >
                {usersError ? (
                  <Menu.Item title={`Erro: ${usersError}`} leadingIcon="alert-circle-outline" disabled />
                ) : null}
                {usersLoading ? <Menu.Item title="Carregando..." leadingIcon="progress-clock" disabled /> : null}

                {!usersLoading && !usersError && availableToPick.length === 0 ? (
                  <Menu.Item title="Nenhum usuário encontrado" disabled />
                ) : null}

                {availableToPick.map((u) => (
                  <Menu.Item
                    key={u.id}
                    title={u.name || "Sem nome"}
                    leadingIcon="account-outline"
                    onPress={() =>
                      closeThen(() => setUserMenuOpen(false), () => {
                        setSelectedUserId(u.id);
                        setSelectedUserSnapshot({
                          id: u.id,
                          name: u.name ?? "Sem nome",
                          email: u.email ?? null,
                          photoUrl: u.photoUrl ?? null,
                        });
                      })
                    }
                  />
                ))}

                {usersNextCursor ? (
                  <Menu.Item
                    title={usersLoading ? "Carregando..." : "Carregar mais"}
                    leadingIcon="chevron-down"
                    onPress={loadMoreUsers}
                    disabled={usersLoading}
                  />
                ) : null}
              </Menu>
            </View>

            {/* Função */}
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.dialogLabel}>Função</Text>

              <Menu
                visible={roleMenuOpen}
                onDismiss={() => setRoleMenuOpen(false)}
                anchor={
                  <DropdownAnchor
                    icon={selectedRoleKey ? "briefcase-check" : "briefcase-outline"}
                    label={
                      selectedRoleKey === OTHER_ROLE_KEY
                        ? customRole.trim()
                          ? `Outro: ${customRole.trim()}`
                          : "Outro (personalizado)"
                        : CHURCH_ROLE_OPTIONS.find((r) => r.key === selectedRoleKey)?.label || "Selecionar função"
                    }
                    onPress={() => {
                      setUserMenuOpen(false);
                      setRoleMenuOpen(true);
                    }}
                  />
                }
              >
                {roleGroups.map((cat) => (
                  <React.Fragment key={cat.key}>
                    <Menu.Item title={cat.label} disabled titleStyle={styles.menuHeaderTitle} />
                    {cat.items.map((r) => (
                      <Menu.Item
                        key={r.key}
                        title={r.label}
                        leadingIcon={r.icon}
                        onPress={() =>
                          closeThen(() => setRoleMenuOpen(false), () => {
                            setSelectedRoleKey(r.key);
                            setCustomRole("");
                          })
                        }
                      />
                    ))}
                  </React.Fragment>
                ))}

                <Menu.Item
                  title="Outro (personalizado)"
                  leadingIcon="pencil-outline"
                  onPress={() => closeThen(() => setRoleMenuOpen(false), () => setSelectedRoleKey(OTHER_ROLE_KEY))}
                />
              </Menu>

              {selectedRoleKey === OTHER_ROLE_KEY ? (
                <TextInput
                  mode="outlined"
                  label="Descreva a função"
                  placeholder="Ex.: Apoio no palco, Organização, Libras..."
                  value={customRole}
                  onChangeText={setCustomRole}
                  left={<TextInput.Icon icon="pencil-outline" />}
                  style={{ marginTop: 10 }}
                />
              ) : null}
            </View>

            {/* Preview */}
            {selectedUserId ? (
              <Surface style={styles.previewBox} elevation={0}>
                <Icon source="information-outline" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                  {selectedUser?.name || "Membro"} •{" "}
                  {selectedRoleKey === OTHER_ROLE_KEY
                    ? customRole.trim()
                      ? customRole.trim()
                      : "Outro (preencha acima)"
                    : CHURCH_ROLE_OPTIONS.find((r) => r.key === selectedRoleKey)?.label || "Selecione uma função"}
                </Text>
              </Surface>
            ) : null}
          </Dialog.Content>

          <Dialog.Actions>
            <Button onPress={closeAddDialog}>Cancelar</Button>
            <Button mode="contained" onPress={handleAddMember} disabled={!selectedUserId}>
              Adicionar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles(theme) {
  return {
    container: {
      padding: 20,
      paddingTop: 12,
    },
    header: {
      marginBottom: 16,
      gap: 10,
    },
    title: {
      fontWeight: "900",
      letterSpacing: -0.6,
    },
    statsRow: {
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
      flexWrap: "wrap",
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statText: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: "600",
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.colors.outlineVariant,
    },

    previewCard: {
      borderRadius: 20,
      overflow: "hidden",
    },
    previewTint: {
      height: 70,
      opacity: 0.12,
    },
    previewContent: {
      flexDirection: "row",
      gap: 14,
      paddingTop: 14,
      paddingBottom: 18,
    },
    previewIcon: {
      width: 62,
      height: 62,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    previewTitle: {
      fontWeight: "900",
      marginBottom: 4,
    },
    previewDesc: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },

    blockCard: {
      borderRadius: 16,
      borderColor: theme.colors.outlineVariant,
    },

    saveButton: {
      marginTop: 26,
      borderRadius: 14,
    },
    saveButtonContent: {
      paddingVertical: 8,
    },

    dialog: {
      borderRadius: 22,
    },
    dialogTitle: {
      fontWeight: "900",
    },
    dialogDescription: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 14,
      lineHeight: 20,
    },
    dialogLabel: {
      fontWeight: "900",
      marginBottom: 8,
    },
    helperText: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 6,
    },
    menuHeaderTitle: {
      fontWeight: "900",
      color: theme.colors.onSurfaceVariant,
    },
    previewBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
  };
}