import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/cliente";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const pendingShop = data.user.user_metadata?.pending_shop;
      if (pendingShop && typeof pendingShop.name === "string" && typeof pendingShop.slug === "string") {
        const { data: existingShop } = await supabase.from("shops").select("id")
          .eq("owner_id", data.user.id).limit(1).maybeSingle();
        if (!existingShop) {
          const { error: shopError } = await supabase.from("shops").insert({
            owner_id: data.user.id,
            name: pendingShop.name,
            slug: pendingShop.slug,
            city: pendingShop.city ?? "",
            state: pendingShop.state ?? "",
            address: pendingShop.address ?? "",
            phone: pendingShop.phone ?? "",
            whatsapp: pendingShop.whatsapp ?? "",
          });
          if (shopError) return NextResponse.redirect(new URL("/entrar/admin?erro=barbearia", requestUrl.origin));
        }
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name ?? "",
          phone: data.user.user_metadata?.phone ?? null,
        });
      }
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/entrar/cliente?erro=confirmacao", requestUrl.origin));
}
