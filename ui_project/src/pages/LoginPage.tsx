import { useState } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Shield, Eye, EyeOff, Mail, Lock, Github, Loader2 } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { toast } from "sonner";
import axios from "axios"; // <--- ADDED: Necessary for direct API call

export function LoginPage() {
  const { login, register } = useAuth(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // 1. Direct Backend Call to capture the Token
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: loginData.email,
        password: loginData.password,
      });

      // 2. Extract Token
      const { access_token, user } = response.data;

      if (!access_token) {
        throw new Error("No access token received.");
      }

      // 3. CRITICAL: Save Token to Storage (Fixes Settings Page issue)
      localStorage.setItem("access_token", access_token);
      
      // 4. Update Context State
      await login(loginData.email, loginData.password);
      
      toast.success("Welcome back!");
      navigate("/dashboard"); 

    } catch (err: any) {
      console.error("Login Error:", err);
      const msg = err.response?.data?.detail || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
const API_URL = import.meta.env.VITE_API_URL; 
const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // FIX: Use axios directly to hit the correct backend route
      await axios.post(`${API_URL}/auth/register`, {
        email: registerData.email,
        password: registerData.password,
        full_name: registerData.name // Backend expects 'full_name', not 'name'
      });
      
      toast.success("Account created! Please sign in.");
      
      // Switch the tab to "Sign In" automatically
      const loginTab = document.querySelector('[value="login"]') as HTMLElement;
      if (loginTab) loginTab.click();
      
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800">
                <Shield className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">FairVision</h1>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Advanced AI fairness platform for bias detection and mitigation
            </p>
          </div>

          {/* Auth Card */}
          <Card className="glass-card rounded-2xl shadow-xl border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-zinc-900 dark:text-zinc-100">Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 glass-plate p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                  <TabsTrigger
                    value="login"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 transition-colors"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 transition-colors"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Social auth (placeholder) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  <Button
                    type="button"
                    onClick={() => toast.info("Google sign-in coming soon")}
                    className="w-full border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/70 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Google
                  </Button>
                  <Button
                    type="button"
                    onClick={() => toast.info("GitHub sign-in coming soon")}
                    className="w-full border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/70 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
                  >
                    <Github className="w-4 h-4 mr-2" /> GitHub
                  </Button>
                </div>
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <span className="w-full border-t border-zinc-200 dark:border-zinc-700/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">or continue with</span>
                  </div>
                </div>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-9"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Your password"
                          className="pl-9 pr-10"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, password: e.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8 text-zinc-500"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 select-none">
                        <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                        Remember me
                      </label>
                      <a href="#" className="text-sky-600 dark:text-sky-400 hover:underline">Forgot password?</a>
                    </div>

                    <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Ada Lovelace"
                        value={registerData.name}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@company.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Confirm Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-zinc-500 mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}