const assert = require("node:assert/strict");
const test = require("node:test");
const { canManageRole, hasAnyRole, highestRole, rolesFromUser } = require("../src/utils/access");

test("normalizes legacy and relational roles without treating Premium as a role", () => {
  assert.deepEqual(rolesFromUser({ role: "ADMIN", badges: ["DEVELOPER", "PREMIUM"], roles: [{ role: "OWNER" }] }), ["OWNER", "DEVELOPER", "ADMIN"]);
  assert.equal(highestRole(["ADMIN", "DEVELOPER"]), "DEVELOPER");
  assert.equal(hasAnyRole(["PREMIUM"]), false);
});

test("enforces the role delegation matrix", () => {
  assert.equal(canManageRole(["ADMIN"], "ADMIN"), false);
  assert.equal(canManageRole(["ADMIN"], "DEVELOPER"), false);
  assert.equal(canManageRole(["DEVELOPER"], "ADMIN"), true);
  assert.equal(canManageRole(["DEVELOPER"], "OWNER"), false);
  assert.equal(canManageRole(["OWNER"], "DEVELOPER"), true);
  assert.equal(canManageRole(["OWNER"], "OWNER"), false);
});
