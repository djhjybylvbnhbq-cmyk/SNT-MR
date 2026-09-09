import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Необработанная ошибка приложения:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fdfcf8] text-[#2c3e2d] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-[#2d4a22]/15 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Что-то пошло не так</h1>
            <p className="text-sm text-gray-600">
              Произошла непредвиденная ошибка при инициализации интерфейса.
            </p>
            {this.state.error && (
              <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 text-left font-mono text-gray-700 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2d4a22] text-white font-medium rounded-xl hover:bg-[#233b1b] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Перезагрузить страницу
              </button>
              <button
                type="button"
                onClick={this.handleClearCache}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors text-xs"
              >
                <Trash2 className="w-4 h-4 text-stone-500" />
                Сбросить локальные данные и перезапустить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
