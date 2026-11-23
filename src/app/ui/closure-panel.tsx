"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

const mask = (value: string) => { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits; };
export default function ClosurePanel() {
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("navalha-closed-dates") ?? "[]");
      const session = JSON.parse(localStorage.getItem("navalha-current-user") ?? "null");
      // Hydrate locally saved dates and account role after server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDates(stored); setIsOwner(session?.role === "owner");
    } catch { /* Start with no date exceptions. */ }
  }, []);
  function save(next: string[]) { setDates(next); localStorage.setItem("navalha-closed-dates", JSON.stringify(next)); }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const [day, month, year] = date.split("/").map(Number), parsed = new Date(year, month - 1, day);
    if (date.length !== 10 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) { setNotice("Digite uma data válida no formato DD/MM/AAAA."); return; }
    if (dates.includes(date)) { setNotice("Essa data já está marcada como fechada."); return; }
    save([...dates, date].sort((a, b) => { const [ad, am, ay] = a.split("/"); const [bd, bm, by] = b.split("/"); return `${ay}${am}${ad}`.localeCompare(`${by}${bm}${bd}`); }));
    setDate(""); setNotice("Dia fechado adicionado ao calendário do cliente.");
  }
  if (!isOwner) return null;
  return <section className="closure-panel"><div className="closure-heading"><span className="service-icon"><CalendarOff size={18}/></span><div><h2>Fechamentos excepcionais</h2><p>Bloqueie um dia específico, mesmo que normalmente seja dia de funcionamento.</p></div></div><form className="closure-form" onSubmit={add}><label>Data de fechamento<input value={date} onChange={(event) => setDate(mask(event.target.value))} required inputMode="numeric" placeholder="DD/MM/AAAA" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" title="Use o formato DD/MM/AAAA"/></label><button className="save-button"><Plus size={15}/> Fechar este dia</button></form>{notice && <p className="closure-notice" role="status">{notice}</p>}{dates.length > 0 && <div className="closure-list"><b>Dias bloqueados</b>{dates.map((item) => <div key={item}><span><CalendarOff size={14}/> {item}</span><button aria-label={`Remover fechamento de ${item}`} onClick={() => { save(dates.filter((value) => value !== item)); setNotice("Data liberada novamente para agendamentos."); }}><Trash2 size={14}/> Remover</button></div>)}</div>}</section>;
}
