import React, { useState, useRef, useEffect } from 'react';
import { Smile, Search, X, ChevronDown } from 'lucide-react';

export interface EmojiOption {
  emoji: string;
  name: string;
  category: string;
  keywords: string[];
}

export const POPULAR_CHAT_EMOJIS: EmojiOption[] = [
  // Популярные в СНТ
  { emoji: '💬', name: 'Общение / Чат', category: 'СНТ', keywords: ['чат', 'общение', 'разговоры', 'флуд', 'беседа'] },
  { emoji: '🚜', name: 'Дорога / Техника', category: 'СНТ', keywords: ['дорога', 'грейдер', 'трактор', 'проезд', 'щебень', 'ямы'] },
  { emoji: '💧', name: 'Водопровод / Полив', category: 'СНТ', keywords: ['вода', 'скважина', 'водопровод', 'полив', 'трубы', 'насос'] },
  { emoji: '⚡', name: 'Электричество / Свет', category: 'СНТ', keywords: ['свет', 'электричество', 'столб', 'трансформатор', 'счетчик', 'фаза'] },
  { emoji: '🔥', name: 'Газ / Отопление', category: 'СНТ', keywords: ['газ', 'отопление', 'котел', 'дрова', 'баллоны', 'тепло'] },
  { emoji: '🍐', name: 'Барахолка / Продам', category: 'СНТ', keywords: ['рынок', 'барахолка', 'продам', 'куплю', 'отдам', 'обмен'] },
  { emoji: '🧹', name: 'Субботник / Уборка', category: 'СНТ', keywords: ['субботник', 'уборка', 'чистота', 'веник', 'грабли'] },
  { emoji: '♻️', name: 'Мусор / Контейнеры', category: 'СНТ', keywords: ['мусор', 'пухто', 'свалка', 'вывоз', 'контейнер', 'экология'] },
  { emoji: '🌲', name: 'Озеленение / Лес', category: 'СНТ', keywords: ['лес', 'дерево', 'ель', 'сосна', 'озеленение', 'парк'] },
  { emoji: '🐕', name: 'Питомцы / Животные', category: 'СНТ', keywords: ['собака', 'кот', 'кошка', 'питомцы', 'потерялся', 'животные'] },
  { emoji: '🏗️', name: 'Строительство', category: 'СНТ', keywords: ['стройка', 'строительство', 'дом', 'кран', 'фундамент', 'забор'] },
  { emoji: '🎉', name: 'Праздники / Дети', category: 'СНТ', keywords: ['праздник', 'дети', 'площадка', 'события', 'новый год', 'шашлык'] },
  { emoji: '🛡️', name: 'Охрана / КПП', category: 'СНТ', keywords: ['охрана', 'кпп', 'сторож', 'шлагбаум', 'безопасность'] },
  { emoji: '🚨', name: 'Срочно / Внимание', category: 'СНТ', keywords: ['срочно', 'важно', 'внимание', 'чп', 'сирена'] },
  { emoji: '📢', name: 'Объявления', category: 'СНТ', keywords: ['рупор', 'объявление', 'новость', 'оповещение'] },
  { emoji: '🤝', name: 'Взаимопомощь', category: 'СНТ', keywords: ['помощь', 'соседи', 'дружба', 'поддержка'] },

  // Дача и природа
  { emoji: '🏡', name: 'Дача / Дом', category: 'Дача', keywords: ['дом', 'дача', 'участок', 'коттедж'] },
  { emoji: '🏠', name: 'Домик', category: 'Дача', keywords: ['дом', 'жилье', 'постройка'] },
  { emoji: '🌱', name: 'Рассада / Сад', category: 'Дача', keywords: ['сад', 'рассада', 'огород', 'росток', 'грядка'] },
  { emoji: '🌿', name: 'Зелень / Трава', category: 'Дача', keywords: ['трава', 'газон', 'покос', 'зелень'] },
  { emoji: '🪴', name: 'Цветы в горшке', category: 'Дача', keywords: ['цветы', 'растения'] },
  { emoji: '🌻', name: 'Подсолнух', category: 'Дача', keywords: ['подсолнух', 'лето', 'солнце'] },
  { emoji: '🌸', name: 'Цветы / Клумба', category: 'Дача', keywords: ['цветы', 'клумба', 'весна'] },
  { emoji: '🪵', name: 'Дрова / Бревна', category: 'Дача', keywords: ['дрова', 'печь', 'бревна', 'баня'] },
  { emoji: '🍎', name: 'Яблоки / Урожай', category: 'Дача', keywords: ['яблоки', 'урожай', 'фрукты'] },
  { emoji: '🍓', name: 'Клубника / Ягоды', category: 'Дача', keywords: ['клубника', 'ягоды', 'варенье'] },
  { emoji: '🍅', name: 'Помидоры / Теплица', category: 'Дача', keywords: ['теплица', 'помидоры', 'томаты', 'овощи'] },
  { emoji: '🥒', name: 'Огурцы', category: 'Дача', keywords: ['огурцы', 'грядка', 'засолка'] },
  { emoji: '🥕', name: 'Морковь', category: 'Дача', keywords: ['морковь', 'овощи'] },
  { emoji: '🥔', name: 'Картофель', category: 'Дача', keywords: ['картошка', 'посадка', 'копка'] },
  { emoji: '🍄', name: 'Грибы', category: 'Дача', keywords: ['грибы', 'лес', 'сбор'] },
  { emoji: '🍯', name: 'Пасека / Мед', category: 'Дача', keywords: ['мед', 'пасека', 'пчелы'] },

  // ЖКХ и коммуникации
  { emoji: '🚰', name: 'Кран с водой', category: 'ЖКХ', keywords: ['кран', 'вода', 'водопровод', 'колонка'] },
  { emoji: '💡', name: 'Лампочка / Идея', category: 'ЖКХ', keywords: ['свет', 'лампа', 'освещение', 'фонарь'] },
  { emoji: '🔌', name: 'Розетка / Подключение', category: 'ЖКХ', keywords: ['розетка', 'электрика', 'подключение'] },
  { emoji: '🔋', name: 'Аккумулятор / Генератор', category: 'ЖКХ', keywords: ['генератор', 'батарея', 'заряд'] },
  { emoji: '♨️', name: 'Отопление / Баня', category: 'ЖКХ', keywords: ['баня', 'пар', 'тепло', 'сауна'] },
  { emoji: '🗑️', name: 'Мусорная корзина', category: 'ЖКХ', keywords: ['мусор', 'урна', 'отходы'] },
  { emoji: '📦', name: 'Посылки / Доставка', category: 'ЖКХ', keywords: ['доставка', 'посылка', 'заказ'] },
  { emoji: '📬', name: 'Почтовый ящик', category: 'ЖКХ', keywords: ['почта', 'письма', 'извещения'] },
  { emoji: '📶', name: 'Интернет / Связь', category: 'ЖКХ', keywords: ['интернет', 'вайфай', 'связь', 'сигнал', 'вышка'] },
  { emoji: '📡', name: 'Антенна / ТВ', category: 'ЖКХ', keywords: ['тв', 'телевидение', 'антенна', 'тарелка'] },

  // Стройка, ремонт и транспорт
  { emoji: '🔨', name: 'Молоток / Ремонт', category: 'Стройка', keywords: ['молоток', 'ремонт', 'гвозди'] },
  { emoji: '🪚', name: 'Пила / Распил', category: 'Стройка', keywords: ['пила', 'доски', 'лес', 'распил'] },
  { emoji: '🔧', name: 'Гаечный ключ', category: 'Стройка', keywords: ['ключ', 'сантехник', 'слесарь', 'починка'] },
  { emoji: '🪛', name: 'Отвертка', category: 'Стройка', keywords: ['отвертка', 'сборка', 'крепеж'] },
  { emoji: '🧱', name: 'Кирпич / Кладка', category: 'Стройка', keywords: ['кирпич', 'стены', 'блоки'] },
  { emoji: '🪜', name: 'Лестница / Крыша', category: 'Стройка', keywords: ['лестница', 'крыша', 'высота'] },
  { emoji: '🧰', name: 'Ящик с инструментами', category: 'Стройка', keywords: ['инструменты', 'мастер'] },
  { emoji: '⚙️', name: 'Механизм / Сервис', category: 'Стройка', keywords: ['шестеренка', 'сервис', 'техника'] },
  { emoji: '🦺', name: 'Спецодежда / Бригада', category: 'Стройка', keywords: ['жилет', 'рабочие', 'бригада'] },
  { emoji: '🚗', name: 'Легковое авто', category: 'Транспорт', keywords: ['машина', 'авто', 'проезд', 'парковка'] },
  { emoji: '🚚', name: 'Грузовик / Доставка', category: 'Транспорт', keywords: ['грузовик', 'газель', 'доставка', 'песок'] },
  { emoji: '🚛', name: 'Тонар / Фура', category: 'Транспорт', keywords: ['фура', 'грузоперевозки', 'щебень'] },
  { emoji: '🅿️', name: 'Парковка', category: 'Транспорт', keywords: ['парковка', 'стоянка', 'машиноместо'] },
  { emoji: '🚧', name: 'Шлагбаум / Ремонт дороги', category: 'Транспорт', keywords: ['шлагбаум', 'знак', 'въезд', 'ворота'] },
  { emoji: '🚪', name: 'Калитка / Ворота', category: 'Транспорт', keywords: ['ворота', 'дверь', 'калитка'] },
  { emoji: '🔑', name: 'Ключи / Чипы доступа', category: 'Транспорт', keywords: ['ключ', 'чип', 'брелок', 'пульт'] },

  // Охрана и безопасность
  { emoji: '🚒', name: 'Пожарная безопасность', category: 'Безопасность', keywords: ['пожар', 'мчс', 'пожарные', 'огонь'] },
  { emoji: '🧯', name: 'Огнетушитель', category: 'Безопасность', keywords: ['огнетушитель', 'пожарный щит'] },
  { emoji: '👮', name: 'Полиция / Охрана', category: 'Безопасность', keywords: ['сторож', 'охрана', 'полиция', 'кпп'] },
  { emoji: '⚠️', name: 'Предупреждение', category: 'Безопасность', keywords: ['внимание', 'опасно', 'предупреждение'] },
  { emoji: '🐈', name: 'Кошки', category: 'Животные', keywords: ['кот', 'кошка', 'котенок'] },
  { emoji: '🐾', name: 'Следы / Потеряшки', category: 'Животные', keywords: ['следы', 'питомцы', 'потерялся', 'нашелся'] },
  { emoji: '🐝', name: 'Осы / Пчелы', category: 'Животные', keywords: ['осы', 'пчелы', 'гнездо', 'укусы'] },

  // Общение и собрания
  { emoji: '📢', name: 'Оповещения правления', category: 'Общение', keywords: ['правление', 'рупор', 'информация'] },
  { emoji: '📣', name: 'Объявление', category: 'Общение', keywords: ['объявление', 'новость'] },
  { emoji: '🔔', name: 'Колокольчик / Уведомление', category: 'Общение', keywords: ['звонок', 'колокольчик', 'напоминание'] },
  { emoji: '👥', name: 'Общее собрание', category: 'Общение', keywords: ['собрание', 'жители', 'люди', 'кворум'] },
  { emoji: '📋', name: 'Повестка / Протокол', category: 'Общение', keywords: ['протокол', 'повестка', 'план'] },
  { emoji: '📌', name: 'Закреплено / Важно', category: 'Общение', keywords: ['закреп', 'булавка', 'важно'] },
  { emoji: '📅', name: 'Календарь / График', category: 'Общение', keywords: ['дата', 'календарь', 'график', 'расписание'] },
  { emoji: '☕', name: 'Беседка / Чай', category: 'Общение', keywords: ['чай', 'кофе', 'беседка', 'отдых'] },
  { emoji: '🎈', name: 'Праздник / Мероприятие', category: 'Общение', keywords: ['шарики', 'праздник', 'день снт'] },
  { emoji: '🎣', name: 'Рыбалка / Река', category: 'Отдых', keywords: ['рыбалка', 'река', 'озеро', 'пруд'] },
  { emoji: '⛺', name: 'Кемпинг / Туризм', category: 'Отдых', keywords: ['палатка', 'туризм', 'поход'] },
  { emoji: '⚽', name: 'Спортплощадка', category: 'Отдых', keywords: ['спорт', 'мяч', 'футбол', 'волейбол'] },

  // Финансы и документы
  { emoji: '💳', name: 'Членские взносы', category: 'Финансы', keywords: ['взносы', 'оплата', 'карта', 'банк'] },
  { emoji: '💰', name: 'Смета / Бюджет', category: 'Финансы', keywords: ['деньги', 'смета', 'бюджет', 'расходы'] },
  { emoji: '🧾', name: 'Квитанции / Чеки', category: 'Финансы', keywords: ['чек', 'квитанция', 'оплата'] },
  { emoji: '📑', name: 'Устав / Документы', category: 'Финансы', keywords: ['устав', 'документы', 'закон', 'правила'] },
  { emoji: '⚖️', name: 'Юрист / Нормы ФЗ-217', category: 'Финансы', keywords: ['суд', 'юрист', 'закон', '217-фз', 'нормы'] },
  { emoji: '🏛️', name: 'Администрация СНТ', category: 'Финансы', keywords: ['администрация', 'здание', 'контора'] },
];

const CATEGORIES = [
  'Все',
  'СНТ',
  'Дача',
  'ЖКХ',
  'Стройка',
  'Транспорт',
  'Безопасность',
  'Общение',
  'Финансы',
];

interface EmojiPickerPopoverProps {
  value: string;
  onChange: (emoji: string) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  buttonClassName?: string;
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  value,
  onChange,
  title = 'Выбрать иконку темы',
  size = 'md',
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [manualEmoji, setManualEmoji] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredEmojis = POPULAR_CHAT_EMOJIS.filter((item) => {
    const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.emoji.includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const currentDisplay = value && value.trim() ? value : '💬';

  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-11 h-11 text-xl',
    lg: 'w-13 h-13 text-2xl',
  }[size];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={title}
        aria-label={title}
        className={`group relative flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-[#2d4a22] bg-[#f4f7f1] ring-3 ring-[#2d4a22]/15'
            : 'border-[#dce3d5] bg-white hover:border-[#8ba888] hover:bg-[#fcfdfa]'
        } ${sizeClasses} ${buttonClassName}`}
      >
        <span className="select-none transition-transform group-hover:scale-110">
          {currentDisplay}
        </span>

        {/* Small badge hinting it is clickable */}
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2d4a22] text-white rounded-full flex items-center justify-center text-[9px] shadow-xs group-hover:bg-[#3a5d2b]">
          <Smile className="w-2.5 h-2.5" />
        </span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white rounded-2xl border border-[#dce3d5] shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f0f4ec] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{currentDisplay}</span>
              <span className="text-xs font-bold text-[#2c3e2d]">Выбор значка темы</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#f4f7f1] rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7a8c71]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск (напр. вода, свет, дорога)..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a8c71] hover:text-[#2c3e2d]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2d4a22] text-white'
                    : 'bg-[#f4f7f1] text-[#5a6b52] hover:bg-[#e9eddf]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emojis Grid */}
          <div className="max-h-48 overflow-y-auto grid grid-cols-7 gap-1 p-1 bg-[#fcfdfa] rounded-xl border border-[#e6ebe0]">
            {filteredEmojis.length > 0 ? (
              filteredEmojis.map((item) => {
                const isSelected = item.emoji === value;
                return (
                  <button
                    key={item.emoji + item.name}
                    type="button"
                    onClick={() => handleSelect(item.emoji)}
                    title={`${item.emoji} — ${item.name}`}
                    className={`h-9 flex items-center justify-center text-lg rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#2d4a22]/15 ring-2 ring-[#2d4a22] scale-105'
                        : 'hover:bg-white hover:shadow-xs hover:scale-110'
                    }`}
                  >
                    <span>{item.emoji}</span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-7 py-4 text-center text-xs text-[#7a8c71]">
                Ничего не найдено по запросу «{search}»
              </div>
            )}
          </div>

          {/* Manual input / custom symbol */}
          <div className="pt-2 border-t border-[#f0f4ec] flex items-center gap-1.5">
            <input
              type="text"
              value={manualEmoji}
              onChange={(e) => setManualEmoji(e.target.value)}
              placeholder="Свой эмодзи или символ"
              className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
            />
            <button
              type="button"
              disabled={!manualEmoji.trim()}
              onClick={() => {
                if (manualEmoji.trim()) {
                  handleSelect(manualEmoji.trim());
                  setManualEmoji('');
                }
              }}
              className="px-2.5 py-1 bg-[#2d4a22] text-white rounded-lg text-xs font-bold hover:bg-[#3a5d2b] disabled:opacity-30 transition cursor-pointer"
            >
              ОК
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
