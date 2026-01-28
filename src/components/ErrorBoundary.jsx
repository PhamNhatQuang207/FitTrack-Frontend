import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if error is related to Google Translate
    const isTranslateError = error.message && (
      error.message.includes('removeChild') || 
      error.message.includes('NotFoundError') ||
      error.message.includes('Node')
    );
    
    if (isTranslateError) {
      console.warn('This error might be caused by Google Translate interfering with the DOM.');
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-gray-800 rounded-xl border border-red-500/30 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">
                <span>Something went wrong</span>
              </h1>
              
              <p className="text-gray-400 mb-6">
                <span>The application encountered an unexpected error. This might be caused by browser extensions like Google Translate.</span>
              </p>

              {this.state.error && (
                <div className="w-full mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <p className="text-sm text-red-400 font-mono break-words">
                    <span>{this.state.error.toString()}</span>
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  <span>Go to Dashboard</span>
                </button>
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  <span className="font-semibold">Tip:</span>
                  <span> If this error persists, try disabling browser translation features or extensions.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
