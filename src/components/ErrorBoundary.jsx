import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Antigravity UI Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#090A0F] text-slate-100 flex flex-col items-center justify-center p-8 select-none">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            Antigravity Daemon Encountered a Fault
          </h2>
          <p className="text-xs font-mono text-slate-400 max-w-md text-center mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred in the React desktop tree.'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 rounded-xl bg-cyan text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-cyan/90 transition-colors shadow-cyan-glow"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restart Daemon Workspace</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

