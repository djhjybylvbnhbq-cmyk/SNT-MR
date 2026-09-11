import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Announcement,
  ChatMessage,
  User,
  UserRole,
  CustomContentItem,
  VaultData,
  AppConfig,
  AppBlockConfig,
} from './types';
import {
  createEncryptedVault,
  verifyAndDecryptVault,
  computeFingerprint,
  encryptData,
} from './services/crypto';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_MESSAGES,
  INITIAL_RESIDENTS,
} from './data/seedData';
import { MobileHeader } from './components/MobileHeader';
import { MobileNavigation, TabType } from './components/MobileNavigation';
import { CommunityChat } from './components/CommunityChat';
import { AdminAnnouncements } from './components/AdminAnnouncements';
import { ResidentsDirectory } from './components/ResidentsDirectory';
import { RegisterModal } from './components/RegisterModal';
import { AdminStudio } from './components/AdminStudio';
import { CustomSectionView } from './components/CustomSectionView';
import { loadAppConfig, saveAppConfig, sanitizeAppConfig, DEFAULT_CHAT_TOPICS, isSectionVisibleForRole } from './utils/appConfig';
import { isUserChatBlocked, checkIsAdmin } from './utils/moderation';
import { isAnnouncementPublished } from './utils/announcements';
import { AlertTriangle, X, Pin, ArrowRight } from 'lucide-react';
import {
  testConnection,
  seedFirestoreIfEmpty,
  subscribeResidents,
  subscribeMessages,
  subscribeAnnouncements,
  subscribeAppConfig,
  fetchResidentsFromFirestore,
  fetchMessagesFromFirestore,
  fetchAnnouncementsFromFirestore,
  fetchAppConfigFromFirestore,
  saveResidentToFirestore,
  updateResidentPresence,
  markResidentOffline,
  deleteResidentFromFirestore,
  saveMessageToFirestore,
  updateMessageReactionsInFirestore,
  updateMessageInFirestore,
  deleteMessageFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  clearAllAnnouncementsFromFirestore,
  saveAppConfigToFirestore,
} from './services/firebase';

const STORAGE_KEY = 'snt_mezhdurechye_vault_v1';
const BROADCAST_CHANNEL_NAME = 'snt_mezhdurechye_broadcast';
const RESIDENTS_CACHE_KEY = 'snt_mezhdurechye_residents_directory';
const ANNOUNCEMENTS_CACHE_KEY = 'snt_mezhdurechye_announcements_cache';
const MESSAGES_CACHE_KEY = 'snt_mezhdurechye_messages_cache';

/**
 * Reconciles remote announcements from Firestore with local state and in-flight items.
 * Firestore is the authoritative source of truth for cloud-connected devices.
 */
const reconcileAnnouncements = (
  remote: Announcement[],
  pendingMap?: Map<string, Announcement>
): Announcement[] => {
  const map = new Map<string, Announcement>();
  for (const ann of remote) {
    if (ann && ann.id && !ann.isDeleted) {
      map.set(ann.id, ann);
      if (pendingMap) pendingMap.delete(ann.id);
    }
  }
  if (pendingMap) {
    for (const [id, pendingAnn] of pendingMap.entries()) {
      if (!map.has(id) && !pendingAnn.isDeleted) {
        map.set(id, pendingAnn);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : new Date(a.date || 0).getTime();
    const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.date || 0).getTime();
    return dateB - dateA;
  });
};

/**
 * Reconciles remote chat messages from Firestore with local state and in-flight items.
 */
const reconcileMessages = (
  remote: ChatMessage[],
  pendingMap?: Map<string, ChatMessage>
): ChatMessage[] => {
  const map = new Map<string, ChatMessage>();
  for (const m of remote) {
    if (m && m.id) {
      map.set(m.id, m);
      if (pendingMap) pendingMap.delete(m.id);
    }
  }
  if (pendingMap) {
    for (const [id, pendingMsg] of pendingMap.entries()) {
      if (!map.has(id)) {
        map.set(id, pendingMsg);
      }
    }
  }
  return Array.from(map.values()).sort(
    (x, y) => new Date(x.timestamp || 0).getTime() - new Date(y.timestamp || 0).getTime()
  );
};

const DELETED_RESIDENT_IDS = new Set([
  'resident-1',
  'resident-2',
  'resident-3',
  'resident-4',
  'resident-5',
  'resident-1789015539719-qp38',
  'resident-1789029122700-2nxz',
  'test-gardener',
]);

/**
 * Reconciles remote residents from Firestore with local state and in-flight items.
 */
const reconcileResidents = (
  remote: User[],
  pendingMap?: Map<string, User>
): User[] => {
  const map = new Map<string, User>();
  if (remote && remote.length > 0) {
    for (const r of remote) {
      if (r && r.id && !DELETED_RESIDENT_IDS.has(r.id)) {
        map.set(r.id, r);
        if (pendingMap) pendingMap.delete(r.id);
      }
    }
  } else {
    for (const init of INITIAL_RESIDENTS) {
      if (!DELETED_RESIDENT_IDS.has(init.id)) {
        map.set(init.id, init);
      }
    }
  }
  if (pendingMap) {
    for (const [id, pendingUser] of pendingMap.entries()) {
      if (!map.has(id) && !DELETED_RESIDENT_IDS.has(id)) {
        map.set(id, pendingUser);
      }
    }
  }
  return Array.from(map.values());
};

const loadCachedResidents = (): User[] => {
  try {
    const raw = localStorage.getItem(RESIDENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((r: User) => r && r.id && !DELETED_RESIDENT_IDS.has(r.id));
        if (filtered.length > 0) return filtered;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_RESIDENTS;
};

const loadCachedAnnouncements = (): Announcement[] => {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => !a.isDeleted);
      }
    }
  } catch {
    // ignore
  }
  return [];
};

const loadCachedMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(MESSAGES_CACHE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
};

export default function App() {
  // Vault State
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [residents, setResidents] = useState<User[]>(loadCachedResidents);
  const [messages, setMessages] = useState<ChatMessage[]>(loadCachedMessages);
  const [announcements, setAnnouncements] = useState<Announcement[]>(loadCachedAnnouncements);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);
  const [keyFingerprint, setKeyFingerprint] = useState<string>('');
  const [activePin, setActivePin] = useState<string>('');
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Chat visit timestamp for unread badge calculation
  const [lastChatVisitTimestamp, setLastChatVisitTimestamp] = useState<string>(() => {
    try {
      return localStorage.getItem('snt_mezhdurechye_last_chat_visit') || '';
    } catch {
      return '';
    }
  });

  // App CMS / Customizer Config
  const [appConfig, setAppConfig] = useState<AppConfig>(loadAppConfig);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<string[]>([]);
  const [dismissedBannerAnnouncementIds, setDismissedBannerAnnouncementIds] = useState<string[]>([]);
  const [highlightedAnnouncementId, setHighlightedAnnouncementId] = useState<string | null>(null);

  // Derive user role and privileged status early
  const userRole: UserRole =
    currentUser?.role ||
    (currentUser?.isChairman ? 'chairman' : currentUser?.isAdmin ? 'admin' : 'member');

  const isPrivilegedUser = Boolean(
    userRole === 'admin' ||
    userRole === 'chairman' ||
    currentUser?.isAdmin ||
    currentUser?.isChairman
  );

  // Synchronize dismissed banner announcements per user
  useEffect(() => {
    if (!currentUser) {
      setDismissedBannerAnnouncementIds([]);
      return;
    }
    if (isPrivilegedUser) {
      // Board members (Chairman/Admin) always see all active pinned banners in the header!
      setDismissedBannerAnnouncementIds([]);
    } else {
      // Regular gardener - load their personal dismissed banners from local device storage
      try {
        const userSpecificKey = `snt_mezhdurechye_dismissed_banners_${currentUser.id}`;
        const stored = localStorage.getItem(userSpecificKey);
        if (stored) {
          setDismissedBannerAnnouncementIds(JSON.parse(stored));
        } else {
          setDismissedBannerAnnouncementIds([]);
        }
      } catch {
        setDismissedBannerAnnouncementIds([]);
      }
    }
  }, [currentUser?.id, isPrivilegedUser]);

  // Periodic ticker for scheduled announcements (triggers reactive re-render when scheduled time passes)
  const [, setScheduleTicker] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleTicker(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // UI Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>('');

  // Memory CryptoKey reference
  const activeCryptoKeyRef = useRef<CryptoKey | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnlockedRef = useRef<boolean>(isUnlocked);

  const activePinRef = useRef<string>(activePin);
  useEffect(() => {
    activePinRef.current = activePin;
  }, [activePin]);

  const currentUserRef = useRef<User | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const residentsRef = useRef<User[]>(residents);
  useEffect(() => {
    residentsRef.current = residents;
  }, [residents]);

  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const announcementsRef = useRef<Announcement[]>(announcements);
  useEffect(() => {
    announcementsRef.current = announcements;
  }, [announcements]);

  // Cloud cache refs so we always know the freshest remote data
  const latestCloudResidentsRef = useRef<User[] | null>(null);
  const latestCloudMessagesRef = useRef<ChatMessage[] | null>(null);
  const latestCloudAnnouncementsRef = useRef<Announcement[] | null>(null);
  const latestCloudConfigRef = useRef<AppConfig | null>(null);

  // In-flight pending local modifications awaiting Firestore acknowledgment
  const pendingAnnouncementsRef = useRef<Map<string, Announcement>>(new Map());
  const pendingMessagesRef = useRef<Map<string, ChatMessage>>(new Map());
  const pendingResidentsRef = useRef<Map<string, User>>(new Map());
  const [isRefreshingCloud, setIsRefreshingCloud] = useState<boolean>(false);

  // Proactively fetch all collections directly from Firestore to catch up on any offline updates
  const refreshFromCloud = useCallback(async () => {
    setIsRefreshingCloud(true);
    try {
      const [remoteResidents, remoteMessages, remoteAnnouncements, remoteConfig] = await Promise.all([
        fetchResidentsFromFirestore(),
        fetchMessagesFromFirestore(),
        fetchAnnouncementsFromFirestore(),
        fetchAppConfigFromFirestore(),
      ]);

      if (remoteResidents) {
        latestCloudResidentsRef.current = remoteResidents;
        const reconciledResidents = reconcileResidents(remoteResidents, pendingResidentsRef.current);
        setResidents(reconciledResidents);
        try {
          localStorage.setItem(RESIDENTS_CACHE_KEY, JSON.stringify(reconciledResidents));
        } catch {
          // ignore
        }
        setCurrentUser((prev) => {
          if (!prev) return null;
          const found = reconciledResidents.find((r) => r.id === prev.id);
          return found ? { ...prev, ...found } : prev;
        });
      }

      if (remoteMessages) {
        latestCloudMessagesRef.current = remoteMessages;
        const reconciledMessages = reconcileMessages(remoteMessages, pendingMessagesRef.current);
        setMessages(reconciledMessages);
        try {
          localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(reconciledMessages));
        } catch {
          // ignore
        }
      }

      if (remoteAnnouncements) {
        latestCloudAnnouncementsRef.current = remoteAnnouncements;
        const reconciledAnnouncements = reconcileAnnouncements(
          remoteAnnouncements,
          pendingAnnouncementsRef.current
        );
        setAnnouncements(reconciledAnnouncements);
        try {
          localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(reconciledAnnouncements));
        } catch {
          // ignore
        }
        if (activePinRef.current && currentUserRef.current) {
          saveEncryptedVault(
            currentUserRef.current,
            latestCloudResidentsRef.current || residentsRef.current,
            latestCloudMessagesRef.current || messagesRef.current,
            reconciledAnnouncements,
            activePinRef.current,
            latestCloudConfigRef.current || undefined
          ).catch(() => {});
        }
      }

      if (remoteConfig) {
        const cleaned = sanitizeAppConfig(remoteConfig);
        latestCloudConfigRef.current = cleaned;
        setAppConfig(cleaned);
        saveAppConfig(cleaned);
      }
    } catch (err) {
      console.warn('refreshFromCloud note:', err);
    } finally {
      setIsRefreshingCloud(false);
    }
  }, []);

  // Sync ref for isUnlocked to avoid re-triggering effects
  useEffect(() => {
    isUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  // Cloud Firestore Real-time Sync & Initialization
  useEffect(() => {
    let unsubResidents: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;
    let unsubAnnouncements: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;

    async function initCloudSync() {
      // 1. Establish real-time onSnapshot listeners immediately
      unsubResidents = subscribeResidents((remoteResidents) => {
        if (remoteResidents) {
          latestCloudResidentsRef.current = remoteResidents;
          const reconciled = reconcileResidents(remoteResidents, pendingResidentsRef.current);
          setResidents(reconciled);
          try {
            localStorage.setItem(RESIDENTS_CACHE_KEY, JSON.stringify(reconciled));
          } catch {
            // ignore
          }
          setCurrentUser((prev) => {
            if (!prev) return null;
            const found = reconciled.find((r) => r.id === prev.id);
            return found ? { ...prev, ...found } : prev;
          });
        }
      });

      unsubMessages = subscribeMessages((remoteMessages) => {
        if (remoteMessages) {
          latestCloudMessagesRef.current = remoteMessages;
          const reconciled = reconcileMessages(remoteMessages, pendingMessagesRef.current);
          setMessages(reconciled);
          try {
            localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(reconciled));
          } catch {
            // ignore
          }
        }
      });

      unsubAnnouncements = subscribeAnnouncements((remoteAnnouncements) => {
        if (remoteAnnouncements) {
          latestCloudAnnouncementsRef.current = remoteAnnouncements;
          const reconciled = reconcileAnnouncements(
            remoteAnnouncements,
            pendingAnnouncementsRef.current
          );
          setAnnouncements(reconciled);
          try {
            localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(reconciled));
          } catch {
            // ignore
          }
          if (activePinRef.current && currentUserRef.current) {
            saveEncryptedVault(
              currentUserRef.current,
              latestCloudResidentsRef.current || residentsRef.current,
              latestCloudMessagesRef.current || messagesRef.current,
              reconciled,
              activePinRef.current,
              latestCloudConfigRef.current || undefined
            ).catch(() => {});
          }
        }
      });

      unsubConfig = subscribeAppConfig((remoteConfig) => {
        if (remoteConfig) {
          const cleaned = sanitizeAppConfig(remoteConfig);
          latestCloudConfigRef.current = cleaned;
          setAppConfig(cleaned);
          saveAppConfig(cleaned);
        }
      });

      // 2. Proactively fetch any announcements/messages from the cloud immediately to catch up
      await refreshFromCloud();

      // 3. In background check connection and seed default data if DB is virgin
      try {
        const ok = await testConnection();
        setIsCloudConnected(ok);
        await seedFirestoreIfEmpty();
      } catch (err) {
        console.warn('Cloud sync background connection note:', err);
      }
    }

    initCloudSync();

    return () => {
      if (unsubResidents) unsubResidents();
      if (unsubMessages) unsubMessages();
      if (unsubAnnouncements) unsubAnnouncements();
      if (unsubConfig) unsubConfig();
    };
  }, [refreshFromCloud]);

  // Re-sync with cloud whenever user returns to tab, device goes online, or tab becomes visible
  useEffect(() => {
    const handleReconnected = () => {
      refreshFromCloud();
    };

    window.addEventListener('online', handleReconnected);
    window.addEventListener('focus', handleReconnected);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleReconnected);
      window.removeEventListener('focus', handleReconnected);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshFromCloud]);

  // Auto-restore session from active user ID if saved
  useEffect(() => {
    try {
      (window as any).__APP_MOUNTED__ = true;
    } catch {
      // ignore
    }
    let savedUserId: string | null = null;
    try {
      savedUserId = localStorage.getItem('snt_mezhdurechye_active_user_id');
    } catch {
      // ignore
    }
    if (savedUserId && !currentUser) {
      const all = residents.length > 0 ? residents : loadCachedResidents();
      const match = all.find((r) => r.id === savedUserId);
      if (match) {
        setCurrentUser(match);
        setIsUnlocked(true);
        setIsRegisterOpen(false);
        setActiveTab('info');
      }
    }
  }, [residents, currentUser]);

  // Presence heartbeat: keeps current user's "online" status fresh in Firestore
  useEffect(() => {
    if (!isUnlocked || !currentUser?.id) return;
    const userToHeartbeat = currentUser;
    const currentId = userToHeartbeat.id;

    let lastSent = 0;
    const sendHeartbeat = async (force = false) => {
      const now = Date.now();
      // Throttle heartbeat: minimum 20 seconds between writes unless forced
      if (!force && now - lastSent < 20000) return;
      lastSent = now;
      const nowIso = await updateResidentPresence(userToHeartbeat);
      // Optimistically update local currentUser and residents state for instant feedback
      setCurrentUser((prev) => (prev && prev.id === currentId ? { ...prev, lastActiveAt: nowIso } : prev));
      setResidents((prev) =>
        prev.map((r) => (r.id === currentId ? { ...r, lastActiveAt: nowIso } : r))
      );
      // Broadcast presence to all other open tabs immediately
      broadcastChannelRef.current?.postMessage({
        type: 'PRESENCE_UPDATE',
        userId: currentId,
        lastActiveAt: nowIso,
      });
    };

    // Send immediately when user becomes active
    sendHeartbeat(true);

    // Periodic heartbeat every 20 seconds if document is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    }, 20000);

    // Send on interaction or visibility change if throttled time has passed
    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(true); // Force send immediately upon wake/switching to tab
      }
    };

    window.addEventListener('focus', handleActivity);
    window.addEventListener('pageshow', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pageshow', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
    };
  }, [isUnlocked, currentUser?.id]);

  // Handle window unload to inform other open tabs immediately
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser?.id) {
        const offlineTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        broadcastChannelRef.current?.postMessage({
          type: 'PRESENCE_UPDATE',
          userId: currentUser.id,
          lastActiveAt: offlineTime,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser?.id]);

  // 1. Initial Load: Check if encrypted database exists on device (STRICTLY ONCE ON MOUNT)
  useEffect(() => {
    let rawStored: string | null = null;
    try {
      rawStored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (!rawStored) {
      // First run: Open registration modal
      setIsInitialized(false);
      setIsRegisterOpen(true);
    } else {
      try {
        const parsed = JSON.parse(rawStored);
        if (parsed.ciphertext && parsed.salt) {
          setIsInitialized(true);
          setIsUnlocked(false);
        } else {
          setIsInitialized(false);
          setIsRegisterOpen(true);
        }
      } catch {
        setIsInitialized(false);
        setIsRegisterOpen(true);
      }
    }

    // Do not set unauthenticated currentUser before unlocking
    // Profile hint can be used strictly if needed after decryption

    // Initialize BroadcastChannel for cross-tab local sync (once on mount)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC_DATA' && isUnlockedRef.current) {
          if (event.data.residents) setResidents(event.data.residents);
          if (event.data.messages) setMessages(event.data.messages);
          if (event.data.announcements) setAnnouncements(event.data.announcements);
        } else if (event.data?.type === 'PRESENCE_UPDATE' && event.data.userId) {
          const { userId, lastActiveAt } = event.data;
          setResidents((prev) =>
            prev.map((r) => (r.id === userId ? { ...r, lastActiveAt } : r))
          );
        }
      };
      broadcastChannelRef.current = bc;
      return () => {
        bc.close();
      };
    }
  }, []); // Run ONLY ONCE on mount! NEVER re-lock when isUnlocked changes!

  // 2. Persist data into encrypted localStorage whenever state changes
  const saveEncryptedVault = useCallback(
    async (
      updatedCurrentUser: User | null,
      updatedResidents: User[],
      updatedMessages: ChatMessage[],
      updatedAnnouncements: Announcement[],
      pinToUse: string,
      customConfig?: AppConfig
    ) => {
      const vaultData: VaultData = {
        currentUser: updatedCurrentUser,
        residents: updatedResidents,
        messages: updatedMessages,
        announcements: updatedAnnouncements,
        autoLockMinutes,
        encryptionAlgorithm: 'AES-GCM-256',
        vaultCreatedAt: new Date().toISOString(),
        appConfig: customConfig || appConfig,
        lastChatVisitTimestamp: lastChatVisitTimestamp || new Date().toISOString(),
      };

      try {
        const encrypted = await createEncryptedVault(vaultData, pinToUse);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));

        // Always save unencrypted directory cache so list of residents is available across sessions/modals
        try {
          localStorage.setItem(RESIDENTS_CACHE_KEY, JSON.stringify(updatedResidents));
        } catch {
          // ignore
        }

        // Sync with any other open tabs
        broadcastChannelRef.current?.postMessage({
          type: 'SYNC_DATA',
          residents: updatedResidents,
          messages: updatedMessages,
          announcements: updatedAnnouncements,
        });
      } catch (err) {
        console.error('Failed to encrypt vault to localStorage', err);
      }
    },
    [autoLockMinutes, appConfig, lastChatVisitTimestamp]
  );

  // 3. Activity Tracker for Auto-Lock
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    if (autoLockMinutes > 0 && isUnlocked) {
      autoLockTimerRef.current = setTimeout(() => {
        // Lock database
        setIsUnlocked(false);
        activeCryptoKeyRef.current = null;
      }, autoLockMinutes * 60 * 1000);
    }
  }, [autoLockMinutes, isUnlocked]);

  useEffect(() => {
    const handleUserActivity = () => resetAutoLockTimer();
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    resetAutoLockTimer();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [resetAutoLockTimer]);

  // Remove any legacy demo alert banner from blocks config
  useEffect(() => {
    if (appConfig.blocks.some((b) => b.id === 'block-banner-alert' || (b.section === 'global_banner' && b.title === 'Внимание садоводов!'))) {
      const cleaned = sanitizeAppConfig(appConfig);
      setAppConfig(cleaned);
      saveAppConfig(cleaned);
    }
  }, [appConfig]);

  // Auto-clean deleted / non-existent residents from announcement confirmedBy & poll votes
  useEffect(() => {
    if (!residents || residents.length === 0 || !announcements || announcements.length === 0) {
      return;
    }

    const validResidentIds = new Set(residents.map((r) => r.id));
    if (currentUser?.id) {
      validResidentIds.add(currentUser.id);
    }

    let hasAnyChanges = false;
    const cleanedAnnouncements = announcements.map((ann) => {
      const originalConfirmed = ann.confirmedBy || [];
      const validConfirmed = originalConfirmed.filter((id) => validResidentIds.has(id));

      let pollChanged = false;
      let newPoll = ann.poll;
      if (ann.poll && Array.isArray(ann.poll.options)) {
        const newOptions = ann.poll.options.map((opt) => {
          const originalVotes = opt.votes || [];
          const validVotes = originalVotes.filter((id) => validResidentIds.has(id));
          if (validVotes.length !== originalVotes.length) {
            pollChanged = true;
          }
          return { ...opt, votes: validVotes };
        });
        if (pollChanged) {
          newPoll = { ...ann.poll, options: newOptions };
        }
      }

      if (validConfirmed.length !== originalConfirmed.length || pollChanged) {
        hasAnyChanges = true;
        const updatedAnn: Announcement = {
          ...ann,
          confirmedBy: validConfirmed,
          poll: newPoll,
        };
        // Auto-sync cleaned announcement to Firestore
        saveAnnouncementToFirestore(updatedAnn).catch(() => {});
        return updatedAnn;
      }
      return ann;
    });

    if (hasAnyChanges) {
      setAnnouncements(cleanedAnnouncements);
      try {
        localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(cleanedAnnouncements));
      } catch {
        // ignore
      }
      if (activePinRef.current && currentUserRef.current) {
        saveEncryptedVault(
          currentUserRef.current,
          residentsRef.current,
          messagesRef.current,
          cleanedAnnouncements,
          activePinRef.current
        ).catch(() => {});
      }
    }
  }, [residents, currentUser?.id, announcements]);

  // 4. Registration Handler (Create new vault or append user without wiping existing members)
  const handleRegister = async (
    userData: Omit<User, 'id' | 'registeredAt'>,
    pin: string
  ) => {
    const nowIso = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id: `resident-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      registeredAt: nowIso,
      lastActiveAt: nowIso,
    };
    pendingResidentsRef.current.set(newUser.id, newUser);

    // 1. Gather all existing residents, messages, and announcements
    let currentResidents = residents.length > 0 ? residents : loadCachedResidents();
    let currentMsgs = messages;
    let currentAnns = announcements;
    let currentConfig = appConfig;

    // 2. If an encrypted database already exists in localStorage, try decrypting to preserve data
    const rawStored = localStorage.getItem(STORAGE_KEY);
    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored);
        const pinToTry = activePin || pin || '1234';
        const result = await verifyAndDecryptVault(parsed, pinToTry);
        if (result.success && result.data) {
          if (Array.isArray(result.data.residents) && result.data.residents.length > 0) {
            currentResidents = result.data.residents;
          }
          if (Array.isArray(result.data.messages)) {
            currentMsgs = result.data.messages;
          }
          if (Array.isArray(result.data.announcements)) {
            currentAnns = result.data.announcements;
          }
          if (result.data.appConfig) {
            currentConfig = sanitizeAppConfig(result.data.appConfig);
            setAppConfig(currentConfig);
          }
        }
      } catch (err) {
        console.warn('Fallback during register decryption', err);
      }
    }

    // 3. Combine newUser with all existing residents (ensuring previous members like Коля are never wiped)
    const existingFiltered = currentResidents.filter(
      (r) =>
        r.id !== newUser.id &&
        !(
          r.fullName.trim().toLowerCase() === newUser.fullName.trim().toLowerCase() &&
          String(r.plotNumber).trim() === String(newUser.plotNumber).trim()
        )
    );
    const updatedResidentsList = [newUser, ...existingFiltered];

    setCurrentUser(newUser);
    const cloudResidents = latestCloudResidentsRef.current;
    const finalResidents = cloudResidents && cloudResidents.length > 0
      ? reconcileResidents(cloudResidents, pendingResidentsRef.current)
      : updatedResidentsList;
    setResidents(finalResidents);

    const cloudMsgs = latestCloudMessagesRef.current;
    const finalMsgs = cloudMsgs !== null
      ? reconcileMessages(cloudMsgs, pendingMessagesRef.current)
      : currentMsgs;
    setMessages(finalMsgs);

    const cloudAnns = latestCloudAnnouncementsRef.current;
    const finalAnns = cloudAnns !== null
      ? reconcileAnnouncements(cloudAnns, pendingAnnouncementsRef.current)
      : currentAnns;
    setAnnouncements(finalAnns);
    setActivePin(pin);
    setIsInitialized(true);
    setIsUnlocked(true);
    setIsRegisterOpen(false);
    setActiveTab('info');
    refreshFromCloud();

    try {
      localStorage.setItem('snt_mezhdurechye_active_user_id', newUser.id);
    } catch {
      // ignore
    }

    // Save to Firestore cloud database
    await saveResidentToFirestore(newUser);
    await updateResidentPresence(newUser);
    broadcastChannelRef.current?.postMessage({
      type: 'PRESENCE_UPDATE',
      userId: newUser.id,
      lastActiveAt: nowIso,
    });

    // Save encrypted vault
    await saveEncryptedVault(
      newUser,
      updatedResidentsList,
      currentMsgs,
      currentAnns,
      pin,
      currentConfig
    );

    // Save profile hint for friendly lock screen greeting
    try {
      localStorage.setItem(
        'snt_mezhdurechye_profile_hint',
        JSON.stringify({
          fullName: newUser.fullName,
          streetNumber: newUser.streetNumber,
          plotNumber: newUser.plotNumber,
          avatarColor: newUser.avatarColor,
        })
      );
    } catch {
      // ignore
    }

    // Derive fingerprint for display
    const updatedRaw = localStorage.getItem(STORAGE_KEY);
    if (updatedRaw) {
      try {
        const parsed = JSON.parse(updatedRaw);
        const fp = await computeFingerprint(pin, parsed.salt);
        setKeyFingerprint(fp);
      } catch {
        // ignore
      }
    }
  };

  // 4.1 Login Handler (Sign in as selected resident / admin / chairman)
  const handleLogin = async (user: User, pin: string) => {
    const currentAdminSecret = appConfig.adminSecretPassword || 'V6544Dv*';
    const isUserAdmin = user.role === 'admin' || user.isAdmin;

    if (!user.password) {
      throw new Error('Пользователь не зарегистрирован. Пройдите регистрацию.');
    }

    const isMatch =
      pin === user.password ||
      (isUserAdmin && pin === currentAdminSecret);
    if (!isMatch) {
      throw new Error('Неверный пароль');
    }

    // If changing user account, mark previous resident offline immediately
    if (currentUser && currentUser.id !== user.id) {
      const offlineTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      markResidentOffline(currentUser.id);
      setResidents((prev) =>
        prev.map((r) => (r.id === currentUser.id ? { ...r, lastActiveAt: offlineTime } : r))
      );
      broadcastChannelRef.current?.postMessage({
        type: 'PRESENCE_UPDATE',
        userId: currentUser.id,
        lastActiveAt: offlineTime,
      });
    }

    const rawStored = localStorage.getItem(STORAGE_KEY);
    let currentResidents = residents.length > 0 ? residents : loadCachedResidents();
    let currentMsgs = messages;
    let currentAnns = announcements;
    let currentConfig = appConfig;

    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored);
        const result = await verifyAndDecryptVault(parsed, pin);
        if (result.success && result.data) {
          if (Array.isArray(result.data.residents) && result.data.residents.length > 0) {
            currentResidents = result.data.residents;
          }
          if (Array.isArray(result.data.messages)) {
            currentMsgs = result.data.messages;
          }
          if (Array.isArray(result.data.announcements)) {
            currentAnns = result.data.announcements;
          }
          if (result.data.appConfig) {
            currentConfig = sanitizeAppConfig(result.data.appConfig);
            setAppConfig(currentConfig);
          }
        } else if (activePin) {
          const fallbackResult = await verifyAndDecryptVault(parsed, activePin);
          if (fallbackResult.success && fallbackResult.data) {
            if (Array.isArray(fallbackResult.data.residents) && fallbackResult.data.residents.length > 0) {
              currentResidents = fallbackResult.data.residents;
            }
            if (Array.isArray(fallbackResult.data.messages)) {
              currentMsgs = fallbackResult.data.messages;
            }
            if (Array.isArray(fallbackResult.data.announcements)) {
              currentAnns = fallbackResult.data.announcements;
            }
          }
        }
      } catch (err) {
        console.warn('Fallback during login decryption', err);
      }
    }

    const nowIso = new Date().toISOString();
    // Ensure user is present in current residents list with immediate online timestamp
    const updatedUser: User = {
      ...user,
      password: user.password || pin,
      lastActiveAt: nowIso,
    };
    pendingResidentsRef.current.set(updatedUser.id, updatedUser);
    const exists = currentResidents.some((r) => r.id === updatedUser.id);
    const updatedResidents = exists
      ? currentResidents.map((r) => (r.id === updatedUser.id ? { ...r, ...updatedUser } : r))
      : [updatedUser, ...currentResidents];

    const cloudMsgs = latestCloudMessagesRef.current;
    const finalMsgs = cloudMsgs !== null
      ? reconcileMessages(cloudMsgs, pendingMessagesRef.current)
      : currentMsgs;

    const cloudAnns = latestCloudAnnouncementsRef.current;
    const finalAnns = cloudAnns !== null
      ? reconcileAnnouncements(cloudAnns, pendingAnnouncementsRef.current)
      : currentAnns;

    setCurrentUser(updatedUser);
    setResidents(updatedResidents);
    setMessages(finalMsgs);
    setAnnouncements(finalAnns);
    setActivePin(pin);
    setIsInitialized(true);
    setIsUnlocked(true);
    setIsRegisterOpen(false);
    setActiveTab('info');
    refreshFromCloud();

    try {
      localStorage.setItem('snt_mezhdurechye_active_user_id', updatedUser.id);
    } catch {
      // ignore
    }

    // Sync user to Firestore cloud database
    await saveResidentToFirestore(updatedUser);
    await updateResidentPresence(updatedUser);
    broadcastChannelRef.current?.postMessage({
      type: 'PRESENCE_UPDATE',
      userId: updatedUser.id,
      lastActiveAt: nowIso,
    });

    // Save encrypted vault
    await saveEncryptedVault(updatedUser, updatedResidents, currentMsgs, currentAnns, pin, currentConfig);

    // Save profile hint for friendly lock screen greeting
    try {
      localStorage.setItem(
        'snt_mezhdurechye_profile_hint',
        JSON.stringify({
          fullName: updatedUser.fullName,
          avatarColor: updatedUser.avatarColor,
        })
      );
    } catch {
      // ignore
    }

    // Compute key fingerprint
    const updatedRaw = localStorage.getItem(STORAGE_KEY);
    if (updatedRaw) {
      const parsed = JSON.parse(updatedRaw);
      const fp = await computeFingerprint(pin, parsed.salt);
      setKeyFingerprint(fp);
    }
    return true;
  };

  // 5. Unlock Handler
  const handleUnlock = async (pin: string): Promise<boolean> => {
    setUnlockError('');
    const rawStored = localStorage.getItem(STORAGE_KEY);
    if (!rawStored) {
      // If no vault exists yet, initialize it directly with this pin (or 1234)
      await handleEmergencyResetPin(pin || '1234');
      return true;
    }

    try {
      const parsed = JSON.parse(rawStored);
      const result = await verifyAndDecryptVault(parsed, pin);

      if (result.success && result.data) {
        const vaultData: VaultData = result.data;
        setCurrentUser(vaultData.currentUser);

        const rawResidents = vaultData.residents || loadCachedResidents();
        const resolvedResidents = rawResidents.filter((r: User) => r && r.id && !DELETED_RESIDENT_IDS.has(r.id));
        const cloudResidents = latestCloudResidentsRef.current;
        const finalResidents = cloudResidents !== null && cloudResidents.length > 0
          ? reconcileResidents(cloudResidents, pendingResidentsRef.current)
          : resolvedResidents;
        setResidents(finalResidents);
        try {
          localStorage.setItem(RESIDENTS_CACHE_KEY, JSON.stringify(finalResidents));
        } catch {
          // ignore
        }

        const vaultMsgs = Array.isArray(vaultData.messages) ? vaultData.messages : loadCachedMessages();
        const cloudMsgs = latestCloudMessagesRef.current;
        const finalMsgs = cloudMsgs !== null
          ? reconcileMessages(cloudMsgs, pendingMessagesRef.current)
          : vaultMsgs;
        setMessages(finalMsgs);

        const vaultAnns = Array.isArray(vaultData.announcements) ? vaultData.announcements : loadCachedAnnouncements();
        const cloudAnns = latestCloudAnnouncementsRef.current;
        const finalAnns = cloudAnns !== null
          ? reconcileAnnouncements(cloudAnns, pendingAnnouncementsRef.current)
          : vaultAnns;
        setAnnouncements(finalAnns);

        if (vaultData.autoLockMinutes !== undefined) {
          setAutoLockMinutes(vaultData.autoLockMinutes);
        }
        if (vaultData.appConfig) {
          const cleaned = sanitizeAppConfig(vaultData.appConfig);
          setAppConfig(cleaned);
          saveAppConfig(cleaned);
        }
        if (vaultData.lastChatVisitTimestamp) {
          setLastChatVisitTimestamp(vaultData.lastChatVisitTimestamp);
          localStorage.setItem('snt_mezhdurechye_last_chat_visit', vaultData.lastChatVisitTimestamp);
        }
        activeCryptoKeyRef.current = result.key || null;
        setActivePin(pin);

        const fp = await computeFingerprint(pin, parsed.salt);
        setKeyFingerprint(fp);

        setIsUnlocked(true);
        setActiveTab('info');
        refreshFromCloud();
        return true;
      } else {
        // If standard PIN 1234 was submitted and decryption failed
        // (e.g. because of an older test salt or forgotten custom PIN),
        // recover seamlessly so the user is never locked out:
        if (pin === '1234') {
          await handleEmergencyResetPin('1234');
          return true;
        }
        setUnlockError(result.error || 'Неверный PIN-код');
        return false;
      }
    } catch {
      if (pin === '1234') {
        await handleEmergencyResetPin('1234');
        return true;
      }
      setUnlockError('Ошибка расшифровки базы данных. Попробуйте PIN 1234 для восстановления.');
      return false;
    }
  };

  // 6. Manual Lock / Switch User
  const handleLockNow = () => {
    if (currentUser?.id) {
      const offlineTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      markResidentOffline(currentUser.id);
      setResidents((prev) =>
        prev.map((r) => (r.id === currentUser.id ? { ...r, lastActiveAt: offlineTime } : r))
      );
      broadcastChannelRef.current?.postMessage({
        type: 'PRESENCE_UPDATE',
        userId: currentUser.id,
        lastActiveAt: offlineTime,
      });
    }
    setIsUnlocked(false);
    setIsRegisterOpen(true);
    localStorage.removeItem('snt_mezhdurechye_active_user_id');
    activeCryptoKeyRef.current = null;
  };

  // 7. Reset Vault
  const handleResetVault = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('snt_mezhdurechye_profile_hint');
    localStorage.removeItem('snt_mezhdurechye_saved_auth');
    localStorage.removeItem('snt_mezhdurechye_active_user_id');
    localStorage.removeItem(RESIDENTS_CACHE_KEY);
    localStorage.removeItem(ANNOUNCEMENTS_CACHE_KEY);
    localStorage.removeItem(MESSAGES_CACHE_KEY);
    pendingAnnouncementsRef.current.clear();
    pendingMessagesRef.current.clear();
    pendingResidentsRef.current.clear();
    setCurrentUser(null);
    const cloudMsgs = latestCloudMessagesRef.current;
    setMessages(cloudMsgs ? cloudMsgs : []);
    const cloudAnns = latestCloudAnnouncementsRef.current;
    setAnnouncements(cloudAnns ? cloudAnns : []);
    const cloudResidents = latestCloudResidentsRef.current;
    setResidents(cloudResidents && cloudResidents.length > 0 ? cloudResidents : INITIAL_RESIDENTS);
    setIsUnlocked(false);
    setIsInitialized(false);
    setIsRegisterOpen(true);
  };

  // 7.1 Emergency Reset PIN without losing user profile
  const handleEmergencyResetPin = async (newPin: string = '1234'): Promise<boolean> => {
    const rawHint = localStorage.getItem('snt_mezhdurechye_profile_hint');
    let hintUser: Partial<User> = {};
    if (rawHint) {
      try {
        hintUser = JSON.parse(rawHint);
      } catch {
        // ignore
      }
    }

    const userToKeep: User = currentUser || {
      id: `resident-${Date.now()}`,
      fullName: hintUser.fullName || 'Дмитрий Воронин',
      streetNumber: hintUser.streetNumber || '4-я улица',
      plotNumber: hintUser.plotNumber || '15',
      isAdmin: false,
      registeredAt: new Date().toISOString(),
      avatarColor: hintUser.avatarColor || 'bg-[#2d4a22]',
    };

    setCurrentUser(userToKeep);
    setActivePin(newPin);
    setIsInitialized(true);
    setIsUnlocked(true);
    setUnlockError('');

    await saveEncryptedVault(
      userToKeep,
      residents,
      messages,
      announcements,
      newPin
    );

    try {
      localStorage.setItem(
        'snt_mezhdurechye_profile_hint',
        JSON.stringify({
          fullName: userToKeep.fullName,
          streetNumber: userToKeep.streetNumber,
          plotNumber: userToKeep.plotNumber,
          avatarColor: userToKeep.avatarColor,
        })
      );
    } catch {
      // ignore
    }

    const rawStored = localStorage.getItem(STORAGE_KEY);
    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored);
        const fp = await computeFingerprint(newPin, parsed.salt);
        setKeyFingerprint(fp);
      } catch {
        // ignore
      }
    }
    return true;
  };

  // 8. Change PIN
  const handleChangePin = async (newPin: string): Promise<boolean> => {
    try {
      setActivePin(newPin);
      await saveEncryptedVault(currentUser, residents, messages, announcements, newPin);

      const rawStored = localStorage.getItem(STORAGE_KEY);
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        const fp = await computeFingerprint(newPin, parsed.salt);
        setKeyFingerprint(fp);
      }
      return true;
    } catch {
      return false;
    }
  };

  // 9. Send Chat Message
  const handleSendMessage = async (
    content: string,
    category: ChatMessage['category'] = 'general',
    replyTo?: ChatMessage['replyTo']
  ) => {
    if (!currentUser) return;
    if (isUserChatBlocked(currentUser)) {
      return;
    }

    const isChairman =
      currentUser.role === 'chairman' ||
      currentUser.isChairman ||
      currentUser.fullName.includes('Председатель');

    const userRole: UserRole =
      currentUser.role ||
      (isChairman ? 'chairman' : currentUser.isAdmin ? 'admin' : 'member');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorStreet: currentUser.streetNumber,
      authorPlot: currentUser.plotNumber,
      authorIsAdmin: !isChairman && !!currentUser.isAdmin,
      authorRole: userRole,
      hidePlotInChat: currentUser.hidePlotInChat,
      content,
      timestamp: new Date().toISOString(),
      category,
      replyTo,
      reactions: {},
    };

    const updated = [...messages, newMsg];
    setMessages(updated);

    // Sync message to Firestore server
    await saveMessageToFirestore(newMsg);

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, updated, announcements, activePin);
    }
  };

  // 10. Add/Toggle Chat Reaction
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    if (isUserChatBlocked(currentUser)) return;

    let updatedReactions: Record<string, string[]> = {};

    const updated = messages.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      const currentList = reactions[emoji] || [];

      if (currentList.includes(currentUser.id)) {
        // Remove reaction
        reactions[emoji] = currentList.filter((id) => id !== currentUser.id);
      } else {
        // Add reaction
        reactions[emoji] = [...currentList, currentUser.id];
      }
      updatedReactions = reactions;
      return { ...m, reactions };
    });

    setMessages(updated);

    // Sync reactions to Firestore server
    await updateMessageReactionsInFirestore(messageId, updatedReactions);

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, updated, announcements, activePin);
    }
  };

  // 10.1 Edit Message (author only)
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentUser) return;
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    // Only author can edit their own message
    if (target.authorId !== currentUser.id) {
      console.warn('Редактировать сообщение может только его автор');
      return;
    }

    const nowIso = new Date().toISOString();
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, content: newContent, editedAt: nowIso } : m
    );
    setMessages(updated);

    await updateMessageInFirestore(messageId, newContent, nowIso);

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, updated, announcements, activePin);
    }
  };

  // 10.2 Delete Message (author can delete own message, Admin can delete any message)
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    const isUserAdmin = checkIsAdmin(currentUser);
    const isAuthor = target.authorId === currentUser.id;

    if (!isAuthor && !isUserAdmin) {
      console.warn('Удалять сообщения могут только автор или администратор СНТ');
      return;
    }

    const updated = messages.filter((m) => m.id !== messageId);
    setMessages(updated);

    await deleteMessageFromFirestore(messageId);

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, updated, announcements, activePin);
    }
  };

  // 11. Simulate neighbor message
  const handleSimulateNeighborMessage = async () => {
    const sampleNeighbors: { name: string; street: string; plot: string; text: string; category: ChatMessage['category'] }[] = [
      { name: 'Иван Сергеевич', street: '2-я улица', plot: '17', text: 'Соседи, кто заказывал дрова на эти выходные? Можем объединить доставку с лесовоза, выйдет дешевле.', category: 'market' },
      { name: 'Татьяна Викторовна', street: '4-я улица', plot: '93', text: 'По саженцам яблонь: остался один саженец Белого налива и два Мельбы. Кому нужно — приходите на 93-й участок!', category: 'market' },
      { name: 'Николай (Береговая)', street: 'Береговая линия', plot: '5', text: 'Смотритель на реке проверил мостки после подъема воды — все в порядке, лодочная стоянка открыта.', category: 'security' },
      { name: 'Анатолий Петрович', street: '1-я улица', plot: '8', text: 'Спасибо правлению за оперативный ремонт фонаря на углу 1-й улицы!', category: 'electricity' },
      { name: 'Михаил (3-я улица)', street: '3-я улица', plot: '52', text: 'Трактор завершил грейдирование 3-й улицы, теперь проезд отличный!', category: 'roads' },
      { name: 'Евгений', street: '5-я улица', plot: '74', text: 'По поливной воде: давление в трубах стабильное, фильтры на насосной промыты.', category: 'water' },
    ];

    const pick = sampleNeighbors[Math.floor(Math.random() * sampleNeighbors.length)];
    const simMsg: ChatMessage = {
      id: `msg-sim-${Date.now()}`,
      authorId: `sim-${Date.now()}`,
      authorName: pick.name,
      authorStreet: pick.street,
      authorPlot: pick.plot,
      content: pick.text,
      timestamp: new Date().toISOString(),
      category: pick.category,
      reactions: { '👍': ['neighbor-1'] },
    };

    const updated = [...messages, simMsg];
    setMessages(updated);

    // Sync simulated message to Firestore server
    await saveMessageToFirestore(simMsg);

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, updated, announcements, activePin);
    }
  };

  // 12. Create Official Announcement
  const handleCreateAnnouncement = async (
    newAnn: Omit<Announcement, 'id' | 'date' | 'confirmedBy'>
  ) => {
    const ann: Announcement = {
      ...newAnn,
      id: `ann-${Date.now()}`,
      date: new Date().toISOString(),
      confirmedBy: currentUser ? [currentUser.id] : [],
    };

    pendingAnnouncementsRef.current.set(ann.id, ann);
    const updated = [ann, ...announcements.filter((a) => a.id !== ann.id)];
    setAnnouncements(updated);
    try {
      localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      // Sync announcement to Firestore server
      await saveAnnouncementToFirestore(ann);
      pendingAnnouncementsRef.current.delete(ann.id);
    } catch (err) {
      console.warn('Failed to save announcement to Firestore:', err);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 12.1 Edit Announcement
  const handleEditAnnouncement = async (updatedAnn: Announcement) => {
    pendingAnnouncementsRef.current.set(updatedAnn.id, updatedAnn);
    const updated = announcements.map((a) => (a.id === updatedAnn.id ? updatedAnn : a));
    setAnnouncements(updated);
    try {
      localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      // Sync edited announcement to Firestore server
      await saveAnnouncementToFirestore(updatedAnn);
      pendingAnnouncementsRef.current.delete(updatedAnn.id);
    } catch (err) {
      console.warn('Failed to update announcement in Firestore:', err);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 13. Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    pendingAnnouncementsRef.current.delete(id);
    const updated = announcements.filter((a) => a.id !== id);
    setAnnouncements(updated);
    try {
      localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      // Delete announcement from Firestore server
      await deleteAnnouncementFromFirestore(id);
    } catch (err) {
      console.warn('Failed to delete announcement from Firestore:', err);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 13.1 Clear All Announcements
  const handleClearAllAnnouncements = async () => {
    pendingAnnouncementsRef.current.clear();
    setAnnouncements([]);
    try {
      localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }

    try {
      // Delete all announcements from Firestore server
      await clearAllAnnouncementsFromFirestore();
    } catch (err) {
      console.warn('Failed to clear all announcements from Firestore:', err);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, [], activePin);
    }
  };

  // 14. Vote on Announcement Poll
  const handleVotePoll = async (announcementId: string, optionId: string) => {
    if (!currentUser) return;

    const updated = announcements.map((ann) => {
      if (ann.id !== announcementId || !ann.poll) return ann;

      const options = ann.poll.options.map((opt) => {
        // Remove user's previous vote from other options
        const filteredVotes = opt.votes.filter((id) => id !== currentUser.id);
        if (opt.id === optionId) {
          // Add vote
          return { ...opt, votes: [...filteredVotes, currentUser.id] };
        }
        return { ...opt, votes: filteredVotes };
      });

      return {
        ...ann,
        poll: { ...ann.poll, options },
      };
    });

    setAnnouncements(updated);

    const targetAnn = updated.find((a) => a.id === announcementId);
    if (targetAnn) {
      await saveAnnouncementToFirestore(targetAnn);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 15. Confirm Read Announcement
  const handleConfirmRead = async (announcementId: string) => {
    if (!currentUser) return;

    const updated = announcements.map((ann) => {
      if (ann.id !== announcementId) return ann;
      const list = ann.confirmedBy || [];
      if (list.includes(currentUser.id)) {
        return { ...ann, confirmedBy: list.filter((id) => id !== currentUser.id) };
      } else {
        return { ...ann, confirmedBy: [...list, currentUser.id] };
      }
    });

    setAnnouncements(updated);

    const targetAnn = updated.find((a) => a.id === announcementId);
    if (targetAnn) {
      await saveAnnouncementToFirestore(targetAnn);
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 15.5 Toggle Banner Pin (header banner across all tabs)
  const handleToggleBannerPin = async (announcementId: string) => {
    const updated = announcements.map((ann) => {
      if (ann.id !== announcementId) return ann;
      return { ...ann, isBannerPinned: !ann.isBannerPinned };
    });
    setAnnouncements(updated);

    const targetAnn = updated.find((a) => a.id === announcementId);
    if (targetAnn) {
      await saveAnnouncementToFirestore(targetAnn);
    }

    // If re-pinned to true, reset dismissal so it shows up again
    if (targetAnn?.isBannerPinned) {
      setDismissedBannerAnnouncementIds((prev) => {
        const next = prev.filter((id) => id !== announcementId);
        if (currentUser?.id) {
          try {
            localStorage.setItem(
              `snt_mezhdurechye_dismissed_banners_${currentUser.id}`,
              JSON.stringify(next)
            );
          } catch {
            // ignore
          }
        }
        return next;
      });
    }

    if (activePin) {
      await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
    }
  };

  // 15.6 Dismiss or Unpin Banner Announcement via Cross button
  // If Chairman or Admin clicks -> unpins for everyone (cloud and local sync via Firestore)
  // If regular member clicks -> hides only for that resident on this device (Firestore is NOT modified!)
  const handleDismissBannerAnnouncement = async (announcementId: string) => {
    if (isPrivilegedUser) {
      // 1. Председатель или Администратор (правление):
      // Открепляем объявление у ВСЕХ пользователей: меняем isBannerPinned: false и сохраняем в Firestore
      const updated = announcements.map((ann) => {
        if (ann.id !== announcementId) return ann;
        return { ...ann, isBannerPinned: false };
      });
      setAnnouncements(updated);

      const targetAnn = updated.find((a) => a.id === announcementId);
      if (targetAnn) {
        await saveAnnouncementToFirestore(targetAnn);
      }
      if (activePin) {
        await saveEncryptedVault(currentUser, residents, messages, updated, activePin);
      }
    } else {
      // 2. Обычный садовод:
      // В облачную базу данных (Firestore) НИЧЕГО НЕ ОТПРАВЛЯЕТСЯ! isBannerPinned остается активным для остальных садоводов.
      // Плашка скрывается ТОЛЬКО локально у данного садовода (сохраняется в памяти его устройства)
      const userId = currentUser?.id || 'guest';
      const userSpecificKey = `snt_mezhdurechye_dismissed_banners_${userId}`;

      setDismissedBannerAnnouncementIds((prev) => {
        const next = prev.includes(announcementId) ? prev : [...prev, announcementId];
        try {
          localStorage.setItem(userSpecificKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  // Jump from header banner to announcement
  const handleGoToAnnouncement = (announcementId: string) => {
    handleTabChange('announcements');
    setHighlightedAnnouncementId(announcementId);
    setTimeout(() => {
      const el = document.getElementById(`announcement-${announcementId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
    setTimeout(() => {
      setHighlightedAnnouncementId(null);
    }, 3500);
  };

  // 16. Update Profile
  const handleUpdateProfile = async (
    userData: Omit<User, 'id' | 'registeredAt'>
  ) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      ...userData,
    };

    setCurrentUser(updatedUser);
    const updatedResidents = residents.map((r) =>
      r.id === updatedUser.id ? updatedUser : r
    );
    setResidents(updatedResidents);
    setIsEditProfileOpen(false);

    // Sync profile to Firestore cloud database
    await saveResidentToFirestore(updatedUser);

    if (activePin) {
      await saveEncryptedVault(
        updatedUser,
        updatedResidents,
        messages,
        announcements,
        activePin
      );
    }
  };

  // 17. Switch Active Test Resident
  const handleSwitchUser = async (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('snt_mezhdurechye_active_user_id', user.id);
    } catch {
      // ignore
    }
    if (activePin) {
      await saveEncryptedVault(user, residents, messages, announcements, activePin);
    }
  };

  // 17.1 Add Resident to Directory (Chairman & Admin)
  const handleAddResident = async (newResidentData: Omit<User, 'id' | 'registeredAt'>) => {
    const newResident: User = {
      ...newResidentData,
      id: `resident-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      registeredAt: new Date().toISOString(),
    };
    const currentList = residents.length > 0 ? residents : loadCachedResidents();
    const updated = [
      newResident,
      ...currentList.filter(
        (r) =>
          r.id !== newResident.id &&
          r.fullName.trim().toLowerCase() !== newResidentData.fullName.trim().toLowerCase()
      ),
    ];
    setResidents(updated);

    // Sync new resident to Firestore cloud database
    await saveResidentToFirestore(newResident);

    const pinToUse = activePin || '1234';
    await saveEncryptedVault(currentUser, updated, messages, announcements, pinToUse);
  };

  // 17.1.1 Update Resident Role / Status (Admin only)
  const handleUpdateResidentRole = async (residentId: string, newRole: UserRole) => {
    if (!checkIsAdmin(currentUser)) {
      console.warn('Изменение статуса садоводов доступно исключительно администратору');
      return;
    }

    let changedResident: User | null = null;
    const updatedList = residents.map((r) => {
      if (r.id !== residentId) return r;
      const res = {
        ...r,
        role: newRole,
        isAdmin: newRole === 'admin',
        isChairman: newRole === 'chairman',
      };
      changedResident = res;
      return res;
    });

    setResidents(updatedList);

    if (changedResident) {
      await saveResidentToFirestore(changedResident);
    }

    let updatedCurrentUser = currentUser;
    if (currentUser && currentUser.id === residentId) {
      updatedCurrentUser = {
        ...currentUser,
        role: newRole,
        isAdmin: newRole === 'admin',
        isChairman: newRole === 'chairman',
      };
      setCurrentUser(updatedCurrentUser);
    }

    const pinToUse = activePin || '1234';
    await saveEncryptedVault(
      updatedCurrentUser,
      updatedList,
      messages,
      announcements,
      pinToUse
    );
  };

  // 17.1.2 Update Chat Block Status (Admin only)
  const handleUpdateChatBlock = async (
    residentId: string,
    blocked: boolean,
    durationMinutes?: number | null,
    reason?: string
  ) => {
    if (!checkIsAdmin(currentUser)) {
      console.warn('Блокировка пользователей в чате доступна исключительно администратору');
      return;
    }

    let changedResident: User | null = null;
    const nowIso = new Date().toISOString();
    let blockUntil: string | null = null;

    if (blocked) {
      if (durationMinutes && durationMinutes > 0) {
        blockUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      } else {
        blockUntil = 'indefinite'; // permanent until unblocked
      }
    }

    const updatedList = residents.map((r) => {
      if (r.id !== residentId) return r;
      const res: User = {
        ...r,
        chatBlocked: blocked,
        chatBlockUntil: blocked ? blockUntil : null,
        chatBlockReason: blocked ? (reason || 'Нарушение правил чата СНТ') : undefined,
        chatBlockedAt: blocked ? nowIso : undefined,
        chatBlockedBy: blocked ? currentUser?.fullName : undefined,
      };
      changedResident = res;
      return res;
    });

    setResidents(updatedList);

    if (changedResident) {
      await saveResidentToFirestore(changedResident);
    }

    let updatedCurrentUser = currentUser;
    if (currentUser && currentUser.id === residentId) {
      updatedCurrentUser = {
        ...currentUser,
        chatBlocked: blocked,
        chatBlockUntil: blocked ? blockUntil : null,
        chatBlockReason: blocked ? (reason || 'Нарушение правил чата СНТ') : undefined,
        chatBlockedAt: blocked ? nowIso : undefined,
        chatBlockedBy: blocked ? currentUser?.fullName : undefined,
      };
      setCurrentUser(updatedCurrentUser);
    }

    const pinToUse = activePin || '1234';
    await saveEncryptedVault(
      updatedCurrentUser,
      updatedList,
      messages,
      announcements,
      pinToUse
    );
  };

  // 17.1.3 Delete Resident from Directory (Admin only)
  const handleDeleteResident = async (residentId: string) => {
    if (!checkIsAdmin(currentUser)) {
      console.warn('Удаление садоводов доступно исключительно администратору');
      return;
    }

    const updatedList = residents.filter((r) => r.id !== residentId);
    setResidents(updatedList);

    try {
      localStorage.setItem(RESIDENTS_CACHE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    // Auto-clean deleted resident from all announcements (confirmedBy & poll votes)
    const cleanedAnnouncements = announcements.map((ann) => {
      const isConfirmed = ann.confirmedBy?.includes(residentId);
      const isVoted = ann.poll?.options.some((opt) => opt.votes.includes(residentId));

      if (!isConfirmed && !isVoted) return ann;

      const updatedAnn: Announcement = {
        ...ann,
        confirmedBy: (ann.confirmedBy || []).filter((id) => id !== residentId),
        poll: ann.poll
          ? {
              ...ann.poll,
              options: ann.poll.options.map((opt) => ({
                ...opt,
                votes: (opt.votes || []).filter((id) => id !== residentId),
              })),
            }
          : undefined,
      };

      // Sync cleaned announcement to Firestore
      saveAnnouncementToFirestore(updatedAnn).catch(console.warn);
      return updatedAnn;
    });

    setAnnouncements(cleanedAnnouncements);
    try {
      localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(cleanedAnnouncements));
    } catch {
      // ignore
    }

    // Delete resident from Firestore cloud database
    await deleteResidentFromFirestore(residentId);

    const pinToUse = activePin || '1234';
    await saveEncryptedVault(
      currentUser,
      updatedList,
      messages,
      cleanedAnnouncements,
      pinToUse
    );
  };

  // 17.2 Add Block to Info-Stand / Section (Chairman & Admin)
  const handleAddBlock = (newBlock: AppBlockConfig) => {
    const updatedBlocks = [...appConfig.blocks, newBlock];
    handleUpdateAppConfig({ ...appConfig, blocks: updatedBlocks });
  };

  // 17.3 Update Block (Chairman & Admin)
  const handleUpdateBlock = (updatedBlock: AppBlockConfig) => {
    const updatedBlocks = appConfig.blocks.map((b) =>
      b.id === updatedBlock.id ? updatedBlock : b
    );
    handleUpdateAppConfig({ ...appConfig, blocks: updatedBlocks });
  };

  // 17.4 Delete Block (Chairman & Admin)
  const handleDeleteBlock = (blockId: string) => {
    const updatedBlocks = appConfig.blocks.filter((b) => b.id !== blockId);
    handleUpdateAppConfig({ ...appConfig, blocks: updatedBlocks });
  };

  // 17.5 Reorder Blocks (Chairman & Admin)
  const handleReorderBlocks = (newBlocks: AppBlockConfig[]) => {
    handleUpdateAppConfig({ ...appConfig, blocks: newBlocks });
  };

  // 17.6 Migrate any legacy customContent.items into uniform blocks
  const handleMigrateLegacySectionItems = (migratedBlocks: AppBlockConfig[], sectionId: string) => {
    const updatedSections = appConfig.sections.map((sec) =>
      sec.id === sectionId && sec.customContent?.items
        ? {
            ...sec,
            customContent: {
              ...sec.customContent,
              items: [],
            },
          }
        : sec
    );
    const existingIds = new Set(appConfig.blocks.map((b) => b.id));
    const newBlocksToAdd = migratedBlocks.filter((b) => !existingIds.has(b.id));
    handleUpdateAppConfig({
      ...appConfig,
      sections: updatedSections,
      blocks: [...appConfig.blocks, ...newBlocksToAdd],
    });
  };

  // 17.6 Add Content Item to Section/Info-Stand (backward compatibility)
  const handleAddSectionContentItem = async (sectionId: string, item: CustomContentItem) => {
    const updatedSections = appConfig.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      const existingItems = sec.customContent?.items || [];
      return {
        ...sec,
        customContent: {
          title: sec.customContent?.title || sec.label,
          description: sec.customContent?.description || sec.subtitle,
          items: [item, ...existingItems],
        },
      };
    });

    const newConfig: AppConfig = {
      ...appConfig,
      sections: updatedSections,
    };
    handleUpdateAppConfig(newConfig);
  };

  // 18. Export Encrypted Vault (.snt-vault file)
  const handleExportVault = () => {
    const rawStored = localStorage.getItem(STORAGE_KEY);
    if (!rawStored) return;

    const blob = new Blob([rawStored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snt-mezhdurechye-encrypted-vault-${new Date()
      .toISOString()
      .slice(0, 10)}.snt-vault`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 19. Import Encrypted Vault from neighbor / file
  const handleImportVault = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.ciphertext || !parsed.salt) {
        return { success: false, message: 'Файл поврежден или не является зашифрованной базой СНТ' };
      }

      // Try decrypting with active PIN
      const result = await verifyAndDecryptVault(parsed, activePin);
      if (!result.success || !result.data) {
        return {
          success: false,
          message: 'Не удалось расшифровать файл текущим PIN-кодом. Проверьте правильность ключа.',
        };
      }

      const incomingData: VaultData = result.data;

      // Merge messages (deduplicate by id)
      const existingMsgIds = new Set(messages.map((m) => m.id));
      const newMessages = (incomingData.messages || []).filter((m) => !existingMsgIds.has(m.id));
      const mergedMessages = [...messages, ...newMessages];

      // Merge announcements
      const existingAnnIds = new Set(announcements.map((a) => a.id));
      const newAnnouncements = (incomingData.announcements || []).filter((a) => !a.isDeleted && !existingAnnIds.has(a.id));
      const mergedAnnouncements = [...announcements, ...newAnnouncements];

      // Merge residents
      const existingResIds = new Set(residents.map((r) => r.id));
      const newResidents = (incomingData.residents || []).filter((r) => !existingResIds.has(r.id));
      const mergedResidents = [...residents, ...newResidents];

      setMessages(mergedMessages);
      setAnnouncements(mergedAnnouncements);
      setResidents(mergedResidents);

      await saveEncryptedVault(
        currentUser,
        mergedResidents,
        mergedMessages,
        mergedAnnouncements,
        activePin
      );

      return {
        success: true,
        message: `Успешно импортировано: +${newMessages.length} сообщений, +${newAnnouncements.length} объявлений!`,
      };
    } catch {
      return { success: false, message: 'Ошибка при чтении файла резервной копии' };
    }
  };

  // Unread announcements count (only published announcements count as unread)
  const unreadCount = announcements.filter(
    (a) => !a.isDeleted && isAnnouncementPublished(a) && currentUser && !(a.confirmedBy || []).includes(currentUser.id)
  ).length;

  // Unread chat messages count based on user's last visit timestamp
  const unreadChatCount =
    activeTab === 'chat' || !isUnlocked
      ? 0
      : messages.filter((m) => {
          // Own messages are never unread
          if (currentUser && m.authorId === currentUser.id) return false;
          // If no visit timestamp recorded yet, all neighbor messages are unread
          if (!lastChatVisitTimestamp) return true;
          const msgTime = new Date(m.timestamp).getTime();
          const visitTime = new Date(lastChatVisitTimestamp).getTime();
          return !isNaN(msgTime) && !isNaN(visitTime) && msgTime > visitTime;
        }).length;

  // Whenever user is actively viewing chat, keep visit timestamp synchronized
  useEffect(() => {
    if (isUnlocked && activeTab === 'chat') {
      const nowIso = new Date().toISOString();
      setLastChatVisitTimestamp(nowIso);
      localStorage.setItem('snt_mezhdurechye_last_chat_visit', nowIso);
    }
  }, [activeTab, isUnlocked, messages.length]);

  const isTabAllowedForRole = (tab: TabType, role: UserRole): boolean => {
    if (tab === 'security') return false;
    if (tab === 'admin') {
      return role === 'admin' || Boolean(currentUser?.isAdmin);
    }
    const sec = appConfig.sections.find((s) => s.id === tab);
    if (!sec) return true;
    return isSectionVisibleForRole(
      sec,
      role,
      currentUser?.isAdmin,
      currentUser?.isChairman || currentUser?.role === 'chairman'
    );
  };

  // Redirect to first allowed tab if active tab is forbidden for current role
  useEffect(() => {
    if (isUnlocked && currentUser && !isTabAllowedForRole(activeTab, userRole)) {
      const firstAllowed = appConfig.sections.find((s) =>
        isSectionVisibleForRole(
          s,
          userRole,
          currentUser?.isAdmin,
          currentUser?.isChairman || currentUser?.role === 'chairman'
        )
      );
      setActiveTab(firstAllowed ? (firstAllowed.id as TabType) : 'info');
    }
  }, [isUnlocked, currentUser, userRole, activeTab, appConfig.sections]);

  // Tab change handler ensuring chat visits update timestamp immediately
  const handleTabChange = (newTab: TabType) => {
    if (currentUser && !isTabAllowedForRole(newTab, userRole)) {
      return;
    }
    if (activeTab === 'chat' && newTab !== 'chat') {
      const nowIso = new Date().toISOString();
      setLastChatVisitTimestamp(nowIso);
      localStorage.setItem('snt_mezhdurechye_last_chat_visit', nowIso);
    } else if (newTab === 'chat') {
      const nowIso = new Date().toISOString();
      setLastChatVisitTimestamp(nowIso);
      localStorage.setItem('snt_mezhdurechye_last_chat_visit', nowIso);
    }
    setActiveTab(newTab);
    window.scrollTo({ top: 0, left: 0 });
  };

  // Handle configuration changes from AdminStudio
  const handleUpdateAppConfig = async (newConfig: AppConfig) => {
    setAppConfig(newConfig);
    saveAppConfig(newConfig);
    await saveAppConfigToFirestore(newConfig);

    // If active tab was a section that has been deleted, smoothly fallback to a remaining section
    const standardTabs = ['chat', 'announcements', 'residents', 'admin'];
    const tabExists = standardTabs.includes(activeTab) || newConfig.sections.some((s) => s.id === activeTab);
    if (!tabExists) {
      const fallbackTab = newConfig.sections[0]?.id || 'announcements';
      setActiveTab(fallbackTab);
    }

    if (activePin) {
      saveEncryptedVault(
        currentUser,
        residents,
        messages,
        announcements,
        activePin,
        newConfig
      );
    }
  };

  // Find all active top banner blocks that have not been individually dismissed
  const activeGlobalBanners = appConfig.blocks.filter(
    (b) => b.section === 'global_banner' && b.enabled && !dismissedBannerIds.includes(b.id)
  );

  // Announcements pinned to top global header banner across all tabs
  // Для членов правления (Председатель и Админ) закрепленная плашка отображается ВСЕГДА, пока активна в базе данных.
  // Для обычных садоводов плашка скрывается только в том случае, если данный садовод нажал крестик локально у себя.
  // Отложенные объявления не отображаются в верхней плашке до наступления времени их публикации!
  const bannerPinnedAnnouncements = announcements.filter((a) => {
    if (a.isDeleted) return false;
    if (!a.isBannerPinned) return false;
    if (!isAnnouncementPublished(a)) return false;
    if (isPrivilegedUser) return true;
    return !dismissedBannerAnnouncementIds.includes(a.id);
  });

  return (
    <div className="min-h-screen bg-[#fdfcf8] text-[#2c3e2d] flex flex-col font-sans antialiased">
      {/* 1. Primary Authentication Modal (Войти / Регистрация) */}
      {(!isUnlocked || isRegisterOpen) && (
        <RegisterModal
          isOpen={true}
          onRegister={handleRegister}
          onLogin={handleLogin}
          residents={residents.length > 0 ? residents : loadCachedResidents()}
          onClose={isUnlocked ? () => setIsRegisterOpen(false) : undefined}
          initialMode={
            (residents.length > 0 ? residents : loadCachedResidents()).some((r) => Boolean(r.password))
              ? 'login'
              : 'register'
          }
          adminSecretPassword={appConfig.adminSecretPassword || 'V6544Dv*'}
          brandingName={appConfig.branding?.appName}
        />
      )}

      {/* 2. Edit Profile Modal */}
      {isEditProfileOpen && currentUser && (
        <RegisterModal
          isOpen={isEditProfileOpen}
          existingUser={currentUser}
          onRegister={handleUpdateProfile}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}

      {/* Sticky Header & Pinned Banners Container */}
      <div className="sticky top-0 z-40">
        <MobileHeader
          currentUser={isUnlocked ? currentUser : null}
          branding={appConfig.branding}
          isCloudConnected={isCloudConnected}
          onRefresh={refreshFromCloud}
          isRefreshing={isRefreshingCloud}
          onLock={handleLockNow}
          onOpenProfile={() => {
            if (userRole === 'member') {
              setIsEditProfileOpen(true);
            } else {
              handleTabChange('residents');
            }
          }}
          onOpenAdmin={() => handleTabChange('admin')}
          onSwitchUser={() => setIsRegisterOpen(true)}
        />

        {/* Pinned Announcement Header Bar (Pinned to header, visible on all tabs, clickable to navigate) */}
        {bannerPinnedAnnouncements.map((ann) => {
          const isUrgent = ann.priority === 'urgent';
          const isImportant = ann.priority === 'important';

          let bannerBg = 'bg-[#f4f7f1] border-b border-[#dce3d5] text-[#2d4a22] hover:bg-[#edf2e7]';
          let badgeBg = 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]';
          let pinIconColor = 'text-[#2d4a22]';
          let arrowColor = 'text-[#2d4a22]';

          if (isUrgent) {
            bannerBg = 'bg-[#fffbeb] border-b border-[#fde68a] text-[#78350f] hover:bg-[#fef3c7]';
            badgeBg = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
            pinIconColor = 'text-[#b45309]';
            arrowColor = 'text-[#b45309]';
          } else if (isImportant) {
            bannerBg = 'bg-[#fffdf5] border-b border-[#fde68a] text-[#92400e] hover:bg-[#fef9ee]';
            badgeBg = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
            pinIconColor = 'text-[#b45309]';
            arrowColor = 'text-[#92400e]';
          }

          return (
            <aside
              key={`banner-pinned-${ann.id}`}
              id={`header-pinned-announcement-${ann.id}`}
              aria-label={`Закрепленное объявление: ${ann.title}`}
              onClick={() => handleGoToAnnouncement(ann.id)}
              className={`${bannerBg} px-3 sm:px-6 py-2.5 shadow-2xs transition-colors duration-150 cursor-pointer relative z-30 group border-b select-none`}
            >
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                    <Pin className={`w-4 h-4 ${pinIconColor}`} />
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border shrink-0 ${badgeBg}`}>
                      {isUrgent ? 'Срочно' : isImportant ? 'Важно' : 'Объявление'}
                    </span>
                    <span className="font-bold truncate text-xs sm:text-[13px] leading-tight group-hover:underline">
                      {ann.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-0.5 ${arrowColor}`}>
                    <span className="hidden sm:inline">К объявлению</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissBannerAnnouncement(ann.id);
                    }}
                    className="p-1 rounded-lg text-inherit/50 hover:text-inherit hover:bg-black/5 transition cursor-pointer"
                    title={
                      isPrivilegedUser
                        ? 'Открепить из шапки у всех (Председатель/Админ)'
                        : 'Скрыть эту плашку у себя'
                    }
                    aria-label={
                      isPrivilegedUser
                        ? 'Открепить из шапки у всех'
                        : 'Скрыть эту плашку у себя'
                    }
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          );
        })}

        {/* Global Banner Notifications (from appConfig blocks) */}
        {activeGlobalBanners.map((banner) => {
          const isAmber = banner.accentColor === 'amber';
          const isSky = banner.accentColor === 'sky';
          const isRose = banner.accentColor === 'rose';

          let bannerBg = 'bg-[#f4f7f1] border-b border-[#dce3d5] text-[#2c3e2d]';
          let iconColor = 'text-[#2d4a22]';
          let badgeBg = 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]';
          let btnColor = 'text-[#5a6b52] hover:text-[#2c3e2d]';

          if (isAmber) {
            bannerBg = 'bg-[#fffbeb] border-b border-[#fde68a] text-[#78350f]';
            iconColor = 'text-[#b45309]';
            badgeBg = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
            btnColor = 'text-[#92400e] hover:text-[#78350f]';
          } else if (isRose) {
            bannerBg = 'bg-[#fff1f2] border-b border-[#fecdd3] text-[#9f1239]';
            iconColor = 'text-[#e11d48]';
            badgeBg = 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]';
            btnColor = 'text-[#be123c] hover:text-[#9f1239]';
          } else if (isSky) {
            bannerBg = 'bg-[#f0f9ff] border-b border-[#bae6fd] text-[#0369a1]';
            iconColor = 'text-[#0284c7]';
            badgeBg = 'bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]';
            btnColor = 'text-[#0284c7] hover:text-[#0369a1]';
          }

          return (
            <aside
              key={banner.id}
              aria-label={`Оповещение: ${banner.title}`}
              className={`${bannerBg} px-3 sm:px-6 py-2 shadow-2xs transition`}
            >
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <AlertTriangle className={`w-4 h-4 ${iconColor} shrink-0`} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold">{banner.title}:</span>
                    {banner.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${badgeBg}`}>
                        {banner.badge}
                      </span>
                    )}
                    <span className="opacity-95">{banner.content}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedBannerIds((prev) => [...prev, banner.id])}
                  className={`${btnColor} p-1 font-bold text-xs shrink-0 cursor-pointer rounded hover:bg-black/5 transition`}
                  title="Скрыть оповещение"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </aside>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 pb-20 sm:pb-24">
        {currentUser && (
          <>
            {activeTab === 'chat' && (
              <CommunityChat
                currentUser={currentUser}
                messages={messages}
                residents={residents}
                blocks={appConfig.blocks}
                chatTopics={appConfig.chatTopics || DEFAULT_CHAT_TOPICS}
                onUpdateChatTopics={(newTopics) =>
                  handleUpdateAppConfig({ ...appConfig, chatTopics: newTopics })
                }
                lastVisitTimestamp={lastChatVisitTimestamp}
                onSendMessage={handleSendMessage}
                onAddReaction={handleAddReaction}
                onSimulateNeighborMessage={handleSimulateNeighborMessage}
                onUpdateChatBlock={handleUpdateChatBlock}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            )}

            {activeTab === 'announcements' && (
              <AdminAnnouncements
                currentUser={currentUser}
                announcements={announcements}
                residents={residents}
                blocks={appConfig.blocks}
                announcementCategories={appConfig.announcementCategories}
                highlightedAnnouncementId={highlightedAnnouncementId}
                onVotePoll={handleVotePoll}
                onConfirmRead={handleConfirmRead}
                onCreateAnnouncement={handleCreateAnnouncement}
                onEditAnnouncement={handleEditAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                onClearAllAnnouncements={handleClearAllAnnouncements}
                onToggleBannerPin={handleToggleBannerPin}
                onRefresh={refreshFromCloud}
                isRefreshing={isRefreshingCloud}
                onEnableAdmin={() => {
                  const code = window.prompt(`Введите код правления СНТ (тестовый код: ${appConfig.adminCode || '2026'}):`);
                  if (code === (appConfig.adminCode || '2026') || code?.toUpperCase() === 'МЕЖДУРЕЧЬЕ') {
                    handleUpdateProfile({ ...currentUser, isAdmin: true });
                  } else if (code !== null) {
                    alert('Неверный код правления');
                  }
                }}
              />
            )}

            {activeTab === 'residents' && (
              <ResidentsDirectory
                currentUser={currentUser}
                residents={residents}
                onEditProfile={() => setIsEditProfileOpen(true)}
                onUpdateResidentRole={handleUpdateResidentRole}
                onUpdateChatBlock={handleUpdateChatBlock}
                onDeleteResident={handleDeleteResident}
              />
            )}

            {activeTab === 'admin' && (
              <AdminStudio
                currentUser={currentUser}
                config={appConfig}
                onSaveConfig={handleUpdateAppConfig}
                onClose={() => handleTabChange('info')}
                onUpdateCurrentUserAdmin={(isAdmin) =>
                  handleUpdateProfile({ ...currentUser, isAdmin })
                }
                lastChatVisitTimestamp={lastChatVisitTimestamp}
                unreadChatCount={unreadChatCount}
                onSetLastChatVisitTimestamp={(ts) => {
                  setLastChatVisitTimestamp(ts);
                  localStorage.setItem('snt_mezhdurechye_last_chat_visit', ts);
                }}
                onSimulateNeighborMessage={handleSimulateNeighborMessage}
                residents={residents}
                onUpdateResidentRole={handleUpdateResidentRole}
                onUpdateChatBlock={handleUpdateChatBlock}
                onDeleteResident={handleDeleteResident}
              />
            )}

            {/* Any other dynamic section (e.g. 'info' or custom created sections) */}
            {!['chat', 'announcements', 'residents', 'admin'].includes(activeTab) && (
              (() => {
                const currentSec = appConfig.sections.find((s) => s.id === activeTab);
                if (!currentSec) {
                  return (
                    <div className="text-center py-12 bg-white rounded-3xl border border-[#dce3d5] p-6 text-[#7a8c71] text-xs space-y-2">
                      <p>Раздел временно отключен или перемещен.</p>
                      <button
                        type="button"
                        onClick={() => handleTabChange('info')}
                        className="px-3 py-1.5 bg-[#2d4a22] text-white rounded-xl font-bold"
                      >
                        Вернуться на Инфо-стенд
                      </button>
                    </div>
                  );
                }
                return (
                  <CustomSectionView
                    section={currentSec}
                    blocks={appConfig.blocks}
                    currentUser={currentUser}
                    onOpenAdmin={() => handleTabChange('admin')}
                    onAddBlock={handleAddBlock}
                    onUpdateBlock={handleUpdateBlock}
                    onDeleteBlock={handleDeleteBlock}
                    onReorderBlocks={handleReorderBlocks}
                    onMigrateLegacyItems={handleMigrateLegacySectionItems}
                    onAddContentItem={handleAddSectionContentItem}
                  />
                );
              })()
            )}
          </>
        )}
      </main>

      {/* Natural Tones Minimal Footer */}
      <footer className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3 pb-24 sm:pb-24 text-[11px] text-[#7a8c71] flex items-center justify-between gap-1 border-t border-[#dce3d5] mt-auto">
        <span>{appConfig.branding.footerText || appConfig.branding.appName || 'СНТ «Междуречье»'}</span>
      </footer>

      {/* Bottom Tab Navigation */}
      {isUnlocked && (
        <MobileNavigation
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          unreadAnnouncementsCount={unreadCount}
          unreadChatCount={unreadChatCount}
          sections={appConfig.sections}
          isAdmin={currentUser?.isAdmin ?? false}
          isChairman={currentUser?.isChairman || currentUser?.role === 'chairman'}
          role={userRole}
        />
      )}
    </div>
  );
}
