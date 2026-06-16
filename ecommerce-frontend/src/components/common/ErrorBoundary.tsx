import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

const CHUNK_LOAD_RELOAD_KEY = 'chunk-load-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || '';
  return /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(msg);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);

    // Stale deployment: browser cached old index.html referencing chunks that
    // no longer exist after a new Vercel deploy. Reload once to fetch fresh
    // index.html. Cooldown prevents reload-loop if the failure is genuine.
    if (isChunkLoadError(error)) {
      const lastReload = Number(sessionStorage.getItem(CHUNK_LOAD_RELOAD_KEY) || 0);
      if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(CHUNK_LOAD_RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.error) {
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
          <h1 className="text-xl font-bold text-red-600 mb-2">
            {chunkError ? 'Đang cập nhật phiên bản mới...' : 'App crashed'}
          </h1>
          {chunkError ? (
            <button
              onClick={() => { sessionStorage.removeItem(CHUNK_LOAD_RELOAD_KEY); window.location.reload(); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tải lại trang
            </button>
          ) : (
            <pre className="text-sm text-red-800 bg-red-100 p-4 rounded-lg max-w-2xl overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
