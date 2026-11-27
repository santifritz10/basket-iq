import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInvitation } from "../lib/player-domain/membership-rules.js";

test("un editor no puede invitar administradores", () => {
  assert.equal(validateInvitation({ inviterLevel: "editor", relationshipType: "player", accessLevel: "admin" }).ok, false);
  assert.equal(validateInvitation({ inviterLevel: "editor", relationshipType: "coach", accessLevel: "editor" }).ok, true);
});

test("un admin sí puede, y el rol no cambia el permiso", () => {
  const r = validateInvitation({ inviterLevel: "admin", relationshipType: "player", accessLevel: "admin" });
  assert.deepEqual(r.value, { relationship_type: "player", access_level: "admin" });
  const p = validateInvitation({ inviterLevel: "admin", relationshipType: "player" });
  assert.equal(p.value.access_level, "viewer", "sin permiso explícito se invita como lector");
});

test("lectores no invitan; valores inválidos se rechazan", () => {
  assert.equal(validateInvitation({ inviterLevel: "viewer", accessLevel: "viewer" }).ok, false);
  assert.equal(validateInvitation({ inviterLevel: "admin", relationshipType: "jefe" }).ok, false);
  assert.equal(validateInvitation({ inviterLevel: "admin", accessLevel: "owner" }).ok, false);
});
