import { AppConfig, AppSectionConfig, ChatTopicConfig, AnnouncementCategoryConfig, SectionAccess, UserRole } from '../types';

export const APP_CONFIG_STORAGE_KEY = 'snt_mezhdurechye_app_config_v1';

export const DEFAULT_ANNOUNCEMENT_CATEGORIES: AnnouncementCategoryConfig[] = [
  { id: 'meeting', label: 'Общее собрание', color: 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]' },
  { id: 'electricity', label: 'Электроэнергия', color: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]' },
  { id: 'water', label: 'Водоснабжение', color: 'bg-[#f4f7f1] text-[#2d4a22] border-[#dce3d5]' },
  { id: 'fees', label: 'Взносы и смета', color: 'bg-[#e9eddf] text-[#5c4033] border-[#dce3d5]' },
  { id: 'security', label: 'Безопасность', color: 'bg-[#fff1f2] text-[#9f1239] border-[#fecdd3]' },
  { id: 'roads', label: 'Дороги и дренаж', color: 'bg-[#f4f7f1] text-[#5a6b52] border-[#dce3d5]' },
];

export const DEFAULT_CHAT_TOPICS: ChatTopicConfig[] = [
  { id: 'general', label: 'Общее', icon: '💬' },
  { id: 'roads', label: 'Дороги', icon: '🚜' },
  { id: 'water', label: 'Водопровод', icon: '💧' },
  { id: 'electricity', label: 'Электричество', icon: '⚡' },
  { id: 'security', label: 'Безопасность', icon: '🛡️' },
  { id: 'market', label: 'Базар / Обмен', icon: '🍐' },
];

export const DEFAULT_APP_CONFIG: AppConfig = {
  branding: {
    appName: 'СНТ Междуречье',
    appTagline: 'Цифровая платформа садоводов • 25 улиц, ~200 участков',
    badgeText: '',
    footerText: 'СНТ «Междуречье»',
    footerSubtext: '',
    welcomeTitle: 'СНТ «Междуречье»',
    welcomeSubtitle: 'Закрытая цифровая платформа садоводов',
    lockScreenNote: 'Все данные синхронизируются в реальном времени через защищенный облачный сервер СНТ',
    emergencyPhoneElectrician: '+7 (925) 123-45-67',
    emergencyPhoneChairman: '+7 (916) 777-88-99',
    emergencyPhoneSecurity: '+7 (903) 444-22-11',
  },
  sections: [
    {
      id: 'chat',
      label: 'Чат',
      subtitle: 'Общение садоводов, взаимовыручка и обсуждения',
      icon: 'MessageSquare',
      enabled: true,
      order: 1,
      access: 'all',
    },
    {
      id: 'announcements',
      label: 'Объявления',
      subtitle: 'Постановления правления, общие собрания, опросы',
      icon: 'Bell',
      enabled: true,
      order: 2,
      access: 'all',
    },
    {
      id: 'info',
      label: 'Инфо-стенд',
      subtitle: 'График воды, вывоз мусора, реквизиты взносов',
      icon: 'Info',
      enabled: true,
      order: 3,
      isCustom: true,
      access: 'all',
      customContent: {
        title: 'Информационный стенд СНТ «Междуречье»',
        description: 'Официальные правила, расписания служб и справочная информация для садоводов',
        items: [],
      },
    },
    {
      id: 'residents',
      label: 'Садоводы',
      subtitle: 'Реестр садоводов по 25 улицам и номерам участков',
      icon: 'Users',
      enabled: true,
      order: 4,
      access: 'admin_chairman',
    },
  ],
  blocks: [
    {
      id: 'block-contacts',
      section: 'dashboard',
      title: 'Экстренные службы и дежурные СНТ',
      content: 'Председатель: +7 (916) 777-88-99 | Электрик: +7 (925) 123-45-67 | Охрана КПП: +7 (903) 444-22-11',
      badge: 'Телефоны',
      type: 'contacts',
      icon: 'Phone',
      enabled: true,
      order: 1,
      accentColor: 'emerald',
    },
    {
      id: 'block-water-schedule',
      section: 'dashboard',
      title: 'График полива на сезон',
      content: 'Среда и Суббота: 09:00 - 19:00. Просьба проверить краны на участках перед запуском насоса.',
      badge: 'Вода',
      type: 'schedule',
      icon: 'Droplets',
      enabled: true,
      order: 2,
      accentColor: 'sky',
    },
  ],
  chatTopics: DEFAULT_CHAT_TOPICS,
  announcementCategories: DEFAULT_ANNOUNCEMENT_CATEGORIES,
  adminCode: '2026',
  adminSecretPassword: 'V6544Dv*',
};

export function isSectionVisibleForRole(
  section: AppSectionConfig,
  role?: UserRole,
  isAdmin?: boolean,
  isChairman?: boolean
): boolean {
  if (section.id === 'security') return false;

  const userIsAdmin = role === 'admin' || Boolean(isAdmin);
  const userIsChairman = role === 'chairman' || Boolean(isChairman);

  const access: SectionAccess =
    section.access || (section.id === 'residents' ? 'admin_chairman' : 'all');

  if (access === 'admin') {
    return userIsAdmin;
  }
  if (access === 'admin_chairman') {
    return userIsAdmin || userIsChairman;
  }
  // 'all'
  return true;
}

export function sanitizeAppConfig(config: AppConfig): AppConfig {
  const cleanBlocks = (Array.isArray(config.blocks) ? config.blocks : []).filter(
    (b) => b && b.id !== 'block-banner-alert' && !(b.section === 'global_banner' && b.title === 'Внимание садоводов!')
  );
  const cleanSections = (Array.isArray(config.sections) ? config.sections : [])
    .filter((s) => s && s.id !== 'security')
    .map((sec) => ({
      ...sec,
      enabled: true,
      access: (sec.access as SectionAccess) || (sec.id === 'residents' ? 'admin_chairman' : 'all'),
    }));

  return {
    ...config,
    sections: cleanSections,
    blocks: cleanBlocks,
  };
}

export function loadAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_CONFIG;
    const parsed = JSON.parse(raw);
    const branding = { ...DEFAULT_APP_CONFIG.branding, ...(parsed.branding || {}) };
    branding.footerSubtext = '';
    if (branding.footerText) {
      branding.footerText = branding.footerText
        .replace(/\s*•\s*Автономная защищенная сеть/gi, '')
        .replace(/Шифрование AES-256.*$/gi, '')
        .replace(/Сервер отсутствует.*$/gi, '')
        .trim();
    }
    let sections = Array.isArray(parsed.sections) ? parsed.sections : DEFAULT_APP_CONFIG.sections;
    sections = sections
      .filter((sec: any) => sec && sec.id !== 'security')
      .map((sec: any, idx: number) => ({
        ...sec,
        enabled: true,
        access: (sec.access as SectionAccess) || (sec.id === 'residents' ? 'admin_chairman' : 'all'),
        order: typeof sec.order === 'number' ? sec.order : idx + 1,
      })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : DEFAULT_APP_CONFIG.blocks;
    const blocks = rawBlocks.filter(
      (b: any) => b && b.id !== 'block-banner-alert' && !(b.section === 'global_banner' && b.title === 'Внимание садоводов!')
    );

    return sanitizeAppConfig({
      branding,
      sections,
      blocks,
      chatTopics: Array.isArray(parsed.chatTopics) && parsed.chatTopics.length > 0
        ? parsed.chatTopics
        : DEFAULT_CHAT_TOPICS,
      announcementCategories: Array.isArray(parsed.announcementCategories) && parsed.announcementCategories.length > 0
        ? parsed.announcementCategories
        : DEFAULT_ANNOUNCEMENT_CATEGORIES,
      adminCode: parsed.adminCode || DEFAULT_APP_CONFIG.adminCode,
      adminSecretPassword: parsed.adminSecretPassword || DEFAULT_APP_CONFIG.adminSecretPassword,
    });
  } catch {
    return DEFAULT_APP_CONFIG;
  }
}

export function saveAppConfig(config: AppConfig): void {
  try {
    const sanitized = sanitizeAppConfig({
      ...config,
      branding: {
        ...config.branding,
        footerSubtext: '',
      },
    });
    localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save app config to localStorage:', err);
  }
}

export function resetAppConfig(): AppConfig {
  try {
    localStorage.removeItem(APP_CONFIG_STORAGE_KEY);
  } catch {
    // ignore
  }
  return DEFAULT_APP_CONFIG;
}
