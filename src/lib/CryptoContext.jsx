// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { createContext, useContext, useState } from 'react';

const CryptoContext = createContext({ key: null, setKey: () => {}, keyLoading: false, setKeyLoading: () => {}, keyError: null, setKeyError: () => {} });

export function CryptoProvider({ children }) {
  const [key, setKey] = useState(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState(null); // set when login couldn't set up the key
  return <CryptoContext.Provider value={{ key, setKey, keyLoading, setKeyLoading, keyError, setKeyError }}>{children}</CryptoContext.Provider>;
}

export const useCrypto = () => useContext(CryptoContext);
