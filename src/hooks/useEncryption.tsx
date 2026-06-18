/**
 * useEncryption — manages the user's data key lifecycle in the
 * browser. The raw key is held only in memory (React context) and is
 * never persisted.
 *
 * - On first signup, call `provisionKey(password)` to mint a new
 *   data key, wrap it with both the password and a recovery phrase,
 *   and store both wrappings in `user_encryption_keys`. Returns the
 *   recovery phrase to show ONCE.
 * - On login, call `unlockWithPassword(password)` to fetch the
 *   wrapped key and unwrap it in memory.
 * - On password forgotten, call `unlockWithRecoveryPhrase(phrase)`
 *   then `rotatePassword(newPassword)` to re-wrap with the new pw.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
  type WrappedKeyBlob,
} from "@/lib/phi-crypto";
import { generateRecoveryPhrase, normalizeRecoveryPhrase } from "@/lib/recovery-phrase";

interface EncryptionContextValue {
  /** In-memory data key. null = locked. */
  dataKey: CryptoKey | null;
  /** True if user_encryption_keys row exists for this user. */
  hasKey: boolean | null;
  /** True if dataKey is loaded. */
  isUnlocked: boolean;
  /** Loading the wrapped-key envelope from the server. */
  loading: boolean;

  provisionKey: (password: string) => Promise<{ recoveryPhrase: string }>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithRecoveryPhrase: (phrase: string) => Promise<void>;
  rotatePassword: (newPassword: string) => Promise<void>;
  lock: () => void;
}

const Ctx = createContext<EncryptionContextValue | null>(null);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const keyRef = useRef<CryptoKey | null>(null);
  const [tick, setTick] = useState(0); // forces re-render when keyRef changes
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const bump = () => setTick((n) => n + 1);

  // Probe whether a key envelope exists for this user.
  useEffect(() => {
    if (!user?.id) {
      keyRef.current = null;
      setHasKey(null);
      bump();
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_encryption_keys")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setHasKey(!error && !!data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const provisionKey = useCallback(
    async (password: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const dataKey = await generateDataKey();
      const recoveryPhrase = generateRecoveryPhrase();

      const passwordWrap = await wrapDataKey(dataKey, password);
      const recoveryWrap = await wrapDataKey(dataKey, recoveryPhrase);

      const { error } = await supabase.from("user_encryption_keys").upsert(
        {
          user_id: user.id,
          password_salt: passwordWrap.salt,
          password_kdf_iters: passwordWrap.iterations,
          wrapped_data_key: passwordWrap.wrapped,
          wrapped_data_key_iv: passwordWrap.iv,
          recovery_salt: recoveryWrap.salt,
          recovery_kdf_iters: recoveryWrap.iterations,
          recovery_wrapped_key: recoveryWrap.wrapped,
          recovery_wrapped_iv: recoveryWrap.iv,
          key_version: 1,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      keyRef.current = dataKey;
      setHasKey(true);
      bump();
      return { recoveryPhrase };
    },
    [user?.id],
  );

  const fetchEnvelope = useCallback(async () => {
    if (!user?.id) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("user_encryption_keys")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (error || !data) throw new Error("Encryption key envelope not found");
    return data;
  }, [user?.id]);

  const unlockWithPassword = useCallback(
    async (password: string) => {
      const env = await fetchEnvelope();
      const blob: WrappedKeyBlob = {
        wrapped: env.wrapped_data_key,
        iv: env.wrapped_data_key_iv,
        salt: env.password_salt,
        iterations: env.password_kdf_iters,
      };
      keyRef.current = await unwrapDataKey(blob, password);
      bump();
    },
    [fetchEnvelope],
  );

  const unlockWithRecoveryPhrase = useCallback(
    async (phrase: string) => {
      const env = await fetchEnvelope();
      const blob: WrappedKeyBlob = {
        wrapped: env.recovery_wrapped_key,
        iv: env.recovery_wrapped_iv,
        salt: env.recovery_salt,
        iterations: env.recovery_kdf_iters,
      };
      keyRef.current = await unwrapDataKey(blob, normalizeRecoveryPhrase(phrase));
      bump();
    },
    [fetchEnvelope],
  );

  const rotatePassword = useCallback(
    async (newPassword: string) => {
      if (!keyRef.current || !user?.id) throw new Error("Unlock required");
      const passwordWrap = await wrapDataKey(keyRef.current, newPassword);
      const { error } = await supabase
        .from("user_encryption_keys")
        .update({
          password_salt: passwordWrap.salt,
          password_kdf_iters: passwordWrap.iterations,
          wrapped_data_key: passwordWrap.wrapped,
          wrapped_data_key_iv: passwordWrap.iv,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    [user?.id],
  );

  const lock = useCallback(() => {
    keyRef.current = null;
    bump();
  }, []);

  const value = useMemo<EncryptionContextValue>(
    () => ({
      dataKey: keyRef.current,
      hasKey,
      isUnlocked: keyRef.current !== null,
      loading,
      provisionKey,
      unlockWithPassword,
      unlockWithRecoveryPhrase,
      rotatePassword,
      lock,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, hasKey, loading, provisionKey, unlockWithPassword, unlockWithRecoveryPhrase, rotatePassword, lock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEncryption(): EncryptionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEncryption must be used inside <EncryptionProvider>");
  return ctx;
}
