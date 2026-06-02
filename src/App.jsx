import React, { useEffect, useMemo, useState, useRef } from "react";
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

function CustomSelect({ name, value: propValue, defaultValue, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(propValue || defaultValue || (options[0]?.value || options[0] || ""));
  const containerRef = useRef(null);

  useEffect(() => {
    if (propValue !== undefined) {
      setSelectedValue(propValue);
    }
  }, [propValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    setSelectedValue(val);
    setIsOpen(false);
    if (onChange) {
      onChange(val);
    }
  };

  const currentLabel = useMemo(() => {
    const found = options.find(o => (typeof o === 'object' ? o.value === selectedValue : o === selectedValue));
    return found ? (typeof found === 'object' ? found.label : found) : selectedValue;
  }, [selectedValue, options]);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={16} className={`arrow ${isOpen ? "open" : ""}`} />
      </button>
      {isOpen && (
        <ul className="custom-select-options" role="listbox">
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            const isSelected = val === selectedValue;
            return (
              <li
                key={val}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(val)}
              >
                {lbl}
                {isSelected && <CheckCircle2 size={14} className="check-icon" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


function CustomDatePicker({ name, defaultValue, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (defaultValue) return new Date(defaultValue);
    return new Date();
  });
  const [viewDate, setViewDate] = useState(() => {
    if (defaultValue) return new Date(defaultValue);
    return new Date();
  });
  const containerRef = useRef(null);

  useEffect(() => {
    if (defaultValue) {
      setSelectedDate(new Date(defaultValue));
      setViewDate(new Date(defaultValue));
    }
  }, [defaultValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (date) => {
    return date.toISOString().slice(0, 10);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const selectDay = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setIsOpen(false);
    if (onChange) onChange(formatDate(date));
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="custom-select-container" ref={containerRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={formatDate(selectedDate)} />
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer" }}
      >
        <span>{selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        <CalendarDays size={16} className="arrow" style={{ color: "#e66b2e" }} />
      </button>
      {isOpen && (
        <div className="custom-select-options calendar-dropdown" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: "auto", width: "270px", padding: "10px", zIndex: 1000 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <button type="button" className="btn ghost" style={{ padding: "4px 8px", border: "1px solid #e3dfd7", borderRadius: "6px" }} onClick={prevMonth}>&lt;</button>
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>{monthNames[month]} {year}</span>
            <button type="button" className="btn ghost" style={{ padding: "4px 8px", border: "1px solid #e3dfd7", borderRadius: "6px" }} onClick={nextMonth}>&gt;</button>
          </header>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", fontSize: "10px", fontWeight: "bold", color: "#849092", marginBottom: "4px" }}>
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {days.map((date, idx) => {
              if (!date) return <span key={`empty-${idx}`} />;
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <button
                  key={date.getTime()}
                  type="button"
                  onClick={() => selectDay(date)}
                  className={`calendar-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  style={{
                    border: 0,
                    borderRadius: "6px",
                    height: "30px",
                    fontSize: "11px",
                    fontWeight: isSelected || isToday ? "bold" : "normal",
                    cursor: "pointer",
                    background: isSelected ? "#e66b2e" : isToday ? "#fff3ed" : "transparent",
                    color: isSelected ? "white" : isToday ? "#d95f26" : "inherit",
                    display: "grid",
                    placeItems: "center"
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function Sparkline({ data, color = "#e66b2e", fill = "none", height = 54 }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 240},${height - 5 - ((v - min) / (max - min || 1)) * (height - 12)}`).join(" ");
  return <svg className="sparkline" viewBox={`0 0 240 ${height}`} preserveAspectRatio="none" aria-hidden="true">
    {fill !== "none" && <polygon points={`0,${height} ${points} 240,${height}`} fill={fill} />}
    <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function Donut({ fuel = 0, service = 0, travel = 0, other = 0 }) {
  const total = fuel + service + travel + other;
  if (total === 0) {
    return <svg viewBox="0 0 42 42" className="donut" aria-label="Expense distribution chart">
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ece8df" strokeWidth="6" />
    </svg>;
  }
  const segments = [
    ["#e66b2e", (fuel / total) * 100],
    ["#315f69", (service / total) * 100],
    ["#e5b45d", (travel / total) * 100],
    ["#8372ac", (other / total) * 100],
  ].filter(([_, pct]) => pct > 0);

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
    setPriceStatus("Waiting for typing to stop...");
    const timer = setTimeout(() => {
      setPriceStatus("Fetching today's INR price...");
      setAutoPrice(false);
      fetchDailyFuelPrice(vehicle.fuel, fuelCity)
        .then((result) => {
          setPrice(String(result.price));
          setAutoPrice(true);
          if (result.isFallback) {
            setPriceStatus(`${result.cached ? "Saved daily" : "Live"} ${vehicle.fuel.toLowerCase()} price for Delhi (fallback for ${result.originalCity}). Saved with this refill.`);
          } else {
            setPriceStatus(`${result.cached ? "Saved daily" : "Live"} ${vehicle.fuel.toLowerCase()} price for ${result.city}. Saved with this refill.`);
          }
        })
        .catch((error) => {
          setAutoPrice(false);
          setPriceStatus(`${error.message} Enter the INR price manually.`);
        });
    }, 600);
    return () => clearTimeout(timer);
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
        <div className="form-grid">
          <label>Date<CustomDatePicker name="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label>Vehicle<input name="vehicle" value={vehicle.name} readOnly /></label>
        </div>
        <label>Current meter reading (km)<input name="odometer" type="number" min={lastFuel?.odometer || vehicle.initialOdometer} placeholder={String(lastFuel?.odometer || vehicle.initialOdometer)} onWheel={(e) => e.target.blur()} required /><small className="field-help">Last recorded meter: {Number(lastFuel?.odometer || vehicle.initialOdometer).toLocaleString("en-IN")} km</small></label>
        {type === "fuel" && <>
          <label>Fuel-price city<input name="fuelCity" placeholder="Bangalore" value={fuelCity} onChange={(e) => setFuelCity(e.target.value)} required /><small className="field-help">Matched against the IndianAPI city list. Saved to your vehicle after this refill.</small></label>
          <div className="form-grid">
            <label>Amount paid (INR)<input name="amount" type="number" min="0" step="0.01" placeholder="2500" value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()} required /></label>
            <label>{vehicle.fuel} price (INR/L)<input name="pricePerLiter" type="number" min="0" step="0.01" placeholder="Fetching today's rate..." value={price} onChange={(e) => setPrice(e.target.value)} onWheel={(e) => e.target.blur()} readOnly={autoPrice} required /></label>
          </div>
          <div className="fuel-calc"><Fuel size={16}/><div><b>{liters || "0.00"} liters</b><small>{priceStatus}</small></div></div>
        </>}
        {type === "trips" && <div className="form-grid"><label>Distance (km)<input name="distance" placeholder="18.4" required /></label><label>Destination<input name="destination" placeholder="Indiranagar" required /></label><label>Category<CustomSelect name="category" options={["Work", "Family", "Business", "Personal"]} /></label></div>}
        {type === "service" && <div className="form-grid"><label>Service type<input name="serviceType" placeholder="Oil and filter change" required /></label><label>Cost (INR)<input name="cost" type="number" min="0" step="0.01" placeholder="1500" onWheel={(e) => e.target.blur()} required /></label></div>}
        {type === "expenses" && <div className="form-grid"><label>Category<CustomSelect name="category" options={["Parking", "Toll", "Accessories", "Miscellaneous"]} /></label><label>Amount<input name="amount" placeholder="120" required /></label></div>}
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
        <div className="form-grid"><label>Vehicle type<CustomSelect name="type" options={["Car", "Motorcycle", "Scooter", "Truck"]} /></label><label>Fuel type<CustomSelect name="fuel" options={["Petrol", "Diesel", "CNG", "LPG"]} /></label></div>
        <label>Home city<input name="city" placeholder="Bangalore" required /><small className="field-help">Used to select your daily fuel rate. The API is contacted only when the fuel-log form opens, at most once per day.</small></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Add vehicle</button></footer>
      </form>
    </section>
  </div>;
}

function ScheduleModal({ close, onScheduleSaved, vehicle }) {
  const [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.weekdays = days.join(",");
    data.vehicle = vehicle.name;
    const id = await saveEntry("schedules", data);
    onScheduleSaved({ ...data, id, createdAt: new Date().toISOString() });
    close();
  }
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="Create schedule" onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">Schedule</span><h2>Create recurring travel</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <form onSubmit={submit}>
        <label>Schedule name<input name="name" defaultValue="Office commute" required autoFocus /></label>
        <div className="form-grid"><label>Destination<input name="destination" defaultValue="Work" required /></label><label>Distance (km)<input name="distance" type="number" defaultValue="18" onWheel={(e) => e.target.blur()} /></label></div>
        <div className="form-grid"><label>Repeat<CustomSelect name="repeat" options={["Daily", "Weekly", "Monthly", "Yearly"]} /></label><label>Start date<CustomDatePicker name="startDate" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div>
        <div className="form-grid"><label>Completion Time<input name="completionTime" type="time" defaultValue="18:00" onClick={(e) => e.target.showPicker()} /></label></div>
        <div className="weekday-picker" aria-label="Choose weekdays">{weekdays.map((day) => <button key={day} type="button" className={days.includes(day) ? "active" : ""} onClick={() => setDays((currentDays) => currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day])}>{day}</button>)}</div>
        <label>Notes<input name="notes" placeholder="Optional reminder notes" /></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Create schedule</button></footer>
      </form>
    </section>
  </div>;
}

function Sidebar({ active, setActive, open, setOpen, vehicle, vehicles = [], setVehicle, setVehicleModal }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    if (!switcherOpen) return;
    function handleClickOutside(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [switcherOpen]);

  const selectVehicle = (v) => {
    localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(v));
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(v));
    setVehicle(v);
    setSwitcherOpen(false);
  };

  return <aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="brand"><div className="brand-mark"><Car size={20}/></div><strong>VehicleLog <em>Pro</em></strong><IconButton label="Close menu" className="menu-close" onClick={() => setOpen(false)}><X size={18}/></IconButton></div>
    
    <div className="profile-container" ref={switcherRef}>
      <div className="profile" onClick={() => setSwitcherOpen(!switcherOpen)} style={{ cursor: "pointer" }}>
        <div className="vehicle-art"><span></span><Car size={24}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>{vehicle?.name || "Your garage"}</b>
          <small style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>{vehicle?.registration || "No vehicle added"}</small>
        </div>
        <ChevronDown size={16} className={`arrow ${switcherOpen ? "open" : ""}`} />
      </div>

      {switcherOpen && (
        <ul className="vehicle-switcher-dropdown">
          {vehicles.map((v) => {
            const isSelected = v.name === vehicle?.name;
            return (
              <li
                key={v.name}
                className={`custom-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => selectVehicle(v)}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <b>{v.name}</b>
                  <small style={{ color: isSelected ? "#ffe2d1" : "#849092", fontSize: "9px", marginTop: "2px" }}>{v.registration}</small>
                </div>
                {isSelected && <CheckCircle2 size={14} className="check-icon" />}
              </li>
            );
          })}
          <li
            className="custom-select-option add-vehicle-btn"
            onClick={() => {
              setSwitcherOpen(false);
              setVehicleModal(true);
            }}
          >
            <Plus size={14} />
            <span>Add vehicle</span>
          </li>
        </ul>
      )}
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

function Overview({
  setModal,
  activities,
  vehicle,
  stats,
  records,
  timePeriod,
  setTimePeriod,
  costPeriod,
  setCostPeriod,
  onOpenScheduleDetails,
  skippedSchedules,
  onViewAllActivities,
  chartData,
  spendTrend,
  litersTrend,
  distanceTrend
}) {
  const filterByPeriod = (entries, period) => {
    if (period === "All time") return entries;
    const now = new Date();
    let days = 365;
    if (period === "Last 30 days") days = 30;
    else if (period === "Last 6 months") days = 180;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return entries.filter((entry) => {
      if (!entry.date) return true;
      return new Date(entry.date) >= cutoff;
    });
  };

  const periodFuel = useMemo(() => filterByPeriod(records.fuel, costPeriod), [records.fuel, costPeriod]);
  const periodMaint = useMemo(() => filterByPeriod(records.maintenance, costPeriod), [records.maintenance, costPeriod]);
  const periodExp = useMemo(() => filterByPeriod(records.expenses, costPeriod), [records.expenses, costPeriod]);

  const fuelSpend = useMemo(() => periodFuel.reduce((sum, r) => sum + Number(r.amount || 0), 0), [periodFuel]);
  const serviceSpend = useMemo(() => periodMaint.reduce((sum, r) => sum + Number(r.cost || 0), 0), [periodMaint]);
  const travelSpend = useMemo(() => periodExp.filter(r => r.category === "Parking" || r.category === "Toll").reduce((sum, r) => sum + Number(r.amount || 0), 0), [periodExp]);
  const otherSpend = useMemo(() => periodExp.filter(r => r.category === "Accessories" || r.category === "Miscellaneous").reduce((sum, r) => sum + Number(r.amount || 0), 0), [periodExp]);
  const totalSpend = fuelSpend + serviceSpend + travelSpend + otherSpend;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySchedules = useMemo(() => {
    return records.schedules.filter(s => isScheduleActiveOnDate(s, todayStr));
  }, [records.schedules, todayStr]);

  return <>
    <section className="hero">
      <div><span className="eyebrow">Your vehicle at a glance</span><h2>{vehicle.name} is ready to <em>roll.</em></h2><p>Current meter <b>{stats.currentOdometer.toLocaleString("en-IN")} km</b>. {stats.fuelCount ? "Mileage is calculated from your saved refills." : "Add your first refill to start building useful insights."}</p></div>
      <div className="hero-score"><div><span>Vehicle health</span><strong>--</strong><small>/ 100</small></div><div className="score-ring"><ShieldCheck size={27}/></div></div>
    </section>
    <section className="metric-grid">
      <Metric title="Total spend" value={`₹${money(stats.spend)}`} detail="fuel spend" trend="0%" icon={CircleDollarSign} chart={spendTrend} />
      <Metric title="Fuel consumed" value={stats.liters.toFixed(2)} detail="liters recorded" trend="0%" icon={Droplets} chart={litersTrend} good />
      <Metric title="Avg. mileage" value={stats.mileage ? stats.mileage.toFixed(2) : "--"} detail="km per liter" trend="0%" icon={Gauge} chart={chartData} good />
      <Metric title="Distance driven" value={money(stats.distance)} detail="km recorded" trend="0%" icon={MapPin} chart={distanceTrend} />
    </section>
    <section className="main-grid">
      <article className="panel wide-panel">
        <PanelTitle eyebrow="Performance" title="Fuel efficiency" action={timePeriod} options={["Last 30 days", "Last 6 months", "Last 12 months", "All time"]} onSelect={setTimePeriod} />
        <div className="chart-summary"><div><strong>{stats.mileage ? stats.mileage.toFixed(2) : "--"}</strong><span> km/L</span><small>{stats.fuelCount ? `${stats.distance.toLocaleString("en-IN")} km from ${stats.fuelCount} refill${stats.fuelCount === 1 ? "" : "s"}` : "Add a fuel record to begin"}</small></div><div className="chart-legend"><i></i>Actual mileage</div></div>
        <LineChart data={chartData} />
      </article>
      <article className="panel expense-panel">
        <PanelTitle eyebrow="Costs" title="Expense split" action={costPeriod} options={["Last 30 days", "Last 6 months", "Last 12 months", "All time"]} onSelect={setCostPeriod} />
        <div className="expense-wrap"><div className="donut-wrap"><Donut fuel={fuelSpend} service={serviceSpend} travel={travelSpend} other={otherSpend}/><strong>₹{money(totalSpend)}<small>Total</small></strong></div>
          <div className="legend">{[
            ["Fuel", `₹${money(fuelSpend)}`, "#e66b2e"],
            ["Service", `₹${money(serviceSpend)}`, "#315f69"],
            ["Travel", `₹${money(travelSpend)}`, "#e5b45d"],
            ["Other", `₹${money(otherSpend)}`, "#8372ac"]
          ].map(([l,v,c]) => <div key={l}><i style={{background:c}}></i><span>{l}</span><b>{v}</b></div>)}</div>
        </div>
      </article>
      <article className="panel">
        <PanelTitle eyebrow="Today's Trips" title="Schedule" action="View calendar"/>
        {todaySchedules.length ? (
          <div className="activity-list" style={{ marginTop: "12px", overflowY: "auto", maxHeight: "170px" }}>
            {todaySchedules.slice(0, 3).map((s) => {
              const isCompleted = records.trips.some(t => t.date === todayStr && t.note.includes(`Completed scheduled trip: ${s.name}`));
              const isSkipped = skippedSchedules[s.id]?.includes(todayStr);
              const timePassed = isTimePassed(s.completionTime);
              
              let statusText = timePassed ? "Done?" : "To be";
              let btnClass = "btn primary";
              if (isCompleted) {
                statusText = "Completed";
                btnClass = "btn ghost";
              } else if (isSkipped) {
                statusText = "Skipped";
                btnClass = "btn ghost";
              }

              return (
                <div className="activity" key={s.id} style={{ borderTop: "1px solid #efebe5", padding: "10px 0" }}>
                  <div className="activity-icon orange" style={{ minWidth: "31px" }}><CalendarDays size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: "11px" }}>{s.name}</b>
                    <small style={{ fontSize: "9px", color: "#899697" }}>{s.destination} · {s.repeat} at {s.completionTime || "18:00"}</small>
                  </div>
                  <aside style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                    <button
                      className={btnClass}
                      style={{ padding: "4px 8px", fontSize: "10px", borderRadius: "6px", height: "auto" }}
                      disabled={isCompleted || isSkipped}
                      onClick={() => onOpenScheduleDetails(s, todayStr, isCompleted, isSkipped)}
                    >
                      {statusText}
                    </button>
                  </aside>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyWidget text="No scheduled trips for today."/>
        )}
      </article>
      <article className="panel">
        <PanelTitle eyebrow="Stay ahead" title="Maintenance" action="All reminders"/>
        <EmptyWidget text="No maintenance reminders yet."/>
      </article>
      <article className="panel activity-panel">
        <PanelTitle eyebrow="Latest" title="Recent activity" action="View all" onSelect={onViewAllActivities} />
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
  return [...fuel, ...trips, ...services, ...expenses]
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}

function Metric({ title, value, detail, trend, icon: Icon, chart, good }) {
  return <article className="metric"><header><div className="metric-icon"><Icon size={18}/></div><span>{title}</span><MoreHorizontal size={17}/></header><div><strong>{value}</strong><small>{detail}</small></div><footer><span className={good ? "positive" : ""}>{good ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {trend}</span><Sparkline data={chart} color={good ? "#3c8174" : "#e66b2e"} fill={good ? "rgba(60,129,116,.06)" : "rgba(230,107,46,.06)"}/></footer></article>;
}

function PanelTitle({ eyebrow, title, action, options, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function close(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  const handleSelect = (opt) => {
    onSelect(opt);
    setIsOpen(false);
  };

  return (
    <header className="panel-title" style={{ position: "relative" }} ref={containerRef}>
      <div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>
      {options ? (
        <div>
          <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer" }}>
            {action}<ChevronDown size={14}/>
          </button>
          {isOpen && (
            <ul className="custom-select-options" style={{ right: 0, left: "auto", minWidth: "120px", top: "100%" }}>
              {options.map((opt) => (
                <li
                  key={opt}
                  className={`custom-select-option ${opt === action ? "selected" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <button type="button" onClick={onSelect} style={{ cursor: "pointer" }}>
          {action}<ChevronDown size={14}/>
        </button>
      )}
    </header>
  );
}

function LineChart() {
  return <div className="line-chart"><div className="grid-lines"><i/><i/><i/><i/></div><span className="axis a1">16</span><span className="axis a2">14</span><span className="axis a3">12</span><Sparkline data={flatData} height={142} color="#e66b2e" fill="rgba(230,107,46,.07)"/><div className="months">{["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"].map(m => <span key={m}>{m}</span>)}</div></div>;
}

function recordCards(active, records) {
  if (active === "Fuel log") return records.fuel.map((r) => ({ record: r, fields: [r.date, `₹${money(Number(r.amount || 0))}`, `${r.liters || "0.00"} L`, `${r.mileage || "--"} km/L`] }));
  if (active === "Trips") return records.trips.map((r) => ({ record: r, fields: [r.destination || "Trip", r.date, `${r.distance || "0"} km`, r.category || "Trip"] }));
  if (active === "Maintenance") return records.maintenance.map((r) => ({ record: r, fields: [r.serviceType || "Service", r.date, `₹${money(Number(r.cost || 0))}`, r.odometer ? `${r.odometer} km` : ""] }));
  if (active === "Expenses") return records.expenses.map((r) => ({ record: r, fields: [r.category || "Expense", r.date, `₹${money(Number(r.amount || 0))}`, r.note || ""] }));
  if (active === "Schedule") return records.schedules.map((r) => ({ record: r, fields: [r.name || "Schedule", r.destination || "Destination", `${r.repeat || "Repeat"} at ${r.completionTime || "18:00"}`, r.weekdays || ""] }));
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
  if (active === "Vehicles") return "vehicles";
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
  const editableKeys = Object.keys(record).filter((key) => !["id", "createdAt", "updatedAt", "activity", "vehicle"].includes(key));
  const deleteLabel = active === "Schedule" ? "Delete schedule" : "Delete log";

  const renderFieldInput = (key) => {
    const labelName = key.replace(/([A-Z])/g, " $1");
    const defaultValue = record[key];

    if (key === "date" || key === "startDate") {
      return (
        <label key={key}>
          {labelName}
          <CustomDatePicker name={key} defaultValue={defaultValue} />
        </label>
      );
    }

    if (key === "category") {
      const options = active === "Trips"
        ? ["Work", "Family", "Business", "Personal"]
        : ["Parking", "Toll", "Accessories", "Miscellaneous"];
      return (
        <label key={key}>
          {labelName}
          <CustomSelect name={key} defaultValue={defaultValue} options={options} />
        </label>
      );
    }

    if (key === "repeat") {
      return (
        <label key={key}>
          {labelName}
          <CustomSelect name={key} defaultValue={defaultValue} options={["Daily", "Weekly", "Monthly", "Yearly"]} />
        </label>
      );
    }

    if (key === "fuel") {
      return (
        <label key={key}>
          {labelName}
          <CustomSelect name={key} defaultValue={defaultValue} options={["Petrol", "Diesel", "CNG", "LPG"]} />
        </label>
      );
    }

    if (key === "type") {
      return (
        <label key={key}>
          {labelName}
          <CustomSelect name={key} defaultValue={defaultValue} options={["Car", "Motorcycle", "Scooter", "Truck"]} />
        </label>
      );
    }

    const isNumberType = ["amount", "pricePerLiter", "cost", "odometer", "distance", "initialOdometer"].includes(key);
    return (
      <label key={key}>
        {labelName}
        <input name={key} type={isNumberType ? "number" : "text"} step="any" defaultValue={defaultValue} onWheel={isNumberType ? (e) => e.target.blur() : undefined} />
      </label>
    );
  };

  return (
    <div className="modal-wrap" role="presentation" onMouseDown={close}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={`${active} details`} onMouseDown={(e) => e.stopPropagation()}>
        <header><div><span className="eyebrow">{active}</span><h2>Edit log details</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
        <form onSubmit={(event) => { event.preventDefault(); onSave(table, record.id, Object.fromEntries(new FormData(event.currentTarget))); close(); }}>
          {editableKeys.map((key) => renderFieldInput(key))}
          {active === "Trips" && <small className="field-help">Changing trip distance updates live odometer, driven distance, and mileage on the dashboard.</small>}
          <footer><button type="button" className="btn danger" onClick={() => onDelete(table, record.id)}><Trash2 size={16}/>{deleteLabel}</button><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><CheckCircle2 size={17}/>Update log</button></footer>
        </form>
      </section>
    </div>
  );
}

function SecondaryPage({ active, setModal, records, onOpenRecord, vehicle, stats, skippedSchedules, onOpenScheduleDetails }) {
  const [title, description] = pages[active] || ["Settings", "Tune the experience to match your vehicle life."];
  const [search, setSearch] = useState("");
  const cards = active === "Vehicles" ? vehicleCards(vehicle, stats) : recordCards(active, records);
  const schedule = active === "Schedule";
  const isSettings = active === "Settings";
  const isVehicles = active === "Vehicles";
  const canCreate = !isSettings && !isVehicles;
  const canOpen = !isSettings;
  const [scheduleView, setScheduleView] = useState("calendar");

  const filteredCards = useMemo(() => {
    if (!search.trim()) return cards;
    const term = search.toLowerCase();
    return cards.filter(({ record }) => {
      return Object.values(record).some((val) =>
        String(val).toLowerCase().includes(term)
      );
    });
  }, [cards, search]);

  return <section className="secondary-page">
    <div className="secondary-hero"><div><span className="eyebrow">VehicleLog Pro</span><h2>{title}</h2><p>{description}</p></div>{canCreate && <button className="btn primary" onClick={() => setModal(schedule ? "schedule" : addTypeForPage(active))}><Plus size={17}/>{schedule ? "Create schedule" : "Add new"}</button>}</div>
    {isSettings ? <SettingsPage records={records} vehicle={vehicle}/> : <>
      <div className="secondary-toolbar">
        <label className="search">
          <Search size={17}/>
          <input placeholder={`Search ${active.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {active === "Schedule" && (
          <div style={{ display: "flex", gap: "4px", padding: "4px", borderRadius: "8px" }} className="theme-toggle-bg">
            <button
              type="button"
              className={`btn ${scheduleView === "calendar" ? "primary" : "ghost"}`}
              style={{ padding: "6px 12px", border: 0, borderRadius: "6px", boxShadow: "none" }}
              onClick={() => setScheduleView("calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`btn ${scheduleView === "list" ? "primary" : "ghost"}`}
              style={{ padding: "6px 12px", border: 0, borderRadius: "6px", boxShadow: "none" }}
              onClick={() => setScheduleView("list")}
            >
              List
            </button>
          </div>
        )}
        <button className="btn ghost"><Grid2X2 size={16}/>Filters</button>
        <button className="btn ghost"><Download size={16}/>Export</button>
      </div>
      
      {schedule && scheduleView === "calendar" ? (
        <CalendarScheduleView
          schedules={records.schedules}
          records={records}
          skippedSchedules={skippedSchedules}
          onOpenScheduleDetails={onOpenScheduleDetails}
        />
      ) : (
        <>
          <div className="data-cards">{filteredCards.map(({ record, fields: [a,b,c,d] }) => <article key={`${active}-${record.id || record.registration || record.name}`} role={canOpen ? "button" : "article"} tabIndex={canOpen ? "0" : undefined} aria-disabled={!canOpen} onClick={canOpen ? () => onOpenRecord(active, record) : undefined}><div className="data-icon">{active === "Schedule" ? <CalendarDays/> : active === "Vehicles" ? <Car/> : <Activity/>}</div><div><h3>{a}</h3><p>{b}</p></div><footer><span>{c}</span><span>{d}</span>{canOpen && <ArrowRight size={17}/>}</footer></article>)}</div>
          {filteredCards.length === 0 && <div className="empty-note"><Sparkles size={18}/><div><b>{schedule ? "No schedules yet" : "No records yet"}</b><p>{schedule ? "Create a recurring trip or reminder from this page." : "Your records stay on this device. Add new entries and they will appear here instantly."}</p></div>{schedule && <button className="btn primary" onClick={() => setModal("schedule")}><Plus size={16}/>Create schedule</button>}</div>}
        </>
      )}
    </>}
  </section>;
}

function isTimePassed(completionTime) {
  if (!completionTime) return true;
  const [hours, minutes] = completionTime.split(":").map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  if (currentHours > hours) return true;
  if (currentHours < hours) return false;
  return currentMinutes >= minutes;
}

function isScheduleActiveOnDate(schedule, date) {
  const start = new Date(schedule.startDate);
  const d = new Date(date);
  d.setHours(0,0,0,0);
  start.setHours(0,0,0,0);

  if (d < start) return false;

  const repeat = schedule.repeat;
  if (repeat === "Daily") {
    return true;
  }
  if (repeat === "Weekly") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDayName = dayNames[d.getDay()];
    const activeDays = (schedule.weekdays || "").split(",");
    return activeDays.includes(currentDayName);
  }
  if (repeat === "Monthly") {
    return d.getDate() === start.getDate();
  }
  if (repeat === "Yearly") {
    return d.getDate() === start.getDate() && d.getMonth() === start.getMonth();
  }
  return false;
}

function ScheduleDetailsModal({ schedule, dateStr, isCompleted, isSkipped, close, onAccept, onSkip }) {
  const isToday = dateStr === new Date().toISOString().slice(0, 10);
  const timePassed = isTimePassed(schedule.completionTime);
  const canAccept = isToday && timePassed && !isCompleted && !isSkipped;

  return (
    <div className="modal-wrap" role="presentation" onMouseDown={close}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Schedule Details" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Schedule Detail</span>
            <h2>{schedule.name}</h2>
          </div>
          <IconButton label="Close" onClick={close}><X size={18}/></IconButton>
        </header>
        <div style={{ display: "grid", gap: "16px", margin: "20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Destination</span>
              <strong style={{ fontSize: "14px" }}>{schedule.destination || "Not specified"}</strong>
            </div>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Distance</span>
              <strong style={{ fontSize: "14px" }}>{schedule.distance ? `${schedule.distance} km` : "Not specified"}</strong>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Frequency</span>
              <strong style={{ fontSize: "14px" }}>{schedule.repeat}</strong>
            </div>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Completion Time</span>
              <strong style={{ fontSize: "14px" }}>{schedule.completionTime || "18:00"}</strong>
            </div>
          </div>
          {schedule.notes && (
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Notes</span>
              <p style={{ margin: 0, fontSize: "12px", color: "#647176" }}>{schedule.notes}</p>
            </div>
          )}
          <div style={{ borderTop: "1px solid #efebe5", paddingTop: "12px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>Status for {dateStr}</span>
            <span className={`connection ${isCompleted ? "online" : isSkipped ? "offline" : timePassed ? "offline" : "online"}`} style={{ display: "inline-flex", width: "auto" }}>
              <i></i>
              <span>{isCompleted ? "Completed" : isSkipped ? "Skipped" : timePassed ? "Ready to Complete" : "Scheduled (Before Completion Time)"}</span>
            </span>
          </div>
        </div>
        <footer>
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          {!isCompleted && !isSkipped && isToday && (
            <>
              <button type="button" className="btn danger" onClick={() => { onSkip(schedule.id, dateStr); close(); }}>
                Skip Today
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!canAccept}
                onClick={() => { onAccept(schedule); close(); }}
                title={!timePassed ? `Only available after completion time (${schedule.completionTime || "18:00"})` : ""}
              >
                Accept to Complete
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function CalendarScheduleView({ schedules, records, skippedSchedules, onOpenScheduleDetails }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const selectedSchedules = useMemo(() => {
    return schedules.filter(s => isScheduleActiveOnDate(s, selectedDateStr));
  }, [schedules, selectedDateStr]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div style={{ display: "grid", gap: "20px", marginTop: "10px" }}>
      <div className="panel" style={{ padding: "20px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>{monthNames[month]} {year}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="btn ghost" onClick={prevMonth} style={{ padding: "6px 12px" }}>&lt; Prev</button>
            <button type="button" className="btn ghost" onClick={nextMonth} style={{ padding: "6px 12px" }}>Next &gt;</button>
          </div>
        </header>

        <div className="calendar-grid-header">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <div className="calendar-grid">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} style={{ minHeight: "64px" }} />;
            
            const dateStr = date.toISOString().slice(0, 10);
            const activeSchedulesForDay = schedules.filter(s => isScheduleActiveOnDate(s, dateStr));
            const hasSchedules = activeSchedulesForDay.length > 0;
            const isSelected = selectedDate.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            const dayTrips = records.trips.filter(t => t.date === dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`calendar-grid-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              >
                <span>{date.getDate()}</span>
                {hasSchedules && (
                  <div style={{ display: "flex", gap: "4px", width: "100%", justifyContent: "flex-end" }}>
                    {activeSchedulesForDay.map(s => {
                      const comp = dayTrips.some(t => t.note.includes(`Completed scheduled trip: ${s.name}`));
                      const skip = skippedSchedules[s.id]?.includes(dateStr);
                      let color = "#e5b45d";
                      if (comp) color = "#3c8174";
                      else if (skip) color = "#849092";
                      return (
                        <span
                          key={s.id}
                          title={`${s.name} (${s.destination})`}
                          style={{
                            height: "6px",
                            width: "6px",
                            borderRadius: "50%",
                            backgroundColor: isSelected ? "#fff" : color
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel" style={{ padding: "20px" }}>
        <header className="panel-title">
          <div>
            <span className="eyebrow">Daily Schedule</span>
            <h3>Trips on {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</h3>
          </div>
        </header>
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {selectedSchedules.map(s => {
            const isCompleted = records.trips.some(t => t.date === selectedDateStr && t.note.includes(`Completed scheduled trip: ${s.name}`));
            const isSkipped = skippedSchedules[s.id]?.includes(selectedDateStr);
            const timePassed = isTimePassed(s.completionTime);
            
            let statusText = "Upcoming";
            let statusClass = "connection";
            if (isCompleted) {
              statusText = "Completed";
              statusClass = "connection online";
            } else if (isSkipped) {
              statusText = "Skipped";
              statusClass = "connection offline";
            } else if (selectedDateStr === new Date().toISOString().slice(0, 10)) {
              statusText = timePassed ? "Done?" : "To be done";
              statusClass = timePassed ? "connection offline" : "connection online";
            }

            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #efebe5", borderRadius: "8px" }} className="activity">
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>{s.name}</h4>
                  <small style={{ color: "#849092" }}>{s.destination} · {s.repeat} at {s.completionTime || "18:00"}</small>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className={statusClass}>
                    <i></i>
                    <span>{statusText}</span>
                  </span>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                    onClick={() => onOpenScheduleDetails(s, selectedDateStr, isCompleted, isSkipped)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
          {selectedSchedules.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "#849092" }} className="widget-empty">
              No scheduled trips for this date.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("Overview");
  const [modal, setModal] = useState(false);
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);

  const [vehicles, setVehicles] = useState(() => {
    const storedVehicles = localStorage.getItem("vehiclelog-v6-vehicles");
    if (storedVehicles) {
      try { return JSON.parse(storedVehicles); } catch (e) {}
    }
    const singleVehicle = localStorage.getItem("vehiclelog-v6-vehicle");
    if (singleVehicle) {
      try {
        const parsed = JSON.parse(singleVehicle);
        const list = [parsed];
        localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(list));
        return list;
      } catch (e) {}
    }
    return [];
  });

  const [vehicle, setVehicle] = useState(() => {
    const activeVehicle = localStorage.getItem("vehiclelog-v6-active-vehicle");
    if (activeVehicle) {
      try { return JSON.parse(activeVehicle); } catch (e) {}
    }
    const singleVehicle = localStorage.getItem("vehiclelog-v6-vehicle");
    if (singleVehicle) {
      try { return JSON.parse(singleVehicle); } catch (e) {}
    }
    return null;
  });

  const [skippedSchedules, setSkippedSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vehiclelog-v6-skipped-schedules") || "{}"); } catch (e) { return {}; }
  });

  const [scheduleDetail, setScheduleDetail] = useState(null);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [records, setRecords] = useState({ fuel: [], trips: [], maintenance: [], expenses: [], schedules: [] });
  const [detail, setDetail] = useState(null);
  const [timePeriod, setTimePeriod] = useState("All time");
  const [costPeriod, setCostPeriod] = useState("All time");
  const [allActivitiesModal, setAllActivitiesModal] = useState(false);

  useEffect(() => { getFuelEntries().then(setFuelEntries); }, []);
  useEffect(() => {
    Promise.all([getEntries("fuel"), getEntries("trips"), getEntries("maintenance"), getEntries("expenses"), getEntries("schedules")]).then(([fuel, trips, maintenance, expenses, schedules]) => {
      setRecords({ fuel, trips, maintenance, expenses, schedules });
      setFuelEntries(fuel);
    }).catch((error) => console.error("Unable to load local records", error));
  }, []);

  const activeRecords = useMemo(() => {
    if (!vehicle) return { fuel: [], trips: [], maintenance: [], expenses: [], schedules: [] };
    const name = vehicle.name;
    return {
      fuel: records.fuel.filter(r => r.vehicle === name),
      trips: records.trips.filter(r => r.vehicle === name),
      maintenance: records.maintenance.filter(r => r.vehicle === name),
      expenses: records.expenses.filter(r => r.vehicle === name),
      schedules: records.schedules.filter(r => r.vehicle === name),
    };
  }, [records, vehicle]);

  const activeFuelEntries = useMemo(() => {
    if (!vehicle) return [];
    return fuelEntries.filter(r => r.vehicle === vehicle.name);
  }, [fuelEntries, vehicle]);

  const filterByPeriod = (entries, period) => {
    if (period === "All time") return entries;
    const now = new Date();
    let days = 365;
    if (period === "Last 30 days") days = 30;
    else if (period === "Last 6 months") days = 180;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return entries.filter((entry) => {
      if (!entry.date) return true;
      return new Date(entry.date) >= cutoff;
    });
  };

  const filteredFuel = useMemo(() => filterByPeriod(activeFuelEntries, timePeriod), [activeFuelEntries, timePeriod]);
  const filteredTripsForStats = useMemo(() => filterByPeriod(activeRecords.trips, timePeriod), [activeRecords.trips, timePeriod]);

  const stats = useMemo(() => {
    const initial = Number(vehicle?.initialOdometer || 0);
    const tripDistance = filteredTripsForStats.reduce((sum, trip) => sum + Number(trip.distance || 0), 0);
    const fuelDistance = Math.max(0, Number(filteredFuel[filteredFuel.length - 1]?.odometer || initial) - initial);
    const distance = Math.max(fuelDistance, tripDistance);
    const currentOdometer = initial + distance;
    const liters = filteredFuel.reduce((sum, entry) => sum + Number(entry.liters || 0), 0);
    const spend = filteredFuel.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return { currentOdometer, liters, spend, distance, mileage: liters ? distance / liters : 0, fuelCount: filteredFuel.length };
  }, [vehicle, filteredFuel, filteredTripsForStats]);

  const chartData = useMemo(() => {
    const sorted = [...filteredFuel].sort((a, b) => new Date(a.date) - new Date(b.date));
    const mileages = sorted.map(r => Number(r.mileage) || 0).filter(m => m > 0);
    if (mileages.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (mileages.length < 2) return Array(12).fill(mileages[0]);
    if (mileages.length >= 12) return mileages.slice(-12);
    const padding = Array(12 - mileages.length).fill(mileages[0]);
    return [...padding, ...mileages];
  }, [filteredFuel]);

  const spendTrend = useMemo(() => {
    const sorted = [...filteredFuel].sort((a, b) => new Date(a.date) - new Date(b.date));
    const amounts = sorted.map(r => Number(r.amount) || 0);
    if (amounts.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (amounts.length < 12) {
      const padding = Array(12 - amounts.length).fill(0);
      return [...padding, ...amounts];
    }
    return amounts.slice(-12);
  }, [filteredFuel]);

  const litersTrend = useMemo(() => {
    const sorted = [...filteredFuel].sort((a, b) => new Date(a.date) - new Date(b.date));
    const liters = sorted.map(r => Number(r.liters) || 0);
    if (liters.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (liters.length < 12) {
      const padding = Array(12 - liters.length).fill(0);
      return [...padding, ...liters];
    }
    return liters.slice(-12);
  }, [filteredFuel]);

  const distanceTrend = useMemo(() => {
    const sorted = [...filteredTripsForStats].sort((a, b) => new Date(a.date) - new Date(b.date));
    const distances = sorted.map(r => Number(r.distance) || 0);
    if (distances.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (distances.length < 12) {
      const padding = Array(12 - distances.length).fill(0);
      return [...padding, ...distances];
    }
    return distances.slice(-12);
  }, [filteredTripsForStats]);

  function addVehicle(entry) {
    const list = [...vehicles, entry];
    localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(list));
    localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(entry));
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(entry));
    setVehicles(list);
    setVehicle(entry);
    setVehicleModal(false);
  }

  function updateVehicle(entry) {
    const list = vehicles.map(v => v.name === vehicle.name ? entry : v);
    localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(list));
    localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(entry));
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(entry));
    setVehicles(list);
    setVehicle(entry);
  }

  function addRecord(type, entry) {
    const { activity, ...record } = entry;
    const table = type === "service" ? "maintenance" : type;
    setRecords((currentRecords) => ({ ...currentRecords, [table]: [...currentRecords[table], record] }));
    if (type === "fuel") setFuelEntries((currentEntries) => [...currentEntries, record]);
  }

  async function saveRecordUpdate(table, id, entry) {
    if (table === "vehicles") {
      updateVehicle(entry);
      return;
    }
    await updateEntry(table, id, entry);
    setRecords((currentRecords) => ({ ...currentRecords, [table]: currentRecords[table].map((record) => Number(record.id) === Number(id) ? { ...record, ...entry, id } : record) }));
    if (table === "fuel") setFuelEntries((currentEntries) => currentEntries.map((record) => Number(record.id) === Number(id) ? { ...record, ...entry, id } : record));
  }

  async function deleteRecord(table, id) {
    if (table === "vehicles") {
      const list = vehicles.filter(v => v.name !== vehicle.name);
      localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(list));
      setVehicles(list);
      if (list.length > 0) {
        const nextActive = list[0];
        localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(nextActive));
        localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(nextActive));
        setVehicle(nextActive);
      } else {
        localStorage.removeItem("vehiclelog-v6-active-vehicle");
        localStorage.removeItem("vehiclelog-v6-vehicle");
        setVehicle(null);
      }
      setDetail(null);
      return;
    }
    await deleteEntry(table, id);
    setRecords((currentRecords) => ({ ...currentRecords, [table]: currentRecords[table].filter((record) => Number(record.id) !== Number(id)) }));
    if (table === "fuel") setFuelEntries((currentEntries) => currentEntries.filter((record) => Number(record.id) !== Number(id)));
    setDetail(null);
  }

  function addSchedule(entry) {
    setRecords((currentRecords) => ({ ...currentRecords, schedules: [...currentRecords.schedules, entry] }));
  }

  async function handleLogTripFromSchedule(schedule) {
    const tripData = {
      date: new Date().toISOString().slice(0, 10),
      vehicle: vehicle.name,
      distance: schedule.distance || "0",
      destination: schedule.destination || "Destination",
      category: "Work",
      note: `Completed scheduled trip: ${schedule.name}`,
    };
    try {
      const id = await saveEntry("trips", tripData);
      setRecords((currentRecords) => ({ ...currentRecords, trips: [...currentRecords.trips, { ...tripData, id }] }));
      alert(`Trip to ${schedule.destination} successfully logged to your Trips log!`);
    } catch (e) {
      console.error(e);
      alert("Failed to log trip automatically.");
    }
  }

  const handleSkipSchedule = (scheduleId, dateStr) => {
    setSkippedSchedules((prev) => {
      const updated = { ...prev };
      if (!updated[scheduleId]) {
        updated[scheduleId] = [];
      }
      if (!updated[scheduleId].includes(dateStr)) {
        updated[scheduleId].push(dateStr);
      }
      localStorage.setItem("vehiclelog-v6-skipped-schedules", JSON.stringify(updated));
      return updated;
    });
  };

  const current = useMemo(() => active, [active]);
  const modalType = modal === true ? null : modal;
  const allActivities = useMemo(() => buildActivities(activeRecords), [activeRecords]);

  return <div className={`app ${dark ? "dark" : ""}`}>
    <Sidebar active={current} setActive={setActive} open={menu} setOpen={setMenu} vehicle={vehicle} vehicles={vehicles} setVehicle={setVehicle} setVehicleModal={setVehicleModal}/>
    <main className="content"><Header active={current} dark={dark} setDark={setDark} setModal={setModal} setMenu={setMenu} vehicle={vehicle}/><div className="content-body">{!vehicle ? <Welcome addVehicle={() => setVehicleModal(true)}/> : current === "Overview" ? <Overview setModal={setModal} activities={allActivities} vehicle={vehicle} stats={stats} records={activeRecords} timePeriod={timePeriod} setTimePeriod={setTimePeriod} costPeriod={costPeriod} setCostPeriod={setCostPeriod} onOpenScheduleDetails={(schedule, dateStr, isCompleted, isSkipped) => setScheduleDetail({ schedule, dateStr, isCompleted, isSkipped })} skippedSchedules={skippedSchedules} onViewAllActivities={() => setAllActivitiesModal(true)} chartData={chartData} spendTrend={spendTrend} litersTrend={litersTrend} distanceTrend={distanceTrend} /> : <SecondaryPage active={current} setModal={setModal} records={activeRecords} vehicle={vehicle} stats={stats} skippedSchedules={skippedSchedules} onOpenScheduleDetails={(schedule, dateStr, isCompleted, isSkipped) => setScheduleDetail({ schedule, dateStr, isCompleted, isSkipped })} onOpenRecord={(page, record) => setDetail({ page, record })}/>}</div></main>
    {modal && modal !== "schedule" && <Modal close={() => setModal(false)} setActivities={() => {}} vehicle={vehicle} fuelEntries={activeFuelEntries} onRecordSaved={addRecord} onVehicleUpdate={updateVehicle} initialType={modalType}/>}
    {modal === "schedule" && <ScheduleModal close={() => setModal(false)} onScheduleSaved={addSchedule} vehicle={vehicle}/>}
    {detail && <LogDetailModal active={detail.page} record={detail.record} close={() => setDetail(null)} onSave={saveRecordUpdate} onDelete={deleteRecord}/>}
    {vehicleModal && <VehicleModal close={() => setVehicleModal(false)} addVehicle={addVehicle}/>}
    {scheduleDetail && <ScheduleDetailsModal schedule={scheduleDetail.schedule} dateStr={scheduleDetail.dateStr} isCompleted={scheduleDetail.isCompleted} isSkipped={scheduleDetail.isSkipped} close={() => setScheduleDetail(null)} onAccept={handleLogTripFromSchedule} onSkip={handleSkipSchedule} />}

    {allActivitiesModal && (
      <div className="modal-wrap" role="presentation" onMouseDown={() => setAllActivitiesModal(false)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label="Activity history" onMouseDown={(e) => e.stopPropagation()}>
          <header><div><span className="eyebrow">Activity history</span><h2>All recent activity</h2></div><IconButton label="Close" onClick={() => setAllActivitiesModal(false)}><X size={18}/></IconButton></header>
          <div className="activity-list" style={{ maxHeight: "350px", overflowY: "auto", marginTop: "16px", paddingRight: "4px" }}>
            {allActivities.map((a, i) => (
              <div className="activity" key={`${a.title}-${i}`} style={{ borderTop: "1px solid #efebe5", padding: "10px 0" }}>
                <div className={`activity-icon ${a.tone}`}><a.icon size={16}/></div>
                <div style={{ flex: 1 }}><b>{a.title}</b><small>{a.meta}</small></div>
                <aside><b>{a.amount}</b><small>{a.time}</small></aside>
              </div>
            ))}
            {allActivities.length === 0 && <EmptyWidget text="Your activity will appear here." />}
          </div>
          <footer><button className="btn primary" onClick={() => setAllActivitiesModal(false)}>Close</button></footer>
        </section>
      </div>
    )}
  </div>;
}
