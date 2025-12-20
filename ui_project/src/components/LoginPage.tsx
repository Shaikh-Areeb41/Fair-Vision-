import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Shield, Eye, EyeOff, Mail, Lock, Github } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { toast } from "sonner";

interface LoginPageProps {
  onLogin: (userData: { name: string; email: string }) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Mock login
    onLogin({ name: "John Doe", email: loginData.email });
    toast.success("Welcome back to FairVision!");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.name || !registerData.email || !registerData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Mock registration
    onLogin({ name: registerData.name, email: registerData.email });
    toast.success("Account created successfully! Welcome to FairVision!");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex items-center justify-center p-6">
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
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-zinc-900 dark:text-zinc-100">Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 glass-plate p-1 rounded-lg">
                  <TabsTrigger
                    value="login"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:data-[state=active]:bg-zinc-900/70 dark:data-[state=active]:text-zinc-100 transition-colors"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-zinc-900 dark:data-[state=active]:bg-zinc-900/70 dark:data-[state=active]:text-zinc-100 transition-colors"
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
                    <Mail className="w-4 h-4 mr-2" /> Continue with Email
                  </Button>
                  <Button
                    type="button"
                    onClick={() => toast.info("GitHub sign-in coming soon")}
                    className="w-full border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/70 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
                  >
                    <Github className="w-4 h-4 mr-2" /> Continue with GitHub
                  </Button>
                </div>
                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <span className="w-full border-t border-zinc-200 dark:border-zinc-700/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-transparent px-2 text-zinc-500 dark:text-zinc-500">or continue with</span>
                  </div>
                </div>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-zinc-700 dark:text-zinc-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-9 bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-zinc-700 dark:text-zinc-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Your password"
                          className="pl-9 pr-10 bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 select-none">
                        <input type="checkbox" className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700/60" />
                        Remember me
                      </label>
                      <a className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">Forgot password?</a>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                      size="lg"
                    >
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-zinc-700 dark:text-zinc-300">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Ada Lovelace"
                        className="bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-zinc-700 dark:text-zinc-300">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@company.com"
                        className="bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-zinc-700 dark:text-zinc-300">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        className="bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="text-zinc-700 dark:text-zinc-300">Confirm Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        className="bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        value={registerData.confirmPassword}
                        onChange={(e) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                      size="lg"
                    >
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-500 mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
