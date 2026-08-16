// src/utils/permissions.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilitário puro de permissões — SEM hooks.
//
// Regras principais:
// 1. OWNER sempre tem acesso total.
// 2. OWNER não depende de extraPermissions.
// 3. extraPermissions null/undefined/string JSON não pode quebrar o app.
// 4. MEMBER pode acessar/visualizar células, membros, aniversários e ministérios.
// 5. Mantém compatibilidade com imports antigos:
//    - ROLES.MEMBER / ROLE.MEMBER / USER_ROLES.MEMBER
//    - import permissions from "../utils/permissions";
//
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  MEMBER: "MEMBER",
  LEADER: "LEADER",
  ADMIN:  "ADMIN",
  OWNER:  "OWNER",
};

export const ROLE       = ROLES;
export const USER_ROLES = ROLES;

const ROLE_WEIGHT = {
  MEMBER: 1,
  LEADER: 2,
  ADMIN:  3,
  OWNER:  4,
};

export const PERMISSION_KEYS = [
  // Navegação
  "canAccessHome",
  "canAccessNews",
  "canAccessEvents",
  "canAccessMore",
  "canAccessProfile",
  "canAccessDirectory",

  // Células
  "canAccessCells",
  "canViewCellDetails",
  "canRegisterMeeting",
  "canManageCells",
  "canCreateCell",
  "canEditCell",
  "canDeleteCell",

  // Eventos
  "canViewEvents",
  "canCreateEvent",
  "canEditEvent",
  "canDeleteEvent",
  "canManageEventScales",
  "canViewEventStatistics",
  "canManageEventStatistics",

  // Avisos / Notícias
  "canViewNews",
  "canPublishNews",
  "canCreateNews",
  "canEditNews",
  "canDeleteNews",

  // Membros
  "canViewMembers",
  "canManageMembers",
  "canCreateMember",
  "canEditMember",
  "canEditMemberRole",
  "canDeleteMember",
  "canApproveMember",
  "canViewBirthdays",

  // Ministérios
  "canViewMinistries",
  "canManageMinistries",
  "canCreateMinistry",
  "canEditMinistry",
  "canDeleteMinistry",

  // Escalas
  "canAccessSchedules",
  "canManageSchedules",
  "canCreateSchedule",
  "canEditSchedule",
  "canDeleteSchedule",

  // Admin
  "canAccessAdmin",
  "canViewReports",
  "canManageChurchProfile",
  "canManagePermissions",
  "canAccessRepertoires",
  "canManageRepertoires",
  "canManageSongCatalog",
];

// ─── Normalização ─────────────────────────────────────────────────────────────

export function normalizeRole(raw) {
  const r = String(raw || "").toUpperCase().trim();
  if (r.includes("OWNER"))                                                 return ROLES.OWNER;
  if (r.includes("ADMIN"))                                                 return ROLES.ADMIN;
  if (r.includes("LEADER") || r.includes("LIDER") || r.includes("LÍDER")) return ROLES.LEADER;
  return ROLES.MEMBER;
}

export function normalizeExtraPermissions(extraPermissions = {}) {
  if (!extraPermissions) return {};
  if (typeof extraPermissions === "object" && !Array.isArray(extraPermissions)) {
    return extraPermissions;
  }
  if (typeof extraPermissions === "string") {
    try {
      const parsed = JSON.parse(extraPermissions);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      return {};
    } catch {
      return {};
    }
  }
  return {};
}

export function makeAllPermissions(value) {
  const result = {};
  for (const key of PERMISSION_KEYS) result[key] = !!value;
  return result;
}

export function applyExtraPermissions(basePermissions, extraPermissions = {}) {
  const extras = normalizeExtraPermissions(extraPermissions);
  const final  = { ...(basePermissions || {}) };
  for (const [key, val] of Object.entries(extras)) {
    if (typeof val === "boolean") final[key] = val;
  }
  return final;
}

// ─── Permissões base por role ─────────────────────────────────────────────────

function getBasePermissions(rawRole) {
  const role   = normalizeRole(rawRole);
  const weight = ROLE_WEIGHT[role] || ROLE_WEIGHT.MEMBER;

  return {
    role,
    roleWeight: weight,

    isOwner:  role === ROLES.OWNER,
    isAdmin:  weight >= ROLE_WEIGHT.ADMIN,
    isLeader: weight >= ROLE_WEIGHT.LEADER,
    isMember: true,

    // ── Navegação — todos os membros ativos ──────────────────────────────────
    canAccessHome:      true,
    canAccessNews:      true,
    canAccessEvents:    true,
    canAccessMore:      true,
    canAccessProfile:   true,
    canAccessDirectory: true,

    // ── Células ──────────────────────────────────────────────────────────────
    // MEMBER: pode acessar e visualizar (ver lista e detalhes da célula).
    // LEADER: também registra encontros/reuniões.
    // ADMIN+: gerencia (criar, editar, excluir).
    canAccessCells:     true,                           // todos os membros ativos
    canViewCellDetails: true,                           // todos os membros ativos
    canRegisterMeeting: weight >= ROLE_WEIGHT.LEADER,
    canManageCells:     weight >= ROLE_WEIGHT.ADMIN,
    canCreateCell:      weight >= ROLE_WEIGHT.ADMIN,
    canEditCell:        weight >= ROLE_WEIGHT.ADMIN,
    canDeleteCell:      weight >= ROLE_WEIGHT.ADMIN,

    // ── Eventos ───────────────────────────────────────────────────────────────
    canViewEvents:        true,                         // todos os membros ativos
    canCreateEvent:       weight >= ROLE_WEIGHT.LEADER,
    canEditEvent:         weight >= ROLE_WEIGHT.LEADER,
    canDeleteEvent:       weight >= ROLE_WEIGHT.ADMIN,
    canManageEventScales: weight >= ROLE_WEIGHT.ADMIN,
    canViewEventStatistics: weight >= ROLE_WEIGHT.ADMIN,
    canManageEventStatistics: weight >= ROLE_WEIGHT.ADMIN,

    // ── Avisos / Notícias ─────────────────────────────────────────────────────
    canViewNews:    true,                               // todos os membros ativos
    canPublishNews: weight >= ROLE_WEIGHT.LEADER,
    canCreateNews:  weight >= ROLE_WEIGHT.LEADER,
    canEditNews:    weight >= ROLE_WEIGHT.LEADER,
    canDeleteNews:  weight >= ROLE_WEIGHT.ADMIN,

    // ── Membros ───────────────────────────────────────────────────────────────
    canViewMembers:   true,                             // todos os membros ativos
    canViewBirthdays: true,                             // todos os membros ativos
    canManageMembers:  weight >= ROLE_WEIGHT.ADMIN,
    canCreateMember:   weight >= ROLE_WEIGHT.ADMIN,
    canEditMember:     weight >= ROLE_WEIGHT.ADMIN,
    canEditMemberRole: weight >= ROLE_WEIGHT.ADMIN,
    canDeleteMember:   weight >= ROLE_WEIGHT.ADMIN,
    canApproveMember:  weight >= ROLE_WEIGHT.ADMIN,

    // ── Ministérios ───────────────────────────────────────────────────────────
    // MEMBER: pode visualizar ministérios (botão nas ações rápidas da home).
    // LEADER+: gerencia.
    canViewMinistries:   true,                          // todos os membros ativos
    canManageMinistries: weight >= ROLE_WEIGHT.ADMIN,
    canCreateMinistry:   weight >= ROLE_WEIGHT.ADMIN,
    canEditMinistry:     weight >= ROLE_WEIGHT.ADMIN,
    canDeleteMinistry:   weight >= ROLE_WEIGHT.ADMIN,

    // ── Escalas ───────────────────────────────────────────────────────────────
    canAccessSchedules: weight >= ROLE_WEIGHT.LEADER,
    canManageSchedules: weight >= ROLE_WEIGHT.ADMIN,
    canCreateSchedule:  weight >= ROLE_WEIGHT.ADMIN,
    canEditSchedule:    weight >= ROLE_WEIGHT.ADMIN,
    canDeleteSchedule:  weight >= ROLE_WEIGHT.ADMIN,

    // Repertórios: consulta liberada; gestão somente por permissão individual.
    canAccessRepertoires: true,
    canManageRepertoires: role === ROLES.OWNER,
    canManageSongCatalog: role === ROLES.OWNER,

    // ── Admin ─────────────────────────────────────────────────────────────────
    canAccessAdmin:         weight >= ROLE_WEIGHT.LEADER,
    canViewReports:         weight >= ROLE_WEIGHT.ADMIN,
    canManageChurchProfile: weight >= ROLE_WEIGHT.OWNER,
    canManagePermissions:   weight >= ROLE_WEIGHT.ADMIN,
  };
}

// ─── OWNER: acesso total, ignora extraPermissions ────────────────────────────

export function getOwnerPermissions() {
  return {
    ...getBasePermissions(ROLES.OWNER),
    ...makeAllPermissions(true),
    role:       ROLES.OWNER,
    roleWeight: ROLE_WEIGHT.OWNER,
    isOwner:    true,
    isAdmin:    true,
    isLeader:   true,
    isMember:   true,
  };
}

// ─── getPermissions — ponto de entrada principal ──────────────────────────────

export function getPermissions(rawRole = ROLES.MEMBER, extraPermissions = {}) {
  const role = normalizeRole(rawRole);

  // OWNER sempre tem tudo — extraPermissions não pode bloquear o responsável
  if (role === ROLES.OWNER) return getOwnerPermissions();

  const basePermissions = getBasePermissions(role);
  return applyExtraPermissions(basePermissions, extraPermissions);
}

export const DEFAULT_PERMISSIONS = getPermissions(ROLES.MEMBER, {});

// ─── Helpers de verificação ───────────────────────────────────────────────────

export function isOwnerRole(rawRole) {
  return normalizeRole(rawRole) === ROLES.OWNER;
}

export function isAdminRole(rawRole) {
  const role = normalizeRole(rawRole);
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

export function isLeaderRole(rawRole) {
  const role = normalizeRole(rawRole);
  return role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.LEADER;
}

export function canByRole(rawRole, permissionKey, extraPermissions = {}) {
  const role = normalizeRole(rawRole);
  if (role === ROLES.OWNER) return true;
  const permissions = getPermissions(role, extraPermissions);
  return !!permissions?.[permissionKey];
}

// ─── Metadados visuais por role ───────────────────────────────────────────────

export const ROLE_META = {
  OWNER: {
    label: "Responsável",
    icon:  "crown-outline",
    color: "#F5A623",
    bg:    "#FEF5E7",
  },
  ADMIN: {
    label: "Administrador",
    icon:  "shield-outline",
    color: "#4158D0",
    bg:    "#EEF0FA",
  },
  LEADER: {
    label: "Líder",
    icon:  "account-star-outline",
    color: "#2DBF8A",
    bg:    "#E8F9F3",
  },
  MEMBER: {
    label: "Membro",
    icon:  "account-outline",
    color: "#9198B5",
    bg:    "#F5F6FA",
  },
};

// ─── Export default para compatibilidade com imports legados ──────────────────

const permissionsUtils = {
  ROLES,
  ROLE,
  USER_ROLES,
  ROLE_META,
  PERMISSION_KEYS,
  DEFAULT_PERMISSIONS,
  normalizeRole,
  normalizeExtraPermissions,
  makeAllPermissions,
  applyExtraPermissions,
  getPermissions,
  getOwnerPermissions,
  isOwnerRole,
  isAdminRole,
  isLeaderRole,
  canByRole,
};

export default permissionsUtils;
