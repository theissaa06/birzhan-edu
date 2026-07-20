const test = require("node:test");
const assert = require("node:assert/strict");

const { trustedLayeroPreviewOrigin } = require("../src/server");

test("accepts only HTTPS preview origins belonging to this Layero project", () => {
  assert.equal(trustedLayeroPreviewOrigin("https://theissaa-birzhan-edu.preview.layero.ru"), true);
  assert.equal(trustedLayeroPreviewOrigin("https://theissaa-birzhan-edu-feature-oauth.preview.layero.ru"), true);
  assert.equal(trustedLayeroPreviewOrigin("http://theissaa-birzhan-edu-feature.preview.layero.ru"), false);
  assert.equal(trustedLayeroPreviewOrigin("https://another-project.preview.layero.ru"), false);
  assert.equal(trustedLayeroPreviewOrigin("https://theissaa-birzhan-edu.preview.layero.ru.attacker.example"), false);
  assert.equal(trustedLayeroPreviewOrigin("not-a-url"), false);
});
