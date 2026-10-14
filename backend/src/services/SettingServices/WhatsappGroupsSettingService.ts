import SystemSetting from "../../models/SystemSetting";

const KEY = "whatsappGroupsEnabled";
let cacheValue: boolean | null = null;
let cacheUntil = 0;

export const areWhatsappGroupsEnabled = async (): Promise<boolean> => {
  const now = Date.now();
  if (cacheValue !== null && now < cacheUntil) return cacheValue;

  const setting = await SystemSetting.findByPk(KEY);
  const enabled = setting ? String(setting.value).toLowerCase() === "true" : false;

  cacheValue = enabled;
  cacheUntil = now + 5000;
  return enabled;
};

export const setWhatsappGroupsEnabled = async (
  enabled: boolean
): Promise<boolean> => {
  await SystemSetting.upsert({
    key: KEY,
    value: enabled ? "true" : "false"
  });

  cacheValue = enabled;
  cacheUntil = Date.now() + 5000;
  return enabled;
};

export const clearWhatsappGroupsCache = (): void => {
  cacheValue = null;
  cacheUntil = 0;
};
