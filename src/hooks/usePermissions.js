// src/hooks/usePermissions.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook central de permissões por role.
//
// COMO O ROLE É RESOLVIDO (em ordem de prioridade):
//   1. auth.role
//   2. auth.membership?.role
//   3. auth.activeMembership?.role
//   4. auth.churchMember?.role
//   5. auth.currentMember?.role
//   6. auth.user?.role
//   7. auth.user?.membership?.role
//   8. auth.user?.activeMembership?.role
//   9. auth.isAdmin === true  → "ADMIN"  (fallback booleano legado)
//  10. "MEMBER"               (padrão seguro)
//
// Hierarquia:  MEMBER(1) < LEADER(2) < ADMIN(3) < OWNER(4)
// Cada role herda todas as permissões dos roles abaixo.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

// ─── Constantes ───────────────────────────────────────────────────────────────
export const ROLES = {
  MEMBER: "MEMBER",
  LEADER: "LEADER",
  ADMIN:  "ADMIN",
  OWNER:  "OWNER",
};

const ROLE_WEIGHT = {
  MEMBER: 1,
  LEADER: 2,
  ADMIN:  3,
  OWNER:  4,
};

// ─── Permissões base por role (sem herança) ───────────────────────────────────
const ROLE_PERMISSIONS = {
  MEMBER: {
    canAccessHome:          true,
    canAccessNews:          true,
    canAccessEvents:        true,
    canAccessMore:          true,
    canAccessProfile:       true,
    canAccessDirectory:     true,
    canAccessCells:         false,
    canViewCellDetails:     true,
    canManageCells:         false,
    canCreateCell:          false,
    canDeleteCell:          false,
    canRegisterMeeting:     false,
    canViewEvents:          true,
    canCreateEvent:         false,
    canEditEvent:           false,
    canDeleteEvent:         false,
    canManageEventScales:   false,
    canViewNews:            true,
    canPublishNews:         false,
    canEditNews:            false,
    canDeleteNews:          false,
    canViewMembers:         false,
    canManageMembers:       false,
    canEditMemberRole:      false,
    canDeleteMember:        false,
    canApproveMember:       false,
    canViewBirthdays:       false,
    canViewMinistries:      false,
    canManageMinistries:    false,
    canCreateMinistry:      false,
    canDeleteMinistry:      false,
    canAccessSchedules:     false,
    canManageSchedules:     false,
    canAccessAdmin:         false,
    canViewReports:         false,
    canManageChurchProfile: false,
  },

  LEADER: {
    canAccessCells:         true,
    canViewCellDetails:     true,
    canRegisterMeeting:     true,
    canManageCells:         false,
    canCreateCell:          false,
    canDeleteCell:          false,
    canViewEvents:          true,
    canCreateEvent:         true,
    canEditEvent:           true,
    canDeleteEvent:         false,
    canManageEventScales:   false,
    canViewNews:            true,
    canPublishNews:         true,
    canEditNews:            true,
    canDeleteNews:          false,
    canViewMembers:         true,
    canManageMembers:       false,
    canEditMemberRole:      false,
    canDeleteMember:        false,
    canApproveMember:       false,
    canViewBirthdays:       true,
    canViewMinistries:      true,
    canManageMinistries:    false,
    canCreateMinistry:      false,
    canDeleteMinistry:      false,
    canAccessSchedules:     true,
    canManageSchedules:     false,
    canAccessAdmin:         true,
    canViewReports:         false,
    canManageChurchProfile: false,
  },

  ADMIN: {
    canAccessCells:         true,
    canViewCellDetails:     true,
    canRegisterMeeting:     true,
    canManageCells:         true,
    canCreateCell:          true,
    canDeleteCell:          true,
    canViewEvents:          true,
    canCreateEvent:         true,
    canEditEvent:           true,
    canDeleteEvent:         true,
    canManageEventScales:   true,
    canViewNews:            true,
    canPublishNews:         true,
    canEditNews:            true,
    canDeleteNews:          true,
    canViewMembers:         true,
    canManageMembers:       true,
    canEditMemberRole:      true,
    canDeleteMember:        true,
    canApproveMember:       true,
    canViewBirthdays:       true,
    canViewMinistries:      true,
    canManageMinistries:    true,
    canCreateMinistry:      true,
    canDeleteMinistry:      true,
    canAccessSchedules:     true,
    canManageSchedules:     true,
    canAccessAdmin:         true,
    canViewReports:         true,
    canManageChurchProfile: false,
  },

  OWNER: {
    canAccessHome:          true,
    canAccessNews:          true,
    canAccessEvents:        true,
    canAccessMore:          true,
    canAccessProfile:       true,
    canAccessDirectory:     true,
    canAccessCells:         true,
    canViewCellDetails:     true,
    canRegisterMeeting:     true,
    canManageCells:         true,
    canCreateCell:          true,
    canDeleteCell:          true,
    canViewEvents:          true,
    canCreateEvent:         true,
    canEditEvent:           true,
    canDeleteEvent:         true,
    canManageEventScales:   true,
    canViewNews:            true,
    canPublishNews:         true,
    canEditNews:            true,
    canDeleteNews:          true,
    canViewMembers:         true,
    canManageMembers:       true,
    canEditMemberRole:      true,
    canDeleteMember:        true,
    canApproveMember:       true,
    canViewBirthdays:       true,
    canViewMinistries:      true,
    canManageMinistries:    true,
    canCreateMinistry:      true,
    canDeleteMinistry:      true,
    canAccessSchedules:     true,
    canManageSchedules:     true,
    canAccessAdmin:         true,
    canViewReports:         true,
    canManageChurchProfile: true,
  },
};

// ─── Funções puras (fora do hook — sem hooks internos) ────────────────────────

export function normalizeRole(rawRole) {
  const r = String(rawRole || "").toUpperCase().trim();
  if (r.includes("OWNER"))                                              return ROLES.OWNER;
  if (r.includes("ADMIN"))                                              return ROLES.ADMIN;
  if (r.includes("LEADER") || r.includes("LIDER") || r.includes("LÍDER")) return ROLES.LEADER;
  return ROLES.MEMBER;
}

function resolveRoleFromAuth(auth) {
  // Percorre candidatos em ordem de prioridade
  const candidates = [
    auth?.role,
    auth?.membership?.role,
    auth?.activeMembership?.role,
    auth?.churchMember?.role,
    auth?.currentMember?.role,
    auth?.user?.role,
    auth?.user?.membership?.role,
    auth?.user?.activeMembership?.role,
  ];

  for (const candidate of candidates) {
    const str = String(candidate || "").trim();
    if (str && str !== "undefined" && str !== "null") {
      return normalizeRole(str);
    }
  }

  // Fallback: booleano legado que o AuthContext já expõe
  if (auth?.isAdmin === true) return ROLES.ADMIN;

  return ROLES.MEMBER;
}

function buildPermissions(role, extraPermissions) {
  const weight = ROLE_WEIGHT[role] || 1;

  let merged = { ...ROLE_PERMISSIONS.MEMBER };
  if (weight >= ROLE_WEIGHT.LEADER) merged = { ...merged, ...ROLE_PERMISSIONS.LEADER };
  if (weight >= ROLE_WEIGHT.ADMIN)  merged = { ...merged, ...ROLE_PERMISSIONS.ADMIN };
  if (weight >= ROLE_WEIGHT.OWNER)  merged = { ...merged, ...ROLE_PERMISSIONS.OWNER };

  if (extraPermissions && typeof extraPermissions === "object") {
    merged = { ...merged, ...extraPermissions };
  }

  return merged;
}

// ─── usePermissions ───────────────────────────────────────────────────────────

export function usePermissions() {
  // Único hook chamado — sempre, sem condições
  const auth = useAuth();

  // Derivações síncronas puras — sem hooks adicionais
  const role             = resolveRoleFromAuth(auth);
  const extraPermissions = auth?.extraPermissions || auth?.user?.extraPermissions || {};
  const permissions      = buildPermissions(role, extraPermissions);
  const roleWeight       = ROLE_WEIGHT[role] || 1;

  return {
    role,
    roleWeight,
    permissions,
    isOwner:  role === ROLES.OWNER,
    isAdmin:  roleWeight >= ROLE_WEIGHT.ADMIN,
    isLeader: roleWeight >= ROLE_WEIGHT.LEADER,
    isMember: true,
    can:     (permKey) => !!permissions[permKey],
    hasRole: (minRole) => roleWeight >= (ROLE_WEIGHT[normalizeRole(minRole)] || 1),
  };
}

// ─── Metadados visuais por role ───────────────────────────────────────────────
export const ROLE_META = {
  OWNER:  { label: "Responsável",   icon: "crown-outline",        color: "#F5A623", bg: "#FEF5E7" },
  ADMIN:  { label: "Administrador", icon: "shield-outline",       color: "#4158D0", bg: "#EEF0FA" },
  LEADER: { label: "Líder",         icon: "account-star-outline", color: "#2DBF8A", bg: "#E8F9F3" },
  MEMBER: { label: "Membro",        icon: "account-outline",      color: "#9198B5", bg: "#F5F6FA" },
};