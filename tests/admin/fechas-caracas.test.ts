import assert from "node:assert/strict";
import { test } from "node:test";

import { fechaHoraLocalCaracas, interpretarFechaHoraCaracas } from "../../lib/format.ts";

test("fechaHoraLocalCaracas convierte a hora de Caracas", () => {
  assert.equal(fechaHoraLocalCaracas(new Date("2026-11-11T01:30:00Z")), "2026-11-10T21:30");
  assert.equal(fechaHoraLocalCaracas(new Date("2026-11-10T04:00:00Z")), "2026-11-10T00:00");
});

test("interpretarFechaHoraCaracas lee el texto como UTC-4", () => {
  assert.equal(interpretarFechaHoraCaracas("2026-11-10T21:30")?.toISOString(), "2026-11-11T01:30:00.000Z");
  assert.equal(interpretarFechaHoraCaracas("2026-13-01T00:00"), null);
  assert.equal(interpretarFechaHoraCaracas("2026-02-30T10:00"), null);
  assert.equal(interpretarFechaHoraCaracas(""), null);
  assert.equal(interpretarFechaHoraCaracas("2026-11-10"), null);
});

test("ida y vuelta sin pérdida", () => {
  assert.equal(fechaHoraLocalCaracas(interpretarFechaHoraCaracas("2026-03-05T08:07")!), "2026-03-05T08:07");
});
