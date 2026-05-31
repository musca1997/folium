declare namespace chrome {
  namespace storage {
    const local: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  }
  namespace tabs {
    type Tab = { id?: number; url?: string };
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
  }
  namespace scripting {
    function executeScript<T>(options: { target: { tabId: number }; func: () => T }): Promise<Array<{ result?: T }>>;
  }
}
