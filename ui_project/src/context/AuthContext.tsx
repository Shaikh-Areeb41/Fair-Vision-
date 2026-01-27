import { createContext, useContext, useState, useEffect } from "react";
import { auth, setToken, removeToken, getToken, getUser } from "../lib/api";
import { toast } from "sonner";

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  // Fix: Added types here
  const login = async (email: string, password: string) => {
    try {
      const data = await auth.login(email, password);
      setToken(data.access_token);
      localStorage.setItem("fv_user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.full_name}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Login failed");
      throw err;
    }
  };

  // Fix: Added types here
  const register = async (email: string, password: string, name: string) => {
    try {
      await auth.register(email, password, name);
      await login(email, password); 
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Registration failed");
      throw err;
    }
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem("fv_user");
    setUser(null);
    toast.info("Logged out successfully");
    localStorage.removeItem("dashboardData");
    localStorage.removeItem("analysisResults");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};