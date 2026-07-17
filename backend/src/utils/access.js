const ROLE_PRIORITY = Object.freeze({
  ADMIN: 1,
  DEVELOPER: 2,
  OWNER: 3,
});

const STAFF_ROLES = Object.freeze(["ADMIN", "DEVELOPER", "OWNER"]);
const PRIVILEGED_ROLES = Object.freeze(["DEVELOPER", "OWNER"]);

function normalizeRoles(input) {
  const values = Array.isArray(input) ? input : [];
  return [...new Set(values
    .map((value) => String(value?.role || value || "").toUpperCase())
    .filter((value) => ROLE_PRIORITY[value]))];
}

function rolesFromUser(user) {
  const roles = normalizeRoles(user?.roles);
  const legacyBadges = normalizeRoles(user?.badges);
  if (String(user?.role || "").toUpperCase() === "ADMIN") legacyBadges.push("ADMIN");
  return [...new Set([...roles, ...legacyBadges])];
}

function hasAnyRole(userOrRoles, allowedRoles = STAFF_ROLES) {
  const roles = Array.isArray(userOrRoles)
    ? normalizeRoles(userOrRoles)
    : rolesFromUser(userOrRoles);
  const allowed = new Set(normalizeRoles(allowedRoles));
  return roles.some((role) => allowed.has(role));
}

function highestRole(userOrRoles) {
  const roles = Array.isArray(userOrRoles)
    ? normalizeRoles(userOrRoles)
    : rolesFromUser(userOrRoles);
  return roles.sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])[0] || "USER";
}

function canManageRole(actor, role) {
  const actorRoles = Array.isArray(actor) ? normalizeRoles(actor) : rolesFromUser(actor);
  const requestedRole = String(role || "").toUpperCase();
  if (requestedRole === "OWNER") return false;
  if (requestedRole === "DEVELOPER") return actorRoles.includes("OWNER");
  if (requestedRole === "ADMIN") {
    return actorRoles.includes("OWNER") || actorRoles.includes("DEVELOPER");
  }
  return false;
}

module.exports = {
  ROLE_PRIORITY,
  STAFF_ROLES,
  PRIVILEGED_ROLES,
  normalizeRoles,
  rolesFromUser,
  hasAnyRole,
  highestRole,
  canManageRole,
};
