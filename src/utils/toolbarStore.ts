/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ToolDefinition {
  id: string;
  label: string;
  iconName: string;
  isNew?: boolean;
}

export const DEFAULT_TOOLS: ToolDefinition[] = [
  { id: "fontSize", label: "Font Size", iconName: "Type" },
  { id: "uppercase", label: "Uppercase", iconName: "CaseSensitive" },
  { id: "bold", label: "Bold", iconName: "Bold" },
  { id: "italic", label: "Italic", iconName: "Italic" },
  { id: "underline", label: "Underline", iconName: "Underline" },
  { id: "highlight", label: "Highlight", iconName: "Highlighter" },
  { id: "smartCopy", label: "Smart Copy", iconName: "Copy" },
  { id: "bulletList", label: "Bullet List", iconName: "List" },
  { id: "numberedList", label: "Numbered List", iconName: "ListOrdered" },
  { id: "checkList", label: "Checklist", iconName: "ListTodo" },
  { id: "quote", label: "Quote", iconName: "Quote" },
  { id: "codeBlock", label: "Code Block", iconName: "Code" },
  { id: "divider", label: "Divider", iconName: "Minus" },
  { id: "alignLeft", label: "Align Left", iconName: "AlignLeft" },
  { id: "alignCenter", label: "Align Center", iconName: "AlignCenter" },
  { id: "alignRight", label: "Align Right", iconName: "AlignRight" },
  { id: "table", label: "Table", iconName: "Table" },
  { id: "image", label: "Image", iconName: "Image" },
  { id: "voice", label: "Voice", iconName: "Mic" },
];

export interface ToolbarConfig {
  toolbarMode: "default" | "custom";
  toolsOrder: string[];
  enabledTools: Record<string, boolean>;
}

const STORAGE_KEY = "noteid_toolbar_config";

export function getDefaultToolbarConfig(): ToolbarConfig {
  const enabledTools: Record<string, boolean> = {};
  DEFAULT_TOOLS.forEach((t) => {
    enabledTools[t.id] = true;
  });

  return {
    toolbarMode: "default",
    toolsOrder: DEFAULT_TOOLS.map((t) => t.id),
    enabledTools,
  };
}

export function loadToolbarConfig(): ToolbarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultToolbarConfig();
    const parsed = JSON.parse(raw);

    const defaultConfig = getDefaultToolbarConfig();

    // Support migration from prior format (otherToolsOrder / enabledOtherTools)
    const rawOrder: string[] = parsed.toolsOrder || parsed.otherToolsOrder || [];
    const rawEnabled: Record<string, boolean> = parsed.enabledTools || parsed.enabledOtherTools || {};

    const validDefaultIds = new Set(DEFAULT_TOOLS.map((t) => t.id));
    const sanitizedOrder = rawOrder.filter((id) => validDefaultIds.has(id));
    const existingIds = new Set(sanitizedOrder);
    const missing = DEFAULT_TOOLS.filter((t) => !existingIds.has(t.id));

    const toolsOrder = [...sanitizedOrder, ...missing.map((t) => t.id)];
    const enabledTools = { ...defaultConfig.enabledTools, ...rawEnabled };

    // In custom mode, newly added missing tools are disabled by default
    missing.forEach((t) => {
      if (rawEnabled[t.id] === undefined) {
        enabledTools[t.id] = false;
      }
    });

    return {
      toolbarMode: parsed.toolbarMode === "custom" ? "custom" : "default",
      toolsOrder,
      enabledTools,
    };
  } catch (e) {
    return getDefaultToolbarConfig();
  }
}

export function saveToolbarConfig(config: ToolbarConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Dispatch a custom event so open editors update instantly
    window.dispatchEvent(new Event("toolbar_config_changed"));
  } catch (e) {
    console.error("Failed to save toolbar config", e);
  }
}

