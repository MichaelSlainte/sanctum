import { createContext, useContext, useState } from 'react';

const CryptoContext = createContext({ key: null, setKey: () => {}, keyLoading: false, setKeyLoading: () => {} });

export function CryptoProvider({ children }) {
  const [key, setKey] = useState(null);
  const [keyLoading, setKeyLoading] = useState(false);
  return <CryptoContext.Provider value={{ key, setKey, keyLoading, setKeyLoading }}>{children}</CryptoContext.Provider>;
}

export const useCrypto = () => useContext(CryptoContext);
