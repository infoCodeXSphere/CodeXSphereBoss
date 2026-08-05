import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type Role } from "@cbos/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const res = await api.post<{ accessToken: string; user: { id: string; name: string; email: string; role: Role } }>("/auth/login", values);
      setSession(res.user, res.accessToken);
      navigate("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] text-white px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet" />
          <div>
            <div className="font-display font-semibold leading-none">CBOS</div>
            <div className="text-[10px] text-white/40">CodeSphere Business OS</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-xs text-white/50 block mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-indigo"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="text-xs text-white/50 block mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-indigo"
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-xs text-red-400">{serverError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-brand-indigo to-brand-violet text-white text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-[11px] text-white/30 mt-4">
          Default seed login: admin@codesphere.dev — see README for the seeded password.
        </p>
      </div>
    </div>
  );
}
