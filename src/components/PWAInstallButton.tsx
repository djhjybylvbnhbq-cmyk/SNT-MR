import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, show clean compact badge
  if (isInstalled) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3a5d2b] text-[#a2d1a2] text-xs font-medium border border-[#4d733c]">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#a2d1a2]" />
        <span>Установлено как приложение</span>
      </div>
    );
  }

  // Chromium / Android / Desktop install button
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-[#3a5d2b] hover:bg-[#4d733c] active:bg-[#2d4a22] px-3 py-1.5 text-xs font-semibold text-white border border-[#4d733c] shadow-xs transition"
        title="Установить приложение на телефон без интернета"
      >
        <Download className="w-3.5 h-3.5 text-[#a2d1a2]" />
        <span>На экран</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-ios-install"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[#4d733c] bg-[#3a5d2b] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#4d733c] transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#a2d1a2]" />
          <span>На iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-[#2c3e2d] border border-[#e6ebe0]">
              <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#2d4a22] flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4 text-[#a2d1a2]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#5c4033] uppercase tracking-wider">
                    Установка на iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#7a8c71] hover:text-[#2c3e2d] rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs text-[#5a6b52]">
                <p>
                  Приложение работает полностью автономно без облачных серверов. Добавьте его на домашний экран:
                </p>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f4f7f1] border border-[#dce3d5]">
                  <span className="w-5 h-5 rounded-full bg-[#8ba888] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Нажмите кнопку <strong>«Поделиться»</strong> (значок квадрата со стрелкой вверх) в нижней панели Safari.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f4f7f1] border border-[#dce3d5]">
                  <span className="w-5 h-5 rounded-full bg-[#8ba888] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Прокрутите список и выберите <strong>«На экран "Домой"»</strong> (Add to Home Screen).</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f4f7f1] border border-[#dce3d5]">
                  <span className="w-5 h-5 rounded-full bg-[#8ba888] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Нажмите <strong>«Добавить»</strong> в правом верхнем углу.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#2d4a22] py-2.5 text-xs font-semibold text-white hover:bg-[#3a5d2b] transition"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
