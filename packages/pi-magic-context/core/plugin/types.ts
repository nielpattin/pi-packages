export interface HostPromptResponse {
   info?: {
      id?: string;
      [key: string]: unknown;
   };
   [key: string]: unknown;
}

export interface HostClient {
   session: {
      prompt(args: unknown): Promise<HostPromptResponse>;
      list(...args: unknown[]): Promise<unknown[]>;
      create(...args: unknown[]): Promise<{ id?: string; info?: { id?: string }; [key: string]: unknown }>;
      get(...args: unknown[]): Promise<unknown>;
      messages(...args: unknown[]): Promise<unknown[]>;
      delete(...args: unknown[]): Promise<unknown>;
   };
}

export interface PluginContext {
   client: HostClient;
   [key: string]: unknown;
}
