import React from 'react';
import {
  Info,
  Phone,
  Droplets,
  Clock,
  AlertTriangle,
  Lightbulb,
  FileText,
  Calendar,
  Shield,
  HelpCircle,
  Megaphone,
  Heart,
  Home,
  MapPin,
  Flame,
  Zap,
  Hammer,
  Truck,
  Car,
  Bell,
  CheckCircle2,
  AlertCircle,
  Key,
  Compass,
  Smile,
  Leaf,
  Sprout,
  TreePine,
  Flower2,
  Apple,
  Wrench,
  Construction,
  Settings,
  Mail,
  User,
  Users,
  Building,
  Store,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  BookOpen,
  Bookmark,
  Award,
  Star,
  Flag,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { BlockIconConfig } from '../types';

/**
 * Registry of Lucide icons available for app blocks and sections
 */
export const ICON_COMPONENT_REGISTRY: Record<string, LucideIcon> = {
  Info,
  Phone,
  Droplets,
  Clock,
  AlertTriangle,
  Lightbulb,
  FileText,
  Calendar,
  Shield,
  HelpCircle,
  Megaphone,
  Heart,
  Home,
  MapPin,
  Flame,
  Zap,
  Hammer,
  Truck,
  Car,
  Bell,
  CheckCircle2,
  AlertCircle,
  Key,
  Compass,
  Smile,
  Leaf,
  Sprout,
  TreePine,
  Flower2,
  Apple,
  Wrench,
  Construction,
  Settings,
  Mail,
  User,
  Users,
  Building,
  Store,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  BookOpen,
  Bookmark,
  Award,
  Star,
  Flag,
  Sparkles,
};

/**
 * Standard default list of block icons shown when creating or editing blocks
 */
export const DEFAULT_BLOCK_ICONS: BlockIconConfig[] = [
  { id: 'Info', label: 'Инфо', iconName: 'Info' },
  { id: 'Phone', label: 'Телефон', iconName: 'Phone' },
  { id: 'Droplets', label: 'Вода', iconName: 'Droplets' },
  { id: 'Clock', label: 'Часы / Режим', iconName: 'Clock' },
  { id: 'AlertTriangle', label: 'Внимание', iconName: 'AlertTriangle' },
  { id: 'Lightbulb', label: 'Совет', iconName: 'Lightbulb' },
  { id: 'FileText', label: 'Документ', iconName: 'FileText' },
  { id: 'Calendar', label: 'График', iconName: 'Calendar' },
  { id: 'Shield', label: 'Охрана', iconName: 'Shield' },
  { id: 'Zap', label: 'Электричество', iconName: 'Zap' },
  { id: 'TreePine', label: 'Экология / Лес', iconName: 'TreePine' },
  { id: 'Wrench', label: 'Ремонт / Мастер', iconName: 'Wrench' },
  { id: 'Truck', label: 'Транспорт / Дороги', iconName: 'Truck' },
  { id: 'CreditCard', label: 'Взносы / Оплата', iconName: 'CreditCard' },
];

/**
 * Helper to dynamically render a block icon with fallback to Info
 */
export const renderBlockIcon = (
  iconIdOrName?: string,
  className: string = 'w-4 h-4 shrink-0 text-[#2d4a22]',
  customIcons?: BlockIconConfig[]
): React.ReactElement => {
  if (!iconIdOrName) {
    return <Info className={className} />;
  }

  // 1. Check if it matches a custom icon definition
  if (customIcons && customIcons.length > 0) {
    const custom = customIcons.find((c) => c.id === iconIdOrName || c.iconName === iconIdOrName);
    if (custom && ICON_COMPONENT_REGISTRY[custom.iconName]) {
      const Comp = ICON_COMPONENT_REGISTRY[custom.iconName];
      return <Comp className={className} />;
    }
  }

  // 2. Direct lookup in icon registry
  if (ICON_COMPONENT_REGISTRY[iconIdOrName]) {
    const Comp = ICON_COMPONENT_REGISTRY[iconIdOrName];
    return <Comp className={className} />;
  }

  // 3. Check default icons
  const def = DEFAULT_BLOCK_ICONS.find((d) => d.id === iconIdOrName);
  if (def && ICON_COMPONENT_REGISTRY[def.iconName]) {
    const Comp = ICON_COMPONENT_REGISTRY[def.iconName];
    return <Comp className={className} />;
  }

  // Fallback
  return <Info className={className} />;
};

/**
 * Available Lucide icons catalog for the admin to choose from when adding or editing an icon
 */
export const POPULAR_ICON_OPTIONS: { iconName: string; label: string; category: string }[] = [
  // Основные
  { iconName: 'Info', label: 'Информация', category: 'Общие' },
  { iconName: 'HelpCircle', label: 'Вопрос / Справка', category: 'Общие' },
  { iconName: 'AlertTriangle', label: 'Предупреждение', category: 'Общие' },
  { iconName: 'AlertCircle', label: 'Важное уведомление', category: 'Общие' },
  { iconName: 'Bell', label: 'Колокольчик / Звонок', category: 'Общие' },
  { iconName: 'Megaphone', label: 'Рупор / Оповещение', category: 'Общие' },
  { iconName: 'Lightbulb', label: 'Идея / Совет', category: 'Общие' },
  { iconName: 'Star', label: 'Избранное', category: 'Общие' },
  { iconName: 'CheckCircle2', label: 'Готово / Успех', category: 'Общие' },
  { iconName: 'Flag', label: 'Флаг / Отметка', category: 'Общие' },
  { iconName: 'Sparkles', label: 'Новинка / Акцент', category: 'Общие' },

  // СНТ и природа
  { iconName: 'Home', label: 'Дом / Участок', category: 'СНТ' },
  { iconName: 'MapPin', label: 'Местоположение', category: 'СНТ' },
  { iconName: 'Droplets', label: 'Водоснабжение / Полив', category: 'СНТ' },
  { iconName: 'Zap', label: 'Электричество / Свет', category: 'СНТ' },
  { iconName: 'TreePine', label: 'Лес / Дерево', category: 'СНТ' },
  { iconName: 'Leaf', label: 'Лист / Растения', category: 'СНТ' },
  { iconName: 'Sprout', label: 'Росток / Сад', category: 'СНТ' },
  { iconName: 'Flower2', label: 'Цветы / Клумба', category: 'СНТ' },
  { iconName: 'Apple', label: 'Урожай / Плоды', category: 'СНТ' },
  { iconName: 'Flame', label: 'Пожарная безопасность', category: 'СНТ' },

  // Работы и инфраструктура
  { iconName: 'Wrench', label: 'Инструмент / Ремонт', category: 'Работы' },
  { iconName: 'Hammer', label: 'Строительство', category: 'Работы' },
  { iconName: 'Construction', label: 'Дорожные работы', category: 'Работы' },
  { iconName: 'Truck', label: 'Грузовик / Вывоз мусора', category: 'Работы' },
  { iconName: 'Car', label: 'Шлагбаум / Парковка', category: 'Работы' },
  { iconName: 'Key', label: 'Ключи / Доступ', category: 'Работы' },
  { iconName: 'Shield', label: 'Охрана / КПП', category: 'Работы' },

  // Документы и финансы
  { iconName: 'Phone', label: 'Телефон / Контакт', category: 'Контакты' },
  { iconName: 'Mail', label: 'Почта / Заявления', category: 'Контакты' },
  { iconName: 'User', label: 'Садовод', category: 'Контакты' },
  { iconName: 'Users', label: 'Правление / Собрание', category: 'Контакты' },
  { iconName: 'Building', label: 'Здание правления', category: 'Контакты' },
  { iconName: 'Clock', label: 'Часы / Режим работы', category: 'Контакты' },
  { iconName: 'Calendar', label: 'Календарь / Расписание', category: 'Контакты' },
  { iconName: 'FileText', label: 'Документ / Регламент', category: 'Финансы' },
  { iconName: 'FileSpreadsheet', label: 'Смета / Отчет', category: 'Финансы' },
  { iconName: 'CreditCard', label: 'Оплата взносов', category: 'Финансы' },
  { iconName: 'Receipt', label: 'Квитанция / Чек', category: 'Финансы' },
  { iconName: 'DollarSign', label: 'Тарифы / Счет', category: 'Финансы' },
  { iconName: 'ShoppingCart', label: 'Магазин / Закупки', category: 'Разное' },
  { iconName: 'Store', label: 'Лавка / Рынок', category: 'Разное' },
  { iconName: 'BookOpen', label: 'Устав СНТ / База знаний', category: 'Разное' },
  { iconName: 'Heart', label: 'Взаимопомощь', category: 'Разное' },
];
