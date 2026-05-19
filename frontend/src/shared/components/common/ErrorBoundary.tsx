import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Algo salió mal</h1>
            <p className="mt-3 text-slate-600">Intenta recargar o vuelve a la página anterior.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
