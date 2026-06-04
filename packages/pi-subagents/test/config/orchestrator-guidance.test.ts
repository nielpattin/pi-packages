import { describe, expect, it } from "vitest";
import { buildOrchestratorGuidance, type OrchestratorGuidanceRegistry } from "#src/config/orchestrator-guidance";
import type { AgentConfig } from "#src/types";

function agent(overrides: Partial<AgentConfig> = {}): AgentConfig {
   return {
      name: "agent",
      description: "Test agent",
      extensions: false,
      skills: false,
      systemPrompt: "",
      promptMode: "replace",
      ...overrides,
   };
}

function registry(configs: Record<string, AgentConfig>): OrchestratorGuidanceRegistry {
   return {
      reload() {},
      getAvailableTypes: () =>
         Object.entries(configs)
            .filter(([, config]) => config.enabled !== false)
            .map(([type]) => type),
      resolveAgentConfig: (type) => configs[type]!,
   };
}

describe("buildOrchestratorGuidance", () => {
   it("includes guidance only from enabled agent configs", () => {
      const guidance = buildOrchestratorGuidance(
         registry({
            disabled: agent({ name: "disabled", enabled: false, guidance: "Disabled guidance" }),
            enabled: agent({ name: "enabled", guidance: "Enabled guidance" }),
         }),
      );

      expect(guidance).toContain("Enabled guidance");
      expect(guidance).not.toContain("Disabled guidance");
      expect(guidance).not.toContain("Use Explore agents");
      expect(guidance).not.toContain("Use Plan agents");
   });

   it("returns undefined when no enabled agent has guidance", () => {
      const guidance = buildOrchestratorGuidance(
         registry({
            one: agent({ name: "one", guidance: undefined }),
            two: agent({ name: "two", guidance: "Disabled guidance", enabled: false }),
         }),
      );

      expect(guidance).toBeUndefined();
   });
});
