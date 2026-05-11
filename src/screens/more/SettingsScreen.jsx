import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";

// ─── Design tokens — Design Manual ChurchApp ──────────────────────────────────
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

const APP_VERSION = "1.0.0";

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function MenuRow({ icon, iconColor, iconBg, title, description, onPress, right, last }) {
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
          {right ?? <Icon source="chevron-right" size={20} color={MUTED} />}
        </View>
      </TouchableRipple>
      {!last && <Divider style={s.divider} />}
    </>
  );
}

function ToggleRow({ icon, iconColor, iconBg, title, description, value, onToggle, last }) {
  return (
    <>
      <TouchableRipple onPress={onToggle} style={s.menuRow}>
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
          {/* Switch customizado — alinhado ao manual */}
          <TouchableRipple onPress={onToggle} borderless style={{ borderRadius: 999 }}>
            <View style={[s.switchTrack, value ? s.switchOn : s.switchOff]}>
              <View style={[s.switchThumb, value ? s.thumbOn : s.thumbOff]} />
            </View>
          </TouchableRipple>
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

export default function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();

  // ── Preferências (placeholder — integrar com AsyncStorage ou contexto) ─────
  const [notifGeneral,  setNotifGeneral]  = useState(true);
  const [notifEvents,   setNotifEvents]   = useState(true);
  const [notifNews,     setNotifNews]     = useState(true);
  const [notifSchedule, setNotifSchedule] = useState(true);
  const [darkMode,      setDarkMode]      = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sair da conta",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: signOut },
      ]
    );
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Excluir conta",
      "Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir conta",
          style: "destructive",
          onPress: () => Alert.alert("Em breve", "Entre em contato com o suporte para solicitar a exclusão da conta."),
        },
      ]
    );
  }, []);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Notificações ────────────────────────────────────────────── */}
        <SectionLabel title="NOTIFICAÇÕES" />
        <Surface elevation={0} style={s.card}>
          <ToggleRow
            icon="bell-outline"
            iconColor={BRAND}
            iconBg={BRAND_LIGHT}
            title="Notificações gerais"
            description="Ativa ou desativa todas as notificações do app"
            value={notifGeneral}
            onToggle={() => setNotifGeneral((v) => !v)}
          />
          <ToggleRow
            icon="calendar-star"
            iconColor={WARNING}
            iconBg={WARNING_BG}
            title="Eventos"
            description="Novos eventos e lembretes de escalas"
            value={notifEvents && notifGeneral}
            onToggle={() => setNotifEvents((v) => !v)}
          />
          <ToggleRow
            icon="bullhorn-outline"
            iconColor="#E85D75"
            iconBg="#FDECEF"
            title="Avisos"
            description="Novos avisos publicados pela igreja"
            value={notifNews && notifGeneral}
            onToggle={() => setNotifNews((v) => !v)}
          />
          <ToggleRow
            icon="calendar-check-outline"
            iconColor="#C84AB5"
            iconBg="#FBE9F8"
            title="Minhas escalas"
            description="Notificações de confirmação de escala"
            value={notifSchedule && notifGeneral}
            onToggle={() => setNotifSchedule((v) => !v)}
            last
          />
        </Surface>

        {/* ── Aparência ───────────────────────────────────────────────── */}
        <SectionLabel title="APARÊNCIA" />
        <Surface elevation={0} style={s.card}>
          <ToggleRow
            icon="moon-waning-crescent"
            iconColor={NAVY}
            iconBg={BRAND_LIGHT}
            title="Modo escuro"
            description="Tema escuro para o aplicativo"
            value={darkMode}
            onToggle={() => {
              setDarkMode((v) => !v);
              Alert.alert("Em breve", "O modo escuro estará disponível em breve.");
            }}
            last
          />
        </Surface>

        {/* ── Privacidade ─────────────────────────────────────────────── */}
        <SectionLabel title="PRIVACIDADE" />
        <Surface elevation={0} style={s.card}>
          <MenuRow
            icon="shield-check-outline"
            iconColor={SUCCESS}
            iconBg={SUCCESS_BG}
            title="Política de privacidade"
            description="Como usamos seus dados"
            onPress={() => Linking.openURL("https://seusite.com/privacidade")}
          />
          <MenuRow
            icon="file-document-outline"
            iconColor={BRAND}
            iconBg={BRAND_LIGHT}
            title="Termos de uso"
            description="Termos e condições do aplicativo"
            onPress={() => Linking.openURL("https://seusite.com/termos")}
            last
          />
        </Surface>

        {/* ── Suporte ─────────────────────────────────────────────────── */}
        <SectionLabel title="SUPORTE" />
        <Surface elevation={0} style={s.card}>
          <MenuRow
            icon="lifebuoy"
            iconColor="#0EA5E9"
            iconBg="#E7F6FE"
            title="Central de ajuda"
            description="Dúvidas frequentes e tutoriais"
            onPress={() => Alert.alert("Em breve", "A central de ajuda estará disponível em breve.")}
          />
          <MenuRow
            icon="whatsapp"
            iconColor={SUCCESS}
            iconBg={SUCCESS_BG}
            title="Falar com suporte"
            description="Envie uma mensagem para nossa equipe"
            onPress={() => Linking.openURL("https://wa.me/5551999999999")}
          />
          <MenuRow
            icon="star-outline"
            iconColor={WARNING}
            iconBg={WARNING_BG}
            title="Avaliar o app"
            description="Deixe sua avaliação na loja"
            onPress={() => {
              const url = Platform.OS === "ios"
                ? "itms-apps://itunes.apple.com/app/idSEU_APP_ID"
                : "market://details?id=com.seuapp";
              Linking.openURL(url).catch(() =>
                Alert.alert("Não foi possível abrir a loja.")
              );
            }}
            last
          />
        </Surface>

        {/* ── Sobre o app ─────────────────────────────────────────────── */}
        <SectionLabel title="SOBRE O APP" />
        <Surface elevation={0} style={s.card}>
          <View style={s.aboutBlock}>
            {/* Ícone do app */}
            <View style={s.appIconWrap}>
              <Icon source="church" size={32} color={BRAND} />
            </View>
            <Text style={s.appName}>ChurchApp</Text>
            <Text style={s.appTagline}>Conectando comunidades de fé</Text>
            <View style={s.versionPill}>
              <Text style={s.versionText}>v{APP_VERSION}</Text>
            </View>
          </View>

          <Divider style={[s.divider, { marginLeft: 0 }]} />

          <View style={s.infoBlock}>
            <InfoRow label="Versão"    value={APP_VERSION} />
            <InfoRow label="Plataforma" value={Platform.OS === "ios" ? "iOS" : "Android"} />
            <InfoRow label="Build"     value={Platform.OS === "ios" ? "Release" : "Release"} />
          </View>
        </Surface>

        {/* ── Conta ───────────────────────────────────────────────────── */}
        <SectionLabel title="CONTA" />
        <Surface elevation={0} style={s.card}>
          <MenuRow
            icon="logout"
            iconColor={DANGER}
            iconBg={DANGER_BG}
            title="Sair da conta"
            description="Você será redirecionado para o login"
            onPress={handleSignOut}
            right={<Icon source="chevron-right" size={20} color={DANGER} />}
          />
          <MenuRow
            icon="account-remove-outline"
            iconColor={DANGER}
            iconBg={DANGER_BG}
            title="Excluir minha conta"
            description="Remove permanentemente seus dados do app"
            onPress={handleDeleteAccount}
            right={<Icon source="chevron-right" size={20} color={DANGER} />}
            last
          />
        </Surface>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  container: { paddingBottom: 32 },

  // ── Section label ──────────────────────────────────────────────────────────
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

  // ── Card ───────────────────────────────────────────────────────────────────
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

  // ── Menu row ───────────────────────────────────────────────────────────────
  menuRow:      { paddingHorizontal: 16, paddingVertical: 13 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuTitle:    { fontSize: 14, fontWeight: "800", color: NAVY, letterSpacing: -0.2 },
  menuDesc:     { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },

  // ── Switch ─────────────────────────────────────────────────────────────────
  switchTrack: { width: 46, height: 26, borderRadius: 999, padding: 3, justifyContent: "center" },
  switchOn:    { backgroundColor: SUCCESS_BG, borderWidth: 1, borderColor: SUCCESS },
  switchOff:   { backgroundColor: "#F0F1F5",  borderWidth: 1, borderColor: BORDER },
  switchThumb: { width: 20, height: 20, borderRadius: 999 },
  thumbOn:     { alignSelf: "flex-end",  backgroundColor: SUCCESS },
  thumbOff:    { alignSelf: "flex-start", backgroundColor: MUTED },

  // ── About block ────────────────────────────────────────────────────────────
  aboutBlock: { alignItems: "center", paddingVertical: 24, gap: 6 },
  appIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  appName:    { fontSize: 18, fontWeight: "900", color: NAVY, letterSpacing: -0.4 },
  appTagline: { fontSize: 13, color: MUTED },
  versionPill: {
    marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: BRAND_LIGHT,
  },
  versionText: { fontSize: 11, fontWeight: "800", color: BRAND },

  // ── Info block ─────────────────────────────────────────────────────────────
  infoBlock: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  infoRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: MUTED, fontWeight: "600" },
  infoValue: { fontSize: 13, color: NAVY,  fontWeight: "800" },
});