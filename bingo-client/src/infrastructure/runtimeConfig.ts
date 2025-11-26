export type RuntimeConfig = {
  socketUrl: string;
};

let cachedConfig: RuntimeConfig | null = null;
let loadingPromise: Promise<RuntimeConfig> | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = fetch("/runtime-config.json").then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load runtime config: ${response.status}`);
    }

    const config = (await response.json()) as Partial<RuntimeConfig>;

    if (!config.socketUrl) {
      throw new Error("runtime-config.json is missing a socketUrl value");
    }

    cachedConfig = { socketUrl: config.socketUrl };
    return cachedConfig;
  });

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}
