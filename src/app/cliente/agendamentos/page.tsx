"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Scissors } from "lucide-react";

type Appointment = { id: string; date: string; time: string; client: string; serviceName: string; barberName: string; status: string };
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value;
export default function CustomerAppointments() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [clientName, setClientName] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const name = localStorage.getItem("navalha-client-name") ?? "";
      const all: Appointment[] = JSON.parse(localStorage.getItem("navalha-appointments") ?? "[]");
      // Load the browser's demonstration account and its appointment list.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientName(name); setItems(name ? all.filter((item) => item.client.toLocaleLowerCase() === name.toLocaleLowerCase()) : []);
    } catch { /* No saved appointments yet. */ }
  }, []);
  function cancel(id: string) {
    const all: Appointment[] = JSON.parse(localStorage.getItem("navalha-appointments") ?? "[]");
    const updated = all.map((item) => item.id === id ? { ...item, status: "Cancelado pelo cliente" } : item);
    localStorage.setItem("navalha-appointments", JSON.stringify(updated));
    setItems(updated.filter((item) => item.client.toLocaleLowerCase() === clientName.toLocaleLowerCase()));
    setNotice("Agendamento cancelado.");
  }
  return <main className="customer-shell"><header className="customer-header"><Link className="login-brand" href="/"><span><Scissors size={18}/></span> navalha</Link><Link href="/cliente" className="customer-exit">Novo agendamento</Link></header><section className="customer-content"><span className="login-kicker">ÁREA DO CLIENTE</span><h1>Meus agendamentos</h1><p>{clientName ? `Olá, ${clientName}. Acompanhe seus horários por aqui.` : "Seus pedidos aparecerão aqui depois de um agendamento."}</p>{notice && <div className="booking-success" role="status">{notice}</div>}<div className="panel customer-history"><div className="panel-head"><b><CalendarDays size={17}/> Seus horários</b><span>{items.length} agendamento(s)</span></div>{items.length === 0 ? <div className="empty-state">Você ainda não tem agendamentos. <Link href="/cliente">Escolher um serviço</Link></div> : items.map((item) => <article className="customer-appointment" key={item.id}><div className="customer-appointment-main"><span className="service-icon"><Scissors size={16}/></span><div><strong>{item.serviceName}</strong><small>Com {item.barberName}</small></div><div className="appointment-date"><b>{displayDate(item.date)}</b><small>às {item.time}</small></div></div><div className="customer-appointment-footer"><span className={`schedule-status ${item.status.startsWith("Cancelado") ? "waiting" : ""}`}>{item.status}</span>{!item.status.startsWith("Cancelado") && <button className="cancel-link" onClick={() => cancel(item.id)}>Cancelar agendamento</button>}</div></article>)}</div><div className="customer-notice">Data no formato DD/MM/AAAA e horário de 24 horas.</div><Link href="/cliente" className="back-home"><ArrowLeft size={14}/> Fazer novo agendamento</Link></section></main>;
}
