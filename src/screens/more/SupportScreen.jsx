// src/screens/more/SupportScreen.jsx

import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Divider,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { getAuth, getIdToken } from "@react-native-firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

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
const WARNING     = "#F5A623";
const WARNING_BG  = "#FEF5E7";
const DANGER      = "#E84D4D";
const DANGER_BG   = "#FEECEC";

const WHATSAPP_NUMBER = "5551999999999"; // ← ajuste para seu número
const SUPPORT_EMAIL   = "suporte@churchapp.com.br"; // ← ajuste

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return <Text style={s.sectionLabel}>{title}</Text>;
}

function ContactCard({ icon, iconColor, iconBg, title, description, badge, onPress, last }) {
  return (
    <>
      <TouchableRipple onPress={onPress} style={s.menuRow}>
        <View style={s.menuRowInner}>
          <View style={[s.menuIcon, { backgroundColor: iconBg ?? BRAND_LIGHT }]}>
            <Icon source={icon} size={20} color={iconColor ?? BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={s.menuTitle}>{title}</Text>
              {!!badge && (
                <View style={[s.badge, { backgroundColor: iconBg }]}>
                  <Text style={[s.badgeText, { color: iconColor }]}>{badge}</Text>
                </View>
              )}
            </View>
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

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableRipple onPress={() => setOpen((v) => !v)} style={s.menuRow}>
        <View style={s.menuRowInner}>
          <View style={[s.menuIcon, { backgroundColor: BRAND_LIGHT }]}>
            <Icon source="help-circle-outline" size={20} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.menuTitle}>{question}</Text>
            {open && (
              <Text style={[s.menuDesc, { marginTop: 6, lineHeight: 19 }]}>
                {answer}
              </Text>
            )}
          </View>
          <Icon
            source={open ? "chevron-up" : "chevron-down"}
            size={20}
            color={MUTED}
          />
        </View>
      </TouchableRipple>
      <Divider style={s.divider} />
    </>
  );
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    question: "Como entro em uma célula?",
    answer:
      "Acesse a aba Células, encontre a célula desejada e peça ao líder que adicione você. Se for membro da igreja, o administrador também pode te incluir.",
  },
  {
    question: "Como confirmo minha presença em um evento?",
    answer:
      "Na tela do evento, role até a seção de escalas. Caso esteja escalado, você verá a opção de confirmar ou recusar sua participação.",
  },
  {
    question: "Não estou recebendo notificações. O que faço?",
    answer:
      "Verifique em Configurações se as notificações estão ativas. Também confira as permissões do app nas configurações do seu celular.",
  },
  {
    question: "Como altero minha foto de perfil?",
    answer:
      "Acesse Mais → Meu Perfil → Editar Perfil. Toque na foto atual e escolha uma nova imagem da galeria.",
  },
  {
    question: "Esqueci minha senha. Como recupero?",
    answer:
      "Na tela de login, toque em 'Esqueci minha senha'. Informe seu e-mail e enviaremos um link de redefinição.",
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = useAuth();

  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [msgFocus,  setMsgFocus]  = useState(false);
  const [subjFocus, setSubjFocus] = useState(false);

  // ── Ações de contato ──────────────────────────────────────────────────────

  function openWhatsApp() {
    const text = encodeURIComponent(
      `Olá! Preciso de ajuda com o ChurchApp.\n\nNome: ${me?.name ?? "Usuário"}\nE-mail: ${me?.email ?? ""}`
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`).catch(() =>
      Alert.alert("Não foi possível abrir o WhatsApp.")
    );
  }

  function openEmail() {
    const subject = encodeURIComponent("Suporte ChurchApp");
    const body = encodeURIComponent(
      `Olá,\n\nPreciso de ajuda com o ChurchApp.\n\nNome: ${me?.name ?? ""}\nE-mail: ${me?.email ?? ""}\n\nDescrição do problema:\n`
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert("Não foi possível abrir o e-mail.")
    );
  }

  // ── Envio de mensagem ─────────────────────────────────────────────────────

  async function handleSend() {
    const subjectTrim = subject.trim();
    const messageTrim = message.trim();

    if (!subjectTrim) {
      Alert.alert("Campo obrigatório", "Informe o assunto da mensagem.");
      return;
    }
    if (messageTrim.length < 20) {
      Alert.alert("Mensagem muito curta", "Descreva melhor o problema (mínimo 20 caracteres).");
      return;
    }

    try {
      setSending(true);
      const fbUser = getAuth().currentUser;
      const token  = fbUser ? await getIdToken(fbUser, false) : null;

      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subjectTrim, message: messageTrim }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSubject("");
      setMessage("");
      Alert.alert(
        "Mensagem enviada! ✓",
        "Nossa equipe responderá em breve pelo seu e-mail cadastrado.",
        [{ text: "Ok" }]
      );
    } catch (e) {
      // Fallback: abre email nativo se API falhar
      Alert.alert(
        "Erro ao enviar",
        "Não foi possível enviar pelo app. Deseja abrir o e-mail?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir e-mail", onPress: openEmail },
        ]
      );
    } finally {
      setSending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableRipple
          onPress={() => navigation.goBack()}
          borderless
          style={s.backBtn}
        >
          <Icon source="arrow-left" size={24} color={NAVY} />
        </TouchableRipple>
        <Text style={s.headerTitle}>Suporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.container, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Banner ────────────────────────────────────────────────────── */}
        <Surface elevation={0} style={[s.bannerCard, { marginTop: 16 }]}>
          <View style={s.bannerStrip} />
          <View style={s.bannerContent}>
            <View style={s.bannerIcon}>
              <Icon source="headset" size={28} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Como podemos ajudar?</Text>
              <Text style={s.bannerDesc}>
                Nossa equipe está disponível para te ajudar. Escolha o canal preferido abaixo.
              </Text>
            </View>
          </View>
        </Surface>

        {/* ── Canais de contato ─────────────────────────────────────────── */}
        <SectionLabel title="FALE CONOSCO" />
        <Surface elevation={0} style={s.card}>
          <ContactCard
            icon="whatsapp"
            iconColor={SUCCESS}
            iconBg={SUCCESS_BG}
            title="WhatsApp"
            description="Resposta rápida em horário comercial"
            badge="Recomendado"
            onPress={openWhatsApp}
          />
          <ContactCard
            icon="email-outline"
            iconColor={BRAND}
            iconBg={BRAND_LIGHT}
            title="E-mail"
            description={SUPPORT_EMAIL}
            onPress={openEmail}
            last
          />
        </Surface>

        {/* ── Formulário de contato ─────────────────────────────────────── */}
        <SectionLabel title="ENVIAR MENSAGEM" />
        <Surface elevation={0} style={s.card}>
          <View style={s.formBlock}>
            <Text style={s.formLabel}>Assunto</Text>
            <View style={[s.inputWrap, subjFocus && s.inputFocused]}>
              <TextInput
                style={s.input}
                placeholder="Ex: Problema com login, dúvida sobre célula..."
                placeholderTextColor={MUTED}
                value={subject}
                onChangeText={setSubject}
                onFocus={() => setSubjFocus(true)}
                onBlur={() => setSubjFocus(false)}
                maxLength={120}
                returnKeyType="next"
              />
            </View>

            <Text style={[s.formLabel, { marginTop: 14 }]}>Mensagem</Text>
            <View style={[s.inputWrap, s.textAreaWrap, msgFocus && s.inputFocused]}>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Descreva com detalhes o que aconteceu..."
                placeholderTextColor={MUTED}
                value={message}
                onChangeText={setMessage}
                onFocus={() => setMsgFocus(true)}
                onBlur={() => setMsgFocus(false)}
                multiline
                numberOfLines={5}
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>
            <Text style={s.charCount}>{message.length}/1000</Text>

            <TouchableRipple
              onPress={handleSend}
              disabled={sending}
              style={[s.sendBtn, sending && s.sendBtnDisabled]}
              borderless
            >
              <View style={s.sendBtnInner}>
                {sending ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Icon source="send" size={18} color="#fff" />
                )}
                <Text style={s.sendBtnText}>
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </Text>
              </View>
            </TouchableRipple>
          </View>
        </Surface>

        {/* ── Perguntas frequentes ──────────────────────────────────────── */}
        <SectionLabel title="PERGUNTAS FREQUENTES" />
        <Surface elevation={0} style={s.card}>
          {FAQ.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
          {/* Remove o último divider */}
          <View style={{ height: 1 }} />
        </Surface>

        {/* ── Horário de atendimento ────────────────────────────────────── */}
        <SectionLabel title="HORÁRIO DE ATENDIMENTO" />
        <Surface elevation={0} style={s.card}>
          <View style={s.scheduleBlock}>
            {[
              { day: "Segunda a Sexta", time: "09h às 18h" },
              { day: "Sábado",          time: "09h às 13h" },
              { day: "Domingo",         time: "Fechado" },
            ].map((item, i, arr) => (
              <React.Fragment key={item.day}>
                <View style={s.scheduleRow}>
                  <Text style={s.scheduleDay}>{item.day}</Text>
                  <Text style={[
                    s.scheduleTime,
                    item.time === "Fechado" && { color: DANGER },
                  ]}>
                    {item.time}
                  </Text>
                </View>
                {i < arr.length - 1 && <Divider style={[s.divider, { marginLeft: 0 }]} />}
              </React.Fragment>
            ))}
          </View>
        </Surface>

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

  // Banner
  bannerCard: {
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
  bannerStrip:   { height: 5, backgroundColor: NAVY },
  bannerContent: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: BRAND_LIGHT,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: { fontSize: 16, fontWeight: "900", color: NAVY, letterSpacing: -0.3 },
  bannerDesc:  { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 17 },

  // Menu row
  menuRow:      { paddingHorizontal: 16, paddingVertical: 13 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuTitle:    { fontSize: 14, fontWeight: "800", color: NAVY, letterSpacing: -0.2 },
  menuDesc:     { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },

  // Badge
  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "800" },

  // Form
  formBlock:   { padding: 16, gap: 4 },
  formLabel:   { fontSize: 12, fontWeight: "800", color: NAVY, letterSpacing: 0.2, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: "#F8F9FC",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  inputFocused: {
    borderColor: BRAND,
    backgroundColor: SURFACE,
  },
  textAreaWrap: { paddingVertical: 12 },
  input: {
    fontSize: 14,
    color: NAVY,
    padding: 0,
    margin: 0,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: MUTED,
    textAlign: "right",
    marginTop: 4,
  },
  sendBtn: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: BRAND,
    overflow: "hidden",
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.2,
  },

  // FAQ
  // (usa menuRow/menuRowInner/menuIcon/menuTitle/menuDesc acima)

  // Schedule
  scheduleBlock: { paddingHorizontal: 16, paddingVertical: 4 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  scheduleDay:  { fontSize: 14, fontWeight: "700", color: NAVY },
  scheduleTime: { fontSize: 14, fontWeight: "800", color: BRAND },
});