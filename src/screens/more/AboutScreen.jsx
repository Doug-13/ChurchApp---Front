// src/screens/more/AboutScreen.jsx

import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Design tokens ────────────────────────────────────────────────────────────
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

const APP_VERSION  = "1.0.0";
const APP_BUILD    = "100";
const PRIVACY_URL  = "https://seusite.com/privacidade";
const TERMS_URL    = "https://seusite.com/termos";

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function MenuRow({ icon, iconColor, iconBg, title, description, onPress, last }) {
  return (
    <>
      <TouchableRipple onPress={onPress} disabled={!onPress} style={s.menuRow}>
        <View style={s.menuRowInner}>
          <View style={[s.menuIcon, { backgroundColor: iconBg ?? BRAND_LIGHT }]}>
            <Icon source={icon} size={20} color={iconColor ?? BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.menuTitle}>{title}</Text>
            {!!description && (
              <Text style={s.menuDesc} numberOfLines={2}>{description}</Text>
            )}
          </View>
          <Icon source="chevron-right" size={20} color={MUTED} />
        </View>
      </TouchableRipple>
      {!last && <Divider style={s.divider} />}
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableRipple
          onPress={() => navigation.goBack()}
          borderless
          style={s.backBtn}
        >
          <Icon source="arrow-left" size={24} color={NAVY} />
        </TouchableRipple>
        <Text style={s.headerTitle}>Sobre o app</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.container, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero do app ───────────────────────────────────────────────── */}
        <Surface elevation={0} style={[s.card, { marginTop: 16 }]}>
          <View style={s.heroBlock}>
            {/* Faixa navy decorativa no topo */}
            <View style={s.heroStrip} />

            <View style={s.heroContent}>
              {/* Ícone */}
              <View style={s.appIconWrap}>
                <Icon source="church" size={36} color={BRAND} />
              </View>

              <Text style={s.appName}>ChurchApp</Text>
              <Text style={s.appTagline}>Conectando comunidades de fé</Text>

              <View style={s.versionPill}>
                <Text style={s.versionText}>v{APP_VERSION}</Text>
              </View>
            </View>
          </View>

          <Divider style={[s.divider, { marginLeft: 0 }]} />

          {/* Informações técnicas */}
          <View style={s.infoBlock}>
            <InfoRow label="Versão"      value={APP_VERSION} />
            <InfoRow label="Build"       value={APP_BUILD} />
            <InfoRow label="Plataforma"  value={Platform.OS === "ios" ? "iOS" : "Android"} />
            <InfoRow
              label="Sistema"
              value={Platform.OS === "ios"
                ? `iOS ${Platform.Version}`
                : `Android ${Platform.Version}`}
            />
          </View>
        </Surface>

        {/* ── O que é ───────────────────────────────────────────────────── */}
        <SectionLabel title="O QUE É" />
        <Surface elevation={0} style={s.card}>
          <View style={s.descBlock}>
            <Text style={s.descText}>
              O <Text style={s.descBold}>ChurchApp</Text> é uma plataforma de gestão para igrejas,
              criada para facilitar a comunicação entre líderes e membros.
            </Text>
            <Text style={[s.descText, { marginTop: 10 }]}>
              Gerencie células, escalas, eventos, avisos e muito mais — tudo em um só lugar,
              de forma simples e intuitiva.
            </Text>
          </View>
        </Surface>

        {/* ── Funcionalidades ───────────────────────────────────────────── */}
        <SectionLabel title="FUNCIONALIDADES" />
        <Surface elevation={0} style={s.card}>
          {[
            { icon: "account-group",           color: "#0EA5E9",  bg: "#E7F6FE",  text: "Gestão de membros e células" },
            { icon: "calendar-star",            color: "#F5A623",  bg: "#FEF5E7",  text: "Criação e divulgação de eventos" },
            { icon: "bullhorn-outline",         color: BRAND,      bg: BRAND_LIGHT,text: "Avisos e comunicados da igreja" },
            { icon: "clipboard-list-outline",   color: "#C84AB5",  bg: "#FBE9F8",  text: "Escalas de serviço" },
            { icon: "shield-account-outline",   color: "#7B61FF",  bg: "#F3F0FF",  text: "Painel administrativo" },
            { icon: "bell-outline",             color: NAVY,       bg: BRAND_LIGHT,text: "Notificações em tempo real" },
          ].map((item, i, arr) => (
            <React.Fragment key={item.text}>
              <View style={s.featureRow}>
                <View style={[s.menuIcon, { backgroundColor: item.bg }]}>
                  <Icon source={item.icon} size={20} color={item.color} />
                </View>
                <Text style={s.featureText}>{item.text}</Text>
              </View>
              {i < arr.length - 1 && <Divider style={s.divider} />}
            </React.Fragment>
          ))}
        </Surface>

        {/* ── Legal ─────────────────────────────────────────────────────── */}
        <SectionLabel title="LEGAL" />
        <Surface elevation={0} style={s.card}>
          <MenuRow
            icon="shield-check-outline"
            iconColor={SUCCESS}
            iconBg={SUCCESS_BG}
            title="Política de privacidade"
            description="Como coletamos e usamos seus dados"
            onPress={() => Linking.openURL(PRIVACY_URL)}
          />
          <MenuRow
            icon="file-document-outline"
            iconColor={BRAND}
            iconBg={BRAND_LIGHT}
            title="Termos de uso"
            description="Regras e condições de utilização do app"
            onPress={() => Linking.openURL(TERMS_URL)}
            last
          />
        </Surface>

        {/* ── Créditos ──────────────────────────────────────────────────── */}
        <View style={s.creditsBlock}>
          <Text style={s.creditsText}>
            Feito com{" "}
            <Text style={{ color: DANGER }}>♥</Text>
            {" "}para igrejas que querem crescer juntas.
          </Text>
          <Text style={s.creditsSub}>
            © {new Date().getFullYear()} ChurchApp. Todos os direitos reservados.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
  },

  container: { paddingHorizontal: 0 },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  // Card base
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },

  divider: { backgroundColor: BORDER, marginLeft: 64 },

  // Hero block
  heroBlock:   { overflow: "hidden" },
  heroStrip:   { height: 6, backgroundColor: NAVY },
  heroContent: { alignItems: "center", paddingVertical: 28, gap: 6 },
  appIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  appName:    { fontSize: 22, fontWeight: "900", color: NAVY, letterSpacing: -0.5 },
  appTagline: { fontSize: 13, color: MUTED },
  versionPill: {
    marginTop: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BRAND_LIGHT,
  },
  versionText: { fontSize: 12, fontWeight: "800", color: BRAND },

  // Info block
  infoBlock: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  infoRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: MUTED, fontWeight: "600" },
  infoValue: { fontSize: 13, color: NAVY,  fontWeight: "800" },

  // Description block
  descBlock: { padding: 16 },
  descText:  { fontSize: 14, color: MUTED, lineHeight: 21 },
  descBold:  { fontWeight: "800", color: NAVY },

  // Feature row
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureText: { fontSize: 14, fontWeight: "700", color: NAVY, flex: 1 },

  // Menu row
  menuRow:      { paddingHorizontal: 16, paddingVertical: 13 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuTitle:    { fontSize: 14, fontWeight: "800", color: NAVY, letterSpacing: -0.2 },
  menuDesc:     { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },

  // Credits
  creditsBlock: { alignItems: "center", paddingVertical: 28, gap: 4 },
  creditsText:  { fontSize: 13, color: MUTED, textAlign: "center" },
  creditsSub:   { fontSize: 11, color: BORDER, textAlign: "center", marginTop: 2 },
});