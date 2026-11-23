"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Eye, EyeOff, Scissors, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CustomerLogin() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));
    const supabase = createClient();

    if (creating) {
      const name = String(data.get("name")).trim();
      const phone = String(data.get("phone")).trim();
      const { data: result, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cliente`,
        },
      });
      if (signUpError || !result.user) {
        setError(signUpError?.message ?? "Não foi possível criar sua conta.");
        setSubmitting(false);
        return;
      }
      if (!result.session) {
        setCreating(false);
        setNotice("Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre.");
        setSubmitting(false);
        return;
      }
      localStorage.setItem("navalha-client-profile", JSON.stringify({ name, phone, email }));
      localStorage.setItem("navalha-client-name", name);
      setSubmitting(false);
      router.push("/cliente");
      return;
    }

    const { data: result, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !result.user) {
      setError("E-mail ou senha incorretos.");
      setSubmitting(false);
      return;
    }
    const name = String(result.user.user_metadata?.full_name ?? "").trim();
    const phone = String(result.user.user_metadata?.phone ?? "").trim();
    localStorage.setItem("navalha-client-profile", JSON.stringify({ name, phone, email }));
    if (name) localStorage.setItem("navalha-client-name", name);
    setSubmitting(false);
    router.push("/cliente");
  }

  return (
    <main className="login-shell">
      <Link className="login-brand" href="/"><span><Scissors size={18} /></span> navalha</Link>
      <form className="login-card" onSubmit={submit}>
        <div className="login-icon">{creating ? <UserRound size={22} /> : <CalendarDays size={22} />}</div>
        <span className="login-kicker">ÁREA DO CLIENTE</span>
        <h1>{creating ? "Crie sua conta" : "Seu próximo corte"}</h1>
        <p>{creating ? "Cadastre seus dados para agilizar seus agendamentos." : "Entre para agendar e consultar seus horários."}</p>
        {creating && <>
          <label>Nome completo<input name="name" required autoComplete="name" placeholder="Seu nome" /></label>
          <label>Telefone<input name="phone" required type="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
        </>}
        <label>Seu e-mail<input name="email" required type="email" autoComplete="email" placeholder="voce@email.com" /></label>
        <label>Senha
          <div className="password-field">
            <input name="password" required type={showPassword ? "text" : "password"} autoComplete={creating ? "new-password" : "current-password"} placeholder="Sua senha" />
            <button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </label>
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="form-success">{notice}</p>}
        <button className="login-submit" disabled={submitting}>{submitting ? "Aguarde..." : creating ? "Criar conta" : "Entrar como cliente"}</button>
        <button type="button" className="switch-login switch-button" onClick={() => { setCreating(!creating); setError(""); setNotice(""); }}>{creating ? "Já tenho uma conta · Entrar" : "Ainda não tenho conta · Criar conta"}</button>
        <Link href="/entrar/admin" className="switch-login">Sou barbeiro ou administrador</Link>
      </form>
      <Link className="back-home" href="/"><ArrowLeft size={14} /> Voltar ao início</Link>
    </main>
  );
}
