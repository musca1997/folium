type ExtensionTab = { id?: number; url?: string };

type ExtensionApi = {
  storage: {
    local: {
      get(keys: string[], callback?: (items: Record<string, unknown>) => void): Promise<Record<string, unknown>> | void;
      set(items: Record<string, unknown>, callback?: () => void): Promise<void> | void;
    };
  };
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }, callback?: (tabs: ExtensionTab[]) => void): Promise<ExtensionTab[]> | void;
    captureVisibleTab(windowId?: number | null, options?: { format?: "jpeg" | "png"; quality?: number }, callback?: (dataUrl: string) => void): Promise<string> | void;
  };
  scripting: {
    executeScript<T>(options: { target: { tabId: number }; func: () => T }, callback?: (results: Array<{ result?: T }>) => void): Promise<Array<{ result?: T }>> | void;
  };
  runtime?: {
    lastError?: { message?: string };
  };
};

declare const chrome: ExtensionApi | undefined;
declare const browser: ExtensionApi | undefined;

interface Window {
  chrome?: ExtensionApi;
  browser?: ExtensionApi;
}
