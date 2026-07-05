import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Activity, ArrowRight, Shield } from "lucide-react";
import warehouseBg from "@/assets/hino-warehouse-bg.jpg";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    if (login(username, password)) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Use admin / admin123");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${warehouseBg})` }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 backdrop-blur-[2px]" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
        <div className="animate-slide-up rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Logo & Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/20 animate-scale-in">
              <Activity className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white animate-fade-in">
              DimReduce
            </h1>
            <p className="mt-1.5 text-sm text-white/50 animate-fade-in">
              Dimensionality Reduction Analysis System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-slide-up stagger-1">
              <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Username
              </Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-primary" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="h-11 border-white/10 bg-white/5 pl-11 text-white placeholder:text-white/25 focus-visible:ring-primary/50 focus-visible:border-primary/30 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 animate-slide-up stagger-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-11 border-white/10 bg-white/5 pl-11 text-white placeholder:text-white/25 focus-visible:ring-primary/50 focus-visible:border-primary/30 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 animate-scale-in">
                <Shield className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 animate-slide-up stagger-3"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Login to System
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-white/30">
            <Shield className="h-3 w-3" />
            <p className="text-[10px] uppercase tracking-widest">
              Administrator Access Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
