import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { connect, requestCapability, initSDK, isInstalled } from '@/sdk/octra';
import { SWAP_CIRCLE, SWAP_METHODS } from '@/config';

type ConnectionStep = 'connect' | 'authorize' | 'swap';

export function useWalletConnection() {
  const {
    connected,
    connection,
    capability,
    _hasHydrated,
    setConnection,
    setCapability,
    setDerivedEvmAddress,
    addError,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ConnectionStep>('connect');
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const initRef = useRef(false);

  // Initialize SDK on mount and restore Circle connection if persisted
  useEffect(() => {
    if (initRef.current) return;
    
    const initializeSDK = async () => {
      if (!_hasHydrated) return;
      
      initRef.current = true;
      
      try {
        await initSDK();
        console.log('[useWalletConnection] SDK initialized');
        
        if (connection?.circle) {
          console.log('[useWalletConnection] Restoring Circle connection:', connection.circle);
          try {
            await connect(connection.circle);
            // Don't auto-request capability - let user click "Authorize" button
            // This prevents wallet popup opening in expanded mode on page load
          } catch (err) {
            console.error('[useWalletConnection] Failed to restore connection:', err);
            setConnection(null);
            setCapability(null);
          }
        }
        
        setSdkInitialized(true);
      } catch (err) {
        console.error('[useWalletConnection] Failed to initialize SDK:', err);
        initRef.current = false;
      }
    };
    
    initializeSDK();
  }, [_hasHydrated, connection?.circle, capability, setConnection, setCapability]);

  // Update step based on connection state
  useEffect(() => {
    if (!_hasHydrated || !sdkInitialized) return;
    
    if (!connected || connection?.circle !== SWAP_CIRCLE) {
      setStep('connect');
    } else if (!capability) {
      setStep('authorize');
    } else {
      setStep('swap');
    }
  }, [_hasHydrated, sdkInitialized, connected, connection, capability]);

  // Sync derived EVM address
  useEffect(() => {
    if (connection?.evmAddress) {
      setDerivedEvmAddress(connection.evmAddress);
    }
  }, [connection?.evmAddress, setDerivedEvmAddress]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    try {
      await initSDK();
      if (!isInstalled()) {
        addError('NOT_INSTALLED', 'Please install Octra wallet extension');
        return;
      }
      const conn = await connect(SWAP_CIRCLE);
      setConnection(conn);
    } catch (err) {
      addError('CONNECTION_FAILED', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setConnection, addError]);

  const handleAuthorize = useCallback(async () => {
    setLoading(true);
    try {
      const cap = await requestCapability({
        methods: [...SWAP_METHODS],
        scope: 'write',
        encrypted: false,
        ttlSeconds: 7200,
      });
      setCapability(cap);
    } catch (err) {
      addError('AUTHORIZE_FAILED', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setCapability, addError]);

  return {
    step,
    loading,
    sdkInitialized,
    isReady: _hasHydrated && sdkInitialized,
    handleConnect,
    handleAuthorize,
  };
}
