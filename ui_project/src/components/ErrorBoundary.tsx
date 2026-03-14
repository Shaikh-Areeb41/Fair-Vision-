import React from "react";
import { Button } from "./ui/button";

type State = { hasError: boolean; error?: Error };
type Props = { children?: React.ReactNode };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void error;
    void info;
    // You can log the error to an external service here
    // console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-xl w-full glass-card p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred while rendering the application.
            </p>
            <details className="text-xs text-muted-foreground whitespace-pre-wrap mb-4">
              {this.state.error?.message}
            </details>
            <div className="flex gap-2">
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => window.location.reload()}
              >
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
