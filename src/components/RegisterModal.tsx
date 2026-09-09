import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  UserCheck,
  Home,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { SNT_STREETS, formatStreetName } from '../utils/streets';
import { INITIAL_RESIDENTS } from '../data/seedData';

interface RegisterModalProps {
  isOpen: boolean;
  onRegister: (userData: Omit<User, 'id' | 'registeredAt'>, pin: string) => void;
  onLogin?: (user: User, pin: string) => Promise<boolean> | void;
  residents?: User[];
  existingUser?: User | null;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
  adminSecretPassword?: string;
  brandingName?: string;
}

const AVATAR_COLORS = [
  'bg-[#2d4a22]',
  'bg-[#3a5d2b]',
  'bg-[#8ba888]',
  'bg-[#5c4033]',
  'bg-[#7a8c71]',
  'bg-[#92400e]',
  'bg-[#4d733c]',
];

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onRegister,
  onLogin,
  residents = INITIAL_RESIDENTS,
  existingUser,
  onClose,
  initialMode = 'login',
  adminSecretPassword = 'V6544Dv*',
  brandingName,
}) => {
  // Mode: 'login' | 'register' (if editing existing user, fixed to edit)
  const isEditing = Boolean(existingUser);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    isEditing ? 'register' : initialMode
  );

  // Form states for Registration
  const [fullName, setFullName] = useState(existingUser?.fullName || '');
  const [streetNumber, setStreetNumber] = useState(
    existingUser?.streetNumber ? formatStreetName(existingUser.streetNumber) : '1-я улица'
  );
  const [plotNumber, setPlotNumber] = useState(existingUser?.plotNumber || '');
  const [phone, setPhone] = useState(existingUser?.phone || '');
  const [hidePlotInChat, setHidePlotInChat] = useState<boolean>(existingUser?.hidePlotInChat || false);
  const [regPin, setRegPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [avatarColor, setAvatarColor] = useState(existingUser?.avatarColor || AVATAR_COLORS[0]);

  // Form states for Login
  const availableResidents = residents && residents.length > 0 ? residents : INITIAL_RESIDENTS;

  // Helper to retrieve saved credentials strictly from this device after successful registration or login
  const getAutofillCredentials = () => {
    try {
      const saved = localStorage.getItem('snt_mezhdurechye_saved_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.login && parsed?.pin) {
          // Verify that this user is actually registered in residents with a password
          const matchingResident = availableResidents.find(
            (r) =>
              Boolean(r.password) &&
              (r.fullName.trim().toLowerCase() === parsed.login.trim().toLowerCase() ||
                (r.role === 'admin' && parsed.login.toLowerCase().includes('админ')))
          );
          if (matchingResident) {
            return { login: parsed.login, pin: parsed.pin };
          }
        }
      }
    } catch {
      // ignore
    }

    // Default for any device without saved credentials: completely blank
    return {
      login: '',
      pin: '',
    };
  };

  const [loginIdentifier, setLoginIdentifier] = useState(() => getAutofillCredentials().login);
  const [loginPin, setLoginPin] = useState(() => getAutofillCredentials().pin);

  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingUser) {
        setFullName(existingUser.fullName || '');
        setStreetNumber(
          existingUser.streetNumber ? formatStreetName(existingUser.streetNumber) : '1-я улица'
        );
        setPlotNumber(existingUser.plotNumber || '');
        setPhone(existingUser.phone || '');
        setAvatarColor(existingUser.avatarColor || AVATAR_COLORS[0]);
        setHidePlotInChat(existingUser.hidePlotInChat || false);
      } else {
        setFullName('');
        setPlotNumber('');
        setPhone('');
        setHidePlotInChat(false);
        setRegPin('');
        setConfirmPin('');
        setError('');
        // Ensure login and password are automatically filled
        const creds = getAutofillCredentials();
        setLoginIdentifier((prev) => (prev && prev.trim() ? prev : creds.login));
        setLoginPin((prev) => (prev && prev.trim() ? prev : creds.pin));
      }
    }
  }, [isOpen, existingUser]);

  if (!isOpen) return null;

  // Handle Registration Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Пожалуйста, укажите ваше имя или ФИО');
      return;
    }
    if (!streetNumber.trim()) {
      setError('Укажите номер или название улицы');
      return;
    }
    if (!plotNumber.trim()) {
      setError('Укажите номер вашего участка (1-250)');
      return;
    }

    const trimmedPassword = regPin.trim();
    if (!isEditing) {
      if (!trimmedPassword || trimmedPassword.length < 4) {
        setError('Пароль должен содержать не менее 4 символов');
        return;
      }
      if (trimmedPassword !== confirmPin.trim()) {
        setError('Введенные пароли не совпадают');
        return;
      }
    } else if (trimmedPassword) {
      if (trimmedPassword.length < 4) {
        setError('Новый пароль должен содержать не менее 4 символов');
        return;
      }
      if (trimmedPassword !== confirmPin.trim()) {
        setError('Введенные пароли не совпадают');
        return;
      }
    }

    // Check if the secret admin registration password was entered
    const currentAdminSecret = adminSecretPassword || 'V6544Dv*';
    const isAdminRegistration = trimmedPassword === currentAdminSecret;

    const role: UserRole = isEditing
      ? existingUser?.role || 'member'
      : isAdminRegistration
      ? 'admin'
      : 'member';

    const isAdmin = role === 'admin';
    const finalPassword = trimmedPassword || existingUser?.password || '';

    try {
      localStorage.setItem(
        'snt_mezhdurechye_saved_auth',
        JSON.stringify({ login: fullName.trim(), pin: finalPassword })
      );
    } catch {
      // ignore
    }

    onRegister(
      {
        fullName: fullName.trim(),
        streetNumber: streetNumber.trim(),
        plotNumber: plotNumber.trim(),
        phone: phone.trim() || undefined,
        role,
        isAdmin,
        isChairman: role === 'chairman',
        avatarColor,
        password: finalPassword,
        hidePlotInChat,
      },
      finalPassword
    );
  };

  // Handle Login Submit with simple text input for "Логин"
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedLogin = loginIdentifier.trim();
    const trimmedPin = loginPin.trim();

    if (!trimmedLogin) {
      setError('Пожалуйста, введите ваш логин или ФИО');
      return;
    }
    if (!trimmedPin) {
      setError('Пожалуйста, введите пароль');
      return;
    }

    const cleanLogin = trimmedLogin.toLowerCase();
    const currentAdminSecret = adminSecretPassword || 'V6544Dv*';

    // 1. Find registered user who has completed registration with a password
    let targetResident = availableResidents.find(
      (r) =>
        Boolean(r.password) &&
        (r.fullName.trim().toLowerCase() === cleanLogin ||
          ((cleanLogin === 'admin' || cleanLogin === 'админ' || cleanLogin === 'администратор') &&
            (r.role === 'admin' || r.isAdmin)))
    );

    // 2. Match by plot number if digits entered
    if (!targetResident) {
      const plotDigits = cleanLogin.replace(/\D/g, '');
      if (plotDigits) {
        targetResident = availableResidents.find(
          (r) => Boolean(r.password) && String(r.plotNumber).trim() === plotDigits
        );
      }
    }

    // 3. Match by phone digits if entered
    if (!targetResident) {
      const phoneDigits = cleanLogin.replace(/\D/g, '');
      if (phoneDigits.length >= 7) {
        targetResident = availableResidents.find(
          (r) => Boolean(r.password) && r.phone && r.phone.replace(/\D/g, '').includes(phoneDigits)
        );
      }
    }

    if (!targetResident || !targetResident.password) {
      setError('Пользователь с таким логином не зарегистрирован. Пожалуйста, перейдите на вкладку «Регистрация».');
      return;
    }

    const isUserAdmin = targetResident.role === 'admin' || targetResident.isAdmin;
    const isPasswordCorrect =
      trimmedPin === targetResident.password ||
      (isUserAdmin && trimmedPin === currentAdminSecret);

    if (!isPasswordCorrect) {
      setError('Неверный пароль');
      return;
    }

    if (onLogin) {
      setIsSubmitting(true);
      try {
        await onLogin(targetResident, trimmedPin);
        try {
          localStorage.setItem(
            'snt_mezhdurechye_saved_auth',
            JSON.stringify({ login: targetResident.fullName, pin: trimmedPin })
          );
        } catch {
          // ignore
        }
      } catch (err: any) {
        setError(err?.message || 'Неверный логин или пароль');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-[#fdfcf8] p-5 sm:p-6 shadow-2xl border border-[#e6ebe0] text-[#2c3e2d] my-6">
        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[#f0f2ec] pb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#2d4a22] flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Home className="w-6 h-6 text-[#a2d1a2]" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-base font-bold text-[#2c3e2d]">
              {isEditing
                ? 'Редактирование профиля'
                : activeTab === 'login'
                ? 'Вход в систему СНТ'
                : 'Регистрация'}
            </h2>
            <p className="text-xs text-[#7a8c71] truncate">
              {brandingName || 'СНТ «Междуречье»'}
            </p>
          </div>
        </div>

        {/* Tab switcher: Login / Register (only if not editing profile) */}
        {!isEditing && (
          <div className="flex items-center p-1 rounded-2xl bg-[#e9eddf]/70 border border-[#dce3d5] mt-4">
            <button
              type="button"
              id="tab-btn-login"
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-[#2d4a22] shadow-xs'
                  : 'text-[#5a6b52] hover:text-[#2c3e2d]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Войти</span>
            </button>
            <button
              type="button"
              id="tab-btn-register"
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-[#2d4a22] shadow-xs'
                  : 'text-[#5a6b52] hover:text-[#2c3e2d]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Регистрация</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-xs text-[#9f1239] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#be123c] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. LOGIN TAB FORM */}
        {!isEditing && activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} autoComplete="on" className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#5c4033] mb-1">
                Логин <span className="text-[#9f1239]">*</span>
              </label>
              <input
                id="input-login-name"
                name="username"
                autoComplete="username"
                type="text"
                required
                placeholder="Введите логин или ФИО"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[#5c4033]">
                  <KeyRound className="w-4 h-4 text-[#2d4a22]" />
                  <span>Пароль</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-[#7a8c71] hover:text-[#2d4a22] flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Скрыть' : 'Показать'}</span>
                </button>
              </div>

              <input
                id="input-login-pin"
                name="password"
                autoComplete="current-password"
                type={showPin ? 'text' : 'password'}
                required
                placeholder="Введите пароль"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] bg-white text-[#2c3e2d] font-mono"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4 text-[#a2d1a2]" />
                <span>{isSubmitting ? 'Вход в систему...' : 'Войти в профиль'}</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION / PROFILE EDIT FORM */}
        {(isEditing || activeTab === 'register') && (
          <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#5c4033] mb-1">
                Логин / ФИО жителя <span className="text-[#9f1239]">*</span>
              </label>
              <input
                id="input-fullname"
                type="text"
                required
                placeholder="Например: Дмитрий или Администратор"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Улица в СНТ <span className="text-[#9f1239]">*</span>
                </label>
                <select
                  id="select-street"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                >
                  {SNT_STREETS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Участок № <span className="text-[#9f1239]">*</span>
                </label>
                <input
                  id="input-plot"
                  type="text"
                  required
                  placeholder="Напр. 15"
                  value={plotNumber}
                  onChange={(e) => setPlotNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#5c4033] mb-1">
                Телефон для экстренной связи соседей{' '}
                <span className="text-[#7a8c71] font-normal">(необязательно)</span>
              </label>
              <input
                id="input-phone"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
              />
            </div>

            {/* Password (for registration or changing in profile edit) */}
            <div className="p-3.5 rounded-2xl bg-[#f4f7f1] border border-[#dce3d5] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[#5c4033]">
                  <KeyRound className="w-4 h-4 text-[#2d4a22]" />
                  <span>
                    {isEditing ? 'Сменить пароль' : 'Пароль'}
                    {isEditing && (
                      <span className="text-[#7a8c71] font-normal ml-1">(необязательно)</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-[#7a8c71] hover:text-[#2d4a22] flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Скрыть' : 'Показать'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  id="input-pin"
                  type={showPin ? 'text' : 'password'}
                  required={!isEditing}
                  placeholder={isEditing ? 'Новый пароль' : 'Придумайте пароль'}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] bg-white text-[#2c3e2d] font-mono"
                />
                <input
                  id="input-pin-confirm"
                  type={showPin ? 'text' : 'password'}
                  required={!isEditing || Boolean(regPin.trim())}
                  placeholder="Повторите пароль"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] bg-white text-[#2c3e2d] font-mono"
                />
              </div>
            </div>

            {/* Avatar color */}
            <div>
              <label className="block font-semibold text-[#5c4033] mb-1.5">
                Цвет значка в чате
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-7 h-7 rounded-full ${color} transition ${
                      avatarColor === color
                        ? 'ring-2 ring-offset-2 ring-[#2d4a22] scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Checkbox: Скрыть улицу и участок в чате */}
            <div className="p-3 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label htmlFor="checkbox-hide-plot" className="text-xs font-semibold text-[#2c3e2d] cursor-pointer block">
                  Скрыть улицу и участок в чате
                </label>
                <p className="text-[11px] text-[#7a8c71]">
                  В ваших сообщениях в общем чате не будет отображаться плашка с улицей и номером участка
                </p>
              </div>
              <input
                id="checkbox-hide-plot"
                type="checkbox"
                checked={hidePlotInChat}
                onChange={(e) => setHidePlotInChat(e.target.checked)}
                className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] accent-[#2d4a22] cursor-pointer shrink-0"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#7a8c71] hover:bg-[#f4f7f1] transition"
                >
                  Отмена
                </button>
              )}
              <button
                id="btn-submit-registration"
                type="submit"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#a2d1a2]" />
                <span>{isEditing ? 'Сохранить профиль' : 'Завершить регистрацию'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
