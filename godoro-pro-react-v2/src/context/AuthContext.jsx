import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { sb } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true wakati tunaangalia session iliyopo
  const [ownerExists, setOwnerExists] = useState(null); // null = bado hatujajua

  const loadStaffProfile = useCallback(async (authUser) => {
    const { data: staffRow, error } = await sb
      .from('staff')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !staffRow) {
      // Auth user yupo lakini hana profile ya staff - si sahihi, tumtoe
      await sb.auth.signOut();
      setCurrentUser(null);
      return null;
    }

    const user = {
      id: staffRow.id,
      name: staffRow.name,
      email: staffRow.email,
      avatar: staffRow.avatar,
      role: staffRow.role,
      locationId: staffRow.location_id,
    };
    setCurrentUser(user);
    return user;
  }, []);

  // Kagua session iliyopo wakati app inaanza (session persistence)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user && mounted) {
        await loadStaffProfile(session.user);
      }
      if (mounted) setAuthLoading(false);
    })();

    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadStaffProfile]);

  const checkOwnerExists = useCallback(async () => {
    try {
      const { data, error } = await sb.rpc('owner_exists');
      if (error) {
        console.error('owner_exists error:', error);
        setOwnerExists(true); // default salama: onyesha login, si signup
        return true;
      }
      setOwnerExists(!!data);
      return !!data;
    } catch (err) {
      console.error('checkOwnerExists exception:', err);
      setOwnerExists(true);
      return true;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
      throw new Error('Invalid email or password.');
    }
    const user = await loadStaffProfile(data.user);
    if (!user) {
      throw new Error('Account not linked to any staff profile.');
    }
    return user;
  }, [loadStaffProfile]);

  const signupOwner = useCallback(async ({ name, email, password }) => {
    const exists = await checkOwnerExists();
    if (exists) {
      throw new Error('Owner account already exists. Please login instead.');
    }

    const { data, error } = await sb.auth.signUp({ email, password });
    if (error || !data?.user) {
      throw new Error(error?.message || 'Failed to create account.');
    }

    const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');

    const { error: insertError } = await sb.from('staff').insert({
      id: data.user.id,
      name,
      email,
      avatar: initials,
      role: 'owner',
      location_id: null,
    });

    if (insertError) {
      throw new Error('Failed to save owner details: ' + insertError.message);
    }

    return true;
  }, [checkOwnerExists]);

  const logout = useCallback(async () => {
    await sb.auth.signOut();
    setCurrentUser(null);
  }, []);

  const isOwner = () => currentUser?.role === 'owner';
  const isManager = () => currentUser?.role === 'owner' || currentUser?.role === 'manager';
  const isSalesperson = () => currentUser?.role === 'salesperson';

  const value = {
    currentUser,
    authLoading,
    ownerExists,
    checkOwnerExists,
    login,
    signupOwner,
    logout,
    isOwner,
    isManager,
    isSalesperson,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
