import * as fs from "fs";
import * as path from "path";
import { parse, stringify } from "yaml";
import { AgentConfig, Scope } from "../types";

interface AgentYaml {
  name?: string;
  model?: string;
  instructions?: string;
  permissions?: string[];
  skills?: string[];
  hooks?: string[];
  mcpServers?: string[];
  claudeMdFiles?: string[];
}

export class AgentsSerializer {
  static read(filePath: string, scope: Scope): AgentConfig {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: AgentYaml = parse(raw) ?? {};
    const fileName = path.basename(filePath, ".yml");
    const name = parsed.name || fileName;

    return {
      id: `${scope.type}:${scope.label}:agent:${name}`,
      name,
      type: "agent",
      scope,
      filePath,
      model: parsed.model,
      instructions: parsed.instructions,
      permissions: parsed.permissions,
      skills: parsed.skills,
      hooks: parsed.hooks,
      mcpServers: parsed.mcpServers,
      claudeMdFiles: parsed.claudeMdFiles,
    };
  }

  static readAll(claudeDir: string, scope: Scope): AgentConfig[] {
    const agentsDir = path.join(claudeDir, "agents");
    if (!fs.existsSync(agentsDir)) return [];

    return fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith(".yml"))
      .map((f) => AgentsSerializer.read(path.join(agentsDir, f), scope));
  }

  static write(agent: AgentConfig): void {
    const data: AgentYaml = { name: agent.name };

    if (agent.model) data.model = agent.model;
    if (agent.instructions) data.instructions = agent.instructions;
    if (agent.permissions) data.permissions = agent.permissions;
    if (agent.skills) data.skills = agent.skills;
    if (agent.hooks) data.hooks = agent.hooks;
    if (agent.mcpServers) data.mcpServers = agent.mcpServers;
    if (agent.claudeMdFiles) data.claudeMdFiles = agent.claudeMdFiles;

    const dir = path.dirname(agent.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(agent.filePath, stringify(data));
  }

  static delete(agent: AgentConfig): void {
    if (fs.existsSync(agent.filePath)) fs.unlinkSync(agent.filePath);
  }
}
