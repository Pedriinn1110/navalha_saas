import { ArrowRight, CalendarDays, Check, Scissors, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand" aria-label="Navalha início">
          <span className="brand-mark"><Scissors size={18} /></span>
          <span>navalha</span>
        </Link>
        <div className="landing-links">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link className="login-link" href="/entrar/cliente">Área do cliente</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Gestão inteligente para barbearias</div>
          <h1>Mais clientes.<br /><em>Mais controle.</em></h1>
          <p>Agenda, equipe, financeiro e relacionamento com clientes em uma única plataforma criada para crescer com seu negócio.</p>
          <div className="hero-actions">
            <Link href="/entrar/admin" className="primary-button">Área do barbeiro <ArrowRight size={17} /></Link>
            <a href="#recursos" className="secondary-button">Conhecer recursos</a>
          </div>
          <div className="hero-proof">
            <span><Check size={14} /> 14 dias grátis</span>
            <span><Check size={14} /> Sem cartão</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Prévia do painel Navalha">
          <div className="preview-card">
            <div className="preview-top"><span className="mini-logo"><Scissors size={15} /></span><b>Visão geral</b><div className="preview-avatar">MS</div></div>
            <div className="preview-stats">
              <div><span>Receita</span><strong>R$ 8.420</strong><small>+18% este mês</small></div>
              <div><span>Atendimentos</span><strong>124</strong><small>+12 esta semana</small></div>
            </div>
            <div className="preview-chart">
              {[42,58,51,74,67,88,78,94,72,83,96,89].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="preview-agenda">
              <div className="agenda-head"><b>Próximos agendamentos</b><span>Hoje</span></div>
              <div className="appointment"><b className="time">09:30</b><div><strong>Lucas Mendes</strong><small>Corte + Barba</small></div><span className="status">Confirmado</span></div>
              <div className="appointment"><b className="time">10:15</b><div><strong>Pedro Henrique</strong><small>Corte degradê</small></div><span className="status neutral">Aguardando</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip" id="recursos">
        <div><CalendarDays /><span><b>Agenda inteligente</b><small>Otimize horários e profissionais</small></span></div>
        <div><Users /><span><b>Base de clientes</b><small>Histórico e preferências</small></span></div>
        <div><TrendingUp /><span><b>Controle financeiro</b><small>Receitas e comissões</small></span></div>
      </section>
      <section className="landing-access" id="planos"><div><span className="eyebrow"><span /> ACESSO SEPARADO</span><h2>Gestão e atendimento,<br/>cada um no seu espaço.</h2><p>A equipe administra agenda, serviços e financeiro. Seus clientes entram em uma área própria para escolher serviços e pedir horários.</p></div><div className="access-actions"><Link href="/cadastro/barbearia" className="primary-button">Cadastrar minha barbearia <ArrowRight size={16}/></Link><Link href="/entrar/admin" className="secondary-button">Entrar como barbeiro</Link><Link href="/entrar/cliente" className="secondary-button">Acessar como cliente</Link></div></section>
    </main>
  );
}
