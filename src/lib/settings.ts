import { prisma } from "./db";
import logger from "./logger";

// 定义默认配置
const defaultSettings = {
  ADMIN_PASSWORD_HASH: "",
  MAX_FAILURES: "3",
  HEALTH_CHECK_MODEL: "gemini-1.5-flash",
  PROXY_URL: "", // Optional proxy URL
  // Booleans are stored as strings "true" or "false"
  TOOLS_CODE_EXECUTION_ENABLED: "false",
  // JSON objects are stored as strings
  SAFETY_SETTINGS: JSON.stringify([
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ]),
  THINKING_BUDGET_MAP: JSON.stringify({}),
  ALLOWED_TOKENS: "[]",
};

// Define a more specific type for settings to help with parsing
export type ParsedSettings = {
  ADMIN_PASSWORD_HASH?: string;
  MAX_FAILURES: number;
  HEALTH_CHECK_MODEL: string;
  PROXY_URL: string;
  TOOLS_CODE_EXECUTION_ENABLED: boolean;
  SAFETY_SETTINGS: { category: string; threshold: string }[];
  THINKING_BUDGET_MAP: { [key: string]: number };
  ALLOWED_TOKENS: string[];
};

type Settings = typeof defaultSettings;
/**
 * 获取所有配置项。
 * 从数据库加载，并处理环境变量和默认值。
 * Note: Caching was removed to prevent stale data issues in serverless environments.
 */
export async function getSettings(): Promise<ParsedSettings> {
  let settingsMap = new Map<string, string>();
  try {
    const settingsFromDb = await prisma.setting.findMany();
    settingsMap = new Map(settingsFromDb.map((s) => [s.key, s.value]));
  } catch (error) {
    // This can happen on the first run if the database is not yet migrated.
    // We can safely ignore it and proceed with defaults.
    logger.warn(
      "Could not fetch settings from database, proceeding with defaults. This is expected on first run.",
      error
    );
  }

  const resolvedSettings: Settings = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    let value = settingsMap.get(key);

    if (value === undefined) {
      const envValue = process.env[key];
      if (envValue !== undefined) {
        value = envValue;
      } else {
        value = defaultSettings[key];
      }
    }
    resolvedSettings[key] = value;
  }

  return parseSettings(resolvedSettings);
}

function parseSettings(settings: Settings): ParsedSettings {
  return {
    ADMIN_PASSWORD_HASH: settings.ADMIN_PASSWORD_HASH,
    MAX_FAILURES: parseInt(settings.MAX_FAILURES, 10),
    HEALTH_CHECK_MODEL: settings.HEALTH_CHECK_MODEL,
    PROXY_URL: settings.PROXY_URL,
    TOOLS_CODE_EXECUTION_ENABLED:
      settings.TOOLS_CODE_EXECUTION_ENABLED === "true",
    SAFETY_SETTINGS: JSON.parse(settings.SAFETY_SETTINGS || "[]"),
    THINKING_BUDGET_MAP: JSON.parse(settings.THINKING_BUDGET_MAP || "{}"),
    ALLOWED_TOKENS: JSON.parse(settings.ALLOWED_TOKENS || "[]"),
  };
}

/**
 * 清空配置缓存（已废弃，因为缓存已被移除）。
 */
export function resetSettings(): void {
  // No-op, cache was removed.
}

/**
 * 更新单个配置项。
 * @param key - 配置项的键
 * @param value - 配置项的值
 */
export async function updateSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  // No need to call resetSettings() as the cache has been removed.
}

/**
 * 更新多个配置项。
 * @param settings - 一个包含要更新的配置项的键值对对象
 */
export async function updateSettings(settings: Partial<ParsedSettings>) {
  const updates = Object.entries(settings).map(([key, value]) => {
    const valueToStore =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    return prisma.setting.upsert({
      where: { key },
      update: { value: valueToStore },
      create: { key, value: valueToStore },
    });
  });
  await prisma.$transaction(updates);
}
