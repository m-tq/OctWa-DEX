import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function Layout({ children, sidebar }: LayoutProps) {
  const { 
    connected, 
    connection, 
    errors, 
    clearErrors,
    setConnection,
    setCapability,
    setOctBalance,
    setDerivedEvmAddress,
    setSwaps
  } = useStore();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedOctra, setCopiedOctra] = useState(false);
  const [copiedEvm, setCopiedEvm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Don't close if clicking the toggle button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-sidebar-toggle]')) {
          setSidebarOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyOctraAddress = async () => {
    if (connection?.walletPubKey) {
      await navigator.clipboard.writeText(connection.walletPubKey);
      setCopiedOctra(true);
      setTimeout(() => setCopiedOctra(false), 2000);
    }
  };

  const handleCopyEvmAddress = async () => {
    if (connection?.evmAddress) {
      await navigator.clipboard.writeText(connection.evmAddress);
      setCopiedEvm(true);
      setTimeout(() => setCopiedEvm(false), 2000);
    }
  };

  const handleDisconnect = () => {
    setConnection(null);
    setCapability(null);
    setOctBalance(null);
    setDerivedEvmAddress(null);
    setSwaps([]); // Clear swap history on disconnect
    setDropdownOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="21" stroke="#0000db" strokeWidth="6" fill="none"/>
              <circle cx="25" cy="25" r="7" fill="#0000db"/>
              <path d="M15 25L20 20M20 20L20 24" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M35 25L30 30M30 30L30 26" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">OCTWA DEX</h1>
              <p className="text-[10px] sm:text-xs text-muted hidden sm:block">PREVIEW - Intent-based Swap</p>
            </div>
          </div>

          {/* Right side: Explorer link + Connection Status */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Explorer Link */}
            <Link 
              to="/explorer" 
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Explorer</span>
            </Link>

            {/* Connection Status with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              {connected ? (
                <>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-card border border-border hover:bg-secondary transition-colors"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-[10px] sm:text-xs text-muted hidden sm:inline">Connected</span>
                    <span className="text-[10px] sm:text-xs text-foreground font-mono">
                      {connection?.walletPubKey?.slice(0, 6)}...{connection?.walletPubKey?.slice(-4)}
                    </span>
                    <svg 
                      className={`w-3 h-3 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-card border border-border shadow-lg z-50">
                    <div className="p-2 border-b border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted">Octra Address</span>
                        <button
                          onClick={handleCopyOctraAddress}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                          title="Copy Octra Address"
                        >
                          {copiedOctra ? (
                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-muted hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="text-xs font-mono text-foreground break-all">
                        {connection?.walletPubKey}
                      </div>
                    </div>
                    {connection?.evmAddress && (
                      <div className="p-2 border-b border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted">EVM Address</span>
                          <button
                            onClick={handleCopyEvmAddress}
                            className="p-1 hover:bg-secondary rounded transition-colors"
                            title="Copy EVM Address"
                          >
                            {copiedEvm ? (
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-muted hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="text-xs font-mono text-foreground break-all">
                          {connection.evmAddress}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={handleDisconnect}
                      className="w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-2 h-2 bg-muted rounded-full" />
                <span className="text-xs text-muted">Not Connected</span>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Main Content - Centered */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start lg:items-center justify-center">
          <div className="max-w-lg w-full">
            {/* Errors - Inside main panel */}
            {errors.length > 0 && (
              <div className="mb-4">
                <div className="p-3 bg-destructive/10 border border-destructive/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-destructive uppercase">Errors</span>
                    <button onClick={clearErrors} className="text-xs text-destructive hover:underline">
                      Clear
                    </button>
                  </div>
                  {errors.map((error) => (
                    <div key={error.id} className="text-xs text-destructive/80 font-mono break-words">
                      [{error.code}] {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
        
        {/* Mobile: History Toggle Button */}
        {sidebar && (
          <button
            data-sidebar-toggle
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Toggle swap history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">History</span>
          </button>
        )}

        {/* Mobile: Sidebar Overlay */}
        {sidebar && sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile: Sidebar Slide-in Panel */}
        {sidebar && (
          <div 
            ref={sidebarRef}
            className={`lg:hidden fixed right-0 top-0 h-full w-[85%] max-w-[380px] bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-medium">Swap History</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
                aria-label="Close history"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-57px)] p-4">
              {sidebar}
            </div>
          </div>
        )}
        
        {/* Desktop: Sidebar (Swap History) */}
        {sidebar && (
          <div className="hidden lg:block w-[380px] xl:w-[420px] border-l border-border overflow-y-auto p-4 xl:p-6 flex-shrink-0">
            {sidebar}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border flex-shrink-0">
        <div className="px-4 sm:px-6 py-2 sm:py-3 text-center">
          <p className="text-[10px] sm:text-xs text-muted">
            OCT ⇄ ETH | Intent-based Cross-Chain Settlement
          </p>
        </div>
      </footer>
    </div>
  );
}
