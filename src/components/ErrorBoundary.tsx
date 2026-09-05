import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      resetCount: 0,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Capturado erro na árvore do DOM:', error, errorInfo);

    const isDomReconciliationError =
      error &&
      (error.message?.includes('insertBefore') ||
        error.message?.includes('child of this node') ||
        error.message?.includes('removeChild') ||
        error.message?.includes('Expected static flag was missing') ||
        error.stack?.includes('insertBefore'));

    if (isDomReconciliationError) {
      console.warn('[ErrorBoundary] Erro crítico de inserção DOM (insertBefore) detectado. Limpando caches e reiniciando...');
      try {
        sessionStorage.clear();
        localStorage.removeItem('delfos_cached_state');
      } catch (_) {}

      // Tenta recuperação automática transparente se for o primeiro erro
      if (this.state.resetCount === 0) {
        setTimeout(() => {
          if (this.props.onReset) {
            this.props.onReset();
          }
          this.setState((prev) => ({
            hasError: false,
            error: null,
            resetCount: prev.resetCount + 1,
          }));
        }, 100);
      }
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('delfos_cached_state');
    } catch (_) {}

    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div key="error-boundary-container" className="min-h-[280px] bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {this.props.fallbackTitle || 'Recuperação de Interface'}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Foi detectada uma divergência na árvore de renderização do DOM. Os dados foram protegidos.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-lg text-left text-xs font-mono text-red-600 mb-6 overflow-x-auto max-h-36">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restaurar e Recarregar</span>
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={`eb-content-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
  }
}
