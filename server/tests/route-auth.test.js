import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve("src/routes");

function readRoute(fileName) {
  return fs.readFileSync(path.join(routesDir, fileName), "utf8");
}

function assertContainsAll(fileName, patterns) {
  const source = readRoute(fileName);
  for (const pattern of patterns) {
    assert.match(source, pattern, `${fileName} should contain ${pattern}`);
  }
}

test("risky shop-scoped routes declare Clerk and shop authorization middleware", () => {
  assertContainsAll("inventory.js", [
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requireScope\("inventory"\)/,
  ]);

  assertContainsAll("business-rules.js", [
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requireScope\("business"\)/,
  ]);

  assertContainsAll("payment-methods.js", [
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requireScope\("pos"\)/,
    /requireScope\("payments"\)/,
  ]);

  assertContainsAll("email-receipts.js", [
    /router\.post\(\s*[\r\n]*\s*"\/send"/,
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requireScope\("receipts"\)/,
  ]);

  assertContainsAll("sms-receipts.js", [
    /router\.post\(\s*[\r\n]*\s*"\/send"/,
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requireScope\("receipts"\)/,
  ]);

  assertContainsAll("receipts.js", [
    /router\.post\(\s*[\r\n]*\s*"\/mint-token"/,
    /requireClerkSession/,
    /requireShopBody/,
    /loadShopAuth/,
    /requirePosOrReceipts/,
    /scopeAllows\(req\.shopAuth\?\.scope,\s*"pos"\)/,
    /scopeAllows\(req\.shopAuth\?\.scope,\s*"receipts"\)/,
  ]);

  assertContainsAll("shop.js", [
    /requireClerkSession/,
    /requireShopReadAccess/,
    /memberCanAccessShop/,
  ]);
});

test("public receipt token lookup remains explicitly anonymous", () => {
  const source = readRoute("email-receipts.js");
  assert.match(source, /router\.get\("\/public\/:token"/);
});
