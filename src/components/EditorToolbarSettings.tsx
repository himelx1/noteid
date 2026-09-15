/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Type,
  CaseSensitive,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Copy,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Image,
  Mic,
  ChevronUp,
  ChevronDown,
  Layout,
  SlidersHorizontal
} from "lucide-react";
import {
  ToolbarConfig,
  DEFAULT_TOOLS,
  ToolDefinition,
  loadToolbarConfig,
  saveToolbarConfig
} from "../utils/toolbarStore";

const ICON_MAP: Record<string, React.ElementType> = {
  Type,
  CaseSensitive,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Copy,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Image,
  Mic
};

export function EditorToolbarSettings() {
  const [config, setConfig] = useState<ToolbarConfig>(loadToolbarConfig);

  useEffect(() => {
    saveToolbarConfig(config);
  }, [config]);

  const toggleMode = (mode: "default" | "custom") => {
    setConfig((prev) => ({ ...prev, toolbarMode: mode }));
  };

  const toggleTool = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      enabledTools: {
        ...prev.enabledTools,
        [id]: !prev.enabledTools[id],
      },
    }));
  };

  const moveTool = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const arr = [...prev.toolsOrder];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return prev;
      const temp = arr[index];
      arr[index] = arr[newIndex];
      arr[newIndex] = temp;
      return { ...prev, toolsOrder: arr };
    });
  };

  // Helper maps for tool definitions
  const toolsMap = new Map(DEFAULT_TOOLS.map((t) => [t.id, t]));

  // Get active tools in order
  let activeToolsInOrder =
    config.toolbarMode === "default"
      ? DEFAULT_TOOLS
      : config.toolsOrder
          .map((id) => toolsMap.get(id))
          .filter((t): t is ToolDefinition => !!t && !!config.enabledTools[t.id]);

  // Fallback if custom mode has no tools enabled
  if (config.toolbarMode === "custom" && activeToolsInOrder.length === 0) {
    const boldTool = toolsMap.get("bold");
    if (boldTool) activeToolsInOrder = [boldTool];
  }

  return (
    <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
        <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
        <span>Editor Toolbar</span>
      </div>

      <p className="text-[11px] text-charcoal-400 leading-relaxed px-1">
        Choose how tools are displayed in your note editor. Switch to Custom mode to show/hide and reorder tools.
      </p>

      {/* Mode Selector */}
      <div className="flex bg-charcoal-950/45 p-1 rounded-2xl border border-charcoal-850/85">
        <button
          type="button"
          id="toolbar-mode-default"
          onClick={() => toggleMode("default")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            config.toolbarMode === "default"
              ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
              : "text-charcoal-400 hover:text-charcoal-200"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Use Default Toolbar</span>
        </button>

        <button
          type="button"
          id="toolbar-mode-custom"
          onClick={() => toggleMode("custom")}
          className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            config.toolbarMode === "custom"
              ? "bg-indigo-950/60 text-indigo-200 border border-indigo-800/60 shadow-sm"
              : "text-charcoal-400 hover:text-charcoal-200"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Use Custom Toolbar</span>
        </button>
      </div>

      {/* Custom Configuration Mode Controls */}
      {config.toolbarMode === "custom" && (
        <div className="flex flex-col gap-6 animate-fade-in pt-1">
          {/* Tools List */}
          <div className="flex flex-col gap-3 bg-charcoal-900/40 border border-charcoal-800/60 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-charcoal-400" />
                Editor Tools
              </span>
              <span className="text-[10px] text-charcoal-400 font-mono">
                Customize Order & Visibility
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {config.toolsOrder.map((id, index) => {
                const tool = toolsMap.get(id);
                if (!tool) return null;
                const IconComponent = ICON_MAP[tool.iconName] || Type;
                const isEnabled = !!config.enabledTools[id];

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isEnabled
                        ? "bg-charcoal-800/60 border-charcoal-700/60 text-charcoal-100"
                        : "bg-charcoal-900/20 border-charcoal-800/30 text-charcoal-500 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Reorder handle buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveTool(index, -1)}
                          className="p-1 rounded hover:bg-charcoal-700 text-charcoal-300 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Move Left/Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === config.toolsOrder.length - 1}
                          onClick={() => moveTool(index, 1)}
                          className="p-1 rounded hover:bg-charcoal-700 text-charcoal-300 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Move Right/Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <IconComponent className="w-4 h-4 shrink-0 text-charcoal-300" />
                      <span className="text-xs font-semibold truncate">{tool.label}</span>

                      {tool.isNew && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold tracking-wide shrink-0">
                          New
                        </span>
                      )}
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleTool(id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-charcoal-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-charcoal-400"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW BLOCK */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-charcoal-800/60">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-charcoal-300 uppercase tracking-wider">
            Live Preview
          </span>
          <span className="text-[10px] text-charcoal-500 font-mono">
            {config.toolbarMode === "default" ? "Default Mode" : "Custom Layout"}
          </span>
        </div>

        <div className="w-full bg-charcoal-900 border border-charcoal-800/80 rounded-2xl p-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-inner">
          {/* Tools Group */}
          {activeToolsInOrder.map((tool) => {
            const IconComp = ICON_MAP[tool.iconName] || Type;
            return (
              <div
                key={tool.id}
                className="p-1.5 rounded-xl bg-charcoal-800/60 text-charcoal-300 border border-charcoal-700/40 flex items-center justify-center shrink-0"
                title={tool.label}
              >
                <IconComp className="w-3.5 h-3.5" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

