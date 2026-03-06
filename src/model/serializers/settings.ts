import * as fs from "fs";
import * as path from "path";
import { SettingsConfig, Scope } from "../types";

export class SettingsSerializer {
  static read(filePath: string, scope: Scope): SettingsConfig {
    let raw: Record<string, unknown> = {};

    if (fs.existsSync(filePath)) {
      raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    return {
      id: `${scope.type}:${scope.label}:settings:main`,
      name: "settings",
      type: "settings",
      scope,
      filePath,
      permissions: raw.permissions as Record<string, string[]> | undefined,
      model: raw.model as string | undefined,
      customInstructions: raw.customInstructions as string | undefined,
      raw,
    };
  }

  static write(settings: SettingsConfig): void {
    const output = { ...settings.raw };
    if (settings.model !== undefined) output.model = settings.model;
    if (settings.permissions !== undefined) output.permissions = settings.permissions;
    if (settings.customInstructions !== undefined) output.customInstructions = settings.customInstructions;

    const dir = path.dirname(settings.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(settings.filePath, JSON.stringify(output, null, 2) + "\n");
  }
}
