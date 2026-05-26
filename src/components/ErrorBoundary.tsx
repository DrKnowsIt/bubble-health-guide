import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label for logging context (e.g. "chat", "dashboard"). */
  scope?: string;
  /** Reset boundary when this value changes (e.g. route path). */
  resetKey?: string | number | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`, error);
    logger.error("component stack", info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              We hit an unexpected error displaying this section. Your data is safe.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/80 mt-2 break-words">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Try again
            </Button>
            <Button size="sm" onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
