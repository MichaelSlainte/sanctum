// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Short-lived signed URL for a file in a private bucket, kept fresh:
//  - re-signs at 80% of its lifetime, so a page left open never shows a dead link;
//  - onError re-signs ONCE (then stops, so a missing file can't loop), and onLoad
//    re-arms that retry;
//  - refresh() re-signs on demand (e.g. after overwriting the file at the same path).
import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from './supabase.js';

export function useSignedUrl(bucket, path, ttlSeconds = 600) {
  const [url, setUrl] = useState(null);
  const [nonce, setNonce] = useState(0);
  const retriedRef = useRef(false);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    storage.createSignedUrl(bucket, path, ttlSeconds).then(u => { if (!cancelled) setUrl(u); });
    const timer = setTimeout(() => setNonce(n => n + 1), ttlSeconds * 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [bucket, path, ttlSeconds, nonce]);

  const refresh = useCallback(() => { retriedRef.current = false; setNonce(n => n + 1); }, []);
  const onError = useCallback(() => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    setNonce(n => n + 1);
  }, []);
  const onLoad = useCallback(() => { retriedRef.current = false; }, []);

  return { url: path ? url : null, refresh, onError, onLoad };
}
