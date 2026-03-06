import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import { Store } from "./model/store";
import { discoverScopes } from "./scopes";
import { ClaudeTreeProvider } from "./tree/provider";
import { PanelManager } from "./webview/panel-manager";
import { ClaudeFileWatcher } from "./watchers/file-watcher";
import { registerCommands } from "./commands";
import { Scope } from "./model/types";

// Serializers
import { SettingsSerializer } from "./model/serializers/settings";
import { HooksSerializer } from "./model/serializers/hooks";
import { SkillsSerializer } from "./model/serializers/skills";
import { CommandsSerializer } from "./model/serializers/commands";
import { McpServersSerializer } from "./model/serializers/mcp-servers";
import { AgentsSerializer } from "./model/serializers/agents";
import { ClaudeMdSerializer } from "./model/serializers/claude-md";
import { MemorySerializer } from "./model/serializers/memory";

export function activate(context: vscode.ExtensionContext) {
  const store = new Store();

  // Discover scopes
  const globalClaudeDir = path.join(os.homedir(), ".claude");
  const workspaceFolders = (vscode.workspace.workspaceFolders || []).map(
    (f) => f.uri.fsPath
  );
  const scopes = discoverScopes(globalClaudeDir, workspaceFolders);

  // Load all objects
  function loadAll() {
    store.clear();
    for (const scope of scopes) {
      loadScope(scope);
    }
    // Load memory for each workspace folder
    for (const folder of workspaceFolders) {
      const memoryScope: Scope = {
        type: "project",
        label: path.basename(folder),
        path: MemorySerializer.getMemoryDir(globalClaudeDir, folder),
      };
      const memoryFiles = MemorySerializer.readAll(globalClaudeDir, folder, memoryScope);
      memoryFiles.forEach((m) => store.set(m));
    }
  }

  function loadScope(scope: Scope) {
    // Settings
    const settingsPath = path.join(scope.path, "settings.json");
    store.set(SettingsSerializer.read(settingsPath, scope));

    // Hooks (from settings.json)
    HooksSerializer.readAll(settingsPath, scope).forEach((h) => store.set(h));

    // Skills
    SkillsSerializer.readAll(scope.path, scope).forEach((s) => store.set(s));

    // Commands
    CommandsSerializer.readAll(scope.path, scope).forEach((c) => store.set(c));

    // MCP Servers
    const mcpPath = path.join(scope.path, "mcp.json");
    McpServersSerializer.readAll(mcpPath, scope).forEach((m) => store.set(m));

    // Agents
    AgentsSerializer.readAll(scope.path, scope).forEach((a) => store.set(a));

    // CLAUDE.md files
    if (scope.type === "project") {
      // For project scopes, look in the parent directory (workspace root)
      const workspaceRoot = path.dirname(scope.path);
      ClaudeMdSerializer.findAll(workspaceRoot, scope).forEach((c) => store.set(c));
    }
  }

  // Initial load
  loadAll();

  // Tree view
  const treeProvider = new ClaudeTreeProvider(store);
  const treeView = vscode.window.createTreeView("claudeControlTree", {
    treeDataProvider: treeProvider,
  });
  context.subscriptions.push(treeView);

  // Panel manager
  const panelManager = new PanelManager(
    context.extensionUri,
    store,
    (obj) => {
      // onSave: write to disk via appropriate serializer
      switch (obj.type) {
        case "settings":
          SettingsSerializer.write(obj);
          break;
        case "hook":
          HooksSerializer.write(obj);
          break;
        case "skill":
          SkillsSerializer.write(obj);
          break;
        case "command":
          CommandsSerializer.write(obj);
          break;
        case "mcpServer":
          McpServersSerializer.write(obj);
          break;
        case "agent":
          AgentsSerializer.write(obj);
          break;
        case "claudeMd":
          ClaudeMdSerializer.write(obj);
          break;
        case "memory":
          MemorySerializer.write(obj);
          break;
      }
      store.set(obj);
      treeProvider.refresh();
      panelManager.updateAll();
    },
    (objectId) => {
      // onDelete
      const obj = store.get(objectId);
      if (obj) {
        switch (obj.type) {
          case "skill":
            SkillsSerializer.delete(obj);
            break;
          case "command":
            CommandsSerializer.delete(obj);
            break;
          case "agent":
            AgentsSerializer.delete(obj);
            break;
          case "hook":
            HooksSerializer.remove(obj);
            break;
          case "mcpServer":
            McpServersSerializer.remove(obj.name, obj.filePath);
            break;
          case "memory":
            MemorySerializer.delete(obj);
            break;
        }
        store.delete(objectId);
        treeProvider.refresh();
        panelManager.updateAll();
      }
    },
    (sourceId, targetId) => {
      // onConnect
      const source = store.get(sourceId);
      const target = store.get(targetId);
      if (source && target) {
        store.connect(sourceId, source.type, targetId, target.type);
        treeProvider.refresh();
        panelManager.updateAll();
      }
    },
    (connectionId) => {
      // onDisconnect
      store.disconnect(connectionId);
      treeProvider.refresh();
      panelManager.updateAll();
    }
  );

  // Register commands
  const reloadAll = () => {
    loadAll();
    treeProvider.refresh();
    panelManager.updateAll();
  };
  registerCommands(context, store, panelManager, treeProvider, reloadAll);

  // File watchers
  const fileWatcher = new ClaudeFileWatcher(scopes, () => {
    reloadAll();
  });
  context.subscriptions.push(fileWatcher);
  context.subscriptions.push({ dispose: () => panelManager.dispose() });

  console.log("Claude Control Plugin activated");
}

export function deactivate() {}
