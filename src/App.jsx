import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell,
  CalendarDays, Car, CheckCircle2, ChevronDown, CircleDollarSign, Clock3,
  Download, Droplets, Fuel, Gauge, Grid2X2, LayoutDashboard, List, MapPin, Menu,
  Moon, MoreHorizontal, Plus, ReceiptText, Search, Settings, ShieldCheck,
  Sparkles, Sun, Table, Trash2, TrendingUp, Upload, User, Wrench, X, Zap,
  Pencil, XCircle,
} from "lucide-react";
import { db, deleteEntry, getEntries, getFuelEntries, saveEntry, updateEntry } from "./db";
import { fetchDailyFuelPrice } from "./fuelPrice";
import { calculateRefill } from "./calculations";
import { parseInputWithAI } from "./gemini";

export function toLocalDateStr(date) {
  if (!date) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return toLocalDateStr(d);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const nav = [
  ["Overview", LayoutDashboard],
  ["Vehicles", Car],
  ["Fuel log", Fuel],
  ["Maintenance", Wrench],
  ["Trips", MapPin],
  ["Expenses", ReceiptText],
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


function CustomCalendarHeaderSelect({ value, onChange, options, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = useMemo(() => {
    const found = options.find(o => o.value === value);
    return found ? found.label : value;
  }, [value, options]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="calendar-header-select-btn"
        style={{
          background: "transparent",
          border: 0,
          fontWeight: "bold",
          fontSize: style?.fontSize || "14px",
          cursor: "pointer",
          outline: "none",
          color: "inherit",
          padding: "2px 6px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "2px"
        }}
      >
        <span>{selectedLabel}</span>
      </button>
      {isOpen && (
        <ul
          className="calendar-header-dropdown-list"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            background: "var(--dropdown-bg, #fcfbf8)",
            border: "1px solid var(--dropdown-border, #e3dfd7)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(13, 28, 32, 0.15)",
            padding: "4px",
            margin: "4px 0 0 0",
            listStyle: "none",
            maxHeight: "180px",
            overflowY: "auto",
            zIndex: 1100,
            minWidth: "100px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: "6px 10px",
                fontSize: "12px",
                cursor: "pointer",
                borderRadius: "6px",
                fontWeight: opt.value === value ? "bold" : "normal",
                background: opt.value === value ? "#fff0e9" : "transparent",
                color: opt.value === value ? "#e66b2e" : "inherit"
              }}
              className="calendar-header-dropdown-item"
            >
              {opt.label}
            </li>
          ))}
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
  const touchStartRef = useRef({ x: 0, y: 0 });

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
    return toLocalDateStr(date);
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

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(diffX) > 40 && Math.abs(diffY) < 80) {
      if (diffX > 0) {
        setViewDate(new Date(year, month - 1, 1));
      } else {
        setViewDate(new Date(year, month + 1, 1));
      }
    }
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
        <div 
          className="calendar-dropdown" 
          style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: "auto", width: "270px", padding: "10px", zIndex: 1000 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <header style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <CustomCalendarHeaderSelect 
                value={month} 
                onChange={(val) => setViewDate(new Date(year, val, 1))}
                options={monthNames.map((name, idx) => ({ value: idx, label: name }))}
                style={{ fontSize: "12px" }}
              />
              <CustomCalendarHeaderSelect 
                value={year} 
                onChange={(val) => setViewDate(new Date(val, month, 1))}
                options={Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 15 + i).map((y) => ({ value: y, label: String(y) }))}
                style={{ fontSize: "12px" }}
              />
            </div>
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

function Modal({ close, setActivities, vehicle, fuelEntries, onRecordSaved, onVehicleUpdate, initialType = null, onScheduleSaved, enableAi, enablePriceFetch, stats }) {
  const [type, setType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [fuelCity, setFuelCity] = useState(vehicle.city || "");
  const [priceStatus, setPriceStatus] = useState(vehicle.city ? "Fetching today's INR price..." : "Enter your city to fetch today's INR price.");
  const [autoPrice, setAutoPrice] = useState(false);
  
  // Controlled form states
  const [odometer, setOdometer] = useState("");
  const [distance, setDistance] = useState("");
  const [destination, setDestination] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toLocalDateStr());

  // Schedule specific states
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleRepeat, setScheduleRepeat] = useState("Daily");
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [scheduleDays, setScheduleDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [scheduleNotes, setScheduleNotes] = useState("");

  // AI states
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const labels = { 
    fuel: ["Fuel refill", Fuel], 
    trips: ["Trip", MapPin], 
    service: ["Service", Wrench], 
    expenses: ["Expense", ReceiptText],
    schedule: ["Schedule", CalendarDays]
  };

  const lastFuel = fuelEntries[fuelEntries.length - 1];
  const preview = calculateRefill({ amount, pricePerLiter: price, currentOdometer: 0, previousOdometer: 0 });
  const liters = amount && price ? preview.liters.toFixed(2) : "";

  // Fuel level & tank space validation calculations
  const filledLiters = Number(liters || 0);
  const tankCapacity = Number(vehicle?.tankCapacity || 50);
  const initialFuel = Number(vehicle?.currentFuelLevel ?? (tankCapacity * 0.75));
  const initialOdo = Number(vehicle?.currentFuelOdometer ?? vehicle?.initialOdometer ?? 0);

  let baselineFuel = initialFuel;
  let baselineOdo = initialOdo;

  if (lastFuel) {
    const refillOdo = Number(lastFuel.odometer || 0);
    if (refillOdo > initialOdo) {
      baselineFuel = tankCapacity; // Assume tank was filled to capacity
      baselineOdo = refillOdo;
    }
  }

  const currentOdo = Number(odometer || baselineOdo);
  const refillDistance = Math.max(0, currentOdo - baselineOdo);
  const averageMileage = Number(stats?.mileage || 15);
  const consumed = averageMileage > 0 ? refillDistance / averageMileage : 0;
  const fuelBefore = Math.max(0, baselineFuel - consumed);
  const maxFillableLiters = Math.max(0, tankCapacity - fuelBefore);
  const refillExceeds = type === "fuel" && filledLiters > maxFillableLiters;

  useEffect(() => {
    if (type !== "fuel" || !fuelCity.trim() || !enablePriceFetch) {
      if (type === "fuel" && !enablePriceFetch) {
        setPriceStatus("Manual price entry active.");
        setAutoPrice(false);
      }
      return;
    }
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
  }, [type, fuelCity, vehicle.fuel, enablePriceFetch]);

  const handleAiFill = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const result = await parseInputWithAI(aiInput);
      if (result && result.type) {
        setType(result.type);
        if (result.type === "fuel") {
          if (result.data.amount) setAmount(String(result.data.amount));
          if (result.data.pricePerLiter) setPrice(String(result.data.pricePerLiter));
          if (result.data.fuelCity) setFuelCity(result.data.fuelCity);
          if (result.data.note) setNote(result.data.note);
        } else if (result.type === "trips") {
          if (result.data.distance) setDistance(String(result.data.distance));
          if (result.data.destination) setDestination(result.data.destination);
          if (result.data.category) setCategorySelect(result.data.category);
          if (result.data.note) setNote(result.data.note);
        } else if (result.type === "service") {
          if (result.data.serviceType) setServiceType(result.data.serviceType);
          if (result.data.cost) setCost(String(result.data.cost));
          if (result.data.note) setNote(result.data.note);
        } else if (result.type === "expenses") {
          if (result.data.category) setCategorySelect(result.data.category);
          if (result.data.amount) setAmount(String(result.data.amount));
          if (result.data.note) setNote(result.data.note);
        } else if (result.type === "schedule") {
          if (result.data.name) setScheduleName(result.data.name);
          if (result.data.destination) setDestination(result.data.destination);
          if (result.data.distance) setDistance(String(result.data.distance));
          if (result.data.repeat) setScheduleRepeat(result.data.repeat);
          if (result.data.completionTime) setScheduleTime(result.data.completionTime);
          if (result.data.startDate) setDate(result.data.startDate);
          if (result.data.notes) setScheduleNotes(result.data.notes);
          if (result.data.weekdays) {
            setScheduleDays(result.data.weekdays.split(",").map(d => d.trim()));
          }
        }
      } else {
        setAiError("AI could not classify the entry. Please try different wording.");
      }
    } catch (err) {
      setAiError(err.message || "An error occurred during AI analysis.");
    } finally {
      setAiLoading(false);
    }
  };

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    
    if (type === "schedule") {
      data.weekdays = scheduleDays.join(",");
      data.vehicle = vehicle.name;
      const id = await saveEntry("schedules", data);
      if (onScheduleSaved) {
        onScheduleSaved({ ...data, id, createdAt: new Date().toISOString() });
      }
      setSaving(false); close();
      return;
    }

    if (type === "fuel") {
      if (refillExceeds) {
        alert(`Cannot save refill! Liters filled (${filledLiters.toFixed(2)}L) exceeds the remaining tank capacity (${maxFillableLiters.toFixed(2)}L).`);
        setSaving(false);
        return;
      }
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
      
      <div className="record-tabs-container">
        {type !== null && (
          <div 
            className="record-tabs-highlighter" 
            style={{ 
              transform: `translateX(${Object.keys(labels).indexOf(type) * 100}%)` 
            }}
          >
            <div className="record-highlighter-inner" />
          </div>
        )}
        {Object.entries(labels).map(([key, [label, Icon]]) => {
          const isActive = type === key;
          return (
            <button 
              key={key} 
              type="button" 
              className={`record-tab-btn ${isActive ? "active" : ""}`} 
              onClick={() => setType(key)}
            >
              <Icon size={16}/>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Quick Fill Input */}
      {enableAi && (
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", marginBottom: "6px", background: "#f5f3ef", padding: "8px", borderRadius: "8px" }} className="theme-toggle-bg">
          <input 
            placeholder="Describe entry with AI (e.g., 50L petrol at Bangalore, commute daily to Work at 9am)..." 
            value={aiInput} 
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAiFill(); } }}
            style={{ flex: 1, border: "1px solid #e3dfd7", borderRadius: "8px", padding: "0 10px", height: "36px", background: "white", fontSize: "11px" }}
            disabled={aiLoading}
          />
          <button 
            type="button" 
            className="btn primary" 
            onClick={handleAiFill} 
            disabled={aiLoading || !aiInput.trim()}
            style={{ height: "36px", padding: "0 12px", fontSize: "11px" }}
          >
            {aiLoading ? "Analyzing..." : "Fill with AI"}
          </button>
        </div>
      )}
      {enableAi && aiError && <div style={{ color: "#c74830", fontSize: "10px", fontWeight: "bold", marginBottom: "8px" }}>{aiError}</div>}
      {type ? <form onSubmit={submit}>
        <div className="form-grid">
          <label>Date<CustomDatePicker name="date" defaultValue={date} onChange={setDate} /></label>
          <label>Vehicle<input name="vehicle" value={vehicle.name} readOnly /></label>
        </div>
        
        {type !== "schedule" && (
          <label>Current meter reading (km)<input name="odometer" type="number" min={lastFuel?.odometer || vehicle.initialOdometer} placeholder={String(lastFuel?.odometer || vehicle.initialOdometer)} value={odometer} onChange={(e) => setOdometer(e.target.value)} onWheel={(e) => e.target.blur()} required /><small className="field-help">Last recorded meter: {Number(lastFuel?.odometer || vehicle.initialOdometer).toLocaleString("en-IN")} km</small></label>
        )}

        {type === "fuel" && <>
          <label>Fuel-price city<input name="fuelCity" placeholder="Bangalore" value={fuelCity} onChange={(e) => setFuelCity(e.target.value)} required /><small className="field-help">Matched against the IndianAPI city list. Saved to your vehicle after this refill.</small></label>
          <div className="form-grid">
            <label>Amount paid (INR)<input name="amount" type="number" min="0" step="0.01" placeholder="2500" value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()} required /></label>
            <label>{vehicle.fuel} price (INR/L)<input name="pricePerLiter" type="number" min="0" step="0.01" placeholder="Fetching today's rate..." value={price} onChange={(e) => setPrice(e.target.value)} onWheel={(e) => e.target.blur()} readOnly={autoPrice && enablePriceFetch} required /></label>
          </div>
          {refillExceeds && (
            <div style={{ color: "#c74830", fontSize: "11px", fontWeight: "bold", background: "#fdf3f2", border: "1px solid #f6cfca", padding: "8px", borderRadius: "8px", marginTop: "4px" }}>
              ⚠️ Refill exceeds tank capacity! Max fillable: {maxFillableLiters.toFixed(2)}L (Current fuel: {fuelBefore.toFixed(2)}L / {tankCapacity}L).
            </div>
          )}
          <div className="fuel-calc"><Fuel size={16}/><div><b>{liters || "0.00"} liters</b><small>{priceStatus}</small></div></div>
        </>}

        {type === "trips" && <div className="form-grid"><label>Distance (km)<input name="distance" placeholder="18.4" value={distance} onChange={(e) => setDistance(e.target.value)} required /></label><label>Destination<input name="destination" placeholder="Indiranagar" value={destination} onChange={(e) => setDestination(e.target.value)} required /></label><label>Category<CustomSelect name="category" value={categorySelect} onChange={setCategorySelect} options={["Work", "Family", "Business", "Personal"]} /></label></div>}
        
        {type === "service" && <div className="form-grid"><label>Service type<input name="serviceType" placeholder="Oil and filter change" value={serviceType} onChange={(e) => setServiceType(e.target.value)} required /></label><label>Cost (INR)<input name="cost" type="number" min="0" step="0.01" placeholder="1500" value={cost} onChange={(e) => setCost(e.target.value)} onWheel={(e) => e.target.blur()} required /></label></div>}
        
        {type === "expenses" && <div className="form-grid"><label>Category<CustomSelect name="category" value={categorySelect} onChange={setCategorySelect} options={["Parking", "Toll", "Accessories", "Miscellaneous"]} /></label><label>Amount<input name="amount" placeholder="120" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label></div>}

        {type === "schedule" && <>
          <label>Schedule name<input name="name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} required /></label>
          <div className="form-grid">
            <label>Destination<input name="destination" placeholder="Work" value={destination} onChange={(e) => setDestination(e.target.value)} required /></label>
            <label>Distance (km)<input name="distance" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} onWheel={(e) => e.target.blur()} /></label>
          </div>
          <div className="form-grid">
            <label>Repeat<CustomSelect name="repeat" value={scheduleRepeat} onChange={setScheduleRepeat} options={["Daily", "Weekly", "Monthly", "Yearly"]} /></label>
            <label>Start date<CustomDatePicker name="startDate" defaultValue={date} onChange={setDate} /></label>
          </div>
          <div className="form-grid">
            <label>Completion Time<input name="completionTime" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} onClick={(e) => e.target.showPicker()} /></label>
          </div>
          {scheduleRepeat !== "Daily" && (
            <div className="weekday-picker" aria-label="Choose weekdays">
              {weekdays.map((day) => (
                <button 
                  key={day} 
                  type="button" 
                  className={scheduleDays.includes(day) ? "active" : ""} 
                  onClick={() => setScheduleDays((currentDays) => currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day])}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </>}

        <label>Note<input name="note" value={type === "schedule" ? scheduleNotes : note} onChange={(e) => type === "schedule" ? setScheduleNotes(e.target.value) : setNote(e.target.value)} placeholder="Add a short note" /></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary" disabled={saving || refillExceeds}><Plus size={17}/>{saving ? "Saving..." : "Add record"}</button></footer>
      </form> : <div className="record-prompt"><Sparkles size={17}/><span>Choose the kind of record you want to add.</span></div>}
    </section>
  </div>;
}

function VehicleModal({ close, addVehicle, username }) {
  function submit(e) {
    e.preventDefault();
    const entry = Object.fromEntries(new FormData(e.currentTarget));
    entry.tankCapacity = Number(entry.tankCapacity || 50);
    entry.currentFuelLevel = Number(entry.currentFuelLevel || 25);
    entry.currentFuelOdometer = Number(entry.initialOdometer || 0);
    entry.driver = username;

    if (entry.currentFuelLevel > entry.tankCapacity) {
      alert("Current fuel level cannot exceed tank capacity!");
      return;
    }

    addVehicle(entry);
  }
  return <div className="modal-wrap" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-label="Add vehicle" onMouseDown={(e) => e.stopPropagation()}>
      <header><div><span className="eyebrow">Your garage</span><h2>Add your first vehicle</h2></div><IconButton label="Close" onClick={close}><X size={18}/></IconButton></header>
      <form onSubmit={submit}>
        <label>Vehicle name<input name="name" placeholder="My daily driver" required /></label>
        <div className="form-grid"><label>Registration number<input name="registration" placeholder="KA 01 AB 1234" required /></label><label>Initial meter reading (km)<input name="initialOdometer" type="number" min="0" placeholder="24500" required /></label></div>
        <div className="form-grid"><label>Vehicle type<CustomSelect name="type" options={["Car", "Motorcycle", "Scooter", "Truck"]} /></label><label>Fuel type<CustomSelect name="fuel" options={["Petrol", "Diesel", "CNG", "LPG"]} /></label></div>
        <div className="form-grid">
          <label>Tank capacity (L)<input name="tankCapacity" type="number" min="1" placeholder="45" defaultValue="45" required /></label>
          <label>Current fuel level (L)<input name="currentFuelLevel" type="number" min="0" step="0.1" placeholder="20" defaultValue="20" required /></label>
        </div>
        <div className="form-grid">
          <label>Home city<input name="city" placeholder="Bangalore" required /></label>
          <div style={{ display: "none" }}></div>
        </div>
        <small className="field-help" style={{ marginTop: "-6px", display: "block" }}>Home city is used to select your daily fuel rate. Tank capacity and current fuel prevent refilling beyond tank limits.</small>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Add vehicle</button></footer>
      </form>
    </section>
  </div>;
}

function ScheduleModal({ close, onScheduleSaved, vehicle }) {
  const [days, setDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [repeat, setRepeat] = useState("Weekly");
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
        <label>Schedule name<input name="name" defaultValue="Office commute" required /></label>
        <div className="form-grid"><label>Destination<input name="destination" defaultValue="Work" required /></label><label>Distance (km)<input name="distance" type="number" defaultValue="18" onWheel={(e) => e.target.blur()} /></label></div>
        <div className="form-grid"><label>Repeat<CustomSelect name="repeat" value={repeat} onChange={setRepeat} options={["Daily", "Weekly", "Monthly", "Yearly"]} /></label><label>Start date<CustomDatePicker name="startDate" defaultValue={toLocalDateStr()} /></label></div>
        <div className="form-grid"><label>Completion Time<input name="completionTime" type="time" defaultValue="18:00" onClick={(e) => e.target.showPicker()} /></label></div>
        {repeat !== "Daily" && (
          <div className="weekday-picker" aria-label="Choose weekdays">{weekdays.map((day) => <button key={day} type="button" className={days.includes(day) ? "active" : ""} onClick={() => setDays((currentDays) => currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day])}>{day}</button>)}</div>
        )}
        <label>Notes<input name="notes" placeholder="Optional reminder notes" /></label>
        <footer><button type="button" className="btn ghost" onClick={close}>Cancel</button><button className="btn primary"><Plus size={17}/>Create schedule</button></footer>
      </form>
    </section>
  </div>;
}

function Sidebar({ active, setActive, open, setOpen, vehicle, vehicles = [], setVehicle, setVehicleModal, username, setUsername, users, setUsers }) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);
  const sidebarRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        const isMenuBtn = e.target.closest(".mobile-menu");
        if (!isMenuBtn) {
          setOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, setOpen]);

  const selectVehicle = (v) => {
    localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(v));
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(v));
    setVehicle(v);
    setSwitcherOpen(false);
  };

  return <aside ref={sidebarRef} className={`sidebar ${open ? "open" : ""}`}>
    <div className="brand" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <img src="./logo.png" alt="FuelLog Logo" style={{ height: "40px", objectFit: "contain", borderRadius: "6px" }} />
      <IconButton label="Close menu" className="menu-close" onClick={() => setOpen(false)}><X size={18}/></IconButton>
    </div>
    
    <div className="profile-container" ref={switcherRef}>
      <div className="profile" onClick={() => setSwitcherOpen(!switcherOpen)} style={{ cursor: "pointer" }}>
        <div className="vehicle-art"><span></span><User size={20}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>{username || "Driver"}</b>
          <small style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>{vehicle ? `${vehicle.name} (${vehicle.registration || "No registration"})` : "No vehicle active"}</small>
        </div>
        <ChevronDown size={16} className={`arrow ${switcherOpen ? "open" : ""}`} />
      </div>

      {switcherOpen && (
        <ul className="vehicle-switcher-dropdown" style={{ maxHeight: "350px", overflowY: "auto" }}>
          {/* VEHICLES SECTION */}
          <li style={{ padding: "8px 10px 4px", fontSize: "9px", fontWeight: "bold", color: "#819495", textTransform: "uppercase", letterSpacing: "0.5px" }}>Vehicles</li>
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

function Header({ active, setDark, dark, setModal, setMenu, vehicle, notifications = [], setScheduleDetail, records, stats, username }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fuelInfo = useMemo(() => {
    if (!vehicle) return null;
    const tankCapacity = Number(vehicle.tankCapacity || 50);
    const initialFuel = Number(vehicle.currentFuelLevel ?? (tankCapacity * 0.75));
    const initialOdo = Number(vehicle.currentFuelOdometer ?? vehicle.initialOdometer ?? 0);

    const fuelRefills = [...(records?.fuel || [])].sort((a, b) => Number(b.odometer) - Number(a.odometer));
    
    let baselineFuel = initialFuel;
    let baselineOdo = initialOdo;
    
    if (fuelRefills.length > 0) {
      const lastRefill = fuelRefills[0];
      const refillOdo = Number(lastRefill.odometer || 0);
      if (refillOdo > initialOdo) {
        baselineFuel = tankCapacity; // Assume tank was filled to capacity
        baselineOdo = refillOdo;
      }
    }

    const currentOdometer = Number(stats?.currentOdometer || baselineOdo);
    const distance = Math.max(0, currentOdometer - baselineOdo);
    const averageMileage = Number(stats?.mileage || 15);
    const consumed = averageMileage > 0 ? distance / averageMileage : 0;
    const level = Math.max(0, baselineFuel - consumed);
    const percentage = Math.min(100, Math.max(0, Math.round((level / tankCapacity) * 100)));
    return { percentage, level, capacity: tankCapacity };
  }, [vehicle, records?.fuel, stats]);

  const displayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "2-digit" }).replace(", ", " · ");
  const displayName = username || "Driver";

  return <header className="topbar">
    <div className="page-heading"><IconButton label="Open menu" className="mobile-menu" onClick={() => setMenu(true)}><Menu size={20}/></IconButton><div><span className="eyebrow">{displayDate}</span><h1>{active === "Overview" ? <>Good morning, <i>{displayName}.</i></> : active}</h1></div></div>
    <div className="top-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {fuelInfo && (
        <div className="fuel-pill" title={`Fuel Level: ${fuelInfo.level.toFixed(1)}L / ${fuelInfo.capacity}L`}>
          <Fuel size={13} style={{ color: fuelInfo.percentage < 20 ? "#c74830" : "#3c8174" }}/>
          <span>{fuelInfo.percentage}%</span>
        </div>
      )}
      <IconButton label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</IconButton>
      <div style={{ position: "relative" }} ref={containerRef}>
        <IconButton 
          label="Notifications" 
          className={notifications.length > 0 ? "has-dot" : ""} 
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <Bell size={18}/>
        </IconButton>
        {notificationsOpen && (
          <div className="notifications-dropdown">
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #efebe5", paddingBottom: "8px" }} className="dark-border-top">
              <h3 style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Alerts</h3>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: notifications.length > 0 ? "#fff0e9" : "#f1ede7", color: notifications.length > 0 ? "#e66b2e" : "#849092", fontWeight: "bold" }}>
                {notifications.length} Pending
              </span>
            </header>
            <div style={{ maxHeight: "250px", overflowY: "auto", display: "grid", gap: "8px", paddingRight: "4px" }} className="invisible-scroll">
              {notifications.map((n) => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eeeae4" }} className="dark-border-top">
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                    <b style={{ fontSize: "11px", display: "block", textOverflow: "ellipsis", overflow: "hidden" }}>{n.schedule.name}</b>
                    <small style={{ fontSize: "9px", color: "#647176", display: "block", marginTop: "2px" }}>Time: {n.schedule.completionTime || "18:00"}</small>
                  </div>
                  <button
                    className="btn primary"
                    style={{ padding: "4px 8px", fontSize: "9px", borderRadius: "6px", height: "auto", fontWeight: "bold" }}
                    onClick={() => {
                      setNotificationsOpen(false);
                      setScheduleDetail({ schedule: n.schedule, dateStr: n.dateStr, isCompleted: n.isCompleted, isSkipped: n.isSkipped });
                    }}
                  >
                    Action
                  </button>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px", color: "#849092", fontSize: "11px" }}>
                  All caught up! No pending alerts.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </header>;
}

function Welcome({ username, setUsername, users = [], setUsers = () => {}, addVehicle }) {
  if (!username) {
    return <section className="welcome">
      <div className="welcome-mark" style={{ background: "transparent", boxShadow: "none", width: "auto", height: "auto", display: "grid", placeItems: "center" }}>
        <img src="./logo.png" alt="FuelLog Logo" style={{ height: "80px", objectFit: "contain" }} />
      </div>
      <span className="eyebrow">Welcome to FuelLog</span>
      <h2>Let's get to know you.</h2>
      <p>Please enter your name to personalize your dashboard. Your name stays locally on this device.</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        const val = new FormData(e.currentTarget).get("username").trim();
        if (val) {
          localStorage.setItem("vehiclelog-v6-username", val);
          const updatedUsers = [...new Set([...users, val])];
          localStorage.setItem("vehiclelog-v6-users", JSON.stringify(updatedUsers));
          setUsers(updatedUsers);
          setUsername(val);
        }
      }} style={{ display: "grid", gap: "12px", maxWidth: "320px", margin: "24px auto", width: "100%" }}>
        <input 
          name="username" 
          placeholder="Your name" 
          required 
          autoFocus
          style={{ height: "42px", padding: "0 14px", border: "1px solid var(--border-color, #e3dfd7)", borderRadius: "8px", background: "var(--input-bg, white)", color: "var(--text-color, inherit)", fontSize: "14px", textAlign: "center" }}
        />
        <button className="btn primary" style={{ height: "42px", justifyContent: "center" }}>Continue</button>
      </form>
      <div className="welcome-grid">
        <div><Fuel size={18}/><b>Track every refill</b><small>Understand mileage and fuel costs.</small></div>
        <div><Wrench size={18}/><b>Stay ahead of service</b><small>Keep maintenance history tidy.</small></div>
        <div><ShieldCheck size={18}/><b>Private by design</b><small>Local storage, no account required.</small></div>
      </div>
    </section>;
  }

  return <section className="welcome">
    <div className="welcome-mark" style={{ background: "transparent", boxShadow: "none", width: "auto", height: "auto", display: "grid", placeItems: "center" }}>
      <img src="./logo.png" alt="FuelLog Logo" style={{ height: "80px", objectFit: "contain" }} />
    </div>
    <span className="eyebrow">Welcome to FuelLog</span>
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

  const todayStr = toLocalDateStr();
  const todaySchedules = useMemo(() => {
    return records.schedules.filter(s => isScheduleActiveOnDate(s, todayStr));
  }, [records.schedules, todayStr]);

  return <>
    <section className="hero">
      <div><span className="eyebrow">Your vehicle at a glance</span><h2>{vehicle.name}</h2><p>Current meter <b>{stats.currentOdometer.toLocaleString("en-IN")} km</b>. {stats.fuelCount ? "Mileage is calculated from your saved refills." : "Add your first refill to start building useful insights."}</p></div>
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

function vehicleCards(vehicles, allRecords, allFuelEntries) {
  return vehicles.map((v) => {
    const name = v.name;
    const vehicleTrips = allRecords.trips.filter(r => r.vehicle === name);
    const vehicleFuel = allFuelEntries.filter(r => r.vehicle === name);
    const initial = Number(v.initialOdometer || 0);
    const tripDistance = vehicleTrips.reduce((sum, trip) => sum + Number(trip.distance || 0), 0);
    const fuelDistance = Math.max(0, Number(vehicleFuel[vehicleFuel.length - 1]?.odometer || initial) - initial);
    const distance = Math.max(fuelDistance, tripDistance);
    const currentOdometer = initial + distance;
    return {
      record: v,
      fields: [
        v.name || "Vehicle",
        v.registration || "Registration pending",
        `${currentOdometer.toLocaleString("en-IN")} km`,
        `${v.fuel || "Fuel"} - ${v.city || "City pending"}`,
      ],
    };
  });
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

function SettingsPage({ allRecords, vehicles, setVehicles, setVehicle, onRefresh, vehicle, enableAi, setEnableAi, enablePriceFetch, setEnablePriceFetch, geminiApiKey, setGeminiApiKey, fuelApiKey, setFuelApiKey, stats, username, setUsername }) {
  const totalLogs = allRecords.fuel.length + allRecords.trips.length + allRecords.maintenance.length + allRecords.expenses.length + allRecords.schedules.length;
  const configured = Boolean(import.meta.env.VITE_FUEL_API_BASE_URL && (fuelApiKey || import.meta.env.VITE_FUEL_API_KEY));
  const rows = [
    ["Fuel price API", configured ? "Configured and active" : "Add API base URL and key in settings or .env", configured],
    ["Local storage", "Records stay in this browser on this device", true],
    ["Vehicle profile", vehicle ? `${vehicle.name} - ${vehicle.registration}` : "No vehicle profile", Boolean(vehicle)],
    ["Saved logs", `${totalLogs} local record${totalLogs === 1 ? "" : "s"}`, totalLogs > 0],
  ];

  const [tempTankCapacity, setTempTankCapacity] = useState(vehicle?.tankCapacity || 45);
  const [tempCurrentFuelLevel, setTempCurrentFuelLevel] = useState(vehicle?.currentFuelLevel || 20);

  useEffect(() => {
    setTempTankCapacity(vehicle?.tankCapacity || 45);
    setTempCurrentFuelLevel(vehicle?.currentFuelLevel || 20);
  }, [vehicle]);

  const handleUpdateFuel = () => {
    if (!vehicle) return;
    const capacity = Number(tempTankCapacity || 50);
    const fuelLvl = Number(tempCurrentFuelLevel || 25);
    if (fuelLvl > capacity) {
      alert("Current fuel level cannot exceed tank capacity!");
      return;
    }

    const updatedVehicle = {
      ...vehicle,
      tankCapacity: capacity,
      currentFuelLevel: fuelLvl,
      currentFuelOdometer: Number(stats?.currentOdometer || vehicle.initialOdometer || 0)
    };

    const list = vehicles.map(v => v.name === vehicle.name ? updatedVehicle : v);
    localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(list));
    localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(updatedVehicle));
    localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(updatedVehicle));
    setVehicles(list);
    setVehicle(updatedVehicle);
    alert("Fuel configuration updated successfully!");
  };

  const [exportVehicle, setExportVehicle] = useState("all");
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const isFullBackup = exportVehicle === "all";
    const exportedVehicles = isFullBackup 
      ? vehicles 
      : vehicles.filter(v => v.name === exportVehicle);
      
    const exportedLogs = {
      fuel: isFullBackup ? allRecords.fuel : allRecords.fuel.filter(r => r.vehicle === exportVehicle),
      trips: isFullBackup ? allRecords.trips : allRecords.trips.filter(r => r.vehicle === exportVehicle),
      maintenance: isFullBackup ? allRecords.maintenance : allRecords.maintenance.filter(r => r.vehicle === exportVehicle),
      expenses: isFullBackup ? allRecords.expenses : allRecords.expenses.filter(r => r.vehicle === exportVehicle),
      schedules: isFullBackup ? allRecords.schedules : allRecords.schedules.filter(r => r.vehicle === exportVehicle),
    };
    
    const data = {
      version: "1.0",
      exportType: isFullBackup ? "all" : "vehicle-specific",
      vehicleName: isFullBackup ? null : exportVehicle,
      vehicles: exportedVehicles,
      logs: exportedLogs
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = url;
    const filename = isFullBackup 
      ? `vehiclelog_backup_${toLocalDateStr()}.json`
      : `vehiclelog_${exportVehicle.replace(/\s+/g, '_')}_backup_${toLocalDateStr()}.json`;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.vehicles || !data.logs) {
          alert("Invalid backup file format. Missing vehicles or logs.");
          return;
        }
        
        // 1. Merge vehicles
        const existingVehicles = [...vehicles];
        let importedVehiclesCount = 0;
        const mergedVehicles = [...existingVehicles];
        
        for (const importedVehicle of data.vehicles) {
          const exists = existingVehicles.some(v => v.name.toLowerCase() === importedVehicle.name.toLowerCase());
          if (!exists) {
            mergedVehicles.push(importedVehicle);
            importedVehiclesCount++;
          }
        }
        
        if (importedVehiclesCount > 0) {
          localStorage.setItem("vehiclelog-v6-vehicles", JSON.stringify(mergedVehicles));
          setVehicles(mergedVehicles);
          if (!vehicle && mergedVehicles.length > 0) {
            localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(mergedVehicles[0]));
            localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(mergedVehicles[0]));
            setVehicle(mergedVehicles[0]);
          }
        }
        
        // 2. Merge logs
        let importedLogsCount = 0;
        const tables = ["fuel", "trips", "maintenance", "expenses", "schedules"];
        
        const existingDbLogs = {};
        for (const table of tables) {
          existingDbLogs[table] = await getEntries(table);
        }
        
        for (const table of tables) {
          const importedList = data.logs[table] || [];
          const existingList = existingDbLogs[table] || [];
          
          for (const record of importedList) {
            let isDup = false;
            if (table === "fuel") {
              isDup = existingList.some(e => 
                String(e.date) === String(record.date) && 
                String(e.vehicle).toLowerCase() === String(record.vehicle).toLowerCase() && 
                String(e.amount) === String(record.amount) &&
                String(e.odometer) === String(record.odometer)
              );
            } else if (table === "trips") {
              isDup = existingList.some(e => 
                String(e.date) === String(record.date) && 
                String(e.vehicle).toLowerCase() === String(record.vehicle).toLowerCase() && 
                String(e.distance) === String(record.distance) &&
                String(e.destination).toLowerCase() === String(record.destination).toLowerCase()
              );
            } else if (table === "maintenance") {
              isDup = existingList.some(e => 
                String(e.date) === String(record.date) && 
                String(e.vehicle).toLowerCase() === String(record.vehicle).toLowerCase() && 
                String(e.serviceType).toLowerCase() === String(record.serviceType).toLowerCase() &&
                String(e.cost) === String(record.cost)
              );
            } else if (table === "expenses") {
              isDup = existingList.some(e => 
                String(e.date) === String(record.date) && 
                String(e.vehicle).toLowerCase() === String(record.vehicle).toLowerCase() && 
                String(e.category).toLowerCase() === String(record.category).toLowerCase() &&
                String(e.amount) === String(record.amount)
              );
            } else if (table === "schedules") {
              isDup = existingList.some(e => 
                String(e.name).toLowerCase() === String(record.name).toLowerCase() && 
                String(e.vehicle).toLowerCase() === String(record.vehicle).toLowerCase() && 
                String(e.repeat).toLowerCase() === String(record.repeat).toLowerCase() &&
                String(e.startDate) === String(record.startDate)
              );
            }
            
            if (!isDup) {
              const { id, ...recordWithoutId } = record;
              await db.table(table).add({ 
                ...recordWithoutId, 
                createdAt: recordWithoutId.createdAt || new Date().toISOString() 
              });
              importedLogsCount++;
            }
          }
        }
        
        onRefresh();
        alert(`Import completed successfully!\nMerged ${importedVehiclesCount} new vehicle profile(s) and ${importedLogsCount} new log record(s).`);
      } catch (err) {
        console.error(err);
        alert("Failed to parse or merge backup data. Make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset file input
  };

  return <div className="settings-grid">
    <article className="setting-card"><div><ShieldCheck size={18}/><span className="eyebrow">Privacy</span><h3>Local-first data</h3></div><p>Your vehicle, fuel, travel, expense, and schedule logs are stored locally in this browser. The fuel API is only called when you create a fuel refill.</p></article>
    
    <article className="setting-card">
      <div>
        <Settings size={18}/>
        <span className="eyebrow">Profile</span>
        <h3>Personalization</h3>
      </div>
      <p style={{ marginBottom: "12px" }}>Update your display name used across your personal dashboard.</p>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
          Your Name
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              localStorage.setItem("vehiclelog-v6-username", e.target.value);
            }}
            style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px", color: "inherit" }}
          />
        </label>
      </div>
    </article>
    
    <article className="setting-card">
      <div>
        <Fuel size={18}/>
        <span className="eyebrow">Garage</span>
        <h3>Fuel Configuration</h3>
      </div>
      <p style={{ marginBottom: "12px" }}>Update your vehicle's physical fuel tank specifications and adjust current levels.</p>
      {vehicle ? (
        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
            Tank Capacity (Liters)
            <input
              type="number"
              min="1"
              value={tempTankCapacity}
              onChange={(e) => setTempTankCapacity(e.target.value)}
              style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px" }}
            />
          </label>
          <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
            Current Fuel in Tank (Liters)
            <input
              type="number"
              min="0"
              step="0.1"
              value={tempCurrentFuelLevel}
              onChange={(e) => setTempCurrentFuelLevel(e.target.value)}
              style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px" }}
            />
          </label>
          <button type="button" className="btn primary" onClick={handleUpdateFuel} style={{ marginTop: "8px" }}>
            Save Configuration
          </button>
        </div>
      ) : (
        <p style={{ color: "#849092", fontStyle: "italic" }}>No active vehicle profile to configure.</p>
      )}
    </article>
    
    <article className="setting-card">
      <div>
        <Settings size={18}/>
        <span className="eyebrow">Features</span>
        <h3>Feature Toggles</h3>
      </div>
      <p style={{ marginBottom: "12px" }}>Toggle modern app capabilities on or off to match your preference.</p>
      <div style={{ display: "grid", gap: "10px" }}>
        <div className="setting-row" style={{ cursor: "pointer", borderTop: 0 }} onClick={() => {
          const next = !enableAi;
          setEnableAi(next);
          localStorage.setItem("vehiclelog-v6-enable-ai", String(next));
        }}>
          <div>
            <b>AI Quick Add Parser</b>
            <small>Enable Gemini-powered description logs</small>
          </div>
          <span className={`switch ${enableAi ? "on" : ""}`}><i></i></span>
        </div>
        <div className="setting-row" style={{ cursor: "pointer" }} onClick={() => {
          const next = !enablePriceFetch;
          setEnablePriceFetch(next);
          localStorage.setItem("vehiclelog-v6-enable-price-fetch", String(next));
        }}>
          <div>
            <b>Live Fuel Price Fetch</b>
            <small>Query Indian Oil prices for your city</small>
          </div>
          <span className={`switch ${enablePriceFetch ? "on" : ""}`}><i></i></span>
        </div>
      </div>
    </article>

    <article className="setting-card">
      <div>
        <ShieldCheck size={18}/>
        <span className="eyebrow">API Keys</span>
        <h3>Developer Credentials</h3>
      </div>
      <p style={{ marginBottom: "12px" }}>Configure custom keys to bypass standard environment quotas or fallback limits.</p>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
          Gemini API Key
          <input
            type="password"
            placeholder={(import.meta.env.VITE_GEMINI_API_KEY || geminiApiKey) ? "Configured (click to override)" : "Enter Gemini API Key"}
            value={geminiApiKey}
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              localStorage.setItem("vehiclelog-v6-gemini-api-key", e.target.value);
            }}
            style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px" }}
          />
        </label>
        <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
          Fuel Price API Key
          <input
            type="password"
            placeholder={(import.meta.env.VITE_FUEL_API_KEY || fuelApiKey) ? "Configured (click to override)" : "Enter Fuel API Key"}
            value={fuelApiKey}
            onChange={(e) => {
              setFuelApiKey(e.target.value);
              localStorage.setItem("vehiclelog-v6-fuel-api-key", e.target.value);
            }}
            style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px" }}
          />
        </label>
      </div>
    </article>

    <article className="setting-card">
      <div>
        <Download size={18}/>
        <span className="eyebrow">Export</span>
        <h3>Export backup</h3>
      </div>
      <p style={{ marginBottom: "12px" }}>Download a copy of your garage profiles and logs. You can export a full backup or filter by a specific vehicle.</p>
      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679", display: "grid", gap: "4px" }}>
          Vehicle Filter
          <CustomSelect
            name="exportVehicle"
            value={exportVehicle}
            onChange={setExportVehicle}
            options={[
              { value: "all", label: "All Vehicles (Full Backup)" },
              ...vehicles.map(v => ({ value: v.name, label: v.name }))
            ]}
          />
        </label>
        <button type="button" className="btn primary" onClick={handleExport} style={{ marginTop: "8px" }}>
          <Download size={16}/> Export Backup (JSON)
        </button>
      </div>
    </article>

    <article className="setting-card">
      <div>
        <Upload size={18}/>
        <span className="eyebrow">Import</span>
        <h3>Import backup</h3>
      </div>
      <p style={{ marginBottom: "16px" }}>Upload a previously exported JSON backup file. This will merge new vehicles and logs while safely deduplicating existing entries.</p>
      <div style={{ display: "grid", gap: "8px" }}>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFileChange}
          style={{ display: "none" }}
        />
        <button type="button" className="btn ghost" onClick={handleImportClick} style={{ border: "1px dashed #dedad3", minHeight: "80px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Upload size={22} style={{ color: "#e66b2e" }}/>
          <span style={{ fontSize: "11px", fontWeight: "700" }}>Click to select JSON Backup File</span>
        </button>
      </div>
    </article>

    <article className="setting-card wide">
      <span className="eyebrow">System status</span>
      {rows.map(([label, text, on]) => <div className="setting-row" key={label}><div><b>{label}</b><small>{text}</small></div><span className={`switch ${on ? "on" : ""}`}><i></i></span></div>)}
    </article>
  </div>;
}

function LogDetailModal({ active, record, close, onSave, onDelete, activeVehicle, onSetVehicleActive }) {
  const table = tableForPage(active);
  const [selectedDays, setSelectedDays] = useState(() => {
    if (record.weekdays) {
      return record.weekdays.split(",").map(d => d.trim()).filter(Boolean);
    }
    return [];
  });
  const [repeatVal, setRepeatVal] = useState(record.repeat || "Weekly");

  const editableKeys = Object.keys(record).filter((key) => !["id", "createdAt", "updatedAt", "activity", "vehicle", "endDate"].includes(key));
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
          <CustomSelect name={key} value={repeatVal} onChange={setRepeatVal} options={["Daily", "Weekly", "Monthly", "Yearly"]} />
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

    if (key === "weekdays") {
      if (repeatVal === "Daily") {
        return <input type="hidden" key={key} name="weekdays" value="" />;
      }
      const weekdaysList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return (
        <div key={key} style={{ display: "grid", gap: "6px", margin: "8px 0" }}>
          <label style={{ fontSize: "10px", fontWeight: "700", color: "#687679" }}>Active Days</label>
          <div className="weekday-picker" aria-label="Choose weekdays">
            {weekdaysList.map((day) => (
              <button
                key={day}
                type="button"
                className={selectedDays.includes(day) ? "active" : ""}
                onClick={() => {
                  setSelectedDays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                  );
                }}
              >
                {day}
              </button>
            ))}
          </div>
          <input type="hidden" name="weekdays" value={selectedDays.join(",")} />
        </div>
      );
    }

    if (key === "completionTime") {
      return (
        <label key={key}>
          {labelName}
          <input name={key} type="time" defaultValue={defaultValue || "18:00"} onClick={(e) => e.target.showPicker()} />
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
        <form onSubmit={(event) => { event.preventDefault(); onSave(table, active === "Vehicles" ? record.name : record.id, Object.fromEntries(new FormData(event.currentTarget))); close(); }}>
          {editableKeys.map((key) => renderFieldInput(key))}
          {active === "Trips" && <small className="field-help">Changing trip distance updates live odometer, driven distance, and mileage on the dashboard.</small>}
          <footer>
            <button type="button" className="btn danger" onClick={() => onDelete(table, active === "Vehicles" ? record.name : record.id)}><Trash2 size={16}/>{deleteLabel}</button>
            {active === "Vehicles" && onSetVehicleActive && (
              record.name === activeVehicle?.name ? (
                <button type="button" className="btn ghost" disabled style={{ opacity: 0.65, cursor: "not-allowed" }}>
                  Active vehicle
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn primary" 
                  onClick={() => onSetVehicleActive(record)}
                  style={{ background: "#3c8174", borderColor: "#3c8174", boxShadow: "none" }}
                >
                  <CheckCircle2 size={16}/>
                  Set as Active
                </button>
              )
            )}
            <button type="button" className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn primary"><CheckCircle2 size={17}/>Update log</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function SecondaryPage({ active, setModal, records, onOpenRecord, vehicle, vehicles, setVehicles, setVehicle, allRecords, allFuelEntries, stats, skippedSchedules, onOpenScheduleDetails, onRefresh, enableAi, setEnableAi, enablePriceFetch, setEnablePriceFetch, geminiApiKey, setGeminiApiKey, fuelApiKey, setFuelApiKey, username, setUsername, users = [], setUsers = () => {}, setVehicleModal = () => {} }) {
  const [title, description] = pages[active] || ["Settings", "Tune the experience to match your vehicle life."];
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(`vehiclelog-v6-viewmode-${active}`) || "list";
  });
  const [sortBy, setSortBy] = useState("time");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filter States
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempRange, setTempRange] = useState("all");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");

  const [appliedRange, setAppliedRange] = useState("all");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [appliedMin, setAppliedMin] = useState("");
  const [appliedMax, setAppliedMax] = useState("");

  const filterRef = useRef(null);
  const [driverModalOpen, setDriverModalOpen] = useState(false);

  const handleReset = () => {
    setTempRange("all");
    setTempStart("");
    setTempEnd("");
    setTempMin("");
    setTempMax("");
    setAppliedRange("all");
    setAppliedStart("");
    setAppliedEnd("");
    setAppliedMin("");
    setAppliedMax("");
    setFilterOpen(false);
  };

  useEffect(() => {
    setViewMode(localStorage.getItem(`vehiclelog-v6-viewmode-${active}`) || "list");
    setSortBy("time");
    setSortOrder("desc");
    handleReset();
  }, [active]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem(`vehiclelog-v6-viewmode-${active}`, mode);
  };

  const handleApply = () => {
    setAppliedRange(tempRange);
    setAppliedStart(tempStart);
    setAppliedEnd(tempEnd);
    setAppliedMin(tempMin);
    setAppliedMax(tempMax);
    setFilterOpen(false);
  };

  const isFilterApplied = appliedRange !== "all" || appliedMin !== "" || appliedMax !== "";

  const filteredRecords = useMemo(() => {
    if (!["Fuel log", "Maintenance", "Trips", "Expenses"].includes(active)) {
      return records;
    }

    let list = active === "Fuel log" ? (records.fuel || []) :
               active === "Maintenance" ? (records.maintenance || []) :
               active === "Trips" ? (records.trips || []) :
               active === "Expenses" ? (records.expenses || []) : [];

    // 1. Filter by Date range
    const now = new Date();
    
    const getTodayBounds = () => {
      const todayStr = toLocalDateStr();
      return [todayStr, todayStr];
    };
    
    const getYesterdayBounds = () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterday);
      return [yesterdayStr, yesterdayStr];
    };

    const getThisMonthBounds = () => {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      return [`${y}-${m}-01`, `${y}-${m}-${lastDay}`];
    };

    const getLastMonthBounds = () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      return [`${y}-${m}-01`, `${y}-${m}-${lastDay}`];
    };

    let startBound = "";
    let endBound = "";

    if (appliedRange === "today") {
      [startBound, endBound] = getTodayBounds();
    } else if (appliedRange === "yesterday") {
      [startBound, endBound] = getYesterdayBounds();
    } else if (appliedRange === "this-month") {
      [startBound, endBound] = getThisMonthBounds();
    } else if (appliedRange === "last-month") {
      [startBound, endBound] = getLastMonthBounds();
    } else if (appliedRange === "custom") {
      startBound = appliedStart;
      endBound = appliedEnd;
    }

    if (startBound || endBound) {
      list = list.filter((r) => {
        if (!r.date) return false;
        if (startBound && r.date < startBound) return false;
        if (endBound && r.date > endBound) return false;
        return true;
      });
    }

    // 2. Filter by Price/Value range
    if (appliedMin !== "" || appliedMax !== "") {
      const min = appliedMin !== "" ? Number(appliedMin) : -Infinity;
      const max = appliedMax !== "" ? Number(appliedMax) : Infinity;
      
      list = list.filter((r) => {
        let val = 0;
        if (active === "Fuel log") val = Number(r.amount || 0);
        else if (active === "Maintenance") val = Number(r.cost || 0);
        else if (active === "Trips") val = Number(r.distance || 0);
        else if (active === "Expenses") val = Number(r.amount || 0);
        return val >= min && val <= max;
      });
    }

    return list;
  }, [records, active, appliedRange, appliedStart, appliedEnd, appliedMin, appliedMax]);

  const sortedRecords = useMemo(() => {
    if (!["Fuel log", "Maintenance", "Trips", "Expenses"].includes(active)) {
      return records;
    }

    const list = [...filteredRecords];

    list.sort((a, b) => {
      let valA, valB;

      if (sortBy === "time") {
        valA = a.date ? new Date(a.date).getTime() : 0;
        valB = b.date ? new Date(b.date).getTime() : 0;
      } else {
        if (active === "Fuel log") {
          valA = Number(a.amount || 0);
          valB = Number(b.amount || 0);
        } else if (active === "Maintenance") {
          valA = Number(a.cost || 0);
          valB = Number(b.cost || 0);
        } else if (active === "Trips") {
          valA = Number(a.distance || 0);
          valB = Number(b.distance || 0);
        } else if (active === "Expenses") {
          valA = Number(a.amount || 0);
          valB = Number(b.amount || 0);
        } else {
          valA = 0;
          valB = 0;
        }
      }

      if (sortOrder === "asc") {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    return {
      ...records,
      fuel: active === "Fuel log" ? list : records.fuel,
      maintenance: active === "Maintenance" ? list : records.maintenance,
      trips: active === "Trips" ? list : records.trips,
      expenses: active === "Expenses" ? list : records.expenses,
    };
  }, [filteredRecords, active, sortBy, sortOrder]);

  const cards = active === "Vehicles" ? vehicleCards(vehicles, allRecords, allFuelEntries) : recordCards(active, sortedRecords);
  const schedule = active === "Schedule";
  const isSettings = active === "Settings";
  const isVehicles = active === "Vehicles";
  const canCreate = !isSettings && !isVehicles;
  const canOpen = !isSettings;
  const [scheduleView, setScheduleView] = useState("calendar");
  const showSortAndView = ["Fuel log", "Maintenance", "Trips", "Expenses"].includes(active);

  const sortOptions = useMemo(() => {
    return [
      { value: "time-desc", label: "Newest first" },
      { value: "time-asc", label: "Oldest first" },
      { value: "price-desc", label: active === "Trips" ? "Longest distance" : "Highest amount" },
      { value: "price-asc", label: active === "Trips" ? "Shortest distance" : "Lowest amount" }
    ];
  }, [active]);

  const rangeOptions = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this-month", label: "This month" },
    { value: "last-month", label: "Last month" },
    { value: "custom", label: "Custom range" }
  ];

  return <section className="secondary-page">
    {isSettings ? <SettingsPage allRecords={allRecords} vehicles={vehicles} setVehicles={setVehicles} setVehicle={setVehicle} onRefresh={onRefresh} vehicle={vehicle} enableAi={enableAi} setEnableAi={setEnableAi} enablePriceFetch={enablePriceFetch} setEnablePriceFetch={setEnablePriceFetch} geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey} fuelApiKey={fuelApiKey} setFuelApiKey={setFuelApiKey} stats={stats} username={username} setUsername={setUsername}/> : <>
      <div className="secondary-toolbar" style={{ display: "flex", gap: "8px", padding: "17px 0", alignItems: "center" }}>
        
        {showSortAndView && (
          <>
            <div style={{ width: "160px" }}>
              <CustomSelect 
                value={`${sortBy}-${sortOrder}`} 
                onChange={(val) => {
                  const [by, order] = val.split("-");
                  setSortBy(by);
                  setSortOrder(order);
                }}
                options={sortOptions} 
              />
            </div>

            <div className="view-toggle-group">
              <button 
                type="button" 
                className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`} 
                onClick={() => handleViewModeChange("list")}
                title="List View"
                aria-label="View as list"
              >
                <List size={16} />
              </button>
              <button 
                type="button" 
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`} 
                onClick={() => handleViewModeChange("table")}
                title="Table View"
                aria-label="View as table"
              >
                <Table size={16} />
              </button>
            </div>
          </>
        )}
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          {showSortAndView && (
            <div className="filter-wrapper" ref={filterRef} style={{ position: "relative" }}>
              <button 
                type="button" 
                className={`btn ${isFilterApplied ? "primary" : "ghost"}`} 
                onClick={() => setFilterOpen(!filterOpen)}
                aria-haspopup="true"
                aria-expanded={filterOpen}
              >
                <Grid2X2 size={16}/>
                <span>{isFilterApplied ? "Filters active" : "Filters"}</span>
              </button>
              {filterOpen && (
                <div className="custom-select-options filter-popover" style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, width: "290px", padding: "14px", zIndex: 1000, display: "grid", gap: "12px", background: "#fcfbf8" }}>
                  <label style={{ display: "grid", gap: "4px", fontSize: "10px", fontWeight: "bold", color: "#687679" }}>
                    Date Period
                    <CustomSelect
                      value={tempRange}
                      onChange={setTempRange}
                      options={rangeOptions}
                    />
                  </label>
                  
                  {tempRange === "custom" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <label style={{ display: "grid", gap: "4px", fontSize: "10px", fontWeight: "bold", color: "#687679" }}>
                        Start Date
                        <CustomDatePicker
                          name="filterStart"
                          defaultValue={tempStart || toLocalDateStr()}
                          onChange={setTempStart}
                        />
                      </label>
                      <label style={{ display: "grid", gap: "4px", fontSize: "10px", fontWeight: "bold", color: "#687679" }}>
                        End Date
                        <CustomDatePicker
                          name="filterEnd"
                          defaultValue={tempEnd || toLocalDateStr()}
                          onChange={setTempEnd}
                        />
                      </label>
                    </div>
                  )}

                  <label style={{ display: "grid", gap: "4px", fontSize: "10px", fontWeight: "bold", color: "#687679" }}>
                    {active === "Trips" ? "Distance range (km)" : "Amount range (INR)"}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempMin}
                        onChange={(e) => setTempMin(e.target.value)}
                        style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px", width: "100%" }}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempMax}
                        onChange={(e) => setTempMax(e.target.value)}
                        style={{ height: "39px", padding: "0 10px", border: "1px solid #e3dfd7", borderRadius: "8px", background: "white", fontSize: "12px", width: "100%" }}
                      />
                    </div>
                  </label>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px", borderTop: "1px solid #eeeae4", paddingTop: "10px" }} className="dark-border-top">
                    <button type="button" className="btn ghost" onClick={handleReset} style={{ padding: "6px 12px", height: "auto" }}>
                      Reset
                    </button>
                    <button type="button" className="btn primary" onClick={handleApply} style={{ padding: "6px 12px", height: "auto" }}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {canCreate && (
            <button className="btn primary toolbar-add-btn" onClick={() => setModal(schedule ? "schedule" : addTypeForPage(active))}>
              <Plus size={17}/>
              <span>{schedule ? "Create schedule" : "Add new"}</span>
            </button>
          )}
        </div>
      </div>

      {isVehicles && (
        <div className="panel" style={{ padding: "20px", marginBottom: "16px", display: "grid", gap: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "bold", color: "#819495", textTransform: "uppercase", letterSpacing: "0.5px" }}>Driver Account</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              {users.map((u) => {
                const isActive = u === username;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      localStorage.setItem("vehiclelog-v6-username", u);
                      setUsername(u);
                    }}
                    className={`btn ${isActive ? "primary" : "ghost"}`}
                    style={{ padding: "6px 12px", height: "auto", fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}
                  >
                    <User size={13} />
                    <span>{u}</span>
                    {isActive && <CheckCircle2 size={13} style={{ color: "white" }} />}
                  </button>
                );
              })}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDriverModalOpen(true)}
                style={{ padding: "6px 12px", height: "auto", fontSize: "12px", borderStyle: "dashed" }}
              >
                <Plus size={13} />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eeeae4", paddingTop: "14px" }} className="dark-border-top">
            <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: "bold", color: "#819495", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Vehicle</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              {vehicles.map((v) => {
                const isActive = v.name === vehicle?.name;
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => {
                      localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(v));
                      localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(v));
                      setVehicle(v);
                    }}
                    className={`btn ${isActive ? "primary" : "ghost"}`}
                    style={{ padding: "6px 12px", height: "auto", fontSize: "12px", display: "flex", gap: "6px", alignItems: "center" }}
                  >
                    <Car size={13} />
                    <div style={{ textAlign: "left" }}>
                      <span style={{ display: "block" }}>{v.name}</span>
                      <small style={{ display: "block", fontSize: "8px", opacity: 0.8 }}>{v.registration || "No registration"}</small>
                    </div>
                    {isActive && <CheckCircle2 size={13} style={{ color: "white" }} />}
                  </button>
                );
              })}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setVehicleModal(true)}
                style={{ padding: "6px 12px", height: "auto", fontSize: "12px", borderStyle: "dashed" }}
              >
                <Plus size={13} />
                <span>Add Vehicle</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {schedule && scheduleView === "calendar" ? (
        <CalendarScheduleView
          schedules={records.schedules}
          records={records}
          skippedSchedules={skippedSchedules}
          onOpenScheduleDetails={onOpenScheduleDetails}
        />
      ) : (
        <>
          {showSortAndView && viewMode === "table" ? (
            cards.length === 0 ? (
              <div className="empty-note">
                <Sparkles size={18}/>
                <div>
                  <b>No records yet</b>
                  <p>Your records stay on this device. Add new entries and they will appear here instantly.</p>
                </div>
              </div>
            ) : (
              <div className="table-container">
                <table className="milo-table">
                  <thead>
                    {active === "Fuel log" && (
                      <tr>
                        <th>Date</th>
                        <th>Amount paid</th>
                        <th>Price</th>
                        <th>Liters</th>
                        <th>Mileage</th>
                        <th>Odometer</th>
                        <th>City</th>
                        <th>Note</th>
                      </tr>
                    )}
                    {active === "Maintenance" && (
                      <tr>
                        <th>Service type</th>
                        <th>Date</th>
                        <th>Cost</th>
                        <th>Odometer</th>
                        <th>Note</th>
                      </tr>
                    )}
                    {active === "Trips" && (
                      <tr>
                        <th>Destination</th>
                        <th>Date</th>
                        <th>Distance</th>
                        <th>Category</th>
                        <th>Note</th>
                      </tr>
                    )}
                    {active === "Expenses" && (
                      <tr>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Note</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {cards.map(({ record }) => {
                      return (
                        <tr key={record.id} onClick={() => onOpenRecord(active, record)}>
                          {active === "Fuel log" && (
                            <>
                              <td>{record.date}</td>
                              <td>₹{money(Number(record.amount || 0))}</td>
                              <td>₹{Number(record.pricePerLiter || 0).toFixed(2)}/L</td>
                              <td>{record.liters || "0.00"} L</td>
                              <td>{record.mileage || "--"} km/L</td>
                              <td>{Number(record.odometer || 0).toLocaleString("en-IN")} km</td>
                              <td>{record.fuelCity || ""}</td>
                              <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={record.note}>{record.note || ""}</td>
                            </>
                          )}
                          {active === "Maintenance" && (
                            <>
                              <td>{record.serviceType || "Service"}</td>
                              <td>{record.date}</td>
                              <td>₹{money(Number(record.cost || 0))}</td>
                              <td>{Number(record.odometer || 0).toLocaleString("en-IN")} km</td>
                              <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={record.note}>{record.note || ""}</td>
                            </>
                          )}
                          {active === "Trips" && (
                            <>
                              <td>{record.destination || "Destination"}</td>
                              <td>{record.date}</td>
                              <td>{record.distance || 0} km</td>
                              <td>{record.category || "Trip"}</td>
                              <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={record.note}>{record.note || ""}</td>
                            </>
                          )}
                          {active === "Expenses" && (
                            <>
                              <td>{record.category || "Expense"}</td>
                              <td>{record.date}</td>
                              <td>₹{money(Number(record.amount || 0))}</td>
                              <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={record.note}>{record.note || ""}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <>
              <div className="data-cards">{cards.map(({ record, fields: [a,b,c,d] }) => <article key={`${active}-${record.id || record.registration || record.name}`} role={canOpen ? "button" : "article"} tabIndex={canOpen ? "0" : undefined} aria-disabled={!canOpen} onClick={canOpen ? () => onOpenRecord(active, record) : undefined}><div className="data-icon">{active === "Schedule" ? <CalendarDays/> : active === "Vehicles" ? <Car/> : <Activity/>}</div><div><h3>{a}</h3><p>{b}</p></div><footer><span>{c}</span><span>{d}</span>{canOpen && <ArrowRight size={17}/>}</footer></article>)}</div>
              {cards.length === 0 && <div className="empty-note"><Sparkles size={18}/><div><b>{schedule ? "No schedules yet" : "No records yet"}</b><p>{schedule ? "Create a recurring trip or reminder from this page." : "Your records stay on this device. Add new entries and they will appear here instantly."}</p></div>{schedule && <button className="btn primary empty-add-btn" onClick={() => setModal("schedule")}><Plus size={16}/>Create schedule</button>}</div>}
            </>
          )}
        </>
      )}
    </>}
    {driverModalOpen && (
      <div className="modal-wrap" role="presentation" onMouseDown={() => setDriverModalOpen(false)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label="Add driver account" onMouseDown={(e) => e.stopPropagation()}>
          <header>
            <div>
              <span className="eyebrow">Driver account</span>
              <h2>Add new driver</h2>
            </div>
            <IconButton label="Close" onClick={() => setDriverModalOpen(false)}><X size={18}/></IconButton>
          </header>
          <form onSubmit={(e) => {
            e.preventDefault();
            const val = new FormData(e.currentTarget).get("driverName").trim();
            if (val) {
              const updatedUsers = [...new Set([...users, val])];
              localStorage.setItem("vehiclelog-v6-users", JSON.stringify(updatedUsers));
              localStorage.setItem("vehiclelog-v6-username", val);
              setUsers(updatedUsers);
              setUsername(val);
              setDriverModalOpen(false);
            }
          }}>
            <label>
              Driver / Account Name
              <input 
                name="driverName" 
                placeholder="Enter driver name" 
                required 
                autoFocus
                style={{ width: "100%", height: "42px", padding: "0 14px", marginTop: "4px" }}
              />
            </label>
            <small className="field-help" style={{ display: "block", marginTop: "6px" }}>Creating a new account isolates their tracked vehicles and logs on this device.</small>
            <footer>
              <button type="button" className="btn ghost" onClick={() => setDriverModalOpen(false)}>Cancel</button>
              <button className="btn primary"><Plus size={17}/>Add driver</button>
            </footer>
          </form>
        </section>
      </div>
    )}
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

  if (schedule.endDate) {
    const end = new Date(schedule.endDate);
    end.setHours(0,0,0,0);
    if (d > end) return false;
  }

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
  if (repeat === "Yearly") {
    return d.getDate() === start.getDate() && d.getMonth() === start.getMonth();
  }
  return false;
}

function ScheduleDetailsModal({ schedule, dateStr, isCompleted, isSkipped, close, onAccept, onSkip, onEdit }) {
  const isToday = dateStr === toLocalDateStr();
  const timePassed = isTimePassed(schedule.completionTime);
  const isEnded = schedule.endDate && new Date(schedule.endDate) < new Date(dateStr);
  const canAccept = isToday && timePassed && !isCompleted && !isSkipped && !isEnded;

  // Format date nicely (e.g., "Tue, 16 Jun")
  const formattedDate = new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });

  return (
    <div className="modal-wrap" role="presentation" onMouseDown={close}>
      <section 
        className="modal" 
        role="dialog" 
        aria-modal="true" 
        aria-label="Schedule Details" 
        onMouseDown={(e) => e.stopPropagation()}
        style={{ 
          textAlign: "center", 
          padding: "40px 24px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          boxSizing: "border-box"
        }}
      >

        {/* Large icon with status-dependent background */}
        <div style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: isCompleted ? "rgba(60, 129, 116, 0.12)" : isSkipped ? "rgba(230, 107, 46, 0.12)" : isEnded ? "rgba(132, 144, 146, 0.12)" : "rgba(36, 64, 71, 0.08)",
          color: isCompleted ? "#3c8174" : isSkipped ? "#e66b2e" : isEnded ? "#849092" : "#244047",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
          boxShadow: "0 8px 16px rgba(0,0,0,0.03)"
        }}>
          <CalendarDays size={32} />
        </div>

        <span className="eyebrow" style={{ display: "block", letterSpacing: "1.5px", marginBottom: "6px", fontSize: "10px", color: "#849092" }}>Scheduled Trip</span>
        <h2 style={{ fontSize: "24px", margin: "0 0 8px 0", fontWeight: "800", color: "var(--text-color, #203036)", lineHeight: "1.2" }}>{schedule.name}</h2>
        <span style={{ fontSize: "14px", color: "#849092", display: "block", marginBottom: "24px", fontWeight: "500" }}>{formattedDate}</span>

        {/* Info Box */}
        <div style={{
          background: "var(--input-bg, #f5f3ef)",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          textAlign: "left",
          fontSize: "13px",
          marginBottom: "24px",
          border: "1px solid var(--border-color, #e7e3dc)",
          width: "100%",
          maxWidth: "380px"
        }} className="theme-toggle-bg">
          <div>
            <span style={{ color: "#849092", display: "block", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Destination</span>
            <strong style={{ color: "var(--text-color, #203036)", fontSize: "14px", fontWeight: "700" }}>{schedule.destination || "Not specified"}</strong>
          </div>
          <div>
            <span style={{ color: "#849092", display: "block", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Distance</span>
            <strong style={{ color: "var(--text-color, #203036)", fontSize: "14px", fontWeight: "700" }}>{schedule.distance ? `${schedule.distance} km` : "Not specified"}</strong>
          </div>
          <div>
            <span style={{ color: "#849092", display: "block", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Target Time</span>
            <strong style={{ color: "var(--text-color, #203036)", fontSize: "14px", fontWeight: "700" }}>{schedule.completionTime || "18:00"}</strong>
          </div>
          <div>
            <span style={{ color: "#849092", display: "block", fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Repeat Mode</span>
            <strong style={{ color: "var(--text-color, #203036)", fontSize: "14px", fontWeight: "700" }}>{schedule.repeat}</strong>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ marginBottom: "32px" }}>
          <span className={`connection ${isCompleted ? "online" : isSkipped ? "offline" : isEnded ? "offline" : timePassed ? "offline" : "online"}`} style={{ display: "inline-flex", padding: "8px 16px", borderRadius: "20px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.03)" }}>
            <i></i>
            <span style={{ fontWeight: "700" }}>
              {isCompleted ? "Completed" : isSkipped ? "Skipped" : isEnded ? "Ended / Logged" : timePassed ? "Ready to Complete" : "Scheduled (Upcoming)"}
            </span>
          </span>
        </div>

        {/* Buttons Centered in a Premium Layout */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", width: "100%", maxWidth: "380px" }}>
          
          {/* SKIP TODAY BUTTON */}
          <button
            type="button"
            className="btn"
            disabled={isCompleted || isSkipped || !isToday || isEnded}
            onClick={() => { onSkip(schedule.id, dateStr); close(); }}
            style={{
              flex: 1.2,
              height: "48px",
              borderRadius: "24px",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: (isCompleted || isSkipped || !isToday || isEnded) ? "rgba(199, 72, 48, 0.02)" : "rgba(199, 72, 48, 0.08)",
              color: "#c74830",
              border: "1px solid rgba(199, 72, 48, 0.2)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              opacity: (isCompleted || isSkipped || !isToday || isEnded) ? 0.4 : 1
            }}
          >
            <Clock3 size={16} />
            <span>Skip Today</span>
          </button>

          {/* COMPLETE BUTTON */}
          <button
            type="button"
            className="btn"
            disabled={!canAccept}
            onClick={() => { onAccept(schedule); close(); }}
            title={!timePassed ? `Only available after completion time (${schedule.completionTime || "18:00"})` : ""}
            style={{
              flex: 1.5,
              height: "48px",
              borderRadius: "24px",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: !canAccept ? "rgba(60, 129, 116, 0.4)" : "#3c8174",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: !canAccept ? "none" : "0 8px 20px rgba(60, 129, 116, 0.25)",
              opacity: !canAccept ? 0.6 : 1
            }}
          >
            <CheckCircle2 size={16} />
            <span>Complete</span>
          </button>

          {/* CIRCULAR CLOSE CROSS BUTTON */}
          <button
            type="button"
            className="btn"
            onClick={close}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              padding: 0,
              display: "grid",
              placeItems: "center",
              backgroundColor: "var(--input-bg, #f5f3ef)",
              border: "1px solid var(--border-color, #e7e3dc)",
              color: "var(--text-color, #647176)",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>

        </div>

        {/* Edit button below actions */}
        <button
          type="button"
          onClick={onEdit}
          style={{
            marginTop: "16px",
            background: "none",
            border: "none",
            color: "#e66b2e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: "bold",
            padding: "8px 16px",
            borderRadius: "16px",
            backgroundColor: "rgba(230, 107, 46, 0.08)",
            transition: "all 0.2s ease"
          }}
          title="Edit trip details"
        >
          <Pencil size={14} />
          <span>Edit Details</span>
        </button>
      </section>
    </div>
  );
}

function CalendarScheduleView({ schedules, records, skippedSchedules, onOpenScheduleDetails }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const touchStartRef = useRef({ x: 0, y: 0 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
      if (diffX > 0) {
        prevMonth();
      } else {
        nextMonth();
      }
    }
  };

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

  const selectedDateStr = toLocalDateStr(selectedDate);
  const selectedSchedules = useMemo(() => {
    return schedules.filter(s => isScheduleActiveOnDate(s, selectedDateStr));
  }, [schedules, selectedDateStr]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div style={{ display: "grid", gap: "20px", marginTop: "10px" }}>
      <div 
        className="panel" 
        style={{ padding: "20px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <CustomCalendarHeaderSelect 
              value={month} 
              onChange={(val) => setCurrentDate(new Date(year, val, 1))}
              options={monthNames.map((name, idx) => ({ value: idx, label: name }))}
              style={{ fontSize: "16px" }}
            />
            <CustomCalendarHeaderSelect 
              value={year} 
              onChange={(val) => setCurrentDate(new Date(val, month, 1))}
              options={Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 15 + i).map((y) => ({ value: y, label: String(y) }))}
              style={{ fontSize: "16px" }}
            />
          </div>
        </header>

        <div className="calendar-grid-header">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <div className="calendar-grid">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} style={{ minHeight: "64px" }} />;
            
            const dateStr = toLocalDateStr(date);
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
            } else if (selectedDateStr === toLocalDateStr()) {
              statusText = timePassed ? "Done?" : "To be done";
              statusClass = timePassed ? "connection offline" : "connection online";
            }

            return (
              <div 
                key={s.id} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #efebe5", borderRadius: "8px", cursor: "pointer" }} 
                className="activity"
                onClick={() => onOpenScheduleDetails(s, selectedDateStr, isCompleted, isSkipped)}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>{s.name}</h4>
                  <small style={{ color: "#849092" }}>{s.destination} · {s.repeat} at {s.completionTime || "18:00"}</small>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className={statusClass}>
                    <i></i>
                    <span>{statusText}</span>
                  </span>
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

      {/* All Configured Schedules */}
      <div className="panel" style={{ padding: "20px" }}>
        <header className="panel-title">
          <div>
            <span className="eyebrow">All Schedules</span>
            <h3>Configured Trips</h3>
          </div>
        </header>
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {schedules.map(s => {
            const todayStr = toLocalDateStr();
            const isCompletedToday = records.trips.some(t => t.date === todayStr && t.note.includes(`Completed scheduled trip: ${s.name}`));
            const isSkippedToday = skippedSchedules[s.id]?.includes(todayStr);
            const isActiveToday = isScheduleActiveOnDate(s, todayStr);
            
            const isEnded = s.endDate && new Date(s.endDate) < new Date(todayStr);
            
            let statusText = "Inactive today";
            let statusClass = "connection offline";
            if (isEnded) {
              statusText = "Ended / Logged";
              statusClass = "connection offline";
            } else if (isCompletedToday) {
              statusText = "Completed Today";
              statusClass = "connection online";
            } else if (isSkippedToday) {
              statusText = "Skipped Today";
              statusClass = "connection offline";
            } else if (isActiveToday) {
              const timePassed = isTimePassed(s.completionTime);
              statusText = timePassed ? "Due today" : "Active today";
              statusClass = "connection online";
            }

            return (
              <div 
                key={s.id} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #efebe5", borderRadius: "8px", cursor: "pointer" }} 
                className="activity"
                onClick={() => onOpenScheduleDetails(s, todayStr, isCompletedToday, isSkippedToday)}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold" }}>{s.name}</h4>
                  <small style={{ color: "#849092" }}>{s.destination || "No destination"} {s.distance ? `(${s.distance} km)` : ""} · {s.repeat} at {s.completionTime || "18:00"}</small>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className={statusClass}>
                    <i></i>
                    <span>{statusText}</span>
                  </span>
                </div>
              </div>
            );
          })}
          {schedules.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "#849092" }} className="widget-empty">
              No scheduled trips configured yet.
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

  const [username, setUsername] = useState(() => {
    return localStorage.getItem("vehiclelog-v6-username") || "";
  });

  const [users, setUsers] = useState(() => {
    const stored = localStorage.getItem("vehiclelog-v6-users");
    const current = localStorage.getItem("vehiclelog-v6-username") || "";
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return current ? [current] : [];
  });

  const [enableAi, setEnableAi] = useState(() => {
    const val = localStorage.getItem("vehiclelog-v6-enable-ai");
    return val !== "false";
  });
  const [enablePriceFetch, setEnablePriceFetch] = useState(() => {
    const val = localStorage.getItem("vehiclelog-v6-enable-price-fetch");
    return val !== "false";
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem("vehiclelog-v6-gemini-api-key") || "";
  });
  const [fuelApiKey, setFuelApiKey] = useState(() => {
    return localStorage.getItem("vehiclelog-v6-fuel-api-key") || "";
  });

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
  const [notificationsModal, setNotificationsModal] = useState(false);

  const userVehicles = useMemo(() => {
    return vehicles.filter(v => !v.driver || v.driver === username);
  }, [vehicles, username]);

  useEffect(() => {
    if (!username) return;
    const activeDriverVehicles = vehicles.filter(v => !v.driver || v.driver === username);
    const isValid = vehicle && activeDriverVehicles.some(v => v.name === vehicle.name);
    if (!isValid) {
      const nextActive = activeDriverVehicles[0] || null;
      if (nextActive) {
        localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(nextActive));
        localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(nextActive));
      } else {
        localStorage.removeItem("vehiclelog-v6-active-vehicle");
        localStorage.removeItem("vehiclelog-v6-vehicle");
      }
      setVehicle(nextActive);
    }
  }, [username, vehicles]);

  const refreshRecords = () => {
    Promise.all([getEntries("fuel"), getEntries("trips"), getEntries("maintenance"), getEntries("expenses"), getEntries("schedules")]).then(([fuel, trips, maintenance, expenses, schedules]) => {
      setRecords({ fuel, trips, maintenance, expenses, schedules });
      setFuelEntries(fuel);
    }).catch((error) => console.error("Unable to load local records", error));
  };

  useEffect(() => { getFuelEntries().then(setFuelEntries); }, []);
  useEffect(() => {
    refreshRecords();
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

  const notifications = useMemo(() => {
    if (!vehicle) return [];
    const todayStr = toLocalDateStr();
    const todaySchedules = records.schedules.filter(s => s.vehicle === vehicle.name && isScheduleActiveOnDate(s, todayStr));
    const list = [];
    for (const s of todaySchedules) {
      const isCompleted = records.trips.some(t => t.vehicle === vehicle.name && t.date === todayStr && t.note.includes(`Completed scheduled trip: ${s.name}`));
      const isSkipped = skippedSchedules[s.id]?.includes(todayStr);
      const timePassed = isTimePassed(s.completionTime);
      if (timePassed && !isCompleted && !isSkipped) {
        list.push({
          id: `schedule-${s.id}-${todayStr}`,
          type: "schedule-pending",
          title: "Schedule Pending",
          message: `"${s.name}" completion time (${s.completionTime || "18:00"}) has passed.`,
          schedule: s,
          dateStr: todayStr,
          isCompleted,
          isSkipped
        });
      }
    }
    return list;
  }, [records.schedules, records.trips, skippedSchedules, vehicle]);

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
    if (type === "fuel") {
      setFuelEntries((currentEntries) => [...currentEntries, record]);
      if (vehicle) {
        const tankCapacity = Number(vehicle.tankCapacity || 50);
        const initialFuel = Number(vehicle.currentFuelLevel ?? (tankCapacity * 0.75));
        const initialOdo = Number(vehicle.currentFuelOdometer ?? vehicle.initialOdometer ?? 0);
        const averageMileage = Number(stats?.mileage || 15);

        const refuelOdo = Number(record.odometer || 0);
        const distance = Math.max(0, refuelOdo - initialOdo);
        const consumed = averageMileage > 0 ? distance / averageMileage : 0;
        const fuelBefore = Math.max(0, initialFuel - consumed);
        const litersFilled = Number(record.liters || 0);
        const newFuelLevel = Math.min(tankCapacity, fuelBefore + litersFilled);
        
        const updatedVehicle = {
          ...vehicle,
          currentFuelLevel: newFuelLevel,
          currentFuelOdometer: refuelOdo
        };
        updateVehicle(updatedVehicle);
      }
    }
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
    if (table === "schedules") {
      const schedule = records.schedules.find(s => Number(s.id) === Number(id));
      if (schedule) {
        const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
        const updated = { ...schedule, endDate: yesterday };
        await updateEntry("schedules", Number(id), { endDate: yesterday });
        setRecords((currentRecords) => ({
          ...currentRecords,
          schedules: currentRecords.schedules.map((s) => Number(s.id) === Number(id) ? updated : s)
        }));
        setDetail(null);
        return;
      }
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
      date: toLocalDateStr(),
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
    <Sidebar active={current} setActive={setActive} open={menu} setOpen={setMenu} vehicle={vehicle} vehicles={userVehicles} setVehicle={setVehicle} setVehicleModal={setVehicleModal} username={username} setUsername={setUsername} users={users} setUsers={setUsers}/>
    <main className="content"><Header active={current} dark={dark} setDark={setDark} setModal={setModal} setMenu={setMenu} vehicle={vehicle} notifications={notifications} setScheduleDetail={setScheduleDetail} records={activeRecords} stats={stats} username={username} /><div className="content-body">{!vehicle ? <Welcome username={username} setUsername={setUsername} users={users} setUsers={setUsers} addVehicle={() => setVehicleModal(true)}/> : current === "Overview" ? <Overview setModal={setModal} activities={allActivities} vehicle={vehicle} stats={stats} records={activeRecords} timePeriod={timePeriod} setTimePeriod={setTimePeriod} costPeriod={costPeriod} setCostPeriod={setCostPeriod} onOpenScheduleDetails={(schedule, dateStr, isCompleted, isSkipped) => setScheduleDetail({ schedule, dateStr, isCompleted, isSkipped })} skippedSchedules={skippedSchedules} onViewAllActivities={() => setAllActivitiesModal(true)} chartData={chartData} spendTrend={spendTrend} litersTrend={litersTrend} distanceTrend={distanceTrend} /> : <SecondaryPage active={current} setModal={setModal} records={activeRecords} vehicle={vehicle} vehicles={userVehicles} setVehicles={setVehicles} setVehicle={setVehicle} allRecords={records} allFuelEntries={fuelEntries} stats={stats} skippedSchedules={skippedSchedules} onOpenScheduleDetails={(schedule, dateStr, isCompleted, isSkipped) => setScheduleDetail({ schedule, dateStr, isCompleted, isSkipped })} onOpenRecord={(page, record) => setDetail({ page, record })} onRefresh={refreshRecords} enableAi={enableAi} setEnableAi={setEnableAi} enablePriceFetch={enablePriceFetch} setEnablePriceFetch={setEnablePriceFetch} geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey} fuelApiKey={fuelApiKey} setFuelApiKey={setFuelApiKey} username={username} setUsername={setUsername} users={users} setUsers={setUsers} setVehicleModal={setVehicleModal} />}</div></main>
    {modal && <Modal close={() => setModal(false)} setActivities={() => {}} vehicle={vehicle} fuelEntries={activeFuelEntries} onRecordSaved={addRecord} onVehicleUpdate={updateVehicle} initialType={modal === true ? null : modal} onScheduleSaved={addSchedule} enableAi={enableAi} enablePriceFetch={enablePriceFetch} stats={stats} />}
    {detail && <LogDetailModal active={detail.page} record={detail.record} close={() => setDetail(null)} onSave={saveRecordUpdate} onDelete={deleteRecord} activeVehicle={vehicle} onSetVehicleActive={(v) => {
      localStorage.setItem("vehiclelog-v6-active-vehicle", JSON.stringify(v));
      localStorage.setItem("vehiclelog-v6-vehicle", JSON.stringify(v));
      setVehicle(v);
      setDetail(null);
    }}/>}
    {vehicleModal && <VehicleModal close={() => setVehicleModal(false)} addVehicle={addVehicle} username={username}/>}
    {scheduleDetail && <ScheduleDetailsModal schedule={scheduleDetail.schedule} dateStr={scheduleDetail.dateStr} isCompleted={scheduleDetail.isCompleted} isSkipped={scheduleDetail.isSkipped} close={() => setScheduleDetail(null)} onAccept={handleLogTripFromSchedule} onSkip={handleSkipSchedule} onEdit={() => { setDetail({ page: "Schedule", record: scheduleDetail.schedule }); setScheduleDetail(null); }} />}

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

    {vehicle && (
      <button 
        className="floating-add" 
        aria-label="Quick add record" 
        onClick={() => {
          const typeMap = {
            "Fuel log": "fuel",
            "Trips": "trips",
            "Maintenance": "service",
            "Expenses": "expenses",
            "Schedule": "schedule"
          };
          setModal(typeMap[active] || true);
        }}
      >
        <Plus size={22}/>
      </button>
    )}

    {/* Floating Mobile Bottom Navigation Bar */}
    {!menu && (
      <nav className="mobile-bottom-nav">
        {["Overview", "Fuel log", "Schedule", "Settings", "Vehicles"].indexOf(active) !== -1 && (
          <div 
            className="mobile-bottom-nav-highlighter" 
            style={{ 
              transform: `translateX(${["Overview", "Fuel log", "Schedule", "Settings", "Vehicles"].indexOf(active) * 100}%)` 
            }}
          >
            <div className="mobile-highlighter-inner" />
          </div>
        )}
        <button 
          className={`mobile-nav-item ${active === "Overview" ? "active" : ""}`}
          onClick={() => setActive("Overview")}
          aria-label="Home"
        >
          <LayoutDashboard size={22} />
        </button>
        <button 
          className={`mobile-nav-item ${active === "Fuel log" ? "active" : ""}`}
          onClick={() => setActive("Fuel log")}
          aria-label="Fuel log"
        >
          <Fuel size={22} />
        </button>
        <button 
          className={`mobile-nav-item ${active === "Schedule" ? "active" : ""}`}
          onClick={() => setActive("Schedule")}
          aria-label="Schedule"
        >
          <CalendarDays size={22} />
        </button>
        <button 
          className={`mobile-nav-item ${active === "Settings" ? "active" : ""}`}
          onClick={() => setActive("Settings")}
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>
        <button 
          className={`mobile-nav-item ${active === "Vehicles" ? "active" : ""}`}
          onClick={() => setActive("Vehicles")}
          aria-label="Profile"
        >
          <User size={22} />
        </button>
      </nav>
    )}
  </div>;
}
