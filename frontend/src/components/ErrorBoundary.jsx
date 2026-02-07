import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-surface-400 mb-6 max-w-md">
            An unexpected error occurred. You can go home or reload the page to try again.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition-colors"
            >
              Go home
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-xl font-semibold transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
