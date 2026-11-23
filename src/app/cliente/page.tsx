"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CalendarOff, Check, ChevronLeft, ChevronRight, Clock3, CreditCard, MapPin, QrCode, Scissors, ShieldCheck, UserRound } from "lucide-react";

type Barber = { id: string; name: string; photo: string; specialty?: string };
type Service = { id: string; name: string; duration: number; price: number };
type ShopSettings = { openDays: number[]; paymentMethods: string[]; pixKey: string; storeName: string; address: string };
type Appointment = { id: string; date: string; time: string; client: string; clientPhone: string; serviceName: string; barberName: string; barberId?: string; payment: string; status: string; duration?: number };
const defaultBarbers: Barber[] = [{ id: "matheus", name: "Matheus Silva", photo: "", specialty: "Cortes clássicos e barba" }];
const defaultServices: Service[] = [{ id: "corte", name: "Corte tradicional", duration: 30, price: 45 }, { id: "combo", name: "Corte + barba", duration: 60, price: 80 }, { id: "barba", name: "Barba", duration: 30, price: 40 }, { id: "degrade", name: "Corte degradê", duration: 45, price: 55 }];
const defaultSettings: ShopSettings = { openDays: [1, 2, 3, 4, 5, 6], paymentMethods: ["pix", "card", "cash"], pixKey: "", storeName: "Navalha Barbearia", address: "Rua das Palmeiras, 120 · São Paulo, SP" };
const payOptions = [{ id: "pix", label: "Pix", Icon: QrCode }, { id: "card", label: "Cartão", Icon: CreditCard }, { id: "cash", label: "Dinheiro", Icon: Banknote }];
const week = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const slots = Array.from({ length: 22 }, (_, index) => `${String(9 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pad = (value: number) => String(value).padStart(2, "0");
const todayDate = new Date();
const maskPhone = (value: string) => { const d = value.replace(/\D/g, "").slice(0, 11); if (d.length <= 2) return d.length ? `(${d}` : ""; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, d.length > 10 ? 7 : 6)}-${d.slice(d.length > 10 ? 7 : 6)}`; };
const asMinutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
export default function CustomerArea() {
  const router = useRouter();
  const [barbers, setBarbers] = useState(defaultBarbers);
  const [services, setServices] = useState(defaultServices);
  const [settings, setSettings] = useState(defaultSettings);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState("");
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  useEffect(() => {
    try {
      const b = localStorage.getItem("navalha-barbers"), s = localStorage.getItem("navalha-services"), shop = localStorage.getItem("navalha-settings"), profile = localStorage.getItem("navalha-client-profile"), closures = localStorage.getItem("navalha-closed-dates"), savedAppointments = localStorage.getItem("navalha-appointments");
      // Hydrate the browser-saved booking catalog after server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (b) setBarbers(JSON.parse(b).map((item: Barber) => ({ ...item, specialty: item.specialty ?? "Cortes clássicos e barba" })));
      if (s) setServices(JSON.parse(s)); if (shop) setSettings({ ...defaultSettings, ...JSON.parse(shop) });
      if (closures) setClosedDates(JSON.parse(closures)); if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
      if (profile) { const client = JSON.parse(profile); setClientName(client.name ?? ""); setClientPhone(client.phone ?? ""); }
    } catch { /* Use the demonstration catalog when browser storage is empty. */ }
  }, []);
  const chosenServices = useMemo(() => services.filter((service) => selectedServices.includes(service.id)), [services, selectedServices]);
  const total = chosenServices.reduce((sum, service) => sum + service.price, 0);
  const duration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
  const currentBarber = barbers.find((item) => item.id === barberId);
  const todayIso = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}-${pad(todayDate.getDate())}`;
  const selectedIso = date ? date.split("/").reverse().join("-") : "";
  const availablePayments = payOptions.filter((option) => settings.paymentMethods.includes(option.id));
  const year = month.getFullYear(), monthIndex = month.getMonth(), firstWeekday = new Date(year, monthIndex, 1).getDay(), daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const storeOpenNow = settings.openDays.includes(todayDate.getDay()) && !closedDates.includes(`${pad(todayDate.getDate())}/${pad(todayDate.getMonth() + 1)}/${todayDate.getFullYear()}`) && todayDate.getHours() >= 9 && todayDate.getHours() < 20;
  function isClosed(day: number) { const value = `${pad(day)}/${pad(monthIndex + 1)}/${year}`; return !settings.openDays.includes(new Date(year, monthIndex, day).getDay()) || closedDates.includes(value); }
  function isSlotOccupied(slot: string) {
    if (!date || !currentBarber) return false;
    const start = asMinutes(slot), finish = start + Math.max(duration, 30);
    return appointments.some((item) => {
      const belongsToBarber = item.barberId ? item.barberId === currentBarber.id : item.barberName === currentBarber.name;
      if (item.date !== date || !belongsToBarber || item.status.startsWith("Cancelado") || item.status === "Concluído") return false;
      const busyStart = asMinutes(item.time), busyEnd = busyStart + Math.max(item.duration ?? 30, 30);
      return start < busyEnd && finish > busyStart;
    });
  }
  function toggleService(id: string) { setSelectedServices((selected) => selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]); setTime(""); setError(""); }
  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!payment) { setError("Escolha uma forma de pagamento para continuar."); document.getElementById("payment-options")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!chosenServices.length || !currentBarber || !date || !time) { setError("Complete as escolhas de serviço, profissional, data e horário."); return; }
    const [day, mon, yr] = date.split("/").map(Number), parsed = new Date(yr, mon - 1, day);
    if (date.length !== 10 || parsed.getFullYear() !== yr || parsed.getMonth() !== mon - 1 || parsed.getDate() !== day || selectedIso < todayIso || isClosed(day)) { setError("Escolha uma data disponível no calendário."); return; }
    if (isSlotOccupied(time)) { setError("Esse horário acabou de ficar indisponível. Escolha outro."); return; }
    const name = clientName.trim(), phone = clientPhone.trim();
    const appointment: Appointment = { id: crypto.randomUUID(), date, time, client: name, clientPhone: phone, serviceName: chosenServices.map((service) => service.name).join(" + "), barberName: currentBarber.name, barberId: currentBarber.id, payment, status: "Aguardando confirmação", duration };
    try {
      const existing: Appointment[] = JSON.parse(localStorage.getItem("navalha-appointments") ?? "[]");
      localStorage.setItem("navalha-appointments", JSON.stringify([...existing, appointment]));
      localStorage.setItem("navalha-client-name", name); localStorage.setItem("navalha-client-profile", JSON.stringify({ name, phone }));
      const accounts = JSON.parse(localStorage.getItem("navalha-client-accounts") ?? "[]");
      localStorage.setItem("navalha-client-accounts", JSON.stringify(accounts.map((account: { name: string; phone: string }) => account.name === name ? { ...account, phone } : account)));
    } catch { setError("Não foi possível salvar o pedido neste navegador."); return; }
    router.push("/cliente/agendamentos");
  }
  return <main className="customer-shell luxury-customer"><header className="customer-header luxury-header"><Link className="login-brand" href="/"><span><Scissors size={18} strokeWidth={1.75}/></span> navalha</Link><Link className="customer-exit" href="/cliente/agendamentos">Meus agendamentos <ChevronRight size={15}/></Link></header><section className="customer-content luxury-content"><div className="shop-hero"><div className="shop-cover"/><div className="shop-identity"><div className="shop-avatar"><Scissors size={26} strokeWidth={1.6}/></div><div className="shop-copy"><div className="shop-title-row"><h1>{settings.storeName}</h1><span className={`shop-status ${storeOpenNow ? "open" : "closed"}`}><i/>{storeOpenNow ? "Aberto agora" : "Fechado agora"}</span></div><a className="shop-address" href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`} target="_blank" rel="noreferrer"><MapPin size={14} strokeWidth={1.75}/> {settings.address} <ChevronRight size={13}/></a></div></div></div><div className="booking-intro"><div><span className="login-kicker">AGENDE ONLINE</span><h2>Seu próximo corte,<br className="mobile-break"/> no seu horário.</h2></div><p>Escolha os serviços e o profissional. A confirmação chega em seguida.</p></div><form className="luxury-booking-form" onSubmit={book}><section className="booking-section"><div className="section-heading"><span>01</span><div><h3>Escolha seu serviço</h3><p>Você pode combinar mais de um serviço.</p></div></div><div className="luxury-service-grid">{services.map((service) => { const selected = selectedServices.includes(service.id); return <button type="button" key={service.id} aria-pressed={selected} className={`luxury-service-card ${selected ? "selected" : ""}`} onClick={() => toggleService(service.id)}><span className="service-card-top"><span className="service-card-icon"><Scissors size={17} strokeWidth={1.75}/></span><span className={`service-check ${selected ? "checked" : ""}`}>{selected && <Check size={13}/>}</span></span><b>{service.name}</b><span className="service-time"><Clock3 size={14} strokeWidth={1.75}/>{service.duration} min</span><strong>{money(service.price)}</strong></button>; })}</div></section><section className="booking-section"><div className="section-heading"><span>02</span><div><h3>Escolha o profissional</h3><p>Conheça quem vai cuidar do seu visual.</p></div></div><div className="barber-carousel">{barbers.map((barber) => <button type="button" key={barber.id} aria-pressed={barberId === barber.id} className={`luxury-barber-card ${barberId === barber.id ? "selected" : ""}`} onClick={() => { setBarberId(barber.id); setTime(""); }}><span className="barber-photo-ring">{barber.photo ? <Image src={barber.photo} alt="" width={54} height={54} unoptimized/> : <span className="barber-avatar"><UserRound size={24} strokeWidth={1.6}/></span>}</span><b>{barber.name}</b><small>{barber.specialty ?? "Cortes clássicos e barba"}</small></button>)}</div></section><section className="booking-section"><div className="section-heading"><span>03</span><div><h3>Data e horário</h3><p>Dias fechados aparecem apagados no calendário.</p></div></div><div className="luxury-calendar"><div className="calendar-title"><button type="button" aria-label="Mês anterior" disabled={year === todayDate.getFullYear() && monthIndex === todayDate.getMonth()} onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft size={18}/></button><strong>{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={18}/></button></div><div className="luxury-calendar-grid">{week.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span className="calendar-blank" key={`blank-${index}`}/>)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1, dateObj = new Date(year, monthIndex, day), value = `${pad(day)}/${pad(monthIndex + 1)}/${year}`, closed = isClosed(day), past = dateObj < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()); return <button type="button" key={day} disabled={closed || past} className={`luxury-calendar-day ${closed ? "closed" : ""} ${past ? "past" : ""} ${date === value ? "chosen" : ""}`} title={closed ? "Fechado" : past ? "Data passada" : value} onClick={() => { setDate(value); setTime(""); setError(""); }}>{day}</button>; })}</div><div className="calendar-legend"><span><i className="legend-open"/> Disponível</span><span><i className="legend-closed"/> Fechado</span></div></div>{date && barberId && chosenServices.length > 0 && <div className="time-picker"><div className="time-picker-heading"><b><Clock3 size={16}/> Horários disponíveis</b><span>{date}</span></div><div className="time-slot-grid">{slots.map((slot) => { const tooLate = asMinutes(slot) + Math.max(duration, 30) > 20 * 60, occupied = isSlotOccupied(slot) || tooLate; return <button type="button" key={slot} disabled={occupied} aria-pressed={time === slot} className={`time-slot ${occupied ? "occupied" : ""} ${time === slot ? "selected" : ""}`} onClick={() => { setTime(slot); setError(""); }}>{slot}</button>; })}</div><p className="time-helper"><CalendarOff size={13}/> Horários ocupados ficam indisponíveis.</p></div>}</section><section className="booking-section booking-details"><div className="section-heading"><span>04</span><div><h3>Seus dados e pagamento</h3><p>Confirme seus dados para receber o pedido.</p></div></div><div className="client-fields"><label>Nome completo<input required value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Seu nome" autoComplete="name"/></label><label>Telefone<input required type="tel" inputMode="tel" value={clientPhone} onChange={(event) => setClientPhone(maskPhone(event.target.value))} placeholder="(11) 99999-9999" autoComplete="tel"/></label></div><div className="payment-picker luxury-payment"><h3>Forma de pagamento</h3><div>{availablePayments.map(({ id, label, Icon }) => <button type="button" aria-pressed={payment === id} className={`payment-option ${payment === id ? "selected" : ""}`} key={id} onClick={() => setPayment(id)}><Icon size={19} strokeWidth={1.75}/><span>{label}</span></button>)}</div>{payment === "pix" && <p className="pix-key"><QrCode size={16} strokeWidth={1.75}/><span>Chave Pix: <b>{settings.pixKey || "Consulte a barbearia antes de pagar"}</b></span></p>}</div>{error && <p className="form-error" role="alert">{error}</p>}</section><div className={`booking-sticky ${chosenServices.length && barberId && date && time ? "visible" : ""}`}><div className="sticky-summary"><span>Seu agendamento</span><strong>{money(total)} <i>·</i> {duration} min</strong></div><button type="submit" disabled={!chosenServices.length || !barberId || !date || !time}><span>Confirmar agendamento</span><ChevronRight size={18}/></button></div><div className="booking-bottom-space"/><div className="customer-security-note"><ShieldCheck size={14}/> Seus dados são usados somente para organizar seu agendamento.</div></form><Link href="/" className="back-home luxury-back"><ArrowLeft size={14}/> Voltar ao início</Link></section></main>;
}
