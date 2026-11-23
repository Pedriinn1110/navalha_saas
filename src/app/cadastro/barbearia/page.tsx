"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function makeSlug(name: string) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "barbearia";
  return `${base}-${crypto.randomUUID().slice(0, 5)}`;
}

export default function ShopSignup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("owner_name")).trim();
    const shopName = String(form.get("shop_name")).trim();
    const phone = String(form.get("phone")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const city = String(form.get("city")).trim();
    const state = String(form.get("state")).trim().toUpperCase();
    const address = String(form.get("address")).trim();
    const supabase = createClient();
    const shop = { name: shopName, slug: makeSlug(shopName), phone, whatsapp: phone, city, state, address };
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone, pending_shop: shop },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/entrar/admin`,
      },
    });
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Não foi possível criar sua conta.");
      setSubmitting(false);
      return;
    }

    if (data.session) {
      const { error: shopError } = await supabase.from("shops").insert({
        owner_id: data.user.id, ...shop,
      });
      if (shopError) {
        setError("Sua conta foi criada, mas não consegui cadastrar a barbearia. Confira se a migração do banco foi aplicada.");
        setSubmitting(false);
        return;
      }
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: name, phone });
      localStorage.setItem("navalha-current-user", JSON.stringify({
        id: data.user.id, name, email, role: "owner", shopName, shopSlug: shop.slug,
      }));
      router.push("/dashboard");
      return;
    }

    setNotice("Conta criada. Confirme seu e-mail pelo link que enviamos; a barbearia será cadastrada ao confirmar.");
    setSubmitting(false);
  }

  return (
    <main className="login-shell">
      <Link className="login-brand" href="/"><span><Scissors size={18} /></span> navalha</Link>
      <form className="login-card" onSubmit={submit}>
        <div className="login-icon"><Scissors size={22} /></div>
        <span className="login-kicker">COMECE POR AQUI</span>
        <h1>Cadastre sua barbearia</h1>
        <p>Crie o acesso do proprietário e o perfil público do estabelecimento.</p>
        <label>Seu nome<input name="owner_name" required autoComplete="name" placeholder="Nome do proprietário" /></label>
        <label>Nome da barbearia<input name="shop_name" required placeholder="Ex.: Barbearia Central" /></label>
        <label>Telefone / WhatsApp<input name="phone" required type="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
        <div className="form-two">
          <label>Cidade<input name="city" required autoComplete="address-level2" placeholder="Cidade" /></label>
          <label>UF<input name="state" required maxLength={2} autoComplete="address-level1" placeholder="SP" /></label>
        </div>
        <label>Endereço<input name="address" autoComplete="street-address" placeholder="Rua, número e bairro" /></label>
        <label>E-mail<input name="email" required type="email" autoComplete="email" placeholder="voce@email.com" /></label>
        <label>Senha
          <div className="password-field">
            <input name="password" required type={showPassword ? "text" : "password"} minLength={6} autoComplete="new-password" placeholder="Mínimo de 6 caracteres" />
            <button type="button" className="password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <button className="login-submit" disabled={submitting}>{submitting ? "Criando acesso..." : "Criar conta da barbearia"}</button>
        <Link href="/entrar/admin" className="switch-login">Já tenho acesso de barbeiro</Link>
      </form>
      <Link className="back-home" href="/"><ArrowLeft size={14} /> Voltar ao início</Link>
    </main>
  );
}
