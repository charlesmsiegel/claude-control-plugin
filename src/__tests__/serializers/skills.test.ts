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

  it("reads skills recursively from subdirectories", () => {
    fs.mkdirSync(path.join(tmpDir, "skills", "sub1"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "skills", "sub2", "deep"), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, "skills", "top.md"), "---\nname: top\n---\nTop");
    fs.writeFileSync(path.join(tmpDir, "skills", "sub1", "mid.md"), "---\nname: mid\n---\nMid");
    fs.writeFileSync(path.join(tmpDir, "skills", "sub2", "deep", "bottom.md"), "---\nname: bottom\n---\nBottom");

    const results = SkillsSerializer.readAll(tmpDir, scope);
    expect(results).toHaveLength(3);
    const names = results.map((r) => r.name).sort();
    expect(names).toEqual(["bottom", "mid", "top"]);
  });

  it("handles SKILL.md files in subdirectories (plugin style)", () => {
    fs.mkdirSync(path.join(tmpDir, "skills", "pdf"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "skills", "frontend-design"), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, "skills", "pdf", "SKILL.md"),
      "---\nname: pdf\n---\nPDF skill",
    );
    fs.writeFileSync(
      path.join(tmpDir, "skills", "frontend-design", "SKILL.md"),
      "---\nname: frontend-design\n---\nFrontend skill",
    );

    const results = SkillsSerializer.readAll(tmpDir, scope);
    expect(results).toHaveLength(2);
    const names = results.map((r) => r.name).sort();
    expect(names).toEqual(["frontend-design", "pdf"]);
  });

  it("handles skill without frontmatter", () => {
    const skillPath = path.join(tmpDir, "skills", "plain.md");
    fs.writeFileSync(skillPath, "Just content, no frontmatter.");

    const result = SkillsSerializer.read(skillPath, scope);
    expect(result.name).toBe("plain");
    expect(result.content).toBe("Just content, no frontmatter.");
  });
});
