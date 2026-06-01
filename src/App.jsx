import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell,
  CalendarDays, Car, CheckCircle2, ChevronDown, CircleDollarSign, Clock3,
  Download, Droplets, Fuel, Gauge, Grid2X2, LayoutDashboard, MapPin, Menu,
  Moon, MoreHorizontal, Plus, ReceiptText, Search, Settings, ShieldCheck,
  Sparkles, Sun, Trash2, TrendingUp, Wrench, X, Zap,
} from "lucide-react";
import { deleteEntry, getEntries, getFuelEntries, saveEntry, updateEntry } from "./db";
import { fetchDailyFuelPrice } from "./fuelPrice";
import { calculateRefill } from "./calculations";

const nav = [
  ["Overview", LayoutDashboard],
  ["Vehicles", Car],
  ["Fuel log", Fuel],
  ["Maintenance", Wrench],
  ["Trips", MapPin],
  ["Expenses", ReceiptText],
  ["Analytics", TrendingUp],
  ["Schedule", CalendarDays],
];

const flatData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pages = {
  Vehicles: ["Your garage", "Manage profiles, odometer history and lifetime ownership for every vehicle."],
  "Fuel log": ["Fuel history", "Track every refill, compare prices and follow your real-world mileage."],
  Maintenance: ["Service records", "Keep your vehicle healthy with repair history and mileage-based reminders."],
  Trips: ["Travel history", "Review completed journeys, recurring travel and time spent on the road."],
  Expenses: ["All expenses", "See every vehicle-related cost in one tidy ownership ledger."],
  Analytics: ["Performance insights", "Understand fuel, distance and spending trends across your garage."],
  Schedule: ["Travel schedule", "Plan recurring journeys, renewals and service obligations."],
  Settings: ["Settings", "Tune the experience to match your vehicle life."],
};

function money(v) { return new Intl.NumberFormat("en-IN").format(v); }

function IconButton({ children, label, onClick, className = "" }) {
  return <button className={`icon-btn ${className}`} aria-label={label} onClick={onClick}>{children}</button>;
}

function Sparkline({ data, color = "#e66b2e", fill = "none", height = 54 }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 240},${height - 5 - ((v - min) / (max - min || 1)) * (height - 12)}`).join(" ");
  return <svg className="sparkline" viewBox={`0 0 240 ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {fill !== "none" && <polygon points={`0,${height} ${points} 240,${height}`} fill={fill} />}
    <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Donut({ empty = false }) {
  const segments = empty ? [] : [["#e66b2e", 56], ["#315f69", 24], ["#e5b45d", 12], ["#8372ac", 8]];
  let offset = 25;
  return <svg viewBox="0 0 42 42" className="donut" aria-label="Expense distribution chart">
    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ece8df" strokeWidth="6" />
    {segments.map(([color, value]) => {
      const el = <circle key={color} cx="21" cy="21" r="15.9" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${value} ${100-value}`} strokeDashoffset={offset} />;
      offset -= value; return el;
    })}
  </svg>;
}

function Modal({ close, setActivities, vehicle, fuelEntries, onRecordSaved, onVehicleUpdate, initialType = null }) {
  const [type, setType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [fuelCity, setFuelCity] = useState(vehicle.city || "");
  const [priceStatus, setPriceStatus] = useState(vehicle.city ? "Fetching today's INR price..." : "Enter your city to fetch today's INR price.");
  const [autoPrice, setAutoPrice] = useState(false);
  const labels = { fuel: ["Fuel refill", Fuel], trips: ["Trip", MapPin], service: ["Service", Wrench], expenses: ["Expense", ReceiptText] };
  const lastFuel = fuelEntries[fuelEntries.length - 1];
  const preview = calculateRefill({ amount, pricePerLiter: price, currentOdometer: 0, previousOdometer: 0 });
  const liters = amount && price ? preview.liters.toFixed(2) : "";
  useEffect(() => {
    if (type !== "fuel" || !fuelCity.trim()) return;
    setPriceStatus("Fetching today's INR price...");
    setAutoPrice(false);
    fetchDailyFuelPrice(vehicle.fuel, fuelCity)
      .then((result) => {
        setPrice(String(result.price));
        setAutoPrice(true);
        setPriceStatus(`${result.cached ? "Saved daily" : "Live"} ${vehicle.fuel.toLowerCase()} price for ${result.city}. Saved with this refill.`);
      })
      .catch((error) => {
        setAutoPrice(false);
        setPriceStatus(`${error.message} Enter the INR price manually.`);
      });
  }, [type, fuelCity, vehicle.fuel]);
  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (type === "fuel") {
      if (fuelCity.trim() && fuelCity.trim() !== vehicle.city) onVehicleUpdate({ ...vehicle, city: fuelCity.trim() });
      const refill = calculateRefill({ amount: data.amount, pricePerLiter: data.pricePerLiter, currentOdometer: data.odometer, previousOdometer: lastFuel?.odometer || vehicle.initialOdometer });
      data.liters = refill.liters.toFixed(2);
      data.distance = String(refill.distance);
      data.mileage = refill.mileage.toFixed(2);
      data.priceSource = priceStatus.startsWith("Live") || priceStatus.startsWith("Saved daily") ? "fuel.indianapi.in" : "manual";
    }
    let id;
    try { id = await saveEntry(type, data); } catch { localStorage.setItem("vehiclelog-last-entry", JSON.stringify({ type, ...data })); }
    const [title, Icon] = labels[type];
    onRecordSaved(type, { ...data, id: id || Date.now(), createdAt: new Date().toISOString(), activity: { icon: Icon, tone: type === "fuel" ? "orange" : "green", title: `${title} added`, meta: `${data.vehicle} · ${data.note || "New record"}`, amount: data.amount ? `₹${data.amount}` : "Saved", time: "Just now" } });
    setSaving(false); close();
  }
  useEffect(() => { if (initialType) setType(initialType); }, [initialType]);
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="Quick add" onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">Quick add</span><h2>Log a new record</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <div className="record-types">
        {Object.entries(labels).map(([key, [label, Icon]]) => <button key={key} className={type === key ? "active" : ""} onClick={() => setType(key)}><Icon size={17}/>{label}</button>)}
      </div>
      {type ? <form onSubmit={submit}>
        <div className="form-grid"><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Vehicle<input name="vehicle" value={vehicle.name} readOnly /></label></div>
        <label>Current meter reading (km)<input name="odometer" type="number" min={lastFuel?.odometer || vehicle.initialOdometer} placeholder={String(lastFuel?.odometer || vehicle.initialOdometer)} required /><small className="field-help">Last recorded meter: {Number(lastFuel?.odometer || vehicle.initialOdometer).toLocaleString("en-IN")} km</small></label>
        {type === "fuel" && <><label>Fuel-price city<input name="fuelCity" placeholder="Bangalore" value={fuelCity} onChange={(e) => setFuelCity(e.target.value)} required /><small className="field-help">Matched against the IndianAPI city list. Saved to your vehicle after this refill.</small></label><div className="form-grid"><label>Amount paid (INR)<input name="amount" type="number" min="0" step="0.01" placeholder="2500" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label>{vehicle.fuel} price (INR/L)<input name="pricePerLiter" type="number" min="0" step="0.01" placeholder="Fetching today's rate..." value={price} onChange={(e) => setPrice(e.target.value)} readOnly={autoPrice} required /><small className="field-help">{autoPrice ? "Filled automatically from IndianAPI." : "Manual entry is available when the API cannot resolve your city."}</small></label></div><div className="fuel-calc"><Fuel size={16}/><div><b>{liters || "0.00"} liters</b><small>{priceStatus}</small></div></div></>}
        {type === "trips" && <div className="form-grid"><label>Distance (km)<input name="distance" placeholder="18.4" required /></label><label>Destination<input name="destination" placeholder="Indiranagar" required /></label><label>Category<select name="category"><option>Work</option><option>Family</option><option>Business</option><option>Personal</option></select></label></div>}
        {type === "service" && <label>Service type<input name="serviceType" placeholder="Oil and filter change" required /></label>}
        {type === "expenses" && <div className="form-grid"><label>Category<select name="category"><option>Parking</option><option>Toll</option><option>Accessories</option><option>Miscellaneous</option></select></label><label>Amount<input name="amount" placeholder="120" required /></label></div>}
        <label>Note<input name="note" placeholder="Add a short note" /></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" disabled={saving}><Plus size={17}/>{saving ? "Saving..." : "Add record"}</button></footer>
      </form> : <div className="record-prompt"><Sparkles size={17}/><span>Choose the kind of record you want to add.</span></div>}
    </section>
  </div>;
}

function VehicleModal({ close, addVehicle }) {
  function submit(e) {
    e.preventDefault();
    const entry = Object.fromEntries(new FormData(e.currentTarget));
    addVehicle(entry);
  }
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="Add vehicle" onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">Your garage</span><h2>Add your first vehicle</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <form onSubmit={submit}>
        <label>Vehicle name<input name="name" placeholder="My daily driver" required autoFocus /></label>
        <div className="form-grid"><label>Registration number<input name="registration" placeholder="KA 01 AB 1234" required /></label><label>Initial meter reading (km)<input name="initialOdometer" type="number" min="0" placeholder="24500" required /></label></div>
        <div className="form-grid"><label>Vehicle type<select name="type"><option>Car</option><option>Motorcycle</option><option>Scooter</option><option>Truck</option></select></label><label>Fuel type<select name="fuel"><option>Petrol</option><option>Diesel</option><option>CNG</option><option>LPG</option></select></label></div>
        <label>Home city<input name="city" placeholder="Bangalore" required /><small className="field-help">Used to select your daily fuel rate. The API is contacted only when the fuel-log form opens, at most once per day.</small></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Add vehicle</button></footer>
      </form>
    </section>
  </div>;
}

function ScheduleModal({ close, onScheduleSaved }) {
  const [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.weekdays = days.join(",");
    const id = await saveEntry("schedules", data);
    onScheduleSaved({ ...data, id, createdAt: new Date().toISOString() });
    close();
  }
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="Create schedule" onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">Schedule</span><h2>Create recurring travel</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <form onSubmit={submit}>
        <label>Schedule name<input name="name" defaultValue="Office commute" required autoFocus /></label>
        <div className="form-grid"><label>Destination<input name="destination" defaultValue="Work" required /></label><label>Distance (km)<input name="distance" type="number" defaultValue="18" /></label></div>
        <div className="form-grid"><label>Repeat<select name="repeat"><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Yearly</option></select></label><label>Start date<input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div>
        <div className="weekday-picker" aria-label="Choose weekdays">{weekdays.map((day) => <button key={day} type="button" className={days.includes(day) ? "active" : ""} onClick={() => setDays((currentDays) => currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day])}>{day}</button>)}</div>
        <label>Notes<input name="notes" placeholder="Optional reminder notes" /></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Create schedule</button></footer>
      </form>
    </section>
  </div>;
}

function Sidebar({ active, setActive, open, setOpen, vehicle }) {
  return <aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="brand"><div className="brand-mark"><Car size={20}/></div><strong>VehicleLog <em>Pro</em></strong><IconButton label="Close menu" className="menu-close" onClick={() => setOpen(false)}><X size={18}/></IconButton></div>
    <div className="profile">
      <div className="vehicle-art"><span></span><Car size={42}/></div>
      <div><b>{vehicle?.name || "Your garage"}</b><small>{vehicle?.registration || "No vehicle added"}</small></div><ChevronDown size={16}/>
    </div>
    <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? "selected" : ""} onClick={() => { setActive(label); setOpen(false); }}><Icon size={18}/><span>{label}</span></button>)}</nav>
    <div className="side-bottom">
      <button onClick={() => setActive("Settings")}><Settings size={18}/>Settings</button>
      <div className="local-card"><ShieldCheck size={18}/><div><b>Private by design</b><small>All data stored locally</small></div></div>
    </div>
  </aside>;
}

function Header({ active, setDark, dark, setModal, setMenu, vehicle }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return <header className="topbar">
    <div className="page-heading"><IconButton label="Open menu" className="mobile-menu" onClick={() => setMenu(true)}><Menu size={20}/></IconButton><div><span className="eyebrow">Monday · June 01</span><h1>{active === "Overview" ? <>Good morning, <i>Harsh.</i></> : active}</h1></div></div>
    <div className="top-actions"><div className={`connection ${online ? "online" : "offline"}`} title={online ? "Internet available. Vehicle records remain local." : "No internet connection. Local records remain available."}><i></i><span>{online ? "Local mode" : "Offline mode"}</span></div><label className="search"><Search size={17}/><input placeholder="Search anything..." /></label><IconButton label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</IconButton><IconButton label="Notifications" className="has-dot"><Bell size={18}/></IconButton>{vehicle && <button className="btn primary" onClick={() => setModal(true)}><Plus size={17}/>Quick add</button>}</div>
  </header>;
}

function Welcome({ addVehicle }) {
  return <section className="welcome">
    <div className="welcome-mark"><Car size={32}/></div>
    <span className="eyebrow">Welcome to VehicleLog Pro</span>
    <h2>Your garage starts here.</h2>
    <p>Add your first vehicle to begin tracking fuel, maintenance, trips, expenses, and ownership insights. Your data stays on this device.</p>
    <button className="btn primary" onClick={addVehicle}><Plus size={17}/>Add your first vehicle</button>
    <div className="welcome-grid">
      <div><Fuel size={18}/><b>Track every refill</b><small>Understand mileage and fuel costs.</small></div>
      <div><Wrench size={18}/><b>Stay ahead of service</b><small>Keep maintenance history tidy.</small></div>
      <div><ShieldCheck size={18}/><b>Private by design</b><small>Local storage, no account required.</small></div>
    </div>
  </section>;
}

function Overview({ setModal, activities, vehicle, stats }) {
  return <>
    <section className="hero">
      <div><span className="eyebrow">Your vehicle at a glance</span><h2>{vehicle.name} is ready to <em>roll.</em></h2><p>Current meter <b>{stats.currentOdometer.toLocaleString("en-IN")} km</b>. {stats.fuelCount ? "Mileage is calculated from your saved refills." : "Add your first refill to start building useful insights."}</p></div>
      <div className="hero-score"><div><span>Vehicle health</span><strong>--</strong><small>/ 100</small></div><div className="score-ring"><ShieldCheck size={27}/></div></div>
    </section>
    <section className="metric-grid">
      <Metric title="Total spend" value={`₹${money(stats.spend)}`} detail="fuel spend" trend="0%" icon={CircleDollarSign} chart={flatData} />
      <Metric title="Fuel consumed" value={stats.liters.toFixed(2)} detail="liters recorded" trend="0%" icon={Droplets} chart={flatData} good />
      <Metric title="Avg. mileage" value={stats.mileage ? stats.mileage.toFixed(2) : "--"} detail="km per liter" trend="0%" icon={Gauge} chart={flatData} good />
      <Metric title="Distance driven" value={money(stats.distance)} detail="km recorded" trend="0%" icon={MapPin} chart={flatData} />
    </section>
    <section className="main-grid">
      <article className="panel wide-panel">
        <PanelTitle eyebrow="Performance" title="Fuel efficiency" action="Last 12 months"/>
        <div className="chart-summary"><div><strong>{stats.mileage ? stats.mileage.toFixed(2) : "--"}</strong><span> km/L</span><small>{stats.fuelCount ? `${stats.distance.toLocaleString("en-IN")} km from ${stats.fuelCount} refill${stats.fuelCount === 1 ? "" : "s"}` : "Add a fuel record to begin"}</small></div><div className="chart-legend"><i></i>Actual mileage</div></div>
        <LineChart />
      </article>
      <article className="panel expense-panel">
        <PanelTitle eyebrow="Costs" title="Expense split" action="This month"/>
        <div className="expense-wrap"><div className="donut-wrap"><Donut empty={!stats.spend}/><strong>₹{money(stats.spend)}<small>Total</small></strong></div>
          <div className="legend">{[["Fuel",`₹${money(stats.spend)}`,"#e66b2e"],["Service","₹0","#315f69"],["Travel","₹0","#e5b45d"],["Other","₹0","#8372ac"]].map(([l,v,c]) => <div key={l}><i style={{background:c}}></i><span>{l}</span><b>{v}</b></div>)}</div>
        </div>
      </article>
      <article className="panel">
        <PanelTitle eyebrow="Coming up" title="Schedule" action="View calendar"/>
        <EmptyWidget text="No scheduled trips yet."/>
      </article>
      <article className="panel">
        <PanelTitle eyebrow="Stay ahead" title="Maintenance" action="All reminders"/>
        <EmptyWidget text="No maintenance reminders yet."/>
      </article>
      <article className="panel activity-panel">
        <PanelTitle eyebrow="Latest" title="Recent activity" action="View all"/>
        {activities.length ? <div className="activity-list">{activities.slice(0,4).map((a, i) => <div className="activity" key={`${a.title}-${i}`}><div className={`activity-icon ${a.tone}`}><a.icon size={16}/></div><div><b>{a.title}</b><small>{a.meta}</small></div><aside><b>{a.amount}</b><small>{a.time}</small></aside></div>)}</div> : <EmptyWidget text="Your activity will appear here."/>}
      </article>
    </section>
    <button className="floating-add" aria-label="Quick add record" onClick={() => setModal(true)}><Plus size={22}/></button>
  </>;
}

function EmptyWidget({ text }) {
  return <div className="widget-empty"><Sparkles size={16}/><span>{text}</span></div>;
}

function buildActivities(records) {
  const fuel = records.fuel.map((r) => ({ icon: Fuel, tone: "orange", title: "Fuel refill", meta: `${r.vehicle} · ${r.liters || "0.00"} L · ${r.mileage || "--"} km/L`, amount: `₹${money(Number(r.amount || 0))}`, time: r.date }));
  const trips = records.trips.map((r) => ({ icon: MapPin, tone: "blue", title: "Trip", meta: `${r.vehicle} · ${r.destination || "Destination"}`, amount: `${r.distance || 0} km`, time: r.date }));
  const services = records.maintenance.map((r) => ({ icon: Wrench, tone: "green", title: r.serviceType || "Service", meta: `${r.vehicle} · ${r.note || "Service record"}`, amount: r.cost ? `₹${money(Number(r.cost))}` : "Saved", time: r.date }));
  const expenses = records.expenses.map((r) => ({ icon: ReceiptText, tone: "purple", title: r.category || "Expense", meta: `${r.vehicle} · ${r.note || "Expense record"}`, amount: r.amount ? `₹${money(Number(r.amount))}` : "Saved", time: r.date }));
  return [...fuel, ...trips, ...services, ...expenses].slice(-6).reverse();
}

function Metric({ title, value, detail, trend, icon: Icon, chart, good }) {
  return <article className="metric"><header><div className="metric-icon"><Icon size={18}/></div><span>{title}</span><MoreHorizontal size={17}/></header><div><strong>{value}</strong><small>{detail}</small></div><footer><span className={good ? "positive" : ""}>{good ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {trend}</span><Sparkline data={chart} color={good ? "#3c8174" : "#e66b2e"} fill={good ? "rgba(60,129,116,.06)" : "rgba(230,107,46,.06)"}/></footer></article>;
}

function PanelTitle({ eyebrow, title, action }) {
  return <header className="panel-title"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div><button>{action}<ChevronDown size={14}/></button></header>;
}

function LineChart() {
  return <div className="line-chart"><div className="grid-lines"><i/><i/><i/><i/></div><span className="axis a1">16</span><span className="axis a2">14</span><span className="axis a3">12</span><Sparkline data={flatData} height={142} color="#e66b2e" fill="rgba(230,107,46,.07)"/><div className="months">{["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"].map(m => <span key={m}>{m}</span>)}</div></div>;
}

function recordCards(active, records) {
  if (active === "Fuel log") return records.fuel.map((r) => ({ record: r, fields: [r.date, `₹${money(Number(r.amount || 0))}`, `${r.liters || "0.00"} L`, `${r.mileage || "--"} km/L`] }));
  if (active === "Trips") return records.trips.map((r) => ({ record: r, fields: [r.destination || "Trip", r.date, `${r.distance || "0"} km`, r.category || "Trip"] }));
  if (active === "Maintenance") return records.maintenance.map((r) => ({ record: r, fields: [r.serviceType || "Service", r.date, `₹${money(Number(r.cost || 0))}`, r.odometer ? `${r.odometer} km` : ""] }));
  if (active === "Expenses") return records.expenses.map((r) => ({ record: r, fields: [r.category || "Expense", r.date, `₹${money(Number(r.amount || 0))}`, r.note || ""] }));
  if (active === "Schedule") return records.schedules.map((r) => ({ record: r, fields: [r.name || "Schedule", r.destination || "Destination", r.repeat || "Repeat", r.weekdays || ""] }));
  return [];
}

function vehicleCards(vehicle, stats) {
  if (!vehicle) return [];
  return [{
    record: vehicle,
    fields: [
      vehicle.name || "Vehicle",
      vehicle.registration || "Registration pending",
      `${Number(stats.currentOdometer || vehicle.initialOdometer || 0).toLocaleString("en-IN")} km`,
      `${vehicle.fuel || "Fuel"} - ${vehicle.city || "City pending"}`,
    ],
  }];
}

function addTypeForPage(active) {
  if (active === "Fuel log") return "fuel";
  if (active === "Trips") return "trips";
  if (active === "Maintenance") return "service";
  if (active === "Expenses") return "expenses";
  return true;
}

function tableForPage(active) {
  if (active === "Fuel log") return "fuel";
  if (active === "Trips") return "trips";
  if (active === "Maintenance") return "maintenance";
  if (active === "Expenses") return "expenses";
  if (active === "Schedule") return "schedules";
  return "";
}

function SettingsPage({ records, vehicle }) {
  const totalLogs = records.fuel.length + records.trips.length + records.maintenance.length + records.expenses.length + records.schedules.length;
  const configured = Boolean(import.meta.env.VITE_FUEL_API_BASE_URL && import.meta.env.VITE_FUEL_API_KEY);
  const rows = [
    ["Fuel price API", configured ? "Configured from environment" : "Add API base URL and key in .env", configured],
    ["Local storage", "Records stay in this browser on this device", true],
    ["Vehicle profile", vehicle ? `${vehicle.name} - ${vehicle.registration}` : "No vehicle profile", Boolean(vehicle)],
    ["Saved logs", `${totalLogs} local record${totalLogs === 1 ? "" : "s"}`, totalLogs > 0],
  ];
  return <div className="settings-grid">
    <article className="setting-card"><div><ShieldCheck size={18}/><span className="eyebrow">Privacy</span><h3>Local-first data</h3></div><p>Your vehicle, fuel, travel, expense, and schedule logs are stored locally in this browser. The fuel API is only called when you create a fuel refill.</p></article>
    <article className="setting-card"><div><Fuel size={18}/><span className="eyebrow">Fuel</span><h3>Daily price fetch</h3></div><p>IndianAPI is configured through environment variables so the base URL and key can be replaced without touching the app code.</p></article>
    <article className="setting-card wide">
      <span className="eyebrow">System status</span>
      {rows.map(([label, text, on]) => <div className="setting-row" key={label}><div><b>{label}</b><small>{text}</small></div><span className={`switch ${on ? "on" : ""}`}><i></i></span></div>)}
    </article>
  </div>;
}

function LogDetailModal({ active, record, close, onSave, onDelete }) {
  const table = tableForPage(active);
  const editableKeys = Object.keys(record).filter((key) => !["id", "createdAt", "updatedAt", "activity"].includes(key));
  const deleteLabel = active === "Schedule" ? "Delete schedule" : "Delete log";
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={`${active} details`} onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">{active}</span><h2>Edit log details</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <form onSubmit={(event) => { event.preventDefault(); onSave(table, record.id, Object.fromEntries(new FormData(event.currentTarget))); close(); }}>
        {editableKeys.map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")}<input name={key} defaultValue={record[key]} /></label>)}
        {active === "Trips" && <small className="field-help">Changing trip distance updates live odometer, driven distance, and mileage on the dashboard.</small>}
        <footer><button type="button" className="btn danger" onClick={() => onDelete(table, record.id)}><Trash2 size={16}/>{deleteLabel}</button><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><CheckCircle2 size={17}/>Update log</button></footer>
      </form>
    </section>
  </div>;
}

function SecondaryPage({ active, setModal, records, onOpenRecord, vehicle, stats }) {
  const [title, description] = pages[active] || ["Settings", "Tune the experience to match your vehicle life."];
  const cards = active === "Vehicles" ? vehicleCards(vehicle, stats) : recordCards(active, records);
  const schedule = active === "Schedule";
  const isSettings = active === "Settings";
  const isVehicles = active === "Vehicles";
  const canCreate = !isSettings && !isVehicles;
  const canOpen = !isSettings && !isVehicles;
  return <section className="secondary-page">
    <div className="secondary-hero"><div><span className="eyebrow">VehicleLog Pro</span><h2>{title}</h2><p>{description}</p></div>{canCreate && <button className="btn primary" onClick={() => setModal(schedule ? "schedule" : addTypeForPage(active))}><Plus size={17}/>{schedule ? "Create schedule" : "Add new"}</button>}</div>
    {isSettings ? <SettingsPage records={records} vehicle={vehicle}/> : <>
      <div className="secondary-toolbar"><label className="search"><Search size={17}/><input placeholder={`Search ${active.toLowerCase()}...`} /></label><button className="btn ghost"><Grid2X2 size={16}/>Filters</button><button className="btn ghost"><Download size={16}/>Export</button></div>
      <div className="data-cards">{cards.map(({ record, fields: [a,b,c,d] }) => <article key={`${active}-${record.id || record.registration || record.name}`} role={canOpen ? "button" : "article"} tabIndex={canOpen ? "0" : undefined} aria-disabled={!canOpen} onClick={canOpen ? () => onOpenRecord(active, record) : undefined}><div className="data-icon">{active === "Schedule" ? <CalendarDays/> : active === "Vehicles" ? <Car/> : <Activity/>}</div><div><h3>{a}</h3><p>{b}</p></div><footer><span>{c}</span><span>{d}</span>{canOpen && <ArrowRight size={17}/>}</footer></article>)}</div>
      {cards.length === 0 && <div className="empty-note"><Sparkles size={18}/><div><b>{schedule ? "No schedules yet" : "No records yet"}</b><p>{schedule ? "Create a recurring trip or reminder from this page." : "Your records stay on this device. Add new entries and they will appear here instantly."}</p></div>{schedule && <button className="btn primary" onClick={() => setModal("schedule")}><Plus size={16}/>Create schedule</button>}</div>}
    </>}
  </section>;
}

export default function App() {
  const [active, setActive] = useState("Overview");
  const [modal, setModal] = useState(false);
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [activities, setActivities] = useState([]);
  const [vehicle, setVehicle] = useState(() => JSON.parse(localStorage.getItem("vehiclelog-v6-vehicle") || "null"));
  const [vehicleModal, setVehicleModal] = useState(false);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [records, setRecords] = useState({ fuel: [], trips: [], maintenance: [], expenses: [], schedules: [] });
  const [detail, setDetail] = useState(null);
  useEffect(() => { getFuelEntries().then(setFuelEntries); }, []);
  useEffect(() => {
    Promise.all([getEntries("fuel"), getEntries("trips"), getEntries("maintenance"), getEntries("expenses"), getEntries("schedules")]).then(([fuel, trips, maintenance, expenses, schedules]) => {
      setRecords({ fuel, trips, maintenance, expenses, schedules });
      setFuelEntries(fuel);
    }).catch((error) => console.error("Unable to load local records", error));
  }, []);
  const stats = useMemo(() => {
    const initial = Number(vehicle?.initialOdometer || 0);
    const tripDistance = records.trips.reduce((sum, trip) => sum + Number(trip.distance || 0), 0);
    const fuelDistance = Math.max(0, Number(fuelEntries[fuelEntries.length - 1]?.odometer || initial) - initial);
    const distance = Math.max(fuelDistance, tripDistance);
    const currentOdometer = initial + distance;
    const liters = fuelEntries.reduce((sum, entry) => sum + Number(entry.liters || 0), 0);
    const spend = fuelEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { currentOdometer, liters, spend, distance, mileage: liters ? distance / liters : 0, fuelCount: fuelEntries.length };
  }, [vehicle, fuelEntries, records.trips]);
  function addVehicle(entry) {
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(entry));
    setVehicle(entry);
    setVehicleModal(false);
  }
  function addRecord(type, entry) {
    const { activity, ...record } = entry;
    const table = type === "service" ? "maintenance" : type;
    setRecords((currentRecords) => ({ ...currentRecords, [table]: [...currentRecords[table], record] }));
    if (type === "fuel") setFuelEntries((currentEntries) => [...currentEntries, record]);
    if (activity) setActivities((currentActivities) => [activity, ...currentActivities]);
  }
  async function saveRecordUpdate(table, id, entry) {
    await updateEntry(table, id, entry);
    setRecords((currentRecords) => ({ ...currentRecords, [table]: currentRecords[table].map((record) => Number(record.id) === Number(id) ? { ...record, ...entry, id } : record) }));
    if (table === "fuel") setFuelEntries((currentEntries) => currentEntries.map((record) => Number(record.id) === Number(id) ? { ...record, ...entry, id } : record));
  }
  async function deleteRecord(table, id) {
    await deleteEntry(table, id);
    setRecords((currentRecords) => ({ ...currentRecords, [table]: currentRecords[table].filter((record) => Number(record.id) !== Number(id)) }));
    if (table === "fuel") setFuelEntries((currentEntries) => currentEntries.filter((record) => Number(record.id) !== Number(id)));
    setDetail(null);
  }
  function addSchedule(entry) {
    setRecords((currentRecords) => ({ ...currentRecords, schedules: [...currentRecords.schedules, entry] }));
  }
  const current = useMemo(() => active, [active]);
  const modalType = modal === true ? null : modal;
  const allActivities = activities.length ? activities : buildActivities(records);
  return <div className={`app ${dark ? "dark" : ""}`}>
    <Sidebar active={current} setActive={setActive} open={menu} setOpen={setMenu} vehicle={vehicle}/>
    <main className="content"><Header active={current} dark={dark} setDark={setDark} setModal={setModal} setMenu={setMenu} vehicle={vehicle}/><div className="content-body">{!vehicle ? <Welcome addVehicle={() => setVehicleModal(true)}/> : current === "Overview" ? <Overview setModal={setModal} activities={allActivities} vehicle={vehicle} stats={stats}/> : <SecondaryPage active={current} setModal={setModal} records={records} vehicle={vehicle} stats={stats} onOpenRecord={(page, record) => setDetail({ page, record })}/>}</div></main>
    {modal && modal !== "schedule" && <Modal close={() => setModal(false)} setActivities={setActivities} vehicle={vehicle} fuelEntries={fuelEntries} onRecordSaved={addRecord} onVehicleUpdate={addVehicle} initialType={modalType}/>}
    {modal === "schedule" && <ScheduleModal close={() => setModal(false)} onScheduleSaved={addSchedule}/>}
    {detail && <LogDetailModal active={detail.page} record={detail.record} close={() => setDetail(null)} onSave={saveRecordUpdate} onDelete={deleteRecord}/>}
    {vehicleModal && <VehicleModal close={() => setVehicleModal(false)} addVehicle={addVehicle}/>}
  </div>;
}
