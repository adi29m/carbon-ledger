"use client";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { View } from "./workspace";
type Summary = { view: View; period: string; supplierCount: number; documentCount: number; pending: number; missing: number; readiness: number };
type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
type ModelContext = { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> };
const views: View[] = ["overview", "suppliers", "documents", "review", "reports", "settings", "guide"];
export function useWorkspaceTools(summary: Summary, navigate: (view: View) => void) {
  const state = useRef({ summary, navigate });
  useEffect(() => { state.current = { summary, navigate }; }, [summary, navigate]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      { name: "read_cbam_workspace_summary", title: "Read workspace summary", description: "Read the currently selected demo working period, evidence counts and checklist readiness. Readiness is not regulatory compliance.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Expected an empty object."); return { ...state.current.summary, mode: "session-only demo", regulatorySubmission: false }; } },
      { name: "navigate_cbam_workspace", title: "Open a workspace section", description: "Navigate to an existing workspace section. Does not upload, review, export or submit any records.", inputSchema: { type: "object", properties: { view: { type: "string", enum: views } }, required: ["view"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected a view object."); const record = input as Record<string, unknown>; if (Object.keys(record).length !== 1 || typeof record.view !== "string" || !views.includes(record.view as View)) throw new Error("Unsupported workspace section."); const view = record.view as View; flushSync(() => state.current.navigate(view)); return { view, navigated: true }; } },
    ];
    for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional capability; visible controls remain available. */ } }
    return () => lifecycle.abort();
  }, []);
}
