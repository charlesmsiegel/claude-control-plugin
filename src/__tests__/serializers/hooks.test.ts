import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { HooksSerializer } from "../../model/serializers/hooks";
import { Scope } from "../../model/types";

describe("HooksSerializer", () => {
  let tmpDir: string;
  let scope: Scope;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
    scope = { type: "global", label: "Global", path: tmpDir };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("parses hooks from settings.json", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", command: "echo lint", timeout: 5000 }
        ],
        PostToolUse: [
          { matcher: "*", command: "echo done" }
        ]
      }
    }));

    const results = HooksSerializer.readAll(settingsPath, scope);
    expect(results).toHaveLength(2);
    expect(results[0].event).toBe("PreToolUse");
    expect(results[0].matcher).toBe("Bash");
    expect(results[0].command).toBe("echo lint");
    expect(results[1].event).toBe("PostToolUse");
  });

  it("writes a hook back into settings.json", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({ model: "sonnet" }));

    const hook = {
      id: `global:Global:hook:PreToolUse:0`,
      name: "lint",
      type: "hook" as const,
      scope,
      filePath: settingsPath,
      event: "PreToolUse",
      matcher: "Bash",
      command: "echo lint",
      timeout: 5000,
      enabled: true,
    };

    HooksSerializer.write(hook);
    const written = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    expect(written.model).toBe("sonnet");
    expect(written.hooks.PreToolUse).toHaveLength(1);
    expect(written.hooks.PreToolUse[0].command).toBe("echo lint");
  });

  it("returns empty array for file without hooks", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({}));
    const results = HooksSerializer.readAll(settingsPath, scope);
    expect(results).toHaveLength(0);
  });
});
