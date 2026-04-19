import { createContext, useContext, useState } from 'react';

const CryptoContext = createContext({ key: null, setKey: () => {} });

export function CryptoProvider({ children }) {
  const [key, setKey] = useState(null);
  return <CryptoContext.Provider value={{ key, setKey }}>{children}</CryptoContext.Provider>;
}

export const useCrypto = () => useContext(CryptoContext);
