// src/screens/admin/MemberPermissionsScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/AuthContext";
import { getPermissions, normalizeRole, ROLE_META, ROLES } from "../../utils/permissions";

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY        = "#1A2366";
const BRAND_BLUE  = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const WARNING     = "#F5A623";
const WARNING_BG  = "#FEF5E7";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";
const MUTED       = "#9198B5";
const BORDER      = "#E4E6F0";

// ─── Definição dos grupos de permissões (UI) ─────────────────────────────────
// Cada grupo vira uma seção. Cada item é uma permissão do getPermissions().
const PERMISSION_GROUPS = [
  {
    key: "repertoires",
    label: "Louvor e repertórios",
    icon: "playlist-music-outline",
    color: "#7C3AED",
    bg: "#F3E8FF",
    items: [
      { key: "canAccessRepertoires", label: "Acessar repertórios", desc: "Ver repertórios liberados para o membro" },
      { key: "canManageRepertoires", label: "Gerenciar repertórios", desc: "Criar, editar e excluir repertórios" },
      { key: "canManageSongCatalog", label: "Gerenciar catálogo", desc: "Cadastrar, editar e arquivar músicas" },
    ],
  },
  {
    key:   "cells",
    label: "Células",
    icon:  "home-group",
    color: SUCCESS,
    bg:    SUCCESS_BG,
    items: [
      { key: "canAccessCells",     label: "Acessar células",              desc: "Ver lista de células da igreja"       },
      { key: "canViewCellDetails", label: "Ver detalhes da célula",       desc: "Abrir e visualizar dados de uma célula" },
      { key: "canRegisterMeeting", label: "Registrar reunião",            desc: "Lançar presença e reuniões de célula" },
      { key: "canManageCells",     label: "Gerenciar células",            desc: "Editar configurações e participantes"  },
      { key: "canCreateCell",      label: "Criar células",                desc: "Adicionar novas células"              },
      { key: "canDeleteCell",      label: "Excluir células",              desc: "Remover células permanentemente"      },
    ],
  },
  {
    key:   "events",
    label: "Eventos",
    icon:  "calendar-star-outline",
    color: WARNING,
    bg:    WARNING_BG,
    items: [
      { key: "canViewEvents",        label: "Visualizar eventos",         desc: "Ver lista e detalhes de eventos"       },
      { key: "canCreateEvent",       label: "Criar eventos",              desc: "Adicionar novos eventos à agenda"      },
      { key: "canEditEvent",         label: "Editar eventos",             desc: "Alterar data, local e detalhes"        },
      { key: "canDeleteEvent",       label: "Excluir eventos",            desc: "Remover eventos permanentemente"       },
      { key: "canManageEventScales", label: "Gerenciar escalas",          desc: "Criar e editar escalas de ministério"  },
      { key: "canViewEventStatistics", label: "Ver estatísticas", desc: "Consultar os resultados dos eventos realizados" },
      { key: "canManageEventStatistics", label: "Registrar estatísticas", desc: "Criar e atualizar relatórios pós-evento" },
    ],
  },
  {
    key:   "news",
    label: "Avisos",
    icon:  "bullhorn-outline",
    color: BRAND_BLUE,
    bg:    BRAND_LIGHT,
    items: [
      { key: "canViewNews",    label: "Visualizar avisos",   desc: "Ver avisos e comunicados da igreja"    },
      { key: "canPublishNews", label: "Publicar avisos",     desc: "Criar e enviar avisos para membros"    },
      { key: "canEditNews",    label: "Editar avisos",       desc: "Alterar avisos já publicados"          },
      { key: "canDeleteNews",  label: "Excluir avisos",      desc: "Remover avisos permanentemente"        },
    ],
  },
  {
    key:   "members",
    label: "Membros",
    icon:  "account-group-outline",
    color: BRAND_BLUE,
    bg:    BRAND_LIGHT,
    items: [
      { key: "canViewMembers",    label: "Visualizar membros",  desc: "Ver lista e dados dos membros"         },
      { key: "canManageMembers",  label: "Gerenciar membros",   desc: "Editar cadastros e informações"        },
      { key: "canEditMemberRole", label: "Alterar role",        desc: "Mudar o nível de acesso de membros"    },
      { key: "canDeleteMember",   label: "Excluir membros",     desc: "Remover membros da igreja"             },
      { key: "canApproveMember",  label: "Aprovar cadastros",   desc: "Liberar acesso de novos membros"       },
      { key: "canViewBirthdays",  label: "Ver aniversariantes", desc: "Acessar lista de aniversários"         },
    ],
  },
  {
    key:   "ministries",
    label: "Ministérios",
    icon:  "layers-outline",
    color: BRAND_BLUE,
    bg:    BRAND_LIGHT,
    items: [
      { key: "canViewMinistries",   label: "Visualizar ministérios", desc: "Ver equipes e departamentos"          },
      { key: "canManageMinistries", label: "Gerenciar ministérios",  desc: "Editar membros e configurações"       },
      { key: "canCreateMinistry",   label: "Criar ministérios",      desc: "Adicionar novas equipes"              },
      { key: "canDeleteMinistry",   label: "Excluir ministérios",    desc: "Remover equipes permanentemente"      },
    ],
  },
  {
    key:   "admin",
    label: "Administração",
    icon:  "shield-outline",
    color: DANGER,
    bg:    DANGER_BG,
    items: [
      { key: "canAccessAdmin",         label: "Acessar painel admin",  desc: "Ver o painel administrativo"          },
      { key: "canViewReports",         label: "Ver relatórios",        desc: "Acessar indicadores e histórico"      },
      { key: "canAccessSchedules",     label: "Acessar escalas",       desc: "Ver tab de escalas de serviço"        },
      { key: "canManageSchedules",     label: "Gerenciar escalas",     desc: "Criar e editar escalas de serviço"    },
      { key: "canManageChurchProfile", label: "Editar perfil da igreja", desc: "Alterar dados e imagem da igreja"   },
    ],
  },
];

// ─── Roles disponíveis para seleção ──────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: ROLES.MEMBER, ...ROLE_META.MEMBER },
  { value: ROLES.LEADER, ...ROLE_META.LEADER },
  { value: ROLES.ADMIN,  ...ROLE_META.ADMIN  },
  { value: ROLES.OWNER,  ...ROLE_META.OWNER  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleChip({ option, selected, onPress }) {
  return (
    <TouchableRipple
      onPress={() => onPress(option.value)}
      borderless
      style={[
        styles.roleChip,
        selected && { backgroundColor: option.color, borderColor: option.color },
        !selected && { backgroundColor: "#fff", borderColor: BORDER },
      ]}
    >
      <View style={styles.roleChipInner}>
        <Icon source={option.icon} size={16} color={selected ? "#fff" : option.color} />
        <Text style={[styles.roleChipLabel, { color: selected ? "#fff" : NAVY }]}>
          {option.label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

function PermissionRow({ item, value, onChange, locked, tc, isParent }) {
  return (
    <View style={[
      styles.permRow,
      locked && styles.permRowLocked,
      isParent && styles.permRowParent,
    ]}>
      <View style={{ flex: 1 }}>
        <View style={styles.permLabelRow}>
          <Text style={[styles.permLabel, locked && { color: tc.muted }]}>
            {item.label}
          </Text>
          {isParent && (
            <View style={styles.parentBadge}>
              <Text style={styles.parentBadgeText}>principal</Text>
            </View>
          )}
        </View>
        <Text style={[styles.permDesc, { color: tc.muted }]} numberOfLines={2}>
          {item.desc}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={locked}
        trackColor={{ false: BORDER, true: SUCCESS + "66" }}
        thumbColor={value ? SUCCESS : "#ccc"}
        ios_backgroundColor={BORDER}
        style={styles.permSwitch}
      />
    </View>
  );
}

function GroupSection({ group, overrides, onToggle, basePerms, tc }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.groupWrap}>
      {/* Header clicável */}
      <TouchableRipple onPress={() => setCollapsed((v) => !v)} borderless style={styles.groupHeader}>
        <View style={styles.groupHeaderInner}>
          <View style={[styles.groupIcon, { backgroundColor: group.bg }]}>
            <Icon source={group.icon} size={18} color={group.color} />
          </View>
          <Text style={styles.groupLabel}>{group.label}</Text>

          {/* Contagem de ativas */}
          <View style={[styles.groupCount, { backgroundColor: group.bg }]}>
            <Text style={[styles.groupCountText, { color: group.color }]}>
              {group.items.filter((i) =>
                overrides[i.key] !== undefined ? overrides[i.key] : basePerms[i.key]
              ).length}/{group.items.length}
            </Text>
          </View>

          <Icon
            source={collapsed ? "chevron-down" : "chevron-up"}
            size={18}
            color={MUTED}
          />
        </View>
      </TouchableRipple>

      {/* Items */}
      {!collapsed && (
        <Surface elevation={0} style={[styles.groupCard, { backgroundColor: tc.surface, borderColor: tc.outline }]}>
          {group.items.map((item, idx) => {
            const isParentItem   = idx === 0;
            const parentKey      = group.items[0].key;
            const parentValue    = overrides[parentKey] !== undefined
              ? overrides[parentKey]
              : basePerms[parentKey];
            const effectiveValue = overrides[item.key] !== undefined
              ? overrides[item.key]
              : basePerms[item.key];

            // Filhos ficam desabilitados se o pai estiver desligado
            const isChildLocked = !isParentItem && !parentValue;

            return (
              <View key={item.key}>
                <PermissionRow
                  item={item}
                  value={isChildLocked ? false : !!effectiveValue}
                  locked={isChildLocked}
                  onChange={(v) => onToggle(item.key, v)}
                  tc={tc}
                  isParent={isParentItem}
                />
                {idx < group.items.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            );
          })}
        </Surface>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MemberPermissionsScreen({ navigation, route }) {
  const theme = useTheme();
  const { apiFetchAuth } = useAuth();

  const tc = useMemo(() => ({
    surface: theme.colors.surface,
    bg:      theme.colors.background,
    outline: theme.colors.outlineVariant,
    text:    theme.colors.onSurface,
    muted:   theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
  }), [theme]);

  const { member } = route.params || {};
  const memberName = member?.name || "Membro";

  // Role atual do membro (normalizado)
  const [selectedRole, setSelectedRole] = useState(
    normalizeRole(member?.roleRaw || member?.role || "MEMBER")
  );

  // Overrides manuais (permissões extras além do role)
  // Formato: { canDeleteEvent: true, canPublishNews: false, ... }
  const [overrides, setOverrides] = useState(member?.extraPermissions || {});

  const [saving, setSaving] = useState(false);
  const [dirty,  setDirty]  = useState(false);

  // Permissões base calculadas do role selecionado
  const basePerms = useMemo(() => getPermissions(selectedRole), [selectedRole]);

  // Roleta: quando o role muda, limpa overrides que o role já contempla
  const handleRoleChange = useCallback((newRole) => {
    setSelectedRole(newRole);
    setOverrides({});
    setDirty(true);
  }, []);

  // Toggle de permissão individual — com cascata pai/filho
  //
  // Regras:
  //   - Ligar qualquer filho  → liga automaticamente o pai (items[0] do grupo)
  //   - Desligar o pai        → desliga automaticamente todos os filhos do grupo
  //   - Ligar/desligar filho  → não afeta os outros filhos
  const handleToggle = useCallback((permKey, value) => {
    setOverrides((prev) => {
      const next = { ...prev, [permKey]: value };

      // Encontra o grupo ao qual esta permissão pertence
      const group = PERMISSION_GROUPS.find((g) =>
        g.items.some((i) => i.key === permKey)
      );
      if (!group) return next;

      const parentKey = group.items[0].key;
      const isParent  = permKey === parentKey;

      if (isParent && !value) {
        // Pai desligado → desliga todos os filhos
        group.items.forEach((i) => { next[i.key] = false; });
      } else if (!isParent && value) {
        // Filho ligado → liga o pai automaticamente
        next[parentKey] = true;
      }

      return next;
    });
    setDirty(true);
  }, []);

  // Salvar
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      // Prioriza userId (chave do User/ChurchMember) sobre id (pode ser Member legado)
      const memberId = member?.userId || member?.id;
      console.log("🟦 [MemberPermissions] memberId:", memberId, "| userId:", member?.userId, "| id:", member?.id);
      const payload  = {
        role:             selectedRole,
        extraPermissions: overrides,
      };

      console.log("🟦 [MemberPermissions] salvando:", payload);

      await apiFetchAuth(
        `/users/members/${encodeURIComponent(memberId)}/permissions`,
        { method: "PUT", body: JSON.stringify(payload) }
      );

      setDirty(false);
      Alert.alert("Permissões salvas", `As permissões de ${memberName} foram atualizadas.`, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.log("🟥 [MemberPermissions] erro ao salvar:", e?.message);
      Alert.alert("Erro", e?.message || "Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  }, [apiFetchAuth, member, selectedRole, overrides, memberName, navigation]);

  const roleMeta = ROLE_META[selectedRole] ?? ROLE_META.MEMBER;

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.blob, { width: 200, height: 200, top: -60, right: -50 }]} />
          <View style={[styles.blob, { width: 120, height: 120, bottom: -60, left: -30, opacity: 0.05 }]} />

          <View style={styles.heroIconWrap}>
            <Icon source="shield-account-outline" size={26} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Permissões</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            Defina o nível de acesso de{"\n"}
            <Text style={{ fontWeight: "900", color: "#fff" }}>{memberName}</Text>
          </Text>

          {/* Role atual */}
          <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Icon source={roleMeta.icon} size={13} color="#fff" />
            <Text style={styles.heroPillText}>{roleMeta.label}</Text>
          </View>
        </View>

        {/* ── Aviso sobre herança ── */}
        <Surface elevation={0} style={[styles.infoCard, { backgroundColor: BRAND_LIGHT, borderColor: BRAND_BLUE + "30" }]}>
          <Icon source="information-outline" size={18} color={BRAND_BLUE} />
          <Text style={styles.infoText}>
            O role define permissões base. Os toggles permitem adicionar ou restringir acessos específicos individualmente.
          </Text>
        </Surface>

        {/* ── Selecionar Role ── */}
        <Text style={styles.sectionTitle}>Role do membro</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((opt) => (
            <RoleChip
              key={opt.value}
              option={opt}
              selected={selectedRole === opt.value}
              onPress={handleRoleChange}
            />
          ))}
        </View>

        {/* Descrição do role selecionado */}
        <Surface elevation={0} style={[styles.roleDescCard, { backgroundColor: roleMeta.bg, borderColor: roleMeta.color + "30" }]}>
          <Icon source={roleMeta.icon} size={16} color={roleMeta.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleDescLabel, { color: roleMeta.color }]}>{roleMeta.label}</Text>
            <Text style={[styles.roleDescText, { color: NAVY }]}>
              {selectedRole === ROLES.OWNER  && "Acesso total. Pode editar o perfil da igreja e todas as configurações."}
              {selectedRole === ROLES.ADMIN  && "Gerencia membros, células, eventos, escalas, ministérios e relatórios."}
              {selectedRole === ROLES.LEADER && "Cria eventos e avisos, registra reuniões de célula e visualiza membros."}
              {selectedRole === ROLES.MEMBER && "Acesso básico: visualiza avisos, eventos e dados do próprio perfil."}
            </Text>
          </View>
        </Surface>

        {/* ── Grupos de permissões ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Permissões detalhadas</Text>
        <Text style={[styles.sectionSub, { color: tc.muted }]}>
          Personalize o acesso além do que o role define
        </Text>

        {PERMISSION_GROUPS.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            overrides={overrides}
            onToggle={handleToggle}
            basePerms={basePerms}
            tc={tc}
          />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Footer fixo com botão Salvar ── */}
      <View style={[styles.footer, { backgroundColor: tc.bg, borderColor: tc.outline }]}>
        {dirty && (
          <Text style={[styles.footerDirty, { color: WARNING }]}>
            Alterações não salvas
          </Text>
        )}
        <TouchableRipple
          onPress={handleSave}
          disabled={saving || !dirty}
          borderless
          style={[
            styles.saveBtn,
            { backgroundColor: dirty ? NAVY : BORDER },
          ]}
        >
          <View style={styles.saveBtnInner}>
            {saving
              ? <ActivityIndicator size={16} color="#fff" />
              : <Icon source="content-save-outline" size={18} color={dirty ? "#fff" : MUTED} />
            }
            <Text style={[styles.saveBtnText, { color: dirty ? "#fff" : MUTED }]}>
              {saving ? "Salvando..." : "Salvar permissões"}
            </Text>
          </View>
        </TouchableRipple>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1 },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  // Hero
  hero: {
    backgroundColor: NAVY,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios:     { shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  blob:         { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  heroIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle:    { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  heroSubtitle: { marginTop: 5, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 20 },
  heroPill:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroPillText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  // Info banner
  infoCard:  { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 20 },
  infoText:  { flex: 1, fontSize: 12, color: BRAND_BLUE, lineHeight: 18, fontWeight: "600" },

  // Section title
  sectionTitle: { fontSize: 15, fontWeight: "900", color: NAVY, letterSpacing: -0.3, marginBottom: 10 },
  sectionSub:   { fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 14 },

  // Role chips
  roleRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  roleChip:     { borderRadius: 14, borderWidth: 1.5, overflow: "hidden" },
  roleChipInner:{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  roleChipLabel:{ fontSize: 13, fontWeight: "800" },

  // Role desc
  roleDescCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 4 },
  roleDescLabel:{ fontSize: 12, fontWeight: "900", marginBottom: 3 },
  roleDescText: { fontSize: 13, lineHeight: 19, fontWeight: "500" },

  // Group
  groupWrap:       { marginBottom: 12 },
  groupHeader:     { borderRadius: 16, overflow: "hidden", marginBottom: 6 },
  groupHeaderInner:{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  groupIcon:       { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  groupLabel:      { flex: 1, fontSize: 14, fontWeight: "900", color: NAVY, letterSpacing: -0.2 },
  groupCount:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  groupCountText:  { fontSize: 11, fontWeight: "900" },
  groupCard:       { borderWidth: 1, borderRadius: 20, overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 1 },
    }),
  },

  // Permission row
  permRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  permRowLocked:  { opacity: 0.38 },
  permRowParent:  { backgroundColor: "rgba(0,0,0,0.025)", borderBottomWidth: 0.5, borderBottomColor: BORDER },
  permLabelRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  permLabel:      { fontSize: 13, fontWeight: "800", color: NAVY },
  permDesc:       { fontSize: 11, lineHeight: 15 },
  permSwitch:     { transform: Platform.OS === "ios" ? [{ scaleX: 0.85 }, { scaleY: 0.85 }] : [] },
  separator:      { height: 0.5, backgroundColor: BORDER, marginHorizontal: 16 },
  parentBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: NAVY + "12" },
  parentBadgeText:{ fontSize: 9, fontWeight: "900", color: NAVY, textTransform: "uppercase", letterSpacing: 0.4 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    gap: 6,
    ...Platform.select({
      ios:     { shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 4 },
    }),
  },
  footerDirty:  { fontSize: 11, fontWeight: "700", color: WARNING, textAlign: "center" },
  saveBtn:      { borderRadius: 18, overflow: "hidden" },
  saveBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  saveBtnText:  { fontSize: 15, fontWeight: "900" },
});
