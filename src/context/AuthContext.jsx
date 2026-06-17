import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../libs/supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {

    supabase.auth.getUser().then(
      ({ data }) => {
        setUser(data.user);
      }
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();

  }, []);

  return (
    <AuthContext.Provider
      value={{ user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);