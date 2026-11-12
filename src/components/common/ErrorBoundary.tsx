import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Evalnium System Error Caught by ErrorBoundary:', error, errorInfo);
  }

  private isLegacyPort = () => {
    return typeof window !== 'undefined' && window.location.port === '5173';
  };

  private handleReload = () => {
    if (this.isLegacyPort()) {
      window.location.port = '5175';
      return;
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Application Recovered</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Evalnium caught an unexpected rendering error. Your data is safe.
              </p>
            </div>

            {this.isLegacyPort() && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium text-left">
                <strong>Legacy Port Detected:</strong> This window was loaded on legacy port <strong>5173</strong>. The Evalnium server is currently running on port <strong>5175</strong>.
              </div>
            )}

            {this.state.error && (
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 text-left overflow-x-auto max-h-28">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              <span>{this.isLegacyPort() ? 'Switch to Active Portal (Port 5175)' : 'Reload Evalnium Portal'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
