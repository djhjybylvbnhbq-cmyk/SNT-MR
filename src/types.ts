export type UserRole = 'member' | 'chairman' | 'admin';
export type SectionAccess = 'all' | 'admin' | 'admin_chairman';

export interface User {
  id: string;
  fullName: string;
  streetNumber?: string; // Номер или название улицы
  plotNumber?: string;   // Номер участка
  phone?: string;
  role?: UserRole;
  isAdmin: boolean;
  isChairman?: boolean;
  registeredAt: string;
  avatarColor: string;
  password?: string;
  hidePlotInChat?: boolean;
  // Chat moderation / blocking fields
  chatBlocked?: boolean;
  chatBlockUntil?: string | null; // ISO string expiration date, or 'indefinite' / null for permanent until unblocked
  chatBlockReason?: string;
  chatBlockedAt?: string;
  chatBlockedBy?: string;
}

export interface ChatTopicConfig {
  id: string;
  label: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorStreet: string;
  authorPlot: string;
  authorRole?: UserRole;
  authorIsAdmin?: boolean;
  hidePlotInChat?: boolean;
  content: string;
  text?: string;
  timestamp: string;
  editedAt?: string;
  category?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  replyTo?: {
    id: string;
    authorName: string;
    content: string;
  };
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userIds who voted
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorRole: string; // e.g. "Председатель правления", "Правление СНТ"
  authorName: string;
  date: string;
  priority: 'urgent' | 'important' | 'info';
  isPinned: boolean;
  isBannerPinned?: boolean; // Pinned to global header bar visible across all tabs
  category: 'meeting' | 'electricity' | 'water' | 'fees' | 'security' | 'roads';
  poll?: {
    question: string;
    options: PollOption[];
  };
  confirmedBy?: string[]; // userIds who marked "Ознакомлен"
  scheduledAt?: string; // Optional future publication date and time (ISO string)
  isDeleted?: boolean; // Soft delete / hidden flag
  deletedAt?: string;
}

export interface EncryptedPayload {
  version: number;
  salt: string;        // Base64
  iv: string;          // Base64
  ciphertext: string;  // Base64
  checkCiphertext?: string; // For rapid PIN verification
  checkIv?: string;
  timestamp: number;
}

export interface VaultData {
  currentUser: User | null;
  residents: User[];
  messages: ChatMessage[];
  announcements: Announcement[];
  autoLockMinutes: number;
  encryptionAlgorithm: string;
  vaultCreatedAt: string;
  appConfig?: AppConfig;
  lastChatVisitTimestamp?: string;
}

export interface AppBrandingConfig {
  appName: string;
  appTagline: string;
  badgeText: string;
  footerText: string;
  footerSubtext: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  lockScreenNote: string;
  emergencyPhoneElectrician: string;
  emergencyPhoneChairman: string;
  emergencyPhoneSecurity: string;
}

export interface CustomContentItem {
  id: string;
  title: string;
  text: string;
  badge?: string;
  linkOrPhone?: string;
}

export interface AppSectionConfig {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  enabled: boolean;
  order: number;
  isCustom?: boolean;
  access?: SectionAccess; // 'all' | 'admin' | 'admin_chairman'
  customContent?: {
    title: string;
    description: string;
    items: CustomContentItem[];
  };
}

export interface AppBlockConfig {
  id: string;
  section: string; // 'global_banner' | 'chat_top' | 'announcements_top' | 'dashboard'
  title: string;
  content: string;
  badge?: string;
  type: 'alert' | 'banner' | 'card' | 'contacts' | 'schedule';
  icon?: string;
  enabled: boolean;
  order: number;
  accentColor?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
}

export interface AppConfig {
  branding: AppBrandingConfig;
  sections: AppSectionConfig[];
  blocks: AppBlockConfig[];
  chatTopics?: ChatTopicConfig[];
  adminCode: string;
  adminSecretPassword?: string;
}
