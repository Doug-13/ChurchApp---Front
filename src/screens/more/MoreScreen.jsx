import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Design tokens — alinhados ao Design Manual ───────────────────────────────
const NAVY        = "#1A2366";
const BRAND       = "#4158D0";
const BRAND_LIGHT = "#EEF0FA";
const SUCCESS     = "#2DBF8A";
const SUCCESS_BG  = "#E8F9F3";
const MUTED       = "#9198B5";
const BORDER      = "#E4E6F0";
const PURPLE      = "#7B61FF";
const PURPLE_BG   = "#F3F0FF";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role) {
  const r = String(role || "").toUpperCase();
  if (r === "OWNER") return "Responsável";
  if (r === "ADMIN") return "Admin";
  if (r === "LEADER") return "Líder";
  return "Membro";
}

function canManageChurch(role) {
  const r = String(role || "").toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

async function authFetch(path) {
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Não autenticado.");
  const token = await getIdToken(fbUser, true);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

function resolveImageUrl(obj, ...fields) {
  if (!obj) return null;
  for (const f of fields) {
    const v = obj[f];
    if (v && typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

// ─── Components ───────────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return (
    <Text style={styles.sectionLabel}>{title}</Text>
  );
}

function MenuRow({ icon, iconColor, iconBg, title, description, onPress, rightElement, showDivider = true, last = false }) {
  return (
    <>
      <TouchableRipple onPress={onPress} style={styles.menuRow}>
        <View style={styles.menuRowInner}>
          <View style={[styles.menuIcon, { backgroundColor: iconBg ?? BRAND_LIGHT }]}>
            <Icon source={icon} size={20} color={iconColor ?? BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>{title}</Text>
            {!!description && (
              <Text style={styles.menuDesc} numberOfLines={1}>{description}</Text>
            )}
          </View>
          {rightElement ?? <Icon source="chevron-right" size={20} color={MUTED} />}
        </View>
      </TouchableRipple>
      {!last && <Divider style={{ backgroundColor: BORDER, marginLeft: 64 }} />}
    </>
  );
}

function InfoCard({ children, style }) {
  return (
    <Surface elevation={0} style={[styles.card, style]}>
      {children}
    </Surface>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MoreScreen({ navigation }) {
  const theme = useTheme();
  const { me, signOut, isAdmin, activeChurchId } = useAuth();

  const [church, setChurch] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const userPhotoUrl  = resolveImageUrl(me, "photoUrl", "avatarUrl", "imageUrl", "photo");
  const churchLogoUrl = resolveImageUrl(church, "logoUrl", "photoUrl", "imageUrl");

  const userName  = me?.name || me?.displayName || "Minha conta";
  const userEmail = me?.email || "—";

  const isManager = isAdmin;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const mine = await authFetch("/churches/mine");
        if (!alive) return;

        const selected =
          (activeChurchId && Array.isArray(mine) && mine.find((c) => c.id === activeChurchId)) ||
          mine?.[0] || null;

        setMyRole(selected?.myRole || selected?.role || null);

        if (selected?.id) {
          const full = await authFetch(`/churches/${selected.id}`);
          if (alive) setChurch({ ...selected, ...full, myRole: selected?.myRole });
        }
      } catch (e) {
        console.warn("[MoreScreen] erro ao carregar:", e?.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [activeChurchId]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header: perfil do usuário ────────────────────────────────── */}
        <Surface elevation={0} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileNavyStrip} />
            <View style={styles.profileAvatarWrap}>
              {userPhotoUrl ? (
                <Image source={{ uri: userPhotoUrl }} style={styles.profileAvatar} resizeMode="cover" />
              ) : (
                <Avatar.Icon
                  size={72} icon="account"
                  style={{ backgroundColor: BRAND_LIGHT }}
                  color={BRAND}
                />
              )}
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>

            <View style={styles.profilePills}>
              {!!myRole && (
                <View style={[styles.profilePill, { backgroundColor: BRAND_LIGHT }]}>
                  <View style={[styles.pillDot, { backgroundColor: BRAND }]} />
                  <Text style={[styles.pillText, { color: BRAND }]}>{roleLabel(myRole)}</Text>
                </View>
              )}
              <View style={[styles.profilePill, { backgroundColor: SUCCESS_BG }]}>
                <View style={[styles.pillDot, { backgroundColor: SUCCESS }]} />
                <Text style={[styles.pillText, { color: SUCCESS }]}>Ativo</Text>
              </View>
            </View>
          </View>

          <View style={[styles.profileActions, { borderTopColor: BORDER }]}>
            <TouchableRipple
              onPress={() => navigation.navigate("Profile")}
              style={styles.profileActionBtn}
              borderless
            >
              <View style={styles.profileActionInner}>
                <Icon source="account-edit-outline" size={18} color={BRAND} />
                <Text style={styles.profileActionText}>Editar perfil</Text>
              </View>
            </TouchableRipple>
          </View>
        </Surface>

        {/* ── Igreja ──────────────────────────────────────────────────── */}
        {church && (
          <>
            <SectionLabel title="MINHA IGREJA" />
            <InfoCard>
              <TouchableRipple
                onPress={() => navigation.navigate("ChurchProfile")}
                style={styles.churchHeader}
              >
                <View style={styles.churchHeaderInner}>
                  {churchLogoUrl ? (
                    <Image source={{ uri: churchLogoUrl }} style={styles.churchLogo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.churchLogoFallback, { backgroundColor: BRAND_LIGHT }]}>
                      <Icon source="church" size={22} color={BRAND} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.churchName} numberOfLines={1}>{church.name}</Text>
                    {!!(church.city || church.state) && (
                      <Text style={styles.churchLocation} numberOfLines={1}>
                        {[church.city, church.state].filter(Boolean).join(" • ")}
                      </Text>
                    )}
                    {!!church.about && (
                      <Text style={styles.churchAbout} numberOfLines={2}>{church.about}</Text>
                    )}
                  </View>
                  <Icon source="chevron-right" size={20} color={MUTED} />
                </View>
              </TouchableRipple>

              <Divider style={{ backgroundColor: BORDER }} />
            </InfoCard>
          </>
        )}

        {/* ── Conta ────────────────────────────────────────────────────── */}
        <SectionLabel title="CONTA" />
        <InfoCard>
          <MenuRow
            icon="account-outline"
            iconColor={BRAND}
            iconBg={BRAND_LIGHT}
            title="Meu Perfil"
            description="Dados pessoais e foto"
            onPress={() => navigation.navigate("Profile")}
          />
          <MenuRow
            icon="cog-outline"
            iconColor={MUTED}
            iconBg="#F0F1F5"
            title="Configurações"
            description="Notificações, privacidade e tema"
            onPress={() => navigation.navigate("Settings")}
            last
          />
        </InfoCard>

        {/* ── Administração — só OWNER/ADMIN ────────────────────────────── */}
       

        {/* ── Ajuda ────────────────────────────────────────────────────── */}
        <SectionLabel title="AJUDA" />
        <InfoCard>
          <MenuRow
            icon="lifebuoy"
            iconColor="#0EA5E9"
            iconBg="#E7F6FE"
            title="Suporte"
            description="Fale com a administração"
            onPress={() => navigation.navigate("Support")}
          />
          <MenuRow
            icon="information-outline"
            iconColor={MUTED}
            iconBg="#F0F1F5"
            title="Sobre o app"
            description="Versão, termos e privacidade"
            onPress={() => navigation.navigate("About")}
            last
          />
        </InfoCard>

        {/* ── Sair ─────────────────────────────────────────────────────── */}
        <Surface elevation={0} style={[styles.card, styles.signOutCard]}>
          <TouchableRipple onPress={signOut} style={styles.menuRow} borderless={false}>
            <View style={styles.menuRowInner}>
              <View style={[styles.menuIcon, { backgroundColor: "#FEECEC" }]}>
                <Icon source="logout" size={20} color="#E84D4D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: "#E84D4D" }]}>Sair da conta</Text>
                <Text style={styles.menuDesc}>Entrar com outra conta</Text>
              </View>
            </View>
          </TouchableRipple>
        </Surface>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:      { flex: 1 },
  container: { padding: 16, paddingBottom: 32, gap: 0 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Card base ─────────────────────────────────────────────────────────────
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  // ── Profile card ──────────────────────────────────────────────────────────
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginTop: 8,
  },

  profileTop: {
    position: "relative",
    height: 56,
  },

  profileNavyStrip: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 56,
    backgroundColor: NAVY,
    opacity: 1,
  },

  profileAvatarWrap: {
    position: "absolute",
    bottom: -28,
    left: 20,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    width: 72,
    height: 72,
    backgroundColor: BRAND_LIGHT,
  },

  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
  },

  profileInfo: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 2,
  },

  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.4,
  },

  profileEmail: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },

  profilePills: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },

  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  pillDot: { width: 6, height: 6, borderRadius: 999 },

  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  profileActions: {
    borderTopWidth: 1,
    flexDirection: "row",
  },

  profileActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 0,
  },

  profileActionInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  profileActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND,
  },

  // ── Igreja ────────────────────────────────────────────────────────────────
  churchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  churchHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  churchLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  churchLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  churchName: {
    fontSize: 15,
    fontWeight: "900",
    color: NAVY,
    letterSpacing: -0.3,
  },

  churchLocation: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },

  churchAbout: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
    lineHeight: 17,
    fontStyle: "italic",
  },

  // ── Menu rows ─────────────────────────────────────────────────────────────
  menuRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  menuRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.2,
  },

  menuDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOutCard: {
    marginTop: 20,
  },
});