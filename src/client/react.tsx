import { type ReactNode, createContext, useCallback, useContext, useState } from "react";
import { Alligator } from "./index.js";

const AlligatorContext = createContext<{
  client: Alligator;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AlligatorProvider({
  children,
  tenantId,
}: { children: ReactNode; tenantId: number }) {
  const [client] = useState(() => new Alligator(tenantId));
  const [isAuthenticated, setIsAuthenticated] = useState(client.hasCookies());

  const syncAuthState = useCallback(() => {
    setIsAuthenticated(client.hasCookies());
  }, [client]);

  const login = useCallback(
    async (email: string, password: string) => {
      await client.login({ email, password });
      syncAuthState();
    },
    [client, syncAuthState],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setIsAuthenticated(false);
  }, [client]);

  return (
    <AlligatorContext.Provider value={{ client, isAuthenticated, login, logout }}>
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
}
