import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  is_admin: boolean;
  is_approved: boolean;
  can_vote: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError) setError(authError.message);
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (profileError) setError(profileError.message);
    if (!data) {
      // Optionally, create the profile here if missing
      setUser(null);
    } else {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        is_admin: data.is_admin,
        is_approved: data.is_approved,
        can_vote: data.can_vote,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}; 