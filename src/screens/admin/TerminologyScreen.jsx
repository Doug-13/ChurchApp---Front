// src/screens/admin/TerminologyScreen.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Divider,
  Icon,
  Portal,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTerms } from "../../context/TerminologyContext";

// ─── Design tokens — Design Manual ChurchApp ─────────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const BG          = "#F5F6FA";
const SURFACE     = "#FFFFFF";
const BORDER      = "#E4E6F0";
const MUTED       = "#9198B5";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";
const WARNING     = "#F5A623";
const WARNING_BG  = "#FEF5E7";
const PURPLE      = "#7B61FF";
const PURPLE_BG   = "#F3F0FF";

// ─── Termos configuráveis ────────────────────────────────────────────────────
const TERMINOLOGY_FIELDS = [
  { key: "cell",        label: "Células",           description: "Pequenos grupos de discipulado e comunhão",  icon: "account-group-outline",  iconColor: SUCCESS,   iconBg: SUCCESS_BG,  suggestions: ["Células", "Grupos", "Grupos Pequenos", "GPs", "Comunidades", "Casas"],            placeholder: "Ex: Grupos, GPs, Casas…"          },
  { key: "cellMeeting", label: "Reunião de Célula", description: "Encontro/culto do grupo",                    icon: "home-heart-outline",     iconColor: "#E85D75", iconBg: "#FDECEF",   suggestions: ["Reunião", "Encontro", "Culto", "Encontro Semanal"],                             placeholder: "Ex: Encontro, Culto, Reunião…"     },
  { key: "cellLeader",  label: "Líder de Célula",   description: "Responsável pela célula/grupo",              icon: "account-star-outline",   iconColor: WARNING,   iconBg: WARNING_BG,  suggestions: ["Líder", "Pastor", "Anfitrião", "Coordenador", "Discipulador"],                  placeholder: "Ex: Anfitrião, Coordenador…"       },
  { key: "ministry",    label: "Ministério",         description: "Área de serviço e voluntariado",            icon: "hands-pray",             iconColor: PURPLE,    iconBg: PURPLE_BG,   suggestions: ["Ministério", "Departamento", "Equipe", "Setor", "Área"],                        placeholder: "Ex: Departamento, Equipe…"         },
  { key: "member",      label: "Membro",             description: "Pessoa pertencente à igreja",               icon: "account-outline",        iconColor: BRAND,     iconBg: BRAND_LIGHT, suggestions: ["Membro", "Congregado", "Irmão", "Participante", "Colaborador"],                 placeholder: "Ex: Congregado, Participante…"     },
  { key: "news",        label: "Avisos",             description: "Comunicados e informes da igreja",          icon: "bullhorn-outline",       iconColor: "#0EA5E9", iconBg: "#E7F6FE",   suggestions: ["Avisos", "Informes", "Notícias", "Comunicados", "Recados"],                     placeholder: "Ex: Informes, Comunicados…"        },
  { key: "schedule",    label: "Escala",             description: "Escalas de serviço e voluntariado",         icon: "calendar-check-outline", iconColor: "#C84AB5", iconBg: "#FBE9F8",   suggestions: ["Escala", "Escalação", "Serviço", "Voluntariado", "Grade"],                      placeholder: "Ex: Serviço, Voluntariado…"        },
  { key: "pastor",      label: "Pastor",             description: "Líder principal / título ministerial",      icon: "account-tie-outline",    iconColor: NAVY,      iconBg: BRAND_LIGHT, suggestions: ["Pastor", "Apóstolo", "Bispo", "Presbítero", "Reverendo", "Pr."],               placeholder: "Ex: Bispo, Apóstolo, Pr.…"         },
];

// ─── Presets ─────────────────────────────────────────────────────────────────
const PRESETS = [
  { key: "evangelica",   label: "Evangélica",   icon: "cross-outline",        terms: { cell: "Células",           cellMeeting: "Reunião",    cellLeader: "Líder",          ministry: "Ministério", member: "Membro",       news: "Avisos",      schedule: "Escala",   pastor: "Pastor"      } },
  { key: "batista",      label: "Batista",      icon: "water-outline",        terms: { cell: "Grupos Pequenos",   cellMeeting: "Encontro",   cellLeader: "Líder de Grupo", ministry: "Departamento", member: "Membro",     news: "Informes",    schedule: "Escala",   pastor: "Pastor"      } },
  { key: "presbiteriana",label: "Presbiteriana",icon: "shield-cross-outline", terms: { cell: "Grupos de Comunhão",cellMeeting: "Encontro",   cellLeader: "Anfitrião",      ministry: "Setor",      member: "Congregado",   news: "Comunicados", schedule: "Serviço",  pastor: "Presbítero"  } },
  { key: "catolica",     label: "Católica",     icon: "church",               terms: { cell: "Comunidades",       cellMeeting: "Celebração", cellLeader: "Coordenador",    ministry: "Setor",      member: "Participante", news: "Avisos",      schedule: "Serviço",  pastor: "Padre"       } },
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function PresetChip({ preset, isSelected, onPress }) {
  return (
    <TouchableRipple onPress={onPress} borderless style={[s.presetChip, isSelected && s.presetChipActive]}>
      <View style={s.presetChipInner}>
        <Icon source={preset.icon} size={16} color={isSelected ? BRAND : MUTED} />
        <Text style={[s.presetChipLabel, isSelected && s.presetChipLabelActive]}>{preset.label}</Text>
      </View>
    </TouchableRipple>
  );
}

function TermRow({ field, value, onPress, last }) {
  const displayValue = value?.trim() || field.label;
  const isCustomized = value?.trim() && value.trim() !== field.label;
  return (
    <>
      <TouchableRipple onPress={onPress} style={s.menuRow}>
        <View style={s.menuRowInner}>
          <View style={[s.menuIcon, { backgroundColor: field.iconBg }]}>
            <Icon source={field.icon} size={20} color={field.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.termRowHeader}>
              <Text style={s.menuTitle}>{field.label}</Text>
              {isCustomized && (
                <View style={s.customBadge}><Text style={s.customBadgeText}>personalizado</Text></View>
              )}
            </View>
            <Text style={s.menuDesc}>{field.description}</Text>
          </View>
          <View style={s.termValueWrap}>
            <Text style={[s.termValue, isCustomized && s.termValueCustom]} numberOfLines={1}>{displayValue}</Text>
            <Icon source="chevron-right" size={16} color={MUTED} />
          </View>
        </View>
      </TouchableRipple>
      {!last && <Divider style={s.divider} />}
    </>
  );
}

// ─── Diálogo de edição ────────────────────────────────────────────────────────

function EditTermDialog({ visible, field, currentValue, onDismiss, onSave }) {
  const [value, setValue] = useState(currentValue || "");
  useEffect(() => { if (visible) setValue(currentValue || ""); }, [visible, currentValue]);
  if (!field) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={s.dialog}>
        <View style={s.dialogHeader}>
          <View style={[s.dialogIconWrap, { backgroundColor: field.iconBg }]}>
            <Icon source={field.icon} size={24} color={field.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.dialogTitle}>Personalizar termo</Text>
            <Text style={s.dialogSubtitle}>{field.label}</Text>
          </View>
        </View>

        <Dialog.Content style={{ paddingTop: 8 }}>
          <TextInput
            mode="outlined"
            label={`Nome para "${field.label}"`}
            value={value}
            onChangeText={setValue}
            placeholder={field.placeholder}
            autoFocus
            maxLength={32}
            outlineStyle={{ borderRadius: 14, borderColor: BORDER }}
            style={{ backgroundColor: BG }}
          />
          <Text style={s.suggestLabel}>Sugestões rápidas</Text>
          <View style={s.suggestRow}>
            {field.suggestions.map((sug) => (
              <TouchableRipple key={sug} borderless onPress={() => setValue(sug)} style={[ss.chip, value === sug && ss.chipActive]}>
                <Text style={[ss.chipText, value === sug && ss.chipTextActive]}>{sug}</Text>
              </TouchableRipple>
            ))}
          </View>
        </Dialog.Content>

        <Dialog.Actions style={s.dialogActions}>
          <Button onPress={onDismiss} textColor={MUTED} style={s.dialogBtn}>Cancelar</Button>
          <Button onPress={() => { onSave(value.trim() || field.label); onDismiss(); }} mode="contained" buttonColor={BRAND} style={s.dialogBtnPrimary}>
            Salvar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const ss = StyleSheet.create({
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipActive:    { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  chipText:      { fontSize: 12, fontWeight: "700", color: MUTED },
  chipTextActive:{ color: BRAND },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TerminologyScreen() {
  const { activeChurchId, apiFetchAuth } = useAuth();
  const { reload }                        = useTerms();

  const [terms,           setTerms]          = useState({});
  const [loadingInitial,  setLoadingInitial]  = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [hasChanges,      setHasChanges]      = useState(false);
  const [editField,       setEditField]       = useState(null);
  const [editVisible,     setEditVisible]     = useState(false);
  const [selectedPreset,  setSelectedPreset]  = useState(null);

  // ── Carregar da API ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChurchId) { setLoadingInitial(false); return; }
    let alive = true;
    setLoadingInitial(true);

    apiFetchAuth(`/churches/${activeChurchId}/terminology`, { method: "GET" })
      .then((data) => { if (alive && data && typeof data === "object") setTerms(data); })
      .catch((e)   => { console.warn("[TerminologyScreen] load error:", e?.message); })
      .finally(()  => { if (alive) setLoadingInitial(false); });

    return () => { alive = false; };
  }, [activeChurchId]);

  // ── Edição individual ─────────────────────────────────────────────────────
  function openEdit(field) { setEditField(field); setEditVisible(true); }

  function handleSaveTerm(newValue) {
    setTerms((prev) => ({ ...prev, [editField.key]: newValue }));
    setHasChanges(true);
    setSelectedPreset(null);
  }

  // ── Preset ────────────────────────────────────────────────────────────────
  function applyPreset(preset) {
    Alert.alert(
      `Aplicar preset "${preset.label}"?`,
      "Os termos atuais serão substituídos pelos valores padrão desta denominação.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Aplicar", onPress: () => { setTerms(preset.terms); setSelectedPreset(preset.key); setHasChanges(true); } },
      ]
    );
  }

  // ── Restaurar ─────────────────────────────────────────────────────────────
  function handleReset() {
    Alert.alert(
      "Restaurar padrões?",
      "Todos os termos personalizados serão removidos e os nomes originais serão restaurados.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Restaurar", style: "destructive", onPress: () => { setTerms({}); setSelectedPreset(null); setHasChanges(true); } },
      ]
    );
  }

  // ── Salvar na API ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!activeChurchId) { Alert.alert("Erro", "Nenhuma igreja ativa encontrada."); return; }

    setSaving(true);
    try {
      // PATCH /churches/:id/terminology — backend faz merge e retorna objeto completo
      const updated = await apiFetchAuth(
        `/churches/${activeChurchId}/terminology`,
        { method: "PATCH", body: terms }
      );

      if (updated && typeof updated === "object") setTerms(updated);
      setHasChanges(false);
      setSelectedPreset(null);

      // Propaga os novos termos para todo o app (tabs, stacks e telas)
      reload();

      Alert.alert("Salvo!", "Os termos foram atualizados com sucesso.");
    } catch (e) {
      console.error("[TerminologyScreen] save error:", e?.message);
      Alert.alert("Erro ao salvar", String(e?.message || "Não foi possível salvar os termos."));
    } finally {
      setSaving(false);
    }
  }, [activeChurchId, apiFetchAuth, terms, reload]);

  const customCount = Object.values(terms).filter(Boolean).length;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingInitial) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={BRAND} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>Carregando termos...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Banner ────────────────────────────────────────────────────── */}
        <View style={s.infoBanner}>
          <View style={s.infoBannerIcon}>
            <Icon source="translate" size={22} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoBannerTitle}>Terminologia da Igreja</Text>
            <Text style={s.infoBannerDesc}>
              Adapte os nomes usados no app à linguagem da sua comunidade. As alterações ficam visíveis para todos os membros.
            </Text>
          </View>
        </View>

        {/* ── Presets ───────────────────────────────────────────────────── */}
        <SectionLabel title="PRESETS POR DENOMINAÇÃO" />
        <Surface elevation={0} style={s.card}>
          <View style={s.presetHeader}>
            <Icon source="lightning-bolt-outline" size={16} color={WARNING} />
            <Text style={s.presetHeaderText}>Aplique rapidamente os termos mais comuns da sua denominação</Text>
          </View>
          <Divider style={[s.divider, { marginLeft: 0 }]} />
          <View style={s.presetGrid}>
            {PRESETS.map((p) => (
              <PresetChip key={p.key} preset={p} isSelected={selectedPreset === p.key} onPress={() => applyPreset(p)} />
            ))}
          </View>
        </Surface>

        {/* ── Personalização individual ─────────────────────────────────── */}
        <View style={s.termsSectionHeader}>
          <SectionLabel title="PERSONALIZAÇÃO INDIVIDUAL" />
          {customCount > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{customCount} personalizado{customCount !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        <Surface elevation={0} style={s.card}>
          {TERMINOLOGY_FIELDS.map((field, idx) => (
            <TermRow
              key={field.key}
              field={field}
              value={terms[field.key]}
              onPress={() => openEdit(field)}
              last={idx === TERMINOLOGY_FIELDS.length - 1}
            />
          ))}
        </Surface>

        {/* ── Restaurar ────────────────────────────────────────────────── */}
        {customCount > 0 && (
          <>
            <SectionLabel title="AÇÕES" />
            <Surface elevation={0} style={s.card}>
              <TouchableRipple onPress={handleReset} style={s.menuRow}>
                <View style={s.menuRowInner}>
                  <View style={[s.menuIcon, { backgroundColor: DANGER_BG }]}>
                    <Icon source="restore" size={20} color={DANGER} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.menuTitle, { color: DANGER }]}>Restaurar termos padrão</Text>
                    <Text style={s.menuDesc}>Remove todas as personalizações</Text>
                  </View>
                  <Icon source="chevron-right" size={20} color={DANGER} />
                </View>
              </TouchableRipple>
            </Surface>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Barra de salvar ───────────────────────────────────────────── */}
      {hasChanges && (
        <View style={s.saveBar}>
          <Surface elevation={0} style={s.saveBarSurface}>
            <View style={s.saveBarRow}>
              <View>
                <Text style={s.saveBarTitle}>Há alterações pendentes</Text>
                <Text style={s.saveBarDesc}>Salve para aplicar a toda a igreja</Text>
              </View>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                buttonColor={BRAND}
                style={s.saveBtn}
                labelStyle={s.saveBtnLabel}
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </View>
          </Surface>
        </View>
      )}

      <EditTermDialog
        visible={editVisible}
        field={editField}
        currentValue={editField ? terms[editField.key] : ""}
        onDismiss={() => setEditVisible(false)}
        onSave={handleSaveTerm}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  container: { paddingTop: 8, paddingBottom: 32 },

  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: MUTED, textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginHorizontal: 20 },

  card: {
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, overflow: "hidden",
    ...Platform.select({ ios: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } }),
  },
  divider: { backgroundColor: BORDER, marginLeft: 64 },

  infoBanner:     { flexDirection: "row", alignItems: "flex-start", gap: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: BRAND_LIGHT, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },
  infoBannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: BORDER },
  infoBannerTitle:{ fontSize: 13, fontWeight: "800", color: NAVY, marginBottom: 3 },
  infoBannerDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },

  presetHeader:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  presetHeaderText:    { fontSize: 12, color: MUTED, fontWeight: "600", flex: 1 },
  presetGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingTop: 12 },
  presetChip:          { borderRadius: 999, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, paddingHorizontal: 14, paddingVertical: 8 },
  presetChipActive:    { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  presetChipInner:     { flexDirection: "row", alignItems: "center", gap: 6 },
  presetChipLabel:     { fontSize: 13, fontWeight: "700", color: MUTED },
  presetChipLabelActive:{ color: BRAND },

  termsSectionHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 20 },
  countBadge:        { backgroundColor: BRAND_LIGHT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 20 },
  countBadgeText:    { fontSize: 11, fontWeight: "800", color: BRAND },

  menuRow:      { paddingHorizontal: 16, paddingVertical: 13 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuTitle:    { fontSize: 14, fontWeight: "800", color: NAVY, letterSpacing: -0.2 },
  menuDesc:     { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },

  termRowHeader:   { flexDirection: "row", alignItems: "center", gap: 6 },
  customBadge:     { backgroundColor: SUCCESS_BG, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  customBadgeText: { fontSize: 9, fontWeight: "800", color: SUCCESS, textTransform: "uppercase", letterSpacing: 0.5 },
  termValueWrap:   { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0, maxWidth: 120 },
  termValue:       { fontSize: 13, fontWeight: "700", color: MUTED },
  termValueCustom: { color: BRAND },

  saveBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === "ios" ? 28 : 16, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({ ios: { shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } }, android: { elevation: 8 } }),
  },
  saveBarSurface: { backgroundColor: "transparent" },
  saveBarRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  saveBarTitle:   { fontSize: 13, fontWeight: "800", color: NAVY },
  saveBarDesc:    { fontSize: 11, color: MUTED, marginTop: 2 },
  saveBtn:        { borderRadius: 12, paddingHorizontal: 4 },
  saveBtnLabel:   { fontSize: 13, fontWeight: "800" },

  dialog:       { borderRadius: 24, backgroundColor: SURFACE, marginHorizontal: 16 },
  dialogHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  dialogIconWrap:{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: BORDER },
  dialogTitle:    { fontSize: 10, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  dialogSubtitle: { fontSize: 16, fontWeight: "900", color: NAVY, marginTop: 2 },
  suggestLabel:   { fontSize: 10, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  suggestRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dialogActions:  { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  dialogBtn:        { borderRadius: 12 },
  dialogBtnPrimary: { borderRadius: 12 },
});