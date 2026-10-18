import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VoiceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VoiceErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-rose-500/40 bg-rose-950/20 backdrop-blur-md">
          <AlertTriangle className="h-8 w-8 text-rose-400 mb-2" />
          <h3 className="text-sm font-semibold text-rose-200 mb-1">
            Voice Component Encountered an Error
          </h3>
          <p className="text-xs text-rose-300/80 mb-4 max-w-sm">
            {this.state.error?.message || 'An unexpected audio or recognition issue occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-rose-700 bg-rose-900/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Voice Engine</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
