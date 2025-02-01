import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserData } from "../types.js";
import { Alligator } from "./index.js";

const AlligatorContext = createContext<{
  client: Alligator;
  user: UserData | null;
  isAuthenticated: boolean;
  getCurrentUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
} | null>(null);

export function AlligatorProvider({
  children,
  tenantId,
}: { children: ReactNode; tenantId: number }) {
  const [client] = useState(() => new Alligator(tenantId));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  const getCurrentUser = useCallback(async () => {
    try {
      const user = await client.getCurrentUser(); // Throws error
      setIsAuthenticated(true);
      setUser(user);
    } catch (error) {
      console.error("Unable to retrieve user, try logging in again. Error: ", error);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [client]);

  useEffect(() => {
    const initAuth = async () => {
      await getCurrentUser();
    };
    initAuth();
  }, [getCurrentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const isLoggedIn = await client.login({ email, password });
      if (isLoggedIn) {
        await getCurrentUser();
        return true;
      }
      console.error("Unable to log in for some reason");
      return false;
    },
    [client, getCurrentUser],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, [client]);

  return (
    <AlligatorContext.Provider
      value={{ client, user, isAuthenticated, getCurrentUser, login, logout }}
    >
      {children}
    </AlligatorContext.Provider>
  );
}

export function useAlligator() {
  const context = useContext(AlligatorContext);

  if (!context) {
    throw new Error(
      "useAlligator must be used within an AlligatorProvider higher up in the component tree.",
    );
  }

  return context;
}
