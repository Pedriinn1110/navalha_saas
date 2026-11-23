"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Scissors, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim().toLowerCase();
    const password = String(data.get("password"));
    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !auth.user) {
      setError("E-mail ou senha incorretos.");
      setSubmitting(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("shop_members")
      .select("id, shop_id, role, display_name, shops(name, slug)")
      .eq("user_id", auth.user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      await supabase.auth.signOut();
      setError(memberError
        ? "Não consegui consultar a equipe. Confira se a migração do banco foi aplicada."
        : "Este e-mail ainda não está vinculado a uma barbearia. Peça ao proprietário para enviar seu convite.");
      setSubmitting(false);
      return;
    }

    const shop = Array.isArray(member.shops) ? member.shops[0] : member.shops;
    localStorage.setItem("navalha-current-user", JSON.stringify({
      id: auth.user.id,
      memberId: member.id,
      shopId: member.shop_id,
      name: member.display_name || auth.user.user_metadata?.full_name || email,
      email,
      role: member.role,
      shopName: shop?.name ?? "",
      shopSlug: shop?.slug ?? "",
    }));
    setSubmitting(false);
    router.push("/dashboard");
  }

  return (
    <main className="login-shell">
      <Link className="login-brand" href="/"><span><Scissors size={18} /></span> navalha</Link>
      <form className="login-card" onSubmit={login}>
        <div className="login-icon"><ShieldCheck size={22} /></div>
        <span className="login-kicker">ÁREA DA EQUIPE</span>
        <h1>Entrar como barbeiro</h1>
        <p>Acesse sua agenda e o painel da barbearia.</p>
        <label>E-mail profissional<input name="email" required type="email" autoComplete="email" placeholder="voce@barbearia.com" /></label>
        <label>Senha
          <div className="password-field">
            <input name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" />
            <button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="login-submit" disabled={submitting}>{submitting ? "Conectando..." : "Entrar no painel"}</button>
        <div className="login-hint">Entre com o e-mail e a senha da sua conta da barbearia.</div>
        <Link href="/entrar/cliente" className="switch-login">Sou cliente e quero agendar</Link>
      </form>
      <Link className="back-home" href="/"><ArrowLeft size={14} /> Voltar ao início</Link>
    </main>
  );
}
