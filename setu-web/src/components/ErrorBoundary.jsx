import { Component } from "react";

/**
 * Minimal React error boundary — catches render errors and shows a
 * safe fallback instead of a frozen white screen during a live demo.
 * Must be a class component (React requirement for error boundaries).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Setu caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-8 text-center">
          <span
            className="material-symbols-outlined text-error text-[64px] mb-6"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <h1 className="text-headline-lg text-on-surface mb-3">
            Something went wrong
          </h1>
          <p className="text-body-lg text-on-surface-variant mb-8 max-w-md">
            An unexpected error interrupted your session. Your application data
            is saved — just refresh to pick up where you left off.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-on-primary text-label-lg px-8 py-4 rounded-full shadow-sm hover:opacity-90 transition-opacity"
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
