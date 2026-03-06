import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AgentsSerializer } from "../../model/serializers/agents";
import { AgentConfig, Scope } from "../../model/types";

describe("AgentsSerializer", () => {
  let tmpDir: string;
  let scope: Scope;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
    fs.mkdirSync(path.join(tmpDir, "agents"), { recursive: true });
    scope = { type: "global", label: "Global", path: tmpDir };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("reads a YAML agent file with all fields", () => {
    const agentPath = path.join(tmpDir, "agents", "dev-agent.yml");
    fs.writeFileSync(
      agentPath,
      [
        "name: dev-agent",
        "model: claude-opus-4-6",
        "instructions: You are a development assistant",
        "permissions:",
        "  - Read",
        "  - Write",
        "  - Bash",
        "skills:",
        "  - global:Global:skill:tdd",
        "hooks:",
        "  - global:Global:hook:PreToolUse:0",
        "mcpServers:",
        "  - global:Global:mcpServer:github",
        "claudeMdFiles:",
        "  - project:myproject:claudeMd:root",
      ].join("\n")
    );

    const result = AgentsSerializer.read(agentPath, scope);

    expect(result.type).toBe("agent");
    expect(result.id).toBe("global:Global:agent:dev-agent");
    expect(result.name).toBe("dev-agent");
    expect(result.model).toBe("claude-opus-4-6");
    expect(result.instructions).toBe("You are a development assistant");
    expect(result.permissions).toEqual(["Read", "Write", "Bash"]);
    expect(result.skills).toEqual(["global:Global:skill:tdd"]);
    expect(result.hooks).toEqual(["global:Global:hook:PreToolUse:0"]);
    expect(result.mcpServers).toEqual(["global:Global:mcpServer:github"]);
    expect(result.claudeMdFiles).toEqual(["project:myproject:claudeMd:root"]);
    expect(result.scope).toBe(scope);
    expect(result.filePath).toBe(agentPath);
  });

  it("reads a minimal agent file (name only)", () => {
    const agentPath = path.join(tmpDir, "agents", "minimal.yml");
    fs.writeFileSync(agentPath, "name: minimal\n");

    const result = AgentsSerializer.read(agentPath, scope);

    expect(result.type).toBe("agent");
    expect(result.id).toBe("global:Global:agent:minimal");
    expect(result.name).toBe("minimal");
    expect(result.model).toBeUndefined();
    expect(result.instructions).toBeUndefined();
    expect(result.permissions).toBeUndefined();
    expect(result.skills).toBeUndefined();
    expect(result.hooks).toBeUndefined();
    expect(result.mcpServers).toBeUndefined();
    expect(result.claudeMdFiles).toBeUndefined();
  });

  it("writes an agent back to YAML", () => {
    const agentPath = path.join(tmpDir, "agents", "written.yml");
    const agent: AgentConfig = {
      id: "global:Global:agent:written",
      name: "written",
      type: "agent",
      scope,
      filePath: agentPath,
      model: "claude-opus-4-6",
      instructions: "Be helpful",
      permissions: ["Read", "Write"],
      skills: ["global:Global:skill:tdd"],
      hooks: ["global:Global:hook:PreToolUse:0"],
      mcpServers: ["global:Global:mcpServer:github"],
      claudeMdFiles: ["project:myproject:claudeMd:root"],
    };

    AgentsSerializer.write(agent);

    const written = fs.readFileSync(agentPath, "utf-8");
    expect(written).toContain("name: written");
    expect(written).toContain("model: claude-opus-4-6");
    expect(written).toContain("instructions: Be helpful");
    expect(written).toContain("- Read");
    expect(written).toContain("- Write");
    expect(written).toContain("- global:Global:skill:tdd");
    expect(written).toContain("- global:Global:hook:PreToolUse:0");
    expect(written).toContain("- global:Global:mcpServer:github");
    expect(written).toContain("- project:myproject:claudeMd:root");
  });

  it("round-trips preserving all fields", () => {
    const agentPath = path.join(tmpDir, "agents", "roundtrip.yml");
    const original: AgentConfig = {
      id: "global:Global:agent:roundtrip",
      name: "roundtrip",
      type: "agent",
      scope,
      filePath: agentPath,
      model: "claude-opus-4-6",
      instructions: "You are a roundtrip test agent",
      permissions: ["Read", "Write", "Bash"],
      skills: ["global:Global:skill:tdd", "global:Global:skill:refactor"],
      hooks: ["global:Global:hook:PreToolUse:0"],
      mcpServers: ["global:Global:mcpServer:github"],
      claudeMdFiles: ["project:myproject:claudeMd:root"],
    };

    AgentsSerializer.write(original);
    const restored = AgentsSerializer.read(agentPath, scope);

    expect(restored.id).toBe(original.id);
    expect(restored.name).toBe(original.name);
    expect(restored.type).toBe(original.type);
    expect(restored.model).toBe(original.model);
    expect(restored.instructions).toBe(original.instructions);
    expect(restored.permissions).toEqual(original.permissions);
    expect(restored.skills).toEqual(original.skills);
    expect(restored.hooks).toEqual(original.hooks);
    expect(restored.mcpServers).toEqual(original.mcpServers);
    expect(restored.claudeMdFiles).toEqual(original.claudeMdFiles);
  });

  it("reads all agents from a directory", () => {
    fs.writeFileSync(
      path.join(tmpDir, "agents", "a.yml"),
      "name: a\nmodel: claude-opus-4-6\n"
    );
    fs.writeFileSync(
      path.join(tmpDir, "agents", "b.yml"),
      "name: b\ninstructions: Do B\n"
    );
    // Non-yml file should be ignored
    fs.writeFileSync(
      path.join(tmpDir, "agents", "ignore.txt"),
      "not an agent"
    );

    const results = AgentsSerializer.readAll(tmpDir, scope);

    expect(results).toHaveLength(2);
    const names = results.map((r) => r.name).sort();
    expect(names).toEqual(["a", "b"]);
  });

  it("handles missing agents directory gracefully", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-empty-"));

    const results = AgentsSerializer.readAll(emptyDir, scope);

    expect(results).toEqual([]);
    fs.rmSync(emptyDir, { recursive: true });
  });

  it("handles missing file gracefully", () => {
    const nonexistent = path.join(tmpDir, "agents", "nonexistent.yml");
    expect(() => AgentsSerializer.read(nonexistent, scope)).toThrow();
  });

  it("deletes an agent file", () => {
    const agentPath = path.join(tmpDir, "agents", "to-delete.yml");
    fs.writeFileSync(agentPath, "name: to-delete\n");
    expect(fs.existsSync(agentPath)).toBe(true);

    AgentsSerializer.delete({
      id: "global:Global:agent:to-delete",
      name: "to-delete",
      type: "agent",
      scope,
      filePath: agentPath,
    });

    expect(fs.existsSync(agentPath)).toBe(false);
  });

  it("delete handles already-removed file gracefully", () => {
    const agentPath = path.join(tmpDir, "agents", "already-gone.yml");

    expect(() =>
      AgentsSerializer.delete({
        id: "global:Global:agent:already-gone",
        name: "already-gone",
        type: "agent",
        scope,
        filePath: agentPath,
      })
    ).not.toThrow();
  });

  it("creates parent directories when writing", () => {
    const deepPath = path.join(tmpDir, "new-dir", "agents", "deep.yml");
    const agent: AgentConfig = {
      id: "global:Global:agent:deep",
      name: "deep",
      type: "agent",
      scope,
      filePath: deepPath,
    };

    AgentsSerializer.write(agent);

    expect(fs.existsSync(deepPath)).toBe(true);
    const restored = AgentsSerializer.read(deepPath, scope);
    expect(restored.name).toBe("deep");
  });

  it("uses filename as name when name field is missing", () => {
    const agentPath = path.join(tmpDir, "agents", "from-filename.yml");
    fs.writeFileSync(agentPath, "model: claude-opus-4-6\n");

    const result = AgentsSerializer.read(agentPath, scope);

    expect(result.name).toBe("from-filename");
    expect(result.id).toBe("global:Global:agent:from-filename");
  });

  it("generates correct ID for project scope", () => {
    const projectScope: Scope = {
      type: "project",
      label: "myproject",
      path: tmpDir,
    };
    const agentPath = path.join(tmpDir, "agents", "proj-agent.yml");
    fs.writeFileSync(agentPath, "name: proj-agent\n");

    const result = AgentsSerializer.read(agentPath, projectScope);

    expect(result.id).toBe("project:myproject:agent:proj-agent");
  });
});
