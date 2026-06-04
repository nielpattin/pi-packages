import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { COMMAND_NAME, handleSimplifyCommand } from "./simplify-command.js";

export default function (pi: ExtensionAPI): void {
   pi.registerCommand(COMMAND_NAME, {
      description: "Review recently changed files for clarity, consistency, and maintainability improvements",
      handler: (args: string, ctx: ExtensionCommandContext) => handleSimplifyCommand(args, ctx, pi)
   });
}
