import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SettingsSerializer } from "../../model/serializers/settings";
import { Scope } from "../../model/types";

describe("SettingsSerializer", () => {
  let tmpDir: string;
  let scope: Scope;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
    scope = { type: "global", label: "Global", path: tmpDir };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("parses settings.json", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({
      permissions: { allow: ["Read", "Write"], deny: ["Bash"] },
      model: "claude-sonnet-4-6"
    }));

    const result = SettingsSerializer.read(settingsPath, scope);
    expect(result.type).toBe("settings");
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.permissions).toEqual({ allow: ["Read", "Write"], deny: ["Bash"] });
  });

  it("writes settings.json preserving unknown fields", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({
      permissions: { allow: ["Read"] },
      someOtherField: true
    }));

    const settings = SettingsSerializer.read(settingsPath, scope);
    settings.model = "claude-opus-4-6";
    SettingsSerializer.write(settings);

    const written = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    expect(written.model).toBe("claude-opus-4-6");
    expect(written.someOtherField).toBe(true);
  });

  it("returns empty settings for missing file", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    const result = SettingsSerializer.read(settingsPath, scope);
    expect(result.type).toBe("settings");
    expect(result.raw).toEqual({});
  });
});
