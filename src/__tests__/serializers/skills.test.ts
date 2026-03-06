import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SkillsSerializer } from "../../model/serializers/skills";
import { Scope } from "../../model/types";

describe("SkillsSerializer", () => {
  let tmpDir: string;
  let scope: Scope;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
    fs.mkdirSync(path.join(tmpDir, "skills"), { recursive: true });
    scope = { type: "global", label: "Global", path: tmpDir };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("reads a skill markdown file", () => {
    const skillPath = path.join(tmpDir, "skills", "tdd.md");
    fs.writeFileSync(skillPath, [
      "---",
      "name: tdd",
      "description: Test-driven development workflow",
      "---",
      "",
      "# TDD Skill",
      "",
      "Write tests first.",
    ].join("\n"));

    const result = SkillsSerializer.read(skillPath, scope);
    expect(result.type).toBe("skill");
    expect(result.name).toBe("tdd");
    expect(result.description).toBe("Test-driven development workflow");
    expect(result.content).toContain("# TDD Skill");
  });

  it("reads all skills from a directory", () => {
    fs.writeFileSync(path.join(tmpDir, "skills", "a.md"), "---\nname: a\n---\nContent A");
    fs.writeFileSync(path.join(tmpDir, "skills", "b.md"), "---\nname: b\n---\nContent B");

    const results = SkillsSerializer.readAll(tmpDir, scope);
    expect(results).toHaveLength(2);
  });

  it("writes a skill to markdown", () => {
    const skillPath = path.join(tmpDir, "skills", "new.md");
    SkillsSerializer.write({
      id: "global:Global:skill:new",
      name: "new",
      type: "skill",
      scope,
      filePath: skillPath,
      description: "A new skill",
      content: "# New\n\nDo things.",
    });

    const written = fs.readFileSync(skillPath, "utf-8");
    expect(written).toContain("name: new");
    expect(written).toContain("description: A new skill");
    expect(written).toContain("# New");
  });

  it("handles skill without frontmatter", () => {
    const skillPath = path.join(tmpDir, "skills", "plain.md");
    fs.writeFileSync(skillPath, "Just content, no frontmatter.");

    const result = SkillsSerializer.read(skillPath, scope);
    expect(result.name).toBe("plain");
    expect(result.content).toBe("Just content, no frontmatter.");
  });
});
