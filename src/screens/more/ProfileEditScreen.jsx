// src/screens/more/ProfileEditScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import storage from "@react-native-firebase/storage";
import { getAuth, updateProfile } from "@react-native-firebase/auth";
import { useIsFocused } from "@react-navigation/native";
import ImagePicker from "react-native-image-crop-picker";

import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Design Tokens
// ============================================================================
const DS = {
  colors: {
    primary: "#1CA7D1",
    primaryDark: "#177E9C",
    accent: "#46BCB1",
    bg: "#F5F7FB",
    card: "#FFFFFF",
    text: "#333F42",
    textMuted: "#707D80",
    border: "#DFE1E1",
    tintBlue: "#E3F7FC",
    danger: "#F95F5C",
    success: "#1DB954",
    warning: "#F3B43A",
  },
  radius: {
    card: 18,
    pill: 999,
  },
  space: (n) => n * 8,
};

// ============================================================================
// Utils
// ============================================================================
const safeStr = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return text.trim();
};

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && safeStr(value) !== "") {
      return value;
    }
  }

  return "";
}

function normalizeDateOnlyUTCNoon(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  }

  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  );
}

function formatDatePTBR(value) {
  if (!value) return "";

  const safe = normalizeDateOnlyUTCNoon(value);

  return safe.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseBirthDate(value) {
  if (!value) return normalizeDateOnlyUTCNoon(new Date());

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((item) => parseInt(item, 10));

    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return normalizeDateOnlyUTCNoon(value);
  }

  return normalizeDateOnlyUTCNoon(value);
}

function birthDateToISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  return normalizeDateOnlyUTCNoon(date).toISOString();
}

function normalizeRole(roleRaw) {
  const role = safeStr(roleRaw).toUpperCase();

  if (role.includes("OWNER")) {
    return {
      label: "Dono",
      icon: "crown",
    };
  }

  if (role.includes("ADMIN")) {
    return {
      label: "Administrador",
      icon: "shield-account",
    };
  }

  if (role.includes("LEADER") || role.includes("LÍDER") || role.includes("LIDER")) {
    return {
      label: "Líder",
      icon: "account-star",
    };
  }

  if (role.includes("MEMBER") || role.includes("MEMBRO")) {
    return {
      label: "Membro",
      icon: "account",
    };
  }

  if (role.includes("OBREIRO") || role.includes("WORKER")) {
    return {
      label: "Obreiro",
      icon: "account-hard-hat",
    };
  }

  return {
    label: safeStr(roleRaw) || "Membro",
    icon: "account",
  };
}

function normalizeStatus(statusRaw) {
  const status = safeStr(statusRaw).toUpperCase();

  if (
    status.includes("ACTIVE") ||
    status.includes("ATIVO") ||
    status.includes("APROVADO")
  ) {
    return {
      label: "Ativo",
      isActive: true,
      icon: "check-circle",
    };
  }

  if (
    status.includes("PENDING") ||
    status.includes("PENDENTE") ||
    status.includes("AGUARDANDO")
  ) {
    return {
      label: "Pendente",
      isActive: false,
      icon: "clock-outline",
    };
  }

  if (status.includes("BLOCKED") || status.includes("BLOQUEADO")) {
    return {
      label: "Bloqueado",
      isActive: false,
      icon: "close-circle",
    };
  }

  if (status.includes("INACTIVE") || status.includes("INATIVO")) {
    return {
      label: "Inativo",
      isActive: false,
      icon: "minus-circle",
    };
  }

  return {
    label: safeStr(statusRaw) || "Ativo",
    isActive: true,
    icon: "check-circle",
  };
}

function normalizeCell(me) {
  const raw = me?.cell ?? me?.myCell ?? me?.celula ?? me?.cellMembership ?? null;

  const name =
    safeStr(raw?.name) ||
    safeStr(raw?.nome) ||
    safeStr(me?.cellName) ||
    safeStr(me?.cell?.name) ||
    "";

  const day =
    safeStr(raw?.day) ||
    safeStr(raw?.dia) ||
    safeStr(raw?.meetingDay) ||
    safeStr(raw?.meetingTime) ||
    safeStr(me?.cellDay) ||
    safeStr(me?.cell?.day) ||
    "";

  return {
    name,
    day,
    raw,
  };
}

function normalizeProfileData(me, firebaseUser) {
  const name = pickFirst(
    me?.name,
    me?.fullName,
    me?.displayName,
    firebaseUser?.displayName,
    "Usuário"
  );

  const email = pickFirst(me?.email, firebaseUser?.email);

  const photoUrl = pickFirst(
    me?.photoUrl,
    me?.photoURL,
    me?.avatarUrl,
    firebaseUser?.photoURL
  );

  const phone = pickFirst(me?.phone, me?.whatsapp, me?.cellphone, me?.mobile);

  const birth = pickFirst(
    me?.birthday,
    me?.birthDate,
    me?.birthdate,
    me?.birthDay
  );

  const city = pickFirst(me?.city, me?.addressCity);

  const neighborhood = pickFirst(
    me?.neighborhood,
    me?.addressNeighborhood,
    me?.district
  );

  const street = pickFirst(me?.street, me?.addressStreet);

  const number = pickFirst(me?.number, me?.addressNumber);

  const roleNorm = normalizeRole(me?.role);
  const statusNorm = normalizeStatus(me?.status);
  const cell = normalizeCell(me);

  return {
    id: pickFirst(me?.id, me?.userId, firebaseUser?.uid),
    name: safeStr(name),
    email: safeStr(email),
    photoUrl: safeStr(photoUrl),
    phone: safeStr(phone),
    birth: birth || null,
    city: safeStr(city),
    neighborhood: safeStr(neighborhood),
    street: safeStr(street),
    number: safeStr(number),
    role: roleNorm.label,
    roleIcon: roleNorm.icon,
    status: statusNorm.label,
    statusIcon: statusNorm.icon,
    isActive: statusNorm.isActive,
    cell,
  };
}

function makeSnapshot({
  name,
  phone,
  photoUrl,
  dateOfBirth,
  city,
  neighborhood,
  street,
  number,
}) {
  return {
    name: safeStr(name),
    phone: safeStr(phone),
    photoUrl: safeStr(photoUrl),
    birthday: birthDateToISO(dateOfBirth),
    city: safeStr(city),
    neighborhood: safeStr(neighborhood),
    street: safeStr(street),
    number: safeStr(number),
  };
}

// ============================================================================
// UI Helpers
// ============================================================================
function CardView({ children, style }) {
  return <View style={[styles.cardBase, style]}>{children}</View>;
}

function IconCircle({ name, size = 44, bg, color = "#fff" }) {
  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={name}
        size={Math.round(size * 0.52)}
        color={color}
      />
    </View>
  );
}

function Chip({ icon, label, tone = "default", style }) {
  const toneStyle =
    tone === "success"
      ? {
          backgroundColor: "#EAF8F0",
          borderColor: "#CDEEDD",
          textColor: DS.colors.success,
        }
      : tone === "danger"
      ? {
          backgroundColor: "#FFF1F1",
          borderColor: "#FFD4D4",
          textColor: DS.colors.danger,
        }
      : tone === "warning"
      ? {
          backgroundColor: "#FFF7E7",
          borderColor: "#FFE2A8",
          textColor: DS.colors.warning,
        }
      : {
          backgroundColor: DS.colors.tintBlue,
          borderColor: "#CDECF5",
          textColor: DS.colors.primaryDark,
        };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
        },
        style,
      ]}
    >
      {!!icon && (
        <MaterialCommunityIcons name={icon} size={16} color={toneStyle.textColor} />
      )}

      <Text
        style={[
          styles.chipText,
          {
            color: toneStyle.textColor,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled, loading, style }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnPrimary,
        disabled && {
          opacity: 0.6,
        },
        pressed &&
          !disabled && {
            opacity: 0.92,
          },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnPrimaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

function OutlineButton({ title, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={disabled ? null : onPress}
      style={({ pressed }) => [
        styles.btnOutline,
        disabled && {
          opacity: 0.6,
        },
        pressed &&
          !disabled && {
            opacity: 0.86,
          },
        style,
      ]}
    >
      <Text style={styles.btnOutlineText}>{title}</Text>
    </Pressable>
  );
}

function SimpleField({
  label,
  value,
  setValue,
  error,
  setError,
  setSaved,
  keyboardType,
  autoCapitalize = "words",
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setSaved(false);

            if (error) {
              setError("");
            }
          }}
          placeholder={`Digite ${label.toLowerCase()}`}
          placeholderTextColor={DS.colors.textMuted}
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

// ============================================================================
// Screen
// ============================================================================
export default function ProfileEditScreen({ navigation }) {
  const authCtx = useAuth();
  const isFocused = useIsFocused();
  const firebaseUser = getAuth().currentUser;
  const mounted = useRef(true);

  const fallbackProfile = useMemo(() => {
    return normalizeProfileData(authCtx?.me || authCtx?.user || {}, firebaseUser);
  }, [
    authCtx?.me,
    authCtx?.user,
    firebaseUser?.displayName,
    firebaseUser?.email,
    firebaseUser?.photoURL,
    firebaseUser?.uid,
  ]);

  const [initialSnapshot, setInitialSnapshot] = useState(() => ({
    name: fallbackProfile.name,
    phone: fallbackProfile.phone,
    photoUrl: fallbackProfile.photoUrl,
    birthday: birthDateToISO(parseBirthDate(fallbackProfile.birth || Date.now())),
    city: fallbackProfile.city,
    neighborhood: fallbackProfile.neighborhood,
    street: fallbackProfile.street,
    number: fallbackProfile.number,
  }));

  const [name, setName] = useState(fallbackProfile.name);
  const [phone, setPhone] = useState(fallbackProfile.phone);
  const [photoUrlOrPath, setPhotoUrlOrPath] = useState(fallbackProfile.photoUrl);
  const [dateOfBirth, setDateOfBirth] = useState(() =>
    parseBirthDate(fallbackProfile.birth || Date.now())
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [city, setCity] = useState(fallbackProfile.city);
  const [neighborhood, setNeighborhood] = useState(fallbackProfile.neighborhood);
  const [street, setStreet] = useState(fallbackProfile.street);
  const [number, setNumber] = useState(fallbackProfile.number);

  const [email, setEmail] = useState(fallbackProfile.email);
  const [roleLabel, setRoleLabel] = useState(fallbackProfile.role);
  const [roleIcon, setRoleIcon] = useState(fallbackProfile.roleIcon);
  const [statusLabel, setStatusLabel] = useState(fallbackProfile.status);
  const [statusIcon, setStatusIcon] = useState(fallbackProfile.statusIcon);
  const [isActive, setIsActive] = useState(fallbackProfile.isActive);
  const [cell, setCell] = useState(fallbackProfile.cell);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const applyProfileToState = useCallback((profile) => {
    const birthDate = parseBirthDate(profile.birth || Date.now());

    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setPhotoUrlOrPath(profile.photoUrl);
    setDateOfBirth(birthDate);
    setShowDatePicker(false);

    setCity(profile.city);
    setNeighborhood(profile.neighborhood);
    setStreet(profile.street);
    setNumber(profile.number);

    setRoleLabel(profile.role);
    setRoleIcon(profile.roleIcon);
    setStatusLabel(profile.status);
    setStatusIcon(profile.statusIcon);
    setIsActive(profile.isActive);
    setCell(profile.cell);

    setInitialSnapshot({
      name: profile.name,
      phone: profile.phone,
      photoUrl: profile.photoUrl,
      birthday: birthDateToISO(birthDate),
      city: profile.city,
      neighborhood: profile.neighborhood,
      street: profile.street,
      number: profile.number,
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setError("");
    setSaved(false);
    setLoadingProfile(true);

    try {
      console.log("🟦 [ProfileEditScreen] GET /users/me");

      const meData = await authCtx.apiFetchAuth("/users/me", {
        method: "GET",
      });

      console.log("🟩 [ProfileEditScreen] /users/me:", meData);

      const normalized = normalizeProfileData(meData, getAuth().currentUser);

      if (!mounted.current) return;

      applyProfileToState(normalized);
    } catch (err) {
      console.log("🟥 [ProfileEditScreen] erro ao carregar perfil:", {
        code: err?.code,
        message: err?.message,
        stack: err?.stack,
      });

      if (!mounted.current) return;

      const normalizedFallback = normalizeProfileData(
        authCtx?.me || authCtx?.user || {},
        getAuth().currentUser
      );

      applyProfileToState(normalizedFallback);

      setError(err?.message || "Não foi possível carregar seu perfil.");
    } finally {
      if (mounted.current) {
        setLoadingProfile(false);
      }
    }
  }, [applyProfileToState, authCtx]);

  useEffect(() => {
    mounted.current = true;

    if (isFocused) {
      loadProfile();
    }

    return () => {
      mounted.current = false;
    };
  }, [isFocused, loadProfile]);

  const statusTone = isActive
    ? "success"
    : statusLabel === "Pendente"
    ? "warning"
    : "danger";

  const currentSnapshot = useMemo(() => {
    return makeSnapshot({
      name,
      phone,
      photoUrl: photoUrlOrPath,
      dateOfBirth,
      city,
      neighborhood,
      street,
      number,
    });
  }, [name, phone, photoUrlOrPath, dateOfBirth, city, neighborhood, street, number]);

  const dirty = useMemo(() => {
    return (
      currentSnapshot.name !== initialSnapshot.name ||
      currentSnapshot.phone !== initialSnapshot.phone ||
      currentSnapshot.photoUrl !== initialSnapshot.photoUrl ||
      currentSnapshot.birthday !== initialSnapshot.birthday ||
      currentSnapshot.city !== initialSnapshot.city ||
      currentSnapshot.neighborhood !== initialSnapshot.neighborhood ||
      currentSnapshot.street !== initialSnapshot.street ||
      currentSnapshot.number !== initialSnapshot.number
    );
  }, [currentSnapshot, initialSnapshot]);

  const validate = useCallback(() => {
    const cleanName = safeStr(name);

    if (cleanName.length < 2) {
      return "Informe um nome válido.";
    }

    if (safeStr(phone) && safeStr(phone).length < 8) {
      return "Informe um telefone válido.";
    }

    return "";
  }, [name, phone]);

  const deleteOldPhotoIfNeeded = useCallback(async (oldUrl, newLocalPathOrUrl) => {
    if (!oldUrl) return;

    const oldIsUrl = /^https?:\/\//i.test(oldUrl);
    const newIsSameUrl = oldUrl === newLocalPathOrUrl;
    const isFirebaseStorageUrl = oldUrl.includes("firebasestorage.googleapis.com");

    if (!oldIsUrl || newIsSameUrl || !isFirebaseStorageUrl) return;

    try {
      console.log("🟨 [Storage] tentando remover foto antiga:", oldUrl);

      await storage().refFromURL(oldUrl).delete();

      console.log("🗑️ [Storage] foto antiga removida.");
    } catch (err) {
      console.log("⚠️ [Storage] não foi possível remover foto antiga. Ignorado:", {
        code: err?.code,
        message: err?.message,
      });
    }
  }, []);

  const uploadNewPhotoIfNeeded = useCallback(async (localPathOrUrl, uid) => {
    if (!localPathOrUrl) return null;

    if (/^https?:\/\//i.test(localPathOrUrl)) {
      console.log("ℹ️ [Storage] imagem já é URL, upload ignorado:", localPathOrUrl);
      return localPathOrUrl;
    }

    if (!uid) {
      throw new Error("Usuário Firebase sem UID. Faça login novamente.");
    }

    let uploadUri = localPathOrUrl;

    if (Platform.OS === "ios" && uploadUri.startsWith("file://")) {
      uploadUri = uploadUri.replace("file://", "");
    }

    const fileName = `profile-${Date.now()}.jpg`;
    const storagePath = `images/users/${uid}/${fileName}`;

    console.log("🟦 [Storage] preparando upload da foto");
    console.log("🟦 [Storage] uid:", uid);
    console.log("🟦 [Storage] uploadUri:", uploadUri);
    console.log("🟦 [Storage] storagePath:", storagePath);

    const ref = storage().ref(storagePath);

    await ref.putFile(uploadUri, {
      contentType: "image/jpeg",
    });

    const downloadUrl = await ref.getDownloadURL();

    console.log("🟩 [Storage] nova foto enviada:", downloadUrl);

    return downloadUrl;
  }, []);

  const handleImagePick = useCallback(() => {
    ImagePicker.openPicker({
      width: 600,
      height: 600,
      cropping: true,
      cropperCircleOverlay: true,
      compressImageQuality: 0.8,
      mediaType: "photo",
      includeBase64: false,
    })
      .then((image) => {
        console.log("🟦 [ImagePicker] imagem selecionada:", {
          path: image?.path,
          mime: image?.mime,
          size: image?.size,
          width: image?.width,
          height: image?.height,
        });

        setPhotoUrlOrPath(image.path);
        setSaved(false);

        if (error) {
          setError("");
        }
      })
      .catch((err) => {
        console.log("🟨 [ImagePicker] seleção cancelada ou falhou:", {
          code: err?.code,
          message: err?.message,
        });

        if (err?.code !== "E_PICKER_CANCELLED") {
          Alert.alert("Erro", "Não foi possível selecionar a imagem.");
        }
      });
  }, [error]);

  const onSave = useCallback(async () => {
    const message = validate();

    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const user = getAuth().currentUser;

      console.log("🔥 [Firebase Auth] currentUser:", {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        photoURL: user?.photoURL,
        isAnonymous: user?.isAnonymous,
      });

      if (!user?.uid) {
        throw new Error("Usuário não autenticado no Firebase. Faça login novamente.");
      }

      const oldPhotoUrl = initialSnapshot.photoUrl;
      const selectedPhoto = photoUrlOrPath;

      let finalPhotoUrl = selectedPhoto || null;

      if (selectedPhoto && !/^https?:\/\//i.test(selectedPhoto)) {
        try {
          finalPhotoUrl = await uploadNewPhotoIfNeeded(selectedPhoto, user.uid);
        } catch (uploadErr) {
          console.log("🟥 [Storage] Upload falhou:", {
            code: uploadErr?.code,
            message: uploadErr?.message,
            nativeErrorMessage: uploadErr?.nativeErrorMessage,
            serverResponse: uploadErr?.serverResponse,
            stack: uploadErr?.stack,
          });

          if (uploadErr?.code === "storage/unauthorized") {
            throw new Error(
              "Não foi possível enviar a foto. O Firebase Storage bloqueou o envio. Verifique as regras do Storage."
            );
          }

          throw new Error("Não foi possível enviar a foto. Tente novamente.");
        }
      }

      void (async () => {
        try {
          await deleteOldPhotoIfNeeded(oldPhotoUrl, finalPhotoUrl);
        } catch (err) {
          console.log("⚠️ [Storage] delete antigo ignorado:", {
            code: err?.code,
            message: err?.message,
          });
        }
      })();

      try {
        await updateProfile(user, {
          displayName: safeStr(name),
          photoURL: finalPhotoUrl || null,
        });

        console.log("✅ [Firebase Auth] updateProfile OK");
      } catch (err) {
        console.log("⚠️ [Firebase Auth] updateProfile falhou. Ignorado:", {
          code: err?.code,
          message: err?.message,
        });
      }

      const payload = {
        name: safeStr(name),
        phone: safeStr(phone) || null,
        photoUrl: finalPhotoUrl,
        birthday: birthDateToISO(dateOfBirth),
        city: safeStr(city) || null,
        neighborhood: safeStr(neighborhood) || null,
        street: safeStr(street) || null,
        number: safeStr(number) || null,
      };

      console.log("🟦 [ProfileEditScreen] PATCH /users/me payload:", payload);

      const updated = await authCtx.apiFetchAuth("/users/me", {
        method: "PATCH",
        body: payload,
      });

      console.log("🟩 [ProfileEditScreen] /users/me atualizado:", updated);

      setPhotoUrlOrPath(finalPhotoUrl || "");

      const updatedProfile = normalizeProfileData(
        {
          ...(updated || {}),
          photoUrl: finalPhotoUrl,
          name: payload.name,
          phone: payload.phone,
          birthday: payload.birthday,
          city: payload.city,
          neighborhood: payload.neighborhood,
          street: payload.street,
          number: payload.number,
        },
        getAuth().currentUser
      );

      applyProfileToState(updatedProfile);

      if (typeof authCtx?.refreshMe === "function") {
        authCtx.refreshMe().catch((err) =>
          console.log("⚠️ [ProfileEditScreen] refreshMe falhou. Ignorado:", {
            code: err?.code,
            message: err?.message,
          })
        );
      }

      setSaved(true);

      Alert.alert("Sucesso", "Dados atualizados com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation?.goBack?.(),
        },
      ]);
    } catch (err) {
      console.log("🟥 [ProfileEditScreen] erro ao salvar:", {
        code: err?.code,
        message: err?.message,
        stack: err?.stack,
      });

      setError(err?.message || "Houve um problema ao atualizar seus dados.");

      Alert.alert(
        "Erro",
        err?.message || "Houve um problema ao atualizar seus dados."
      );
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    initialSnapshot.photoUrl,
    photoUrlOrPath,
    uploadNewPhotoIfNeeded,
    deleteOldPhotoIfNeeded,
    name,
    phone,
    dateOfBirth,
    city,
    neighborhood,
    street,
    number,
    authCtx,
    applyProfileToState,
    navigation,
  ]);

  const onCancel = useCallback(() => {
    if (dirty) {
      Alert.alert("Descartar alterações?", "Você tem mudanças não salvas.", [
        {
          text: "Continuar editando",
          style: "cancel",
        },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            setName(initialSnapshot.name);
            setPhone(initialSnapshot.phone);
            setPhotoUrlOrPath(initialSnapshot.photoUrl);
            setDateOfBirth(parseBirthDate(initialSnapshot.birthday || Date.now()));

            setCity(initialSnapshot.city);
            setNeighborhood(initialSnapshot.neighborhood);
            setStreet(initialSnapshot.street);
            setNumber(initialSnapshot.number);

            setShowDatePicker(false);
            setError("");
            setSaved(false);
          },
        },
      ]);

      return;
    }

    navigation?.goBack?.();
  }, [dirty, initialSnapshot, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CardView>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Meu perfil</Text>

              <Text style={styles.heroSubtitle}>
                Atualize seus dados de usuário.
              </Text>
            </View>

            <IconCircle name="account-edit" size={46} bg={DS.colors.primary} />
          </View>

          <View style={styles.avatarRow}>
            <Pressable
              onPress={saving ? null : handleImagePick}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed &&
                  !saving && {
                    opacity: 0.92,
                  },
                saving && {
                  opacity: 0.7,
                },
              ]}
            >
              {photoUrlOrPath ? (
                <Image source={{ uri: photoUrlOrPath }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <MaterialCommunityIcons name="account" size={34} color="#fff" />
                </View>
              )}

              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 8 }}>
              <View>
                <Text
                  style={{
                    fontWeight: "900",
                    color: DS.colors.text,
                  }}
                  numberOfLines={1}
                >
                  {safeStr(name) || "Usuário"}
                </Text>

                <Text style={{ color: DS.colors.textMuted }} numberOfLines={1}>
                  {email || "—"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip icon={roleIcon} label={roleLabel || "—"} />

                <Chip
                  icon={statusIcon || (isActive ? "check-circle" : "close-circle")}
                  label={statusLabel || "—"}
                  tone={statusTone}
                />
              </View>
            </View>
          </View>
        </CardView>

        {loadingProfile && (
          <View style={styles.loadingInline}>
            <ActivityIndicator />

            <Text style={{ color: DS.colors.textMuted }}>Carregando perfil...</Text>
          </View>
        )}

        {!!error && (
          <CardView style={styles.errorCard}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <IconCircle name="alert-circle" size={36} bg={DS.colors.danger} />

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: DS.colors.text }}>
                  Atenção
                </Text>

                <Text style={{ color: DS.colors.textMuted, marginTop: 2 }}>
                  {error}
                </Text>
              </View>
            </View>
          </CardView>
        )}

        <CardView>
          <View style={{ gap: DS.space(2) }}>
            <Text style={styles.sectionTitle}>Dados</Text>

            <Text style={styles.sectionSubtitle}>
              Edite apenas o que for necessário.
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Nome</Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setSaved(false);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Digite seu nome"
                  placeholderTextColor={DS.colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>E-mail</Text>

              <View style={[styles.inputWrap, { backgroundColor: "#F3F4F6" }]}>
                <TextInput
                  value={email}
                  editable={false}
                  style={[styles.input, { color: DS.colors.textMuted }]}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Telefone</Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setSaved(false);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={DS.colors.textMuted}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Data de nascimento</Text>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [
                  styles.inputWrap,
                  pressed && {
                    opacity: 0.92,
                  },
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                ]}
              >
                <Text style={[styles.input, { flex: 1, paddingVertical: 0 }]}>
                  {formatDatePTBR(dateOfBirth) || ""}
                </Text>

                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={18}
                  color={DS.colors.textMuted}
                />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  locale="pt-BR"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }

                    if (event?.type === "dismissed") return;

                    if (selectedDate) {
                      setDateOfBirth(normalizeDateOnlyUTCNoon(selectedDate));
                      setSaved(false);

                      if (error) {
                        setError("");
                      }
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={{ marginTop: 4 }}>
              <Text style={styles.sectionTitle}>Endereço</Text>

              <Text style={styles.sectionSubtitle}>Cidade, bairro, rua e número.</Text>
            </View>

            <SimpleField
              label="Cidade"
              value={city}
              setValue={setCity}
              error={error}
              setError={setError}
              setSaved={setSaved}
            />

            <SimpleField
              label="Bairro"
              value={neighborhood}
              setValue={setNeighborhood}
              error={error}
              setError={setError}
              setSaved={setSaved}
            />

            <SimpleField
              label="Rua"
              value={street}
              setValue={setStreet}
              error={error}
              setError={setError}
              setSaved={setSaved}
            />

            <SimpleField
              label="Número"
              value={number}
              setValue={setNumber}
              error={error}
              setError={setError}
              setSaved={setSaved}
              keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              autoCapitalize="none"
            />

            {saved && (
              <View style={styles.savedBanner}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={DS.colors.success}
                />

                <Text style={{ color: DS.colors.text, fontWeight: "800" }}>
                  Alterações salvas
                </Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <OutlineButton title="Cancelar" onPress={onCancel} style={{ flex: 1 }} />

              <PrimaryButton
                title="Salvar"
                onPress={onSave}
                disabled={!dirty || saving || loadingProfile}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </CardView>

        <View style={{ height: DS.space(3) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },

  content: {
    padding: DS.space(2),
    gap: DS.space(1.5),
  },

  cardBase: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.card,
    padding: DS.space(2),
    borderWidth: 1,
    borderColor: DS.colors.border,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {
          width: 0,
          height: 6,
        },
      },
    }),
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: DS.colors.text,
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    color: DS.colors.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },

  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  avatarPressable: {
    position: "relative",
  },

  avatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ddd",
  },

  avatarFallback: {
    backgroundColor: DS.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DS.colors.card,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DS.colors.text,
  },

  sectionSubtitle: {
    color: DS.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  label: {
    color: DS.colors.text,
    fontWeight: "900",
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.card,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: DS.colors.card,
  },

  input: {
    padding: 0,
    color: DS.colors.text,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  btnPrimary: {
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
  },

  btnOutline: {
    borderWidth: 1,
    borderColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  btnOutlineText: {
    color: DS.colors.primary,
    fontWeight: "900",
  },

  errorCard: {
    borderColor: "#FFE0E0",
  },

  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7F5E1",
    backgroundColor: "#F3FFF7",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: "100%",
  },

  chipText: {
    fontWeight: "900",
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },

  kvKey: {
    color: DS.colors.textMuted,
    fontWeight: "900",
  },

  kvValue: {
    color: DS.colors.text,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
  },
});