import type { AgentConfig } from "#src/types";

export interface OrchestratorGuidanceRegistry {
   reload(): void;
   getAvailableTypes(): string[];
   resolveAgentConfig(type: string): AgentConfig;
}

export function buildOrchestratorGuidance(registry: OrchestratorGuidanceRegistry): string | undefined {
   registry.reload();

   const sections = registry
      .getAvailableTypes()
      .map((type) => renderAgentGuidance(type, registry.resolveAgentConfig(type)))
      .filter((section): section is string => section !== undefined);

   if (sections.length === 0) return undefined;

   return [
      "## Orchestrator Mode Active",
      "",
      "Use the enabled agent guidance below to decide when to delegate work with the subagent tool.",
      "Do not assume unavailable or disabled agents exist.",
      "",
      "## Enabled Agent Guidance",
      "",
      ...sections
   ].join("\n");
}

function renderAgentGuidance(type: string, config: AgentConfig): string | undefined {
   const guidance = config.guidance?.trim();
   if (!guidance) return undefined;

   const title = config.displayName && config.displayName !== type ? `${config.displayName} (${type})` : type;
   return `### ${title}\n${guidance}`;
}
