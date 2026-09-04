import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    if (
      error &&
      (error.message?.includes('Expected static flag was missing') ||
        error.stack?.includes('Expected static flag was missing'))
    ) {
      console.warn('[ErrorBoundary] Limpando estado de renderização devido à anomalia de reconciliação...');
      try {
        sessionStorage.clear();
        localStorage.removeItem('delfos_cached_state');
      } catch (_) {}
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('delfos_cached_state');
    } catch (_) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              Erro ao renderizar tela
            </h1>
            <p className="text-sm text-slate-600 mb-4">
              Ocorreu um problema ao carregar as informações do dashboard.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-lg text-left text-xs font-mono text-red-600 mb-6 overflow-x-auto max-h-36">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
