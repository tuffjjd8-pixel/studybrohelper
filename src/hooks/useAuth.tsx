import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string, referralCode?: string) => Promise<{ error: Error | null; userId?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; emailVerified?: boolean }>;
  signOut: () => Promise<void>;
  checkEmailVerified: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string, referralCode?: string): Promise<{ error: Error | null; userId?: string }> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split("@")[0],
          referral_code: referralCode || undefined,
        },
      },
    });

    // If signup successful and we have a referral code, create the referral record
    if (!error && data?.user && referralCode) {
      try {
        // Find the referrer by their referral code
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("referral_code", referralCode)
          .single();

        if (referrerProfile) {
          // Create the referral record
          await supabase.from("referrals").insert({
            referrer_id: referrerProfile.user_id,
            referred_user_id: data.user.id,
            referral_code: referralCode,
            status: "pending",
          });

          // Update the new user's profile with referred_by
          await supabase
            .from("profiles")
            .update({ referred_by: referrerProfile.user_id })
            .eq("user_id", data.user.id);
        }
      } catch (e) {
        console.error("Failed to create referral record:", e);
      }
    }

    return { error, userId: data?.user?.id };
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; emailVerified?: boolean }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data?.user) {
      // Check if email is verified
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("user_id", data.user.id)
        .maybeSingle();
      
      return { error: null, emailVerified: profile?.email_verified ?? false };
    }
    
    return { error };
  };

  const checkEmailVerified = async (userId: string): Promise<boolean> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("user_id", userId)
      .maybeSingle();
    
    return profile?.email_verified ?? false;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, checkEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
