// src/components/PermissionGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Componente que condiciona a renderização de filhos com base em permissões.
// Usa o hook usePermissions internamente — sem prop drilling de role.
//
// Modos de uso:
//
//  1. Por permissão específica:
//     <PermissionGate require="canDeleteEvent">
//       <DeleteButton />
//     </PermissionGate>
//
//  2. Por role mínimo:
//     <PermissionGate minRole="ADMIN">
//       <AdminPanel />
//     </PermissionGate>
//
//  3. Por role exato:
//     <PermissionGate role="OWNER">
//       <OwnerOnlySection />
//     </PermissionGate>
//
//  4. Múltiplas permissões (AND):
//     <PermissionGate require={["canEditEvent", "canManageEventScales"]}>
//       <ScaleEditor />
//     </PermissionGate>
//
//  5. Fallback customizado:
//     <PermissionGate require="canPublishNews" fallback={<LockedCard />}>
//       <NewsComposerButton />
//     </PermissionGate>
//
//  6. Mostrar bloqueado (em vez de nada):
//     <PermissionGate require="canManageMinistries" showLocked>
//       <MinistryManagerCard />
//     </PermissionGate>
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, TouchableRipple } from "react-native-paper";
import { usePermissions } from "../hooks/usePermissions";

// ─── Design tokens (alinhados ao Design Manual) ───────────────────────────────
const MUTED      = "#9198B5";
const BORDER     = "#E4E6F0";
const WARNING    = "#F5A623";
const WARNING_BG = "#FEF5E7";

// ─── LockedPlaceholder ────────────────────────────────────────────────────────
function LockedPlaceholder({ message }) {
  return (
    <View style={styles.locked}>
      <View style={styles.lockedIconWrap}>
        <Icon source="lock-outline" size={16} color={WARNING} />
      </View>
      <Text style={styles.lockedText}>
        {message || "Você não tem permissão para acessar este recurso."}
      </Text>
    </View>
  );
}

// ─── PermissionGate ───────────────────────────────────────────────────────────
/**
 * @param {string|string[]} require   - Permissão(ões) necessárias (AND logic)
 * @param {string}          minRole   - Role mínimo necessário
 * @param {string}          role      - Role exato necessário
 * @param {ReactNode}       children  - Conteúdo a renderizar se autorizado
 * @param {ReactNode}       fallback  - O que renderizar se negado (padrão: null)
 * @param {boolean}         showLocked- Se true, mostra placeholder de bloqueado
 * @param {string}          lockedMsg - Mensagem customizada no placeholder
 */
export default function PermissionGate({
  require: requiredPerms,
  minRole,
  role: exactRole,
  children,
  fallback = null,
  showLocked = false,
  lockedMsg,
}) {
  const { can, hasRole, role: currentRole } = usePermissions();

  // Verifica permissão específica (string ou array)
  if (requiredPerms) {
    const perms = Array.isArray(requiredPerms) ? requiredPerms : [requiredPerms];
    const allowed = perms.every((p) => can(p));
    if (!allowed) {
      if (showLocked) return <LockedPlaceholder message={lockedMsg} />;
      return fallback;
    }
  }

  // Verifica role mínimo
  if (minRole) {
    if (!hasRole(minRole)) {
      if (showLocked) return <LockedPlaceholder message={lockedMsg} />;
      return fallback;
    }
  }

  // Verifica role exato
  if (exactRole) {
    if (currentRole !== exactRole.toUpperCase()) {
      if (showLocked) return <LockedPlaceholder message={lockedMsg} />;
      return fallback;
    }
  }

  return children;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  locked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: WARNING_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WARNING + "40",
    marginVertical: 4,
  },
  lockedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WARNING + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedText: {
    flex: 1,
    fontSize: 12,
    color: WARNING,
    fontWeight: "600",
    lineHeight: 16,
  },
});