import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Icon,
  Modal,
  Portal,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#1A2366";
const BRAND_BLUE = "#4158D0";
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W * 0.60;
const CARD_GAP = 12;

const QUICK_ACTIONS = [
  { icon: "bullhorn-outline",       label: "Avisos",       route: "NewsTab",       screen: "NewsFeed",        color: "#4158D0", bg: "#EEF0FA" },
  { icon: "calendar-star",          label: "Eventos",      route: "Events",        screen: "EventsList",       color: "#F5A623", bg: "#FEF5E7" },
  { icon: "account-group-outline",  label: "Membros",      route: "HomeTab",       screen: "Directory",        color: "#2DBF8A", bg: "#E8F9F3" },
  { icon: "calendar-check-outline", label: "Escalas",      route: "SchedulesTab",  screen: "MySchedules",      color: "#C84AB5", bg: "#FBE9F8" },
  { icon: "cake-variant-outline",   label: "Aniversários", route: "HomeTab",       screen: "Birthdays",        color: "#E84D4D", bg: "#FEECEC" },
  { icon: "grid-large",             label: "Células",      route: "CellsTab",      screen: "CellsList",        color: "#2E8AE5", bg: "#E6F4FF" },
  { icon: "shield-account-outline", label: "Admin",        route: "AdminTab",      screen: "AdminDashboard",   color: "#7B61FF", bg: "#F3F0FF" },
  { icon: "dots-horizontal",        label: "Mais",         route: "MoreTab",                                   color: "#9198B5", bg: null      },
];

const NEWS_TYPE_META = {
  GENERAL:       { icon: "bullhorn-outline",        color: "#2DBF8A", bg: "#E8F9F3", label: "Geral"        },
  URGENT:        { icon: "alert-circle",            color: "#E84D4D", bg: "#FEECEC", label: "Urgente"      },
  IMPORTANT:     { icon: "information",             color: "#4158D0", bg: "#EEF0FA", label: "Importante"   },
  WARNING:       { icon: "alert",                   color: "#F5A623", bg: "#FEF5E7", label: "Atenção"      },
  INFO:          { icon: "information-outline",     color: "#2E8AE5", bg: "#E6F4FF", label: "Informativo"  },
  EVENT:         { icon: "calendar-star",           color: "#7C3AED", bg: "#F1EAFE", label: "Evento"       },
  SOCIAL_ACTION: { icon: "hand-heart",              color: "#E85D75", bg: "#FDECEF", label: "Ação social"  },
  MEETING:       { icon: "account-group",           color: "#0EA5E9", bg: "#E7F6FE", label: "Reunião"      },
  LEADERSHIP:    { icon: "account-tie",             color: "#6246EA", bg: "#EFECFF", label: "Liderança"    },
  PRAYER:        { icon: "hands-pray",              color: "#14B8A6", bg: "#E6FFFA", label: "Oração"       },
  WORSHIP:       { icon: "music-clef-treble",       color: "#EC4899", bg: "#FCE7F3", label: "Louvor"       },
  SCALE:         { icon: "clipboard-list-outline",  color: "#F97316", bg: "#FFF3E8", label: "Escala"       },
  TRAINING:      { icon: "school-outline",          color: "#2563EB", bg: "#EAF0FF", label: "Treinamento"  },
  CHILDREN:      { icon: "baby-face-outline",       color: "#06B6D4", bg: "#E6FAFD", label: "Infantil"     },
  YOUTH:         { icon: "account-star-outline",    color: "#8B5CF6", bg: "#F3EFFF", label: "Jovens"       },
  WOMEN:         { icon: "human-female",            color: "#EC4899", bg: "#FCE7F3", label: "Mulheres"     },
  MEN:           { icon: "human-male",              color: "#2563EB", bg: "#EAF0FF", label: "Homens"       },
  FINANCE:       { icon: "cash-multiple",           color: "#16A34A", bg: "#EAFBF0", label: "Financeiro"   },
  VOLUNTEERS:    { icon: "account-heart-outline",   color: "#22C55E", bg: "#EAFBF0", label: "Voluntários"  },
};

const LEGACY_TYPE_MAP = {
  "Aviso":       "GENERAL",
  "Evento":      "EVENT",
  "Ação social": "SOCIAL_ACTION",
  "Acao social": "SOCIAL_ACTION",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role) {
  const r = String(role || "").toUpperCase();
  if (r === "OWNER")  return "Responsável";
  if (r === "ADMIN")  return "Admin";
  if (r === "LEADER") return "Líder";
  return "Membro";
}

async function authFetch(path, opts = {}) {
  const { method = "GET", body } = opts;
  const fbUser = getAuth().currentUser;
  if (!fbUser) throw new Error("Usuário não autenticado.");
  const token = await getIdToken(fbUser, false);
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}

function toArray(val) {
  if (Array.isArray(val))        return val;
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data))  return val.data;
  return [];
}

function isPast(dateLabel) {
  if (!dateLabel) return false;
  return new Date(`${dateLabel}T23:59:59`) < new Date();
}

function formatShortDate(dateLabel) {
  const v = String(dateLabel || "").trim();
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return v || "Data a confirmar";
  const [y, m, d] = v.split("-");
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short",
  });
}

function formatFullDate(dateLabel) {
  const v = String(dateLabel || "").trim();
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return v || "Data a confirmar";
  const [y, m, d] = v.split("-");
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatNewsDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  const diff  = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days === 1) return "Ontem";
  if (days  < 7)  return `${days} dias atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isExpired(rawDate) {
  if (!rawDate) return false;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function getNewsMeta(item) {
  const raw = String(item?.type || item?.category || "").trim();
  if (!raw) return NEWS_TYPE_META.GENERAL;
  const upper = raw.toUpperCase();
  if (NEWS_TYPE_META[upper]) return NEWS_TYPE_META[upper];
  const mapped = LEGACY_TYPE_MAP[raw];
  if (mapped && NEWS_TYPE_META[mapped]) return NEWS_TYPE_META[mapped];
  return NEWS_TYPE_META.GENERAL;
}

function withAlpha(hex, a) {
  const h    = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n    = parseInt(full, 16);
  if (isNaN(n)) return null;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function resolveImageUrl(obj, ...fields) {
  if (!obj) return null;
  for (const f of fields) {
    const v = obj[f];
    if (v && typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

function resolveEventAccent(item) {
  const ministryColor = item?.ministries?.[0]?.color;
  if (ministryColor && /^#[0-9A-Fa-f]{3,8}$/.test(ministryColor)) return ministryColor;
  return item?.color || item?.eventColor || BRAND_BLUE;
}

function accentGradient(hex) {
  const h    = String(hex || BRAND_BLUE).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n    = parseInt(full, 16);
  if (isNaN(n)) return [BRAND_BLUE, "#6A80E8"];
  const r     = (n >> 16) & 255;
  const g     = (n >> 8)  & 255;
  const b     =  n        & 255;
  const light = `rgb(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 80, 255)})`;
  return [light, hex];
}

// ─── ModalInfoRow ─────────────────────────────────────────────────────────────

function ModalInfoRow({ icon, label, value, color, tc }) {
  if (!value) return null;
  return (
    <View style={s.modalInfoRow}>
      <View style={[s.modalInfoIcon, { backgroundColor: color + "18" }]}>
        <Icon source={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.modalInfoLabel, { color: tc.muted }]}>{label}</Text>
        <Text style={[s.modalInfoValue, { color: tc.text }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Modal: Evento ────────────────────────────────────────────────────────────

function EventModal({ event, visible, onDismiss, tc }) {
  if (!event) return null;

  const accent   = event?.color || event?.eventColor || BRAND_BLUE;
  const accentBg = withAlpha(accent, 0.1) || tc.iconBg;
  const past     = isPast(event?.dateLabel);
  const ministry = (event?.ministries ?? []).map((m) => m.name).join(", ");
  const coverUrl = resolveImageUrl(event, "coverImageUrl", "coverUrl", "imageUrl", "image", "photoUrl");

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={s.modalContainer}>
        <Surface style={[s.modalSheet, { backgroundColor: tc.surface }]} elevation={0}>
          <View style={s.modalHandle} />

          {coverUrl ? (
            <View style={s.modalCoverWrap}>
              <Image source={{ uri: coverUrl }} style={s.modalCoverImage} resizeMode="cover" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.5)"]} style={s.modalCoverOverlay} />
            </View>
          ) : (
            <LinearGradient
              colors={accentGradient(accent)}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.modalCoverGradient}
            >
              <View style={s.modalGradientBlob} />
              <Icon source={event?.ministries?.[0]?.icon || "calendar-star"} size={36} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <View style={s.modalTopRow}>
              <View style={[s.modalBadge, { backgroundColor: accentBg }]}>
                <Icon source="calendar" size={14} color={accent} />
                <Text style={[s.modalBadgeText, { color: accent }]}>
                  {formatShortDate(event?.dateLabel)}{event?.timeLabel ? ` • ${event.timeLabel}` : ""}
                </Text>
              </View>
              {past ? (
                <View style={[s.modalBadge, { backgroundColor: tc.outline + "60" }]}>
                  <Text style={[s.modalBadgeText, { color: tc.muted }]}>Realizado</Text>
                </View>
              ) : (
                <View style={[s.modalBadge, { backgroundColor: accentBg }]}>
                  <View style={[s.modalDot, { backgroundColor: accent }]} />
                  <Text style={[s.modalBadgeText, { color: accent }]}>Em breve</Text>
                </View>
              )}
            </View>

            <Text style={[s.modalTitle, { color: tc.text }]}>{event?.title ?? "Evento"}</Text>

            {!!event?.description && (
              <Text style={[s.modalBody, { color: tc.muted }]}>{event.description}</Text>
            )}

            <Divider style={[s.modalDivider, { backgroundColor: tc.outline }]} />

            <View style={s.modalInfoList}>
              <ModalInfoRow icon="calendar-outline"      label="Data"          value={formatFullDate(event?.dateLabel)} color={accent} tc={tc} />
              {!!event?.timeLabel   && <ModalInfoRow icon="clock-outline"         label="Horário"       value={event.timeLabel}         color={accent} tc={tc} />}
              {!!event?.location    && <ModalInfoRow icon="map-marker-outline"    label="Local"         value={event.location}          color={accent} tc={tc} />}
              {!!ministry           && <ModalInfoRow icon="account-group-outline" label="Ministério"    value={ministry}                color={accent} tc={tc} />}
              {!!event?.createdByName && <ModalInfoRow icon="account-circle-outline" label="Organizado por" value={event.createdByName} color={accent} tc={tc} />}
            </View>
          </ScrollView>

          <View style={[s.modalFooter, { borderTopColor: tc.outline }]}>
            <Button mode="contained" onPress={onDismiss} style={s.modalBtn} buttonColor={accent} textColor="#fff">
              Fechar
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

// ─── Modal: Aviso ─────────────────────────────────────────────────────────────

function NewsModal({ item, visible, onDismiss, tc }) {
  if (!item) return null;

  const meta         = getNewsMeta(item);
  const expired      = isExpired(item?.expiresAt);
  const isDraft      = item?.active === false;
  const expiresLabel = formatDateTime(item?.expiresAt);
  const updatedLabel = formatDateTime(item?.updatedAt);
  const targetName   = item?.targetDepartmentName || item?.departmentName || null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={s.modalContainer}>
        <Surface style={[s.modalSheet, { backgroundColor: tc.surface }]} elevation={0}>
          <View style={s.modalHandle} />
          <View style={[s.modalStrip, { backgroundColor: meta.color }]} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <View style={s.modalTopRow}>
              <View style={[s.modalBadge, { backgroundColor: meta.bg }]}>
                <Icon source={meta.icon} size={14} color={meta.color} />
                <Text style={[s.modalBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={[s.modalAgo, { color: tc.muted }]}>
                {formatNewsDate(item?.publishedAt || item?.createdAt)}
              </Text>
            </View>

            {(isDraft || expired) && (
              <View style={s.modalBadgesRow}>
                {isDraft && (
                  <View style={[s.modalBadge, { backgroundColor: tc.outline + "60" }]}>
                    <Icon source="eye-off-outline" size={11} color={tc.muted} />
                    <Text style={[s.modalBadgeText, { color: tc.muted }]}>Rascunho</Text>
                  </View>
                )}
                {expired && (
                  <View style={[s.modalBadge, { backgroundColor: "#FEECEC" }]}>
                    <Icon source="timer-off-outline" size={11} color="#E84D4D" />
                    <Text style={[s.modalBadgeText, { color: "#E84D4D" }]}>Expirado</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[s.modalTitle, { color: tc.text }]}>{item?.title ?? "Aviso"}</Text>

            {!!item?.createdByName && (
              <View style={s.modalAuthorRow}>
                <Icon source="account-circle-outline" size={15} color={tc.muted} />
                <Text style={[s.modalAuthorText, { color: tc.muted }]}>
                  Por <Text style={{ fontWeight: "700", color: tc.text }}>{item.createdByName}</Text>
                </Text>
              </View>
            )}

            {!!item?.content && (
              <Text style={[s.modalBody, { color: tc.muted }]}>{item.content}</Text>
            )}

            <Divider style={[s.modalDivider, { backgroundColor: tc.outline }]} />

            <View style={s.modalInfoList}>
              <ModalInfoRow
                icon="earth" label="Visibilidade"
                value={targetName || "Toda a igreja"}
                color={targetName ? "#7C3AED" : meta.color} tc={tc}
              />
              {expiresLabel ? (
                <ModalInfoRow
                  icon={expired ? "timer-off-outline" : "timer-outline"}
                  label={expired ? "Expirou em" : "Válido até"}
                  value={expiresLabel}
                  color={expired ? "#E84D4D" : "#F5A623"} tc={tc}
                />
              ) : (
                <ModalInfoRow icon="infinity" label="Validade" value="Sem data de expiração" color="#2DBF8A" tc={tc} />
              )}
              {!!updatedLabel && (
                <ModalInfoRow icon="pencil-clock-outline" label="Atualizado em" value={updatedLabel} color={tc.muted} tc={tc} />
              )}
            </View>
          </ScrollView>

          <View style={[s.modalFooter, { borderTopColor: tc.outline }]}>
            <Button mode="contained" onPress={onDismiss} style={s.modalBtn} buttonColor={meta.color} textColor="#fff">
              Fechar
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

// ─── Stateless UI components ──────────────────────────────────────────────────

function SectionHeader({ title, subtitle, subtitleColor }) {
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text variant="titleMedium" style={s.sectionTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={[s.sectionSub, subtitleColor ? { color: subtitleColor } : null]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

function QuickActionItem({ icon, label, color, bg, dashed, onPress, surfaceColor, bgColor, outlineColor, textColor }) {
  return (
    <TouchableRipple
      borderless onPress={onPress}
      style={[
        s.qaItem, { backgroundColor: surfaceColor },
        dashed ? { borderStyle: "dashed", borderColor: outlineColor, backgroundColor: bgColor } : null,
      ]}
    >
      <View style={s.qaInner}>
        <View style={[s.qaIconWrap, { backgroundColor: bg || bgColor }]}>
          <Icon source={icon} size={22} color={color} />
        </View>
        <Text style={[s.qaLabel, { color: textColor }]} numberOfLines={1}>{label}</Text>
      </View>
    </TouchableRipple>
  );
}

function EventCard({ item, onPress, surfaceColor, outlineColor, textColor, mutedColor, primaryContainerColor }) {
  const accent        = resolveEventAccent(item);
  const accentBg      = withAlpha(accent, 0.1) || primaryContainerColor;
  const past          = isPast(item?.dateLabel);
  const ministries    = item?.ministries ?? [];
  const ministryLabel = ministries.map((m) => m.name).join(", ");
  const coverUrl      = resolveImageUrl(item, "coverImageUrl", "coverUrl", "imageUrl", "image", "photoUrl");
  const ministryIcon  = ministries[0]?.icon || "calendar-star";
  const gradientColors = accentGradient(accent);

  return (
    <TouchableRipple
      borderless onPress={onPress}
      style={[s.eventCard, { backgroundColor: surfaceColor, borderColor: outlineColor, opacity: past ? 0.62 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        {coverUrl ? (
          <View style={s.eventCoverWrap}>
            <Image source={{ uri: coverUrl }} style={s.eventCoverImage} resizeMode="cover" />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.45)"]} style={s.eventCoverOverlay} />
            <View style={s.eventDateBadgeOnImage}>
              <Icon source="calendar" size={11} color="#fff" />
              <Text style={s.eventDateTextOnImage}>
                {formatShortDate(item?.dateLabel)}{item?.timeLabel ? ` • ${item.timeLabel}` : ""}
              </Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.eventCoverGradient}
          >
            <View style={s.eventGradientBlob} />
            <View style={s.eventGradientIconWrap}>
              <Icon source={ministryIcon} size={28} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={s.eventDateBadgeOnImage}>
              <Icon source="calendar" size={11} color="#fff" />
              <Text style={s.eventDateTextOnImage}>
                {formatShortDate(item?.dateLabel)}{item?.timeLabel ? ` • ${item.timeLabel}` : ""}
              </Text>
            </View>
          </LinearGradient>
        )}

        <View style={s.eventBody}>
          <Text variant="titleSmall" style={[s.eventTitle, { color: textColor }]} numberOfLines={2}>
            {item?.title ?? "Evento"}
          </Text>
          {!!item?.location && (
            <View style={s.eventMeta}>
              <Icon source="map-marker-outline" size={12} color={mutedColor} />
              <Text style={[s.eventMetaText, { color: mutedColor }]} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {!!ministryLabel && (
            <View style={s.eventMeta}>
              <Icon source="account-group-outline" size={12} color={mutedColor} />
              <Text style={[s.eventMetaText, { color: mutedColor }]} numberOfLines={1}>{ministryLabel}</Text>
            </View>
          )}
          <View style={s.eventFooter}>
            {past ? (
              <Text style={[s.eventPast, { color: mutedColor }]}>Realizado</Text>
            ) : (
              <View style={[s.eventChip, { backgroundColor: `${accent}22` }]}>
                <View style={[s.eventDot, { backgroundColor: accent }]} />
                <Text style={[s.eventChipText, { color: accent }]}>Em breve</Text>
              </View>
            )}
            <Icon source="chevron-right" size={16} color={mutedColor} />
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

function EmptyEvents({ surfaceColor, outlineColor, textColor, mutedColor, iconBg, iconColor }) {
  return (
    <View style={[s.emptyEvents, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
      <View style={[s.emptyEventsIcon, { backgroundColor: iconBg }]}>
        <Icon source="calendar-outline" size={24} color={iconColor} />
      </View>
      <Text variant="titleSmall" style={[s.emptyEventsTitle, { color: textColor }]}>Nenhum evento</Text>
      <Text style={[s.emptyEventsText, { color: mutedColor }]}>Nenhum evento publicado ainda.</Text>
    </View>
  );
}

function NewsRow({ item, isLast, onPress, surfaceColor, outlineColor, textColor, mutedColor }) {
  const meta = getNewsMeta(item);
  return (
    <TouchableRipple
      borderless onPress={onPress}
      style={[
        s.newsRow, { backgroundColor: surfaceColor },
        !isLast ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: outlineColor } : null,
      ]}
    >
      <View style={s.newsRowInner}>
        <View style={[s.newsBar, { backgroundColor: meta.color }]} />
        <View style={[s.newsIconWrap, { backgroundColor: meta.bg }]}>
          <Icon source={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={s.newsContent}>
          <View style={s.newsTopRow}>
            <View style={[s.newsBadge, { backgroundColor: meta.bg }]}>
              <Text style={[s.newsBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[s.newsDate, { color: mutedColor }]}>
              {formatNewsDate(item?.publishedAt || item?.createdAt || item?.date)}
            </Text>
          </View>
          <Text style={[s.newsTitle, { color: textColor }]} numberOfLines={1}>
            {item?.title ?? "Aviso"}
          </Text>
          {!!item?.content && (
            <Text style={[s.newsBody, { color: mutedColor }]} numberOfLines={2}>{item.content}</Text>
          )}
        </View>
        <Icon source="chevron-right" size={16} color={mutedColor} />
      </View>
    </TouchableRipple>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { me } = useAuth();

  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [church,       setChurch]       = useState(null);
  const [myRole,       setMyRole]       = useState(null);
  const [error,        setError]        = useState(null);
  const [eventsLoading,setEventsLoading]= useState(false);
  const [events,       setEvents]       = useState([]);
  const [newsLoading,  setNewsLoading]  = useState(false);
  const [news,         setNews]         = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);

  const cityLine = useMemo(() => {
    if (!church) return "—";
    return [church.city, church.state].filter(Boolean).join(" • ") || "—";
  }, [church]);

  const greet = useMemo(() => {
    const first = me?.name ? String(me.name).split(" ")[0] : "";
    return first ? `Olá, ${first}` : "Olá";
  }, [me]);

  const tc = useMemo(() => ({
    surface:    theme.colors.surface,
    bg:         theme.colors.background,
    outline:    theme.colors.outlineVariant,
    text:       theme.colors.onSurface,
    muted:      theme.colors.onSurfaceVariant,
    primary:    theme.colors.primary,
    iconBg:     theme.colors.primaryContainer,
    iconColor:  theme.colors.onPrimaryContainer,
    errorBg:    theme.colors.errorContainer,
    errorColor: theme.colors.onErrorContainer,
  }), [theme]);

  const handleQuickActionPress = useCallback((qa) => {
    if (!qa?.route) return;
    const parentNavigation = navigation.getParent?.();
    if (qa.screen) {
      (parentNavigation || navigation).navigate(qa.route, { screen: qa.screen });
      return;
    }
    (parentNavigation || navigation).navigate(qa.route);
  }, [navigation]);

  const loadHome = useCallback(async () => {
    setError(null);

    // ✅ Usa o me do AuthContext para evitar chamada duplicada de /users/me
    const activeChurchId = me?.activeChurchId ?? null;

    const mine = await authFetch("/churches/mine");

    const selected =
      (activeChurchId && mine?.find?.((c) => c.id === activeChurchId)) ||
      mine?.[0] || null;

    setChurch(selected);
    setMyRole(selected?.myRole || selected?.role || selected?.members?.[0]?.role || null);

    if (selected?.id) {
      setEventsLoading(true);
      setNewsLoading(true);

      const [churchFullRes, evRes, newsRes] = await Promise.allSettled([
        authFetch(`/churches/${selected.id}`),
        authFetch(`/churches/${selected.id}/events`),
        authFetch(`/news?churchId=${selected.id}&take=5`),
      ]);

      // ✅ Dados completos da igreja
      if (churchFullRes.status === "fulfilled") {
        const full = churchFullRes.value;
        setChurch({ ...selected, ...full, myRole: selected?.myRole, myStatus: selected?.myStatus });
      }

      // ✅ Eventos — ordena próximos primeiro, passados por último
      if (evRes.status === "fulfilled") {
        const list = toArray(evRes.value);
        const parseDate = (dateStr) => {
          const v = String(dateStr || "").trim();
          return /^\d{4}-\d{2}-\d{2}$/.test(v)
            ? new Date(`${v}T00:00:00`).getTime()
            : Number.MAX_SAFE_INTEGER;
        };
        const sorted   = [...list].sort((a, b) => parseDate(a?.dateLabel) - parseDate(b?.dateLabel));
        const upcoming = sorted.filter((e) => !isPast(e?.dateLabel));
        const past     = sorted.filter((e) =>  isPast(e?.dateLabel)).reverse();
        setEvents([...upcoming, ...past].slice(0, 6));
      } else {
        setEvents([]);
      }
      setEventsLoading(false);

      // ✅ Avisos — backend já filtra por visibilidade de ministério
      //    Aqui apenas remove rascunhos/inativos que porventura venham
      if (newsRes.status === "fulfilled") {
        const list = toArray(newsRes.value);
        const active = list.filter((n) => {
          if (n?.active === false) return false;
          const st = String(n?.status || "").toUpperCase();
          if (st && st !== "ACTIVE" && st !== "PUBLISHED") return false;
          return true;
        });
        setNews(active.slice(0, 5));
      } else {
        setNews([]);
      }
      setNewsLoading(false);

    } else {
      setEvents([]);
      setNews([]);
    }
  }, [me]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await loadHome();
      } catch (e) {
        if (alive) {
          setChurch(null);
          setMyRole(null);
          setError(e?.message || "Erro ao carregar.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [loadHome]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadHome();
    } catch (e) {
      setError(e?.message || "Erro ao atualizar.");
    } finally {
      setRefreshing(false);
    }
  }, [loadHome]);

  const userPhotoUrl  = resolveImageUrl(me,     "photoUrl", "avatarUrl", "imageUrl", "photo", "avatar");
  const churchLogoUrl = resolveImageUrl(church, "logoUrl",  "photoUrl",  "imageUrl", "coverUrl", "photo", "avatar", "avatarUrl");

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: tc.bg }]}>
        <StatusBar backgroundColor={NAVY} barStyle="light-content" />
        <View style={s.center}>
          <Surface elevation={0} style={[s.loadingIcon, { backgroundColor: tc.iconBg }]}>
            <ActivityIndicator color={tc.primary} />
          </Surface>
          <Text style={[s.loadingText, { color: tc.muted }]}>Carregando sua igreja...</Text>
        </View>
      </View>
    );
  }

  // ─── Sem igreja ────────────────────────────────────────────────────────────
  if (!church) {
    return (
      <View style={[s.root, { backgroundColor: tc.bg }]}>
        <StatusBar backgroundColor={NAVY} barStyle="light-content" />
        <View style={s.emptyWrapper}>
          <Surface style={[s.emptyCard, { backgroundColor: tc.surface, borderColor: tc.outline }]} elevation={0}>
            <View style={[s.emptyCardIcon, { backgroundColor: tc.iconBg }]}>
              <Icon source="church" size={30} color={tc.iconColor} />
            </View>
            <Text variant="headlineSmall" style={s.emptyCardTitle}>Sem igreja vinculada</Text>
            {!!error && (
              <Surface elevation={0} style={[s.errorBox, { backgroundColor: tc.errorBg }]}>
                <Icon source="alert-circle-outline" size={18} color={tc.errorColor} />
                <Text style={[s.errorText, { color: tc.errorColor }]}>{error}</Text>
              </Surface>
            )}
            <Text style={[s.emptyCardDesc, { color: tc.muted }]}>
              Entre em uma igreja existente ou crie uma nova para liberar os recursos do app.
            </Text>
            <Button
              mode="contained" icon="link-variant"
              style={s.emptyCardBtn} contentStyle={s.emptyCardBtnContent}
              onPress={() => navigation.navigate("ChurchGate")}
            >
              Vincular igreja
            </Button>
          </Surface>
        </View>
      </View>
    );
  }

  // ─── Main ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: tc.bg }]}>
      <StatusBar backgroundColor={NAVY} barStyle="light-content" />

      <NewsModal item={selectedNews} visible={!!selectedNews} onDismiss={() => setSelectedNews(null)} tc={tc} />

      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.blobOne} />
          <View style={s.blobTwo} />

          <View style={s.heroTopRow}>
            <View style={s.heroIdentity}>
              {churchLogoUrl ? (
                <Image source={{ uri: churchLogoUrl }} style={s.heroChurchLogo} resizeMode="cover" />
              ) : (
                <Avatar.Icon size={54} icon="church" style={s.heroAvatarFallback} color="#FFFFFF" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.heroGreet}>{greet}</Text>
                <Text variant="titleLarge" style={s.heroName} numberOfLines={1}>
                  {church?.name ?? "Minha igreja"}
                </Text>
                <Text style={s.heroMeta} numberOfLines={1}>
                  {cityLine}{myRole ? ` • ${roleLabel(myRole)}` : ""}
                </Text>
              </View>
            </View>

            <TouchableRipple
              borderless
              onPress={() => {
                const parent = navigation.getParent?.();
                if (parent) parent.navigate("MoreTab", { screen: "Profile" });
                else navigation.navigate("Profile");
              }}
              style={s.heroProfileBtn}
            >
              {userPhotoUrl ? (
                <Image source={{ uri: userPhotoUrl }} style={s.heroUserPhoto} resizeMode="cover" />
              ) : (
                <View style={s.heroProfileBtnInner}>
                  <Icon source="account-circle-outline" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableRipple>
          </View>

          {!!church?.about && (
            <View style={s.heroAboutWrap}>
              <Icon source="information-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={s.heroAbout} numberOfLines={2}>{church.about}</Text>
            </View>
          )}

          <TouchableRipple
            borderless
            onPress={() => navigation.navigate("ChurchProfile")}
            style={s.heroChurchProfileBtn}
          >
            <View style={s.heroChurchProfileBtnInner}>
              <Icon source="church" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroChurchProfileBtnText}>Ver perfil da igreja</Text>
              <Icon source="chevron-right" size={14} color="rgba(255,255,255,0.6)" />
            </View>
          </TouchableRipple>
        </View>

        {/* ── PRÓXIMOS EVENTOS ──────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Próximos eventos" subtitle="Toque para ver detalhes" subtitleColor={tc.muted} />
        </View>

        {eventsLoading ? (
          <View style={s.carouselLoading}>
            <ActivityIndicator color={tc.primary} />
            <Text style={[s.loadingText, { color: tc.muted }]}>Carregando eventos...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={s.emptyEventsPad}>
            <EmptyEvents
              surfaceColor={tc.surface} outlineColor={tc.outline}
              textColor={tc.text}      mutedColor={tc.muted}
              iconBg={tc.iconBg}       iconColor={tc.iconColor}
            />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item, idx) => String(item?.id ?? idx)}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={s.carouselList}
            ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
            renderItem={({ item }) => (
              <EventCard
                item={item}
                surfaceColor={tc.surface}  outlineColor={tc.outline}
                textColor={tc.text}        mutedColor={tc.muted}
                primaryContainerColor={tc.iconBg}
                onPress={() => {
                  const parent = navigation.getParent?.();
                  if (parent) {
                    parent.navigate("Events", {
                      screen: "EventsPreviewScreen",
                      params: { event: item },
                    });
                  } else {
                    navigation.navigate("EventsPreviewScreen", { event: item });
                  }
                }}
              />
            )}
          />
        )}

        {/* ── AVISOS ────────────────────────────────────────────────────── */}
        {(newsLoading || news.length > 0) && (
          <View style={s.section}>
            <SectionHeader title="Avisos" subtitle="Toque para ver detalhes" subtitleColor={tc.muted} />
            {newsLoading ? (
              <View style={s.newsLoading}>
                <ActivityIndicator size="small" color={tc.primary} />
                <Text style={[s.loadingText, { color: tc.muted }]}>Carregando avisos...</Text>
              </View>
            ) : (
              <Surface style={[s.newsCard, { backgroundColor: tc.surface, borderColor: tc.outline }]} elevation={0}>
                {news.map((item, idx) => (
                  <NewsRow
                    key={String(item?.id ?? idx)}
                    item={item} isLast={idx === news.length - 1}
                    surfaceColor={tc.surface} outlineColor={tc.outline}
                    textColor={tc.text}       mutedColor={tc.muted}
                    onPress={() => setSelectedNews(item)}
                  />
                ))}
              </Surface>
            )}
          </View>
        )}

        {/* ── AÇÕES RÁPIDAS ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionHeader title="Ações rápidas" subtitle="O que você mais usa no dia a dia" subtitleColor={tc.muted} />
          <View style={s.qaGrid}>
            {QUICK_ACTIONS.map((qa) => (
              <QuickActionItem
                key={qa.label}
                icon={qa.icon} label={qa.label} color={qa.color} bg={qa.bg}
                dashed={!qa.screen}
                surfaceColor={tc.surface} bgColor={tc.bg}
                outlineColor={tc.outline} textColor={tc.text}
                onPress={qa.route ? () => handleQuickActionPress(qa) : undefined}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:      { flex: 1 },
  container: { paddingBottom: 32 },
  section:   { paddingHorizontal: 16 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  loadingIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, fontSize: 14 },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    minHeight: 200,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 36 : 22,
    paddingBottom: 24,
    overflow: "hidden",
    backgroundColor: NAVY,
  },
  blobOne: { position: "absolute", width: 220, height: 220, borderRadius: 999, top: -60,  right: -50, backgroundColor: "rgba(255,255,255,0.07)" },
  blobTwo: { position: "absolute", width: 160, height: 160, borderRadius: 999, bottom: -90, left: -40, backgroundColor: "rgba(255,255,255,0.05)" },

  heroTopRow:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, zIndex: 2 },
  heroIdentity:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  heroChurchLogo:{ width: 54, height: 54, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
  heroAvatarFallback: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 18, elevation: 0 },
  heroGreet:     { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600" },
  heroName:      { color: "#FFFFFF", fontWeight: "900", letterSpacing: -0.6, marginTop: 1 },
  heroMeta:      { color: "rgba(255,255,255,0.62)", marginTop: 3, fontSize: 12, fontWeight: "600" },

  heroProfileBtn:      { width: 40, height: 40, borderRadius: 13, overflow: "hidden", zIndex: 2, backgroundColor: "rgba(255,255,255,0.14)" },
  heroProfileBtnInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroUserPhoto:       { width: 40, height: 40, borderRadius: 13 },

  heroChurchProfileBtn:      { marginTop: 12, alignSelf: "flex-start", borderRadius: 999, overflow: "hidden", zIndex: 2 },
  heroChurchProfileBtnInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.12)" },
  heroChurchProfileBtnText:  { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  heroAboutWrap: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", zIndex: 2 },
  heroAbout:     { flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17, fontStyle: "italic" },

  // ── Section ────────────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 12, marginTop: 18 },
  sectionTitle:  { fontWeight: "900", letterSpacing: -0.3, color: NAVY },
  sectionSub:    { marginTop: 2, fontSize: 12, lineHeight: 17 },

  // ── Eventos carousel ───────────────────────────────────────────────────────
  carouselList:    { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 2 },
  carouselLoading: { height: 140, alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16 },
  emptyEventsPad:  { paddingHorizontal: 16, marginBottom: 8 },
  emptyEvents:     { borderRadius: 20, borderWidth: 1, padding: 22, alignItems: "center", gap: 8 },
  emptyEventsIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyEventsTitle:{ fontWeight: "900", textAlign: "center", marginTop: 8 },
  emptyEventsText: { textAlign: "center", fontSize: 13, lineHeight: 18 },

  eventCard:         { width: CARD_W, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  eventCoverWrap:    { width: "100%", height: 110, position: "relative" },
  eventCoverImage:   { width: "100%", height: 110 },
  eventCoverOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 50 },
  eventCoverGradient:{ width: "100%", height: 110, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  eventGradientBlob: { position: "absolute", width: 100, height: 100, borderRadius: 999, top: -30, right: -20, backgroundColor: "rgba(255,255,255,0.12)" },
  eventGradientIconWrap: { width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  eventDateBadgeOnImage: { position: "absolute", bottom: 8, left: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  eventDateTextOnImage:  { fontSize: 10, fontWeight: "800", color: "#fff" },
  eventStrip:    { height: 4, width: "100%" },
  eventDateBadge:{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  eventDateText: { fontSize: 11, fontWeight: "800" },
  eventBody:     { padding: 13, gap: 6 },
  eventTitle:    { fontWeight: "900", letterSpacing: -0.3, lineHeight: 20 },
  eventMeta:     { flexDirection: "row", alignItems: "center", gap: 4 },
  eventMetaText: { fontSize: 11.5, flex: 1 },
  eventFooter:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  eventChip:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  eventDot:      { width: 6, height: 6, borderRadius: 999 },
  eventChipText: { fontSize: 11, fontWeight: "700" },
  eventPast:     { fontSize: 11, fontStyle: "italic" },

  // ── News ───────────────────────────────────────────────────────────────────
  newsCard:     { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  newsLoading:  { height: 80, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  newsRow:      { paddingVertical: 0 },
  newsRowInner: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, paddingRight: 14 },
  newsBar:      { width: 3, alignSelf: "stretch", borderRadius: 999, marginLeft: 0, marginVertical: 8 },
  newsIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  newsContent:  { flex: 1, gap: 3 },
  newsTopRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  newsBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  newsBadgeText:{ fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },
  newsDate:     { fontSize: 10.5, fontWeight: "600" },
  newsTitle:    { fontWeight: "800", letterSpacing: -0.2, fontSize: 13 },
  newsBody:     { fontSize: 12, lineHeight: 17 },

  // ── Quick Actions ──────────────────────────────────────────────────────────
  qaGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  qaItem:   { width: (SCREEN_W - 32 - 30) / 4, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "transparent" },
  qaInner:  { paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", gap: 7 },
  qaIconWrap:{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qaLabel:  { fontSize: 10.5, fontWeight: "800", textAlign: "center", letterSpacing: -0.1 },

  // ── Empty / Error states ───────────────────────────────────────────────────
  emptyWrapper:      { flex: 1, padding: 16, justifyContent: "center" },
  emptyCard:         { borderWidth: 1, borderRadius: 28, padding: 22, alignItems: "center" },
  emptyCardIcon:     { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyCardTitle:    { fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  emptyCardDesc:     { marginTop: 8, textAlign: "center", lineHeight: 20 },
  emptyCardBtn:      { marginTop: 18, borderRadius: 16 },
  emptyCardBtnContent:{ height: 46, paddingHorizontal: 8 },
  errorBox:  { marginTop: 14, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, alignSelf: "stretch" },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalContainer:    { justifyContent: "flex-end", margin: 0, flex: 1 },
  modalSheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%", overflow: "hidden" },
  modalHandle:       { width: 44, height: 5, borderRadius: 999, backgroundColor: "#E0E0E0", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalStrip:        { height: 4, width: "100%" },
  modalCoverWrap:    { width: "100%", height: 160, position: "relative" },
  modalCoverImage:   { width: "100%", height: 160 },
  modalCoverOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 70 },
  modalCoverGradient:{ width: "100%", height: 120, alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  modalGradientBlob: { position: "absolute", width: 140, height: 140, borderRadius: 999, top: -50, right: -30, backgroundColor: "rgba(255,255,255,0.1)" },
  modalScroll:       { padding: 20, paddingBottom: 8, gap: 14 },
  modalTopRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  modalBadge:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  modalBadgeText:    { fontSize: 12, fontWeight: "800" },
  modalDot:          { width: 6, height: 6, borderRadius: 999 },
  modalBadgesRow:    { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modalTitle:        { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, lineHeight: 28 },
  modalAgo:          { fontSize: 12, fontWeight: "600" },
  modalAuthorRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  modalAuthorText:   { fontSize: 13 },
  modalBody:         { fontSize: 15, lineHeight: 24 },
  modalDivider:      { height: 1 },
  modalInfoList:     { gap: 12, paddingBottom: 4 },
  modalInfoRow:      { flexDirection: "row", alignItems: "center", gap: 12 },
  modalInfoIcon:     { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalInfoLabel:    { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  modalInfoValue:    { fontSize: 14, fontWeight: "600" },
  modalFooter:       { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  modalBtn:          { borderRadius: 16 },
});