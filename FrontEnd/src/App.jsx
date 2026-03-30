import { useState, useMemo, useCallback, useEffect } from "react";
import {
  LayoutDashboard, Wallet, CreditCard, TrendingDown, PiggyBank,
  CalendarDays, BarChart3, Settings, Plus, ArrowUpRight, ArrowDownRight,
  DollarSign, Target, AlertTriangle, ChevronRight, X, Check,
  Edit3, Trash2, Search, Bell, Menu, Zap, Shield, TrendingUp,
  Receipt, Building2, Banknote, CircleDollarSign,
  Star, RefreshCw, LogOut, LogIn, UserPlus, Users, Tag,
  MessageSquare, Sparkles, Send, Bot, Mic, ChevronDown as ChevronDownIcon,
  Calculator, TrendingUp as TrendingUpIcon, Table, Download,
  Moon, Sun,
  ToggleLeft, ToggleRight, Hash, Palette, ArrowLeftRight, CreditCard as CardIcon
} from "lucide-react";
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  auth, dashboard, accounts as accountsApi, creditCards as ccApi,
  debtsApi, incomesApi, expensesApi, savingsApi, budgetsApi,
  adminUsers, categoriesApi, creditLinesApi, aiApi
} from "./api.js";

const DOP = n => new Intl.NumberFormat("es-DO",{style:"currency",currency:"DOP",minimumFractionDigits:2}).format(n||0);
const SHORT = n => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(0)}K`:`${n}`;
const TODAY = new Date();
const CDAY = TODAY.getDate();
const CUR_MONTH = TODAY.getMonth()+1;
const CUR_YEAR = TODAY.getFullYear();

const CATS = {
  housing:       {name:"Vivienda",        icon:"🏠", color:"#0D9488"},
  food:          {name:"Alimentación",    icon:"🍽️", color:"#F59E0B"},
  transport:     {name:"Transporte",      icon:"🚗", color:"#6366F1"},
  utilities:     {name:"Servicios",       icon:"💡", color:"#EC4899"},
  health:        {name:"Salud",           icon:"🏥", color:"#EF4444"},
  education:     {name:"Educación",       icon:"📚", color:"#8B5CF6"},
  entertainment: {name:"Entretenimiento", icon:"🎬", color:"#F97316"},
  personal:      {name:"Personal",        icon:"👤", color:"#14B8A6"},
  other:         {name:"Otros",           icon:"📌", color:"#64748B"},
};
const IT  = {salary:"Salario",freelance:"Freelance",bonus:"Bono",investment:"Inversión",other:"Otro"};
const ET  = {fixed:"Fijo",variable:"Variable",discretionary:"Discrecional"};
const PM  = {bank:"🏦 Banco",credit:"💳 Tarjeta",cash:"💵 Efectivo"};
const DT  = {personal:"Personal",vehicle:"Vehículo",mortgage:"Hipoteca",education:"Educativo",other:"Otro"};

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({msg, type, onClose}) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = {success:"bg-emerald-600", error:"bg-red-600", info:"bg-blue-600"};
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl ${bg[type]||bg.info}`}>
      {type==="success" ? <Check size={16}/> : <X size={16}/>}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14}/></button>
    </div>
  );
};

// ── Base UI ────────────────────────────────────────────────────────────────
const Card = ({children, className="", onClick}) => (
  <div onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${onClick?"cursor-pointer hover:shadow-md transition-all":""} ${className}`}>
    {children}
  </div>
);

const StatCard = ({icon:I, label, value, sub, trend, trendUp, color="#0D9488"}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between mb-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{backgroundColor:color+"15"}}>
        <I size={18} style={{color}}/>
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${trendUp?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>
          {trendUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{trend}
        </span>
      )}
    </div>
    <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
    <p className="font-bold text-gray-900 text-lg">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </Card>
);

const PBar = ({value, max, color="#0D9488", height=8, showLabel, label}) => {
  const p = max>0 ? Math.min((value/max)*100,100) : 0;
  return (
    <div>
      {(showLabel||label) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span><span>{p.toFixed(0)}%</span>
        </div>
      )}
      <div className="rounded-full overflow-hidden" style={{height, backgroundColor:color+"20"}}>
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${p}%`,backgroundColor:color}}/>
      </div>
    </div>
  );
};

const Badge = ({children, color="gray"}) => {
  const c = {
    gray:"bg-gray-100 text-gray-600", green:"bg-emerald-50 text-emerald-700",
    red:"bg-red-50 text-red-600", blue:"bg-blue-50 text-blue-700",
    yellow:"bg-amber-50 text-amber-700", purple:"bg-purple-50 text-purple-700",
    teal:"bg-teal-50 text-teal-700"
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>;
};

const Modal = ({open, onClose, title, children, wide}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide?"max-w-2xl":"max-w-lg"} max-h-[90vh] overflow-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={18}/>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const F = ({label, type="text", value, onChange, placeholder, prefix, options, step, disabled}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {options ? (
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white disabled:opacity-50">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>}
        <input
          type={type} value={value}
          onChange={e => onChange(type==="number" ? (e.target.value===""?"":parseFloat(e.target.value)) : e.target.value)}
          placeholder={placeholder} step={step} disabled={disabled}
          className={`w-full ${prefix?"pl-10":"px-3"} py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50`}
        />
      </div>
    )}
  </div>
);

const Btn = ({children, onClick, variant="primary", size="md", icon:I, full, disabled, loading}) => {
  const v = {
    primary:"bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
    secondary:"bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger:"bg-red-50 text-red-600 hover:bg-red-100",
    ghost:"text-gray-500 hover:bg-gray-100",
    outline:"border border-gray-200 text-gray-700 hover:bg-gray-50"
  };
  const s = {sm:"px-3 py-1.5 text-xs", md:"px-4 py-2.5 text-sm", lg:"px-6 py-3 text-base"};
  return (
    <button onClick={onClick} disabled={disabled||loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all ${v[variant]} ${s[size]} ${full?"w-full":""} ${(disabled||loading)?"opacity-50 cursor-not-allowed":""}`}>
      {loading ? <RefreshCw size={size==="sm"?12:15} className="animate-spin"/> : (I && <I size={size==="sm"?14:16}/>)}
      {children}
    </button>
  );
};

const Confirm = ({open, onClose, onConfirm, message}) => (
  <Modal open={open} onClose={onClose} title="Confirmar">
    <p className="text-sm text-gray-600 mb-4">{message}</p>
    <div className="flex justify-end gap-2">
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn variant="danger" onClick={() => { onConfirm(); onClose(); }}>Eliminar</Btn>
    </div>
  </Modal>
);

const Spinner = ({text="Cargando..."}) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <RefreshCw size={28} className="animate-spin mb-3 text-teal-500"/>
    <p className="text-sm">{text}</p>
  </div>
);

// ── Auth Screen ────────────────────────────────────────────────────────────
const AuthScreen = ({onLogin}) => {
  const [mode, setMode] = useState("login");
  const [fm, setFm] = useState({email:"", password:"", name:""});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const res = mode==="login"
        ? await auth.login({email:fm.email, password:fm.password})
        : await auth.register({email:fm.email, password:fm.password, name:fm.name});
      auth.setToken(res.token);
      onLogin(res.user);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <DollarSign size={32} className="text-white"/>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MoneyHub</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión financiera personal</p>
        </div>
        <Card className="p-8">
          {/* <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
            {[["login","Iniciar sesión"],["register","Crear cuenta"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); setErr(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode===k?"bg-white text-teal-700 shadow-sm":"text-gray-500"}`}>
                {l}
              </button>
            ))}
          </div> */}
          <div className="space-y-4">
            {mode==="register" && <F label="Nombre completo" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Juan Pérez"/>}
            <F label="Correo electrónico" type="email" value={fm.email} onChange={v=>setFm({...fm,email:v})} placeholder="correo@ejemplo.com"/>
            <F label="Contraseña" type="password" value={fm.password} onChange={v=>setFm({...fm,password:v})} placeholder="Mínimo 6 caracteres"/>
            {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
            <Btn full icon={mode==="login"?LogIn:UserPlus} onClick={submit} loading={loading} size="lg">
              {mode==="login" ? "Iniciar sesión" : "Crear cuenta"}
            </Btn>
          </div>
          {/* <p className="text-xs text-center text-gray-400 mt-4">
            Demo: <span className="font-mono text-teal-600">demo@MoneyHub.com</span> / <span className="font-mono text-teal-600">Demo1234!</span>
          </p> */}
        </Card>
      </div>
    </div>
  );
};

// ── Resource Hook ──────────────────────────────────────────────────────────
const useResource = (apiFn, deps=[]) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiFn()); setError(null); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, deps);
  useEffect(() => { load(); }, [load]);
  return {data, setData, loading, error, reload:load};
};

// ── Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = ({toast}) => {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [exps, setExps]     = useState([]);
  const [dts,  setDts]      = useState([]);
  const [cds,  setCds]      = useState([]);
  const [savs, setSavs]     = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s,e,d,c,sv] = await Promise.all([
        dashboard.stats(), expensesApi.list(), debtsApi.list(), ccApi.list(), savingsApi.list()
      ]);
      setStats(s); setExps(e); setDts(d); setCds(c); setSavs(sv);
    } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner text="Cargando dashboard..."/>;
  if (!stats)  return null;

  const {totalIncome:tI, totalExpenses:tE, totalBalance:tB, totalDebt:tD, totalSaved:tS, healthScore:hs, q1Exp, q2Exp, q1Inc=0, q2Inc=0, monthlyHistory=[]} = stats;
  const available = tI - tE;
  const nextPay = CDAY<=15 ? 15 : 30;
  const daysLeft = Math.max(0, nextPay-CDAY);

  const expByCat = Object.entries(CATS).map(([k,c]) => ({
    name:c.name, color:c.color, icon:c.icon,
    value: exps.filter(e=>e.category===k).reduce((s,e)=>s+parseFloat(e.amount),0)
  })).filter(e=>e.value>0).sort((a,b)=>b.value-a.value);

  const allDebts = [
    ...dts.map(d=>({name:d.name, bal:parseFloat(d.balance), rate:parseFloat(d.annualRate), card:false})),
    ...cds.map(c=>({name:c.name, bal:parseFloat(c.balance), rate:parseFloat(c.annualRate), card:true}))
  ].sort((a,b)=>b.rate-a.rate);

  const mh = [...monthlyHistory, {month:"Mar", income:tI, expenses:tE}];

  const reminders = [
    ...cds.map(c=>({id:`cc${c.id}`, date:c.payDate, title:`Pago ${c.name}`,  type:"cc",   amount:parseFloat(c.minPayment)})),
    ...dts.map(d=>({id:`d${d.id}`,  date:d.payDate, title:`Cuota ${d.name}`, type:"debt", amount:parseFloat(d.payment)})),
  ].filter(x=>x.date>=CDAY).sort((a,b)=>a.date-b.date).slice(0,6);

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white !border-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <p className="text-teal-100 text-sm font-medium mb-1">
              Salud Financiera — {TODAY.toLocaleDateString("es-DO",{month:"long",year:"numeric"})}
            </p>
            <h2 className="text-2xl font-bold mb-2">
              {hs>=70?"¡Buen camino!":hs>=40?"Puedes mejorar":"Atención necesaria"} · Puntuación: {hs}/100
            </h2>
            <p className="text-teal-100 text-sm">
              {daysLeft>0?`Faltan ${daysLeft} días para cobro (día ${nextPay})`:"¡Día de cobro!"} · Flujo: {DOP(available)}
            </p>
          </div>
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="7" strokeDasharray={`${hs*2.64} 264`} strokeLinecap="round"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{hs}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet}         label="Balance Total" value={DOP(tB)} color="#0D9488"/>
        <StatCard icon={ArrowUpRight}   label="Ingresos"      value={DOP(tI)} color="#22C55E"/>
        <StatCard icon={ArrowDownRight} label="Gastos"        value={DOP(tE)} trend={tI>0?`${((tE/tI)*100).toFixed(0)}%`:""} trendUp={false} color="#EF4444"/>
        <StatCard icon={PiggyBank}      label="Ahorro"        value={DOP(tS)} color="#6366F1"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-teal-600"/>Resumen Quincenal
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[{l:"1ra Quincena (1–15)",e:q1Exp,i:q1Inc},{l:"2da Quincena (16–30)",e:q2Exp,i:q2Inc}].map((q,i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">{q.l}</p>
                <p className="text-lg font-bold mb-2">{DOP(q.i)}</p>
                <PBar value={q.e} max={q.i} color={q.e>q.i?"#EF4444":"#0D9488"} height={6}/>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Gastado: {DOP(q.e)}</span>
                  <span>Disp: {DOP(Math.max(0,q.i-q.e))}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 mb-3">Evolución Mensual</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mh}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0D9488" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#EF4444" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={SHORT}/>
                <Tooltip formatter={v=>DOP(v)} contentStyle={{borderRadius:12,border:"1px solid #e5e7eb",fontSize:12}}/>
                <Area type="monotone" dataKey="income"   stroke="#0D9488" fill="url(#gI)" strokeWidth={2} name="Ingresos"/>
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#gE)" strokeWidth={2} name="Gastos"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell size={18} className="text-amber-500"/>Próximos Pagos
          </h3>
          <div className="space-y-3">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${r.type==="inc"?"bg-emerald-500":r.type==="cc"?"bg-blue-500":"bg-red-500"}`}>
                  {r.date}
                </div>
                <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{r.title}</p>
                <span className={`text-sm font-bold ${r.type==="inc"?"text-emerald-600":"text-gray-800"}`}>
                  {r.type==="inc"?"+":"-"}{DOP(r.amount)}
                </span>
              </div>
            ))}
          </div>
          {available<10000 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-amber-700">Flujo ajustado. Reduce gastos discrecionales.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500"/>Gastos por Categoría
          </h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={expByCat} innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={2}>
                  {expByCat.map((_,i) => <Cell key={i} fill={expByCat[i].color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {expByCat.slice(0,6).map((c,i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:c.color}}/>
                  <span className="text-xs text-gray-600 flex-1">{c.icon} {c.name}</span>
                  <span className="text-xs font-semibold">{DOP(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500"/>Deudas ({DOP(tD)})
          </h3>
          <div className="space-y-2">
            {allDebts.map((d,i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{d.card?"💳":"🏦"}</span>
                <span className="text-gray-700 flex-1 truncate text-xs">{d.name}</span>
                <Badge color={d.rate>30?"red":d.rate>20?"yellow":"green"}>{d.rate.toFixed(1)}%</Badge>
                <span className="text-xs font-semibold w-28 text-right">{DOP(d.bal)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target size={18} className="text-emerald-500"/>Metas de Ahorro
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savs.map(g => (
            <div key={g.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{g.icon}</span>
                <div>
                  <p className="text-sm font-bold">{g.name}</p>
                  <p className="text-xs text-gray-400">
                    {parseFloat(g.monthlyContrib)>0 ? Math.ceil((parseFloat(g.target)-parseFloat(g.currentAmount))/parseFloat(g.monthlyContrib)) : 0} meses
                  </p>
                </div>
              </div>
              <PBar value={parseFloat(g.currentAmount)} max={parseFloat(g.target)} color="#0D9488" height={6} showLabel/>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-gray-500">{DOP(g.currentAmount)}</span>
                <span className="font-semibold">{DOP(g.target)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ── Incomes Page ───────────────────────────────────────────────────────────
const IncomesPage = () => {
  const {data, loading, reload} = useResource(incomesApi.list, []);
  const [show, setShow]   = useState(false);
  const [eid,  setEid]    = useState(null);
  const [cdel, setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT, setLT]       = useState(null);
  const blank = {description:"", amount:"", date:new Date().toISOString().split("T")[0], type:"salary", recurrent:false, destType:"", destId:null};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (item=null) => { setFm(item?{...item,destType:item.destType||"",destId:item.destId||null}:blank); setEid(item?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      const p = {description:fm.description, amount:parseFloat(fm.amount), date:fm.date, type:fm.type, recurrent:!!fm.recurrent, destType:fm.destType||null, destId:fm.destId||null};
      if (eid) await incomesApi.update(eid,p); else await incomesApi.create(p);
      await reload(); setShow(false); showT(eid?"Actualizado":"Ingreso registrado");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await incomesApi.remove(id); await reload(); showT("Eliminado"); }
    catch(e) { showT(e.message,"error"); }
  };

  const total = data.reduce((s,i)=>s+parseFloat(i.amount),0);
  const sal   = data.filter(i=>i.type==="salary").reduce((s,i)=>s+parseFloat(i.amount),0);

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Ingresos</h2><p className="text-sm text-gray-500">Gestión de ingresos</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nuevo Ingreso</Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={ArrowUpRight} label="Total"   value={DOP(total)}     color="#22C55E"/>
        <StatCard icon={Banknote}     label="Salario" value={DOP(sal)}        color="#0D9488"/>
        <StatCard icon={Zap}          label="Extra"   value={DOP(total-sal)}  color="#6366F1"/>
      </div>
      <Card className="p-5">
        {loading ? <Spinner/> : data.length===0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay ingresos. Agrega el primero.</p>
        ) : (
          <div className="space-y-2">
            {[...data].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(inc => (
              <div key={inc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ArrowUpRight size={18} className="text-emerald-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{inc.description}</p>
                  <p className="text-xs text-gray-400">{new Date(inc.date).toLocaleDateString("es-DO")} · {inc.recurrent?"Recurrente":"Único"}</p>
                </div>
                <Badge color={inc.type==="salary"?"teal":"purple"}>{IT[inc.type]||inc.type}</Badge>
                <span className="text-base font-bold text-emerald-600">+{DOP(inc.amount)}</span>
                <button onClick={()=>open(inc)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100"><Edit3 size={15}/></button>
                <button onClick={()=>setCdel(inc.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-400"><Trash2 size={15}/></button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Ingreso":"Nuevo Ingreso"}>
        <div className="space-y-4">
          <F label="Descripción" value={fm.description} onChange={v=>setFm({...fm,description:v})} placeholder="Ej: Salario quincenal"/>
          <div className="grid grid-cols-2 gap-3">
            <F label="Monto" type="number" prefix="RD$" value={fm.amount} onChange={v=>setFm({...fm,amount:v})}/>
            <F label="Fecha" type="date" value={fm.date} onChange={v=>setFm({...fm,date:v})}/>
          </div>
          <F label="Tipo" value={fm.type} onChange={v=>setFm({...fm,type:v})} options={Object.entries(IT).map(([v,l])=>({value:v,label:l}))}/>
          <AccountSelector
            label="Acreditar a cuenta / tarjeta (opcional)"
            destType={fm.destType} destId={fm.destId}
            onChange={(type,id)=>setFm({...fm,destType:type,destId:id})}/>
          {fm.destType && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <ArrowUpRight size={14} className="text-emerald-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-emerald-700">El monto se <strong>sumará</strong> al saldo de la cuenta seleccionada.</p>
            </div>
          )}
          <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={!!fm.recurrent} onChange={e=>setFm({...fm,recurrent:e.target.checked})} className="rounded"/>
            <span className="text-sm text-gray-600">Ingreso recurrente</span>
          </label>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar este ingreso? El saldo de la cuenta vinculada sera revertido."/>
    </div>
  );
};

// ── Expenses Page ──────────────────────────────────────────────────────────
const ExpensesPage = () => {
  const {data, loading, reload} = useResource(expensesApi.list, []);
  const [filter, setFilter] = useState("all");
  const [show,   setShow]   = useState(false);
  const [eid,    setEid]    = useState(null);
  const [cdel,   setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT, setLT] = useState(null);
  const blank = {description:"", amount:"", date:new Date().toISOString().split("T")[0], category:"food", type:"variable", payMethod:"bank", sourceType:"", sourceId:null};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (item=null) => { setFm(item?{...item,sourceType:item.sourceType||"",sourceId:item.sourceId||null}:blank); setEid(item?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      const p = {description:fm.description, amount:parseFloat(fm.amount), date:fm.date, category:fm.category, type:fm.type, payMethod:fm.payMethod, sourceType:fm.sourceType||null, sourceId:fm.sourceId||null};
      if (eid) await expensesApi.update(eid,p); else await expensesApi.create(p);
      await reload(); setShow(false); showT(eid?"Actualizado":"Gasto registrado");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await expensesApi.remove(id); await reload(); showT("Eliminado"); }
    catch(e) { showT(e.message,"error"); }
  };

  const filtered = filter==="all" ? data : data.filter(e=>e.type===filter);
  const tE       = data.reduce((s,e)=>s+parseFloat(e.amount),0);
  const fixed    = data.filter(e=>e.type==="fixed").reduce((s,e)=>s+parseFloat(e.amount),0);
  const variable = data.filter(e=>e.type==="variable").reduce((s,e)=>s+parseFloat(e.amount),0);
  const disc     = data.filter(e=>e.type==="discretionary").reduce((s,e)=>s+parseFloat(e.amount),0);

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Gastos</h2><p className="text-sm text-gray-500">Control detallado</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nuevo Gasto</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowDownRight} label="Total"          value={DOP(tE)}       color="#EF4444"/>
        <StatCard icon={Building2}      label="Fijos"          value={DOP(fixed)}     color="#0D9488"/>
        <StatCard icon={Receipt}        label="Variables"      value={DOP(variable)}  color="#F59E0B"/>
        <StatCard icon={Star}           label="Discrecionales" value={DOP(disc)}      color="#8B5CF6"/>
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold">Registro</h3>
          <div className="flex gap-1">
            {[{v:"all",l:"Todos"},{v:"fixed",l:"Fijos"},{v:"variable",l:"Variables"},{v:"discretionary",l:"Discrecional"}].map(f => (
              <button key={f.v} onClick={()=>setFilter(f.v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${filter===f.v?"bg-teal-600 text-white":"text-gray-500 hover:bg-gray-100"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
        {loading ? <Spinner/> : filtered.length===0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin gastos con este filtro.</p>
        ) : (
          <div className="space-y-2">
            {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(exp => {
              const cat = CATS[exp.category] || CATS.other;
              return (
                <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{backgroundColor:cat.color+"15"}}>{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{exp.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString("es-DO")} · {cat.name}</p>
                    {exp.sourceName && <span className="text-xs text-red-500 font-medium">← {exp.sourceName}</span>}
                  </div>
                  </div>
                  <Badge color={exp.type==="fixed"?"teal":exp.type==="variable"?"yellow":"purple"}>{ET[exp.type]}</Badge>
                  <span className="text-sm font-bold text-red-600 w-28 text-right">-{DOP(exp.amount)}</span>
                  <button onClick={()=>open(exp)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100"><Edit3 size={15}/></button>
                  <button onClick={()=>setCdel(exp.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-400"><Trash2 size={15}/></button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Gasto":"Nuevo Gasto"} wide>
        <div className="space-y-4">
          <F label="Descripción" value={fm.description} onChange={v=>setFm({...fm,description:v})} placeholder="Ej: Supermercado"/>
          <div className="grid grid-cols-2 gap-3">
            <F label="Monto" type="number" prefix="RD$" value={fm.amount} onChange={v=>setFm({...fm,amount:v})}/>
            <F label="Fecha" type="date" value={fm.date} onChange={v=>setFm({...fm,date:v})}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Categoría" value={fm.category} onChange={v=>setFm({...fm,category:v})} options={Object.entries(CATS).map(([k,c])=>({value:k,label:`${c.icon} ${c.name}`}))}/>
            <F label="Tipo" value={fm.type} onChange={v=>setFm({...fm,type:v})} options={Object.entries(ET).map(([k,v])=>({value:k,label:v}))}/>
          </div>
          <AccountSelector
            label="Cobrar de cuenta / tarjeta (opcional)"
            destType={fm.sourceType||""} destId={fm.sourceId||null}
            onChange={(type,id)=>setFm({...fm,sourceType:type,sourceId:id})}/>
          {fm.sourceType && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <ArrowDownRight size={15} className="text-red-500 mt-0.5 shrink-0"/>
              <p className="text-xs text-red-700">Al guardar, el monto se <strong>descontará</strong> del saldo de la cuenta/tarjeta seleccionada.</p>
            </div>
          )}
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar este gasto? El saldo de la cuenta vinculada será revertido."/>
    </div>
  );
};

// ── Credit Cards Page ──────────────────────────────────────────────────────
const CreditCardsPage = () => {
  const {data, loading, reload} = useResource(ccApi.list, []);
  const [show,   setShow]   = useState(false);
  const [eid,    setEid]    = useState(null);
  const [cdel,   setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT, setLT] = useState(null);
  const blank = {name:"", bank:"", limit:"", balance:"", cutDate:5, payDate:25, monthlyRate:"", annualRate:"", minPayment:"", color:"#1E40AF"};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (c=null) => { setFm(c?{...c}:blank); setEid(c?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      const p = {name:fm.name, bank:fm.bank, limit:parseFloat(fm.limit), balance:parseFloat(fm.balance)||0, cutDate:parseInt(fm.cutDate), payDate:parseInt(fm.payDate), monthlyRate:parseFloat(fm.monthlyRate)||0, annualRate:parseFloat(fm.annualRate)||0, minPayment:parseFloat(fm.minPayment)||0, color:fm.color};
      if (eid) await ccApi.update(eid,p); else await ccApi.create(p);
      await reload(); setShow(false); showT(eid?"Actualizado":"Tarjeta agregada");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await ccApi.remove(id); await reload(); showT("Eliminado"); }
    catch(e) { showT(e.message,"error"); }
  };

  const tB = data.reduce((s,c)=>s+parseFloat(c.balance),0);
  const tL = data.reduce((s,c)=>s+parseFloat(c.limit),0);

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Tarjetas de Crédito</h2><p className="text-sm text-gray-500">Control de límites e intereses</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nueva Tarjeta</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CreditCard}      label="Deuda TC"     value={DOP(tB)}  color="#EF4444"/>
        <StatCard icon={Shield}          label="Crédito Total" value={DOP(tL)} color="#0D9488"/>
        <StatCard icon={TrendingUp}      label="Utilización"  value={tL>0?`${((tB/tL)*100).toFixed(1)}%`:"0%"} color={tB/tL>0.5?"#EF4444":"#22C55E"}/>
        <StatCard icon={CircleDollarSign} label="Disponible"  value={DOP(tL-tB)} color="#6366F1"/>
      </div>
      {loading ? <Spinner/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(card => {
            const u   = parseFloat(card.limit)>0 ? parseFloat(card.balance)/parseFloat(card.limit) : 0;
            const int = parseFloat(card.balance) * (parseFloat(card.monthlyRate)/100);
            return (
              <Card key={card.id} className="overflow-hidden">
                <div className="p-5 text-white relative overflow-hidden" style={{background:`linear-gradient(135deg,${card.color},${card.color}dd)`}}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-white -translate-y-8 translate-x-8"/>
                  <p className="text-xs opacity-80 mb-1">{card.bank}</p>
                  <p className="text-base font-bold mb-4">{card.name}</p>
                  <div className="flex justify-between items-end">
                    <div><p className="text-xs opacity-70">Balance</p><p className="text-lg font-bold">{DOP(card.balance)}</p></div>
                    <CreditCard size={28} className="opacity-30"/>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <PBar value={parseFloat(card.balance)} max={parseFloat(card.limit)} color={u>0.7?"#EF4444":u>0.5?"#F59E0B":"#22C55E"} height={5} showLabel label={`${DOP(card.balance)} / ${DOP(card.limit)}`}/>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-gray-50"><p className="text-gray-400">Corte</p><p className="font-semibold">Día {card.cutDate}</p></div>
                    <div className="p-2 rounded-lg bg-gray-50"><p className="text-gray-400">Pago</p><p className="font-semibold">Día {card.payDate}</p></div>
                    <div className="p-2 rounded-lg bg-gray-50"><p className="text-gray-400">Tasa</p><p className="font-semibold">{card.monthlyRate}%</p></div>
                    <div className="p-2 rounded-lg bg-gray-50"><p className="text-gray-400">Interés/mes</p><p className="font-semibold text-red-600">{DOP(int)}</p></div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <CardPaymentBtn card={card} onDone={reload}/>
                    <div className="flex gap-2">
                      <Btn size="sm" variant="outline" icon={Edit3} onClick={()=>open(card)} full>Editar</Btn>
                      <Btn size="sm" variant="danger"  icon={Trash2} onClick={()=>setCdel(card.id)}>Borrar</Btn>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {data.length===0 && <p className="text-sm text-gray-400 text-center py-8 col-span-3">No hay tarjetas. Agrega la primera.</p>}
        </div>
      )}
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Tarjeta":"Nueva Tarjeta"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Nombre" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Visa Gold"/>
            <F label="Banco"  value={fm.bank} onChange={v=>setFm({...fm,bank:v})} placeholder="Banco Popular"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Límite"  type="number" prefix="RD$" value={fm.limit}   onChange={v=>setFm({...fm,limit:v})}/>
            <F label="Balance" type="number" prefix="RD$" value={fm.balance} onChange={v=>setFm({...fm,balance:v})}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Día Corte"   type="number" value={fm.cutDate}    onChange={v=>setFm({...fm,cutDate:v})}/>
            <F label="Día Pago"    type="number" value={fm.payDate}    onChange={v=>setFm({...fm,payDate:v})}/>
            <F label="Pago Mínimo" type="number" prefix="RD$" value={fm.minPayment} onChange={v=>setFm({...fm,minPayment:v})}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Tasa Mensual (%)" type="number" step="0.01" value={fm.monthlyRate} onChange={v=>setFm({...fm,monthlyRate:v,annualRate:v?(parseFloat(v)*12).toFixed(2):""})}/>
            <F label="Tasa Anual (%)"   type="number" step="0.01" value={fm.annualRate}  onChange={v=>setFm({...fm,annualRate:v})}/>
          </div>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar esta tarjeta?"/>
    </div>
  );
};

// ── Card Payment Component ─────────────────────────────────────────────────
const CardPaymentBtn = ({card, onDone}) => {
  const [show,  setShow]  = useState(false);
  const [fm,    setFm]    = useState({amount:"", accountId:""});
  const [saving,setSaving]= useState(false);
  const [lT,    setLT]    = useState(null);
  const {accounts} = useAccountsAndCards();

  const pay = async () => {
    if (!fm.amount) return;
    setSaving(true);
    try {
      await creditCards.payment({cardId:card.id, amount:parseFloat(fm.amount), accountId:fm.accountId||null, date:new Date().toISOString().split("T")[0]});
      setShow(false); setFm({amount:"",accountId:""}); onDone();
    } catch(e) { setLT({msg:e.message,type:"error"}); }
    finally { setSaving(false); }
  };

  return (
    <>
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <Btn size="sm" variant="primary" icon={ArrowLeftRight} onClick={()=>setShow(true)} full>Pagar Tarjeta</Btn>
      <Modal open={show} onClose={()=>setShow(false)} title={`Pagar: ${card.name}`}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Deuda actual</span>
              <span className="font-bold text-red-600">{DOP(card.balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pago minimo</span>
              <span className="font-semibold">{DOP(card.minPayment)}</span>
            </div>
          </div>
          <F label="Monto a pagar (RD$)" type="number" prefix="RD$" value={fm.amount} onChange={v=>setFm({...fm,amount:v})}/>
          <div className="flex gap-2">
            {[{label:"Pago minimo", val:card.minPayment},{label:"Pagar total", val:parseFloat(card.balance)}].map((opt,i) => (
              <button key={i} onClick={()=>setFm({...fm,amount:String(opt.val)})}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all">
                {opt.label}
              </button>
            ))}
          </div>
          <F label="Debitar de cuenta (opcional)" value={fm.accountId} onChange={v=>setFm({...fm,accountId:v})}
            options={[{value:"",label:"Sin vincular"},...accounts.map(a=>({value:a.id,label:`🏦 ${a.name} — ${DOP(a.balance)}`}))]}/>
          {fm.accountId && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <ArrowLeftRight size={14} className="text-blue-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-700">Se debitaran <strong>{DOP(parseFloat(fm.amount)||0)}</strong> de la cuenta y se reducira la deuda de la tarjeta.</p>
            </div>
          )}
          <Btn full icon={Check} onClick={pay} loading={saving}>Registrar Pago</Btn>
        </div>
      </Modal>
    </>
  );
};

// ── Debt Payment Component ─────────────────────────────────────────────────
const DebtPaymentBtn = ({debt, onDone}) => {
  const [show,  setShow]  = useState(false);
  const [fm,    setFm]    = useState({amount:"", accountId:""});
  const [saving,setSaving]= useState(false);
  const [lT,    setLT]    = useState(null);
  const {accounts} = useAccountsAndCards();

  const pay = async () => {
    if (!fm.amount) return;
    setSaving(true);
    try {
      await debtsApi.payment({debtId:debt.id, amount:parseFloat(fm.amount), accountId:fm.accountId||null, date:new Date().toISOString().split("T")[0]});
      setShow(false); setFm({amount:"",accountId:""}); onDone();
    } catch(e) { setLT({msg:e.message,type:"error"}); }
    finally { setSaving(false); }
  };

  return (
    <>
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <button onClick={()=>setShow(true)} className="text-teal-600 hover:text-teal-700 font-semibold text-xs flex items-center gap-1 shrink-0">
        <ArrowLeftRight size={12}/> Pagar
      </button>
      <Modal open={show} onClose={()=>setShow(false)} title={`Pagar prestamo: ${debt.name}`}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Balance actual</span>
              <span className="font-bold text-red-600">{DOP(debt.balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cuota mensual</span>
              <span className="font-semibold">{DOP(debt.payment)}</span>
            </div>
          </div>
          <F label="Monto del pago (RD$)" type="number" prefix="RD$" value={fm.amount} onChange={v=>setFm({...fm,amount:v})}/>
          <button onClick={()=>setFm({...fm,amount:String(debt.payment)})}
            className="w-full py-2 text-xs font-semibold rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all">
            Usar cuota mensual ({DOP(debt.payment)})
          </button>
          <F label="Debitar de cuenta (opcional)" value={fm.accountId} onChange={v=>setFm({...fm,accountId:v})}
            options={[{value:"",label:"Sin vincular"},...accounts.map(a=>({value:a.id,label:`🏦 ${a.name} — ${DOP(a.balance)}`}))]}/>
          {fm.accountId && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <ArrowLeftRight size={14} className="text-blue-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-700">Se debitaran <strong>{DOP(parseFloat(fm.amount)||0)}</strong> de la cuenta y se reducira el balance del prestamo.</p>
            </div>
          )}
          <Btn full icon={Check} onClick={pay} loading={saving}>Registrar Pago</Btn>
        </div>
      </Modal>
    </>
  );
};


// ── Debts Page ─────────────────────────────────────────────────────────────
const DebtsPage = () => {
  const [loans,        setLoans]        = useState([]);
  const [cards,        setCards]        = useState([]);
  const [lines,        setLines]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [strategy,     setStrategy]     = useState("avalanche");
  const [tab,          setTab]          = useState("all");
  const [show,         setShow]         = useState(false);
  const [eid,          setEid]          = useState(null);
  const [cdel,         setCdel]         = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [lT,           setLT]           = useState(null);
  const blank = {name:"", type:"personal", original:"", balance:"", monthlyRate:"", annualRate:"", payment:"", payDate:15, status:"active"};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open  = (d=null) => { setFm(d?{...d}:blank); setEid(d?.id??null); setShow(true); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l,c,li] = await Promise.all([debtsApi.list(), ccApi.list(), creditLinesApi.all()]);
      setLoans(l); setCards(c); setLines(li);
    } catch(e) { showT(e.message,"error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const p = {name:fm.name, type:fm.type, original:parseFloat(fm.original)||parseFloat(fm.balance), balance:parseFloat(fm.balance), monthlyRate:parseFloat(fm.monthlyRate)||0, annualRate:parseFloat(fm.annualRate)||0, payment:parseFloat(fm.payment)||0, payDate:parseInt(fm.payDate), status:fm.status};
      if (eid) await debtsApi.update(eid,p); else await debtsApi.create(p);
      await loadAll(); setShow(false); showT(eid?"Actualizado":"Deuda registrada");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await debtsApi.remove(id); await loadAll(); showT("Eliminado"); }
    catch(e) { showT(e.message,"error"); }
  };

  const CURR_SYM = {DOP:"RD$", USD:"$", EUR:"€"};
  const fmtBal = (bal, cur) => cur && cur!=="DOP"
    ? `${CURR_SYM[cur]||""}${parseFloat(bal).toLocaleString("en-US",{minimumFractionDigits:2})}`
    : DOP(bal);

  // Unified list of all debts
  const allDebts = [
    ...loans.map(d => ({
      uid:`loan-${d.id}`, name:d.name, subName:DT[d.type]||d.type,
      bal:parseFloat(d.balance), original:parseFloat(d.original),
      rate:parseFloat(d.annualRate), monthlyRate:parseFloat(d.monthlyRate),
      payment:parseFloat(d.payment), payDate:d.payDate,
      type:"loan", icon:"🏦", currency:"DOP", raw:d,
    })),
    ...cards.map(c => ({
      uid:`card-${c.id}`, name:c.name, subName:c.bank,
      bal:parseFloat(c.balance), original:parseFloat(c.limit),
      rate:parseFloat(c.annualRate), monthlyRate:parseFloat(c.monthlyRate),
      payment:parseFloat(c.minPayment), payDate:c.payDate,
      type:"card", icon:"💳", currency:"DOP",
      balUsd:c.isMultiCurrency?parseFloat(c.balanceUsd||0):null, raw:c,
    })),
    ...lines.filter(l=>l.isActive&&parseFloat(l.balanceUsed)>0).map(l => ({
      uid:`line-${l.id}`, name:l.name, subName:l.cardName,
      bal:parseFloat(l.balanceUsed), original:parseFloat(l.creditLimit),
      rate:parseFloat(l.interestRate)*12, monthlyRate:parseFloat(l.interestRate),
      payment:0, payDate:null,
      type:"line", icon:"📋", currency:l.currency||"DOP", raw:l,
    })),
  ].sort((a,b) => strategy==="avalanche" ? b.rate-a.rate : a.bal-b.bal);

  const tLoans = loans.reduce((s,d)=>s+parseFloat(d.balance),0);
  const tCards  = cards.reduce((s,c)=>s+parseFloat(c.balance),0);
  const tLines  = lines.filter(l=>l.isActive).reduce((s,l)=>s+parseFloat(l.balanceUsed),0);
  const tAll    = tLoans + tCards + tLines;
  const tPay    = loans.reduce((s,d)=>s+parseFloat(d.payment),0) + cards.reduce((s,c)=>s+parseFloat(c.minPayment),0);
  const tInt    = loans.reduce((s,d)=>s+parseFloat(d.balance)*(parseFloat(d.monthlyRate)/100),0)
                + cards.reduce((s,c)=>s+parseFloat(c.balance)*(parseFloat(c.monthlyRate)/100),0);

  const TYPE_STYLE = {
    loan: "bg-blue-50 text-blue-600",
    card: "bg-purple-50 text-purple-600",
    line: "bg-orange-50 text-orange-600",
  };
  const TYPE_LABEL = { loan:"Préstamo", card:"Tarjeta", line:"Línea Crédito" };

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}

      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Deudas</h2><p className="text-sm text-gray-500">Préstamos, tarjetas y líneas de crédito</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nuevo Préstamo</Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingDown}  label="Deuda Total"   value={DOP(tAll)} color="#EF4444"/>
        <StatCard icon={DollarSign}    label="Pago Mensual"  value={DOP(tPay)} color="#F59E0B"/>
        <StatCard icon={AlertTriangle} label="Interés/Mes"   value={DOP(tInt)} color="#DC2626"/>
        <StatCard icon={Target}        label="# Deudas"      value={String(allDebts.length)} color="#6366F1"/>
      </div>

      {/* Breakdown tabs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {k:"all",   icon:"📊", label:"Todas",            val:DOP(tAll),   count:allDebts.length,   color:"teal"},
          {k:"loans", icon:"🏦", label:"Préstamos",        val:DOP(tLoans), count:loans.length,       color:"blue"},
          {k:"cards", icon:"💳", label:"Tarjetas",         val:DOP(tCards), count:cards.length,       color:"purple"},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${tab===t.k?"border-teal-500 bg-teal-50":"border-gray-100 bg-white shadow-sm hover:border-gray-200"}`}>
            <p className="text-lg mb-1">{t.icon}</p>
            <p className="text-xs font-semibold text-gray-500">{t.label}</p>
            <p className={`text-base font-bold ${tab===t.k?"text-teal-700":"text-gray-900"}`}>{t.val}</p>
            <p className="text-[10px] text-gray-400">{t.count} registro{t.count!==1?"s":""}</p>
          </button>
        ))}
      </div>
      {tLines>0 && (
        <button onClick={()=>setTab("lines")}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${tab==="lines"?"border-orange-500 bg-orange-50":"border-gray-100 bg-white shadow-sm hover:border-gray-200"}`}>
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500">Líneas de Crédito</p>
            <p className={`text-base font-bold ${tab==="lines"?"text-orange-700":"text-gray-900"}`}>{DOP(tLines)}</p>
          </div>
          <p className="text-[10px] text-gray-400">{lines.filter(l=>l.isActive).length} activas</p>
        </button>
      )}

      {/* Strategy + unified list */}
      {(tab==="all" || tab==="loans") && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold flex items-center gap-2">
              <Zap size={18} className="text-amber-500"/>
              {tab==="all"?"Todas las deudas — Estrategia unificada":"Préstamos"}
            </h3>
            <div className="flex gap-1">
              {[{k:"avalanche",t:"🏔️ Avalancha"},{k:"snowball",t:"⛄ Bola de Nieve"}].map(s=>(
                <button key={s.k} onClick={()=>setStrategy(s.k)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${strategy===s.k?"bg-teal-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {s.t}
                </button>
              ))}
            </div>
          </div>

          {loading ? <Spinner/> : (tab==="all"?allDebts:allDebts.filter(d=>d.type==="loan")).length===0 ? (
            <div className="text-center py-8">
              <TrendingDown size={32} className="mx-auto mb-2 text-gray-200"/>
              <p className="text-sm text-gray-400">No hay deudas registradas</p>
              {tab==="loans" && <button onClick={()=>open()} className="mt-2 text-xs text-teal-600 font-semibold hover:underline">+ Agregar préstamo</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {(tab==="all"?allDebts:allDebts.filter(d=>d.type==="loan")).map((d,i)=>{
                const net = d.payment>0 ? d.payment - d.bal*(d.monthlyRate/100) : 0;
                const mo  = net>0 ? Math.ceil(d.bal/net) : null;
                const pct = d.original>0 ? ((d.original-d.bal)/d.original)*100 : 0;
                return (
                  <div key={d.uid} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${i===0?"bg-red-500":"bg-gray-400"}`}>
                        {i+1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold">{d.icon} {d.name}</p>
                              {i===0 && <Badge color="red">⚡ #1</Badge>}
                            </div>
                            <p className="text-xs text-gray-400">{d.subName}{d.payDate?` · Día ${d.payDate}`:""}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 inline-block ${TYPE_STYLE[d.type]}`}>
                              {TYPE_LABEL[d.type]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {d.type==="loan" && <>
                              <DebtPaymentBtn debt={d.raw} onDone={loadAll}/>
                              <button onClick={()=>open(d.raw)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600"><Edit3 size={14}/></button>
                              <button onClick={()=>setCdel(d.raw.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </>}
                            {d.type==="card" && <CardPaymentBtn card={d.raw} onDone={loadAll}/>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
                          <div><span className="text-gray-400">Balance</span><p className="font-bold text-red-600">{fmtBal(d.bal,d.currency)}</p>{d.balUsd>0&&<p className="text-[10px] text-blue-500">${d.balUsd.toFixed(2)} USD</p>}</div>
                          <div><span className="text-gray-400">Tasa anual</span><p className="font-semibold">{d.rate.toFixed(1)}%</p></div>
                          <div><span className="text-gray-400">{d.type==="card"?"Pago mín":"Cuota"}</span><p className="font-semibold">{d.payment>0?DOP(d.payment):"—"}</p></div>
                        </div>
                        {d.original>0&&(
                          <PBar value={d.original-d.bal} max={d.original} color="#22C55E" height={5} showLabel
                            label={mo?`${pct.toFixed(0)}% pagado · ~${mo} meses`:`${(100-pct).toFixed(0)}% utilizado`}/>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab==="cards" && (
        <Card className="p-5">
          <h3 className="font-bold mb-4">💳 Tarjetas de Crédito</h3>
          {loading ? <Spinner/> : cards.length===0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay tarjetas registradas.</p>
          ) : (
            <div className="space-y-3">
              {[...cards].sort((a,b)=>parseFloat(b.balance)-parseFloat(a.balance)).map(card=>{
                const u=parseFloat(card.limit)>0?parseFloat(card.balance)/parseFloat(card.limit):0;
                const int=parseFloat(card.balance)*(parseFloat(card.monthlyRate)/100);
                return (
                  <div key={card.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold">💳 {card.name}</p>
                        <p className="text-xs text-gray-400">{card.bank} · Tasa {card.annualRate}% · Pago día {card.payDate}</p>
                      </div>
                      <CardPaymentBtn card={card} onDone={loadAll}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
                      <div><span className="text-gray-400">Deuda</span><p className="font-bold text-red-600">{DOP(card.balance)}</p></div>
                      <div><span className="text-gray-400">Límite</span><p className="font-semibold">{DOP(card.limit)}</p></div>
                      <div><span className="text-gray-400">Interés/mes</span><p className="font-semibold text-red-500">{DOP(int)}</p></div>
                    </div>
                    <PBar value={parseFloat(card.balance)} max={parseFloat(card.limit)} color={u>0.7?"#EF4444":u>0.5?"#F59E0B":"#6366F1"} height={5} showLabel label={`${(u*100).toFixed(0)}% utilizado`}/>
                    {card.isMultiCurrency&&parseFloat(card.balanceUsd)>0&&(
                      <p className="text-[10px] text-blue-500 mt-1">USD: ${parseFloat(card.balanceUsd).toFixed(2)} / ${parseFloat(card.limitUsd).toFixed(2)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab==="lines" && (
        <Card className="p-5">
          <h3 className="font-bold mb-4">📋 Líneas de Crédito</h3>
          {loading ? <Spinner/> : lines.filter(l=>l.isActive).length===0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay líneas activas.</p>
          ) : (
            <div className="space-y-3">
              {lines.filter(l=>l.isActive).sort((a,b)=>parseFloat(b.balanceUsed)-parseFloat(a.balanceUsed)).map(line=>{
                const CSYM={DOP:"RD$",USD:"$",EUR:"€"};
                const sym=CSYM[line.currency]||"RD$";
                const pct=parseFloat(line.creditLimit)>0?(parseFloat(line.balanceUsed)/parseFloat(line.creditLimit))*100:0;
                const int=parseFloat(line.balanceUsed)*(parseFloat(line.interestRate)/100);
                return (
                  <div key={line.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold">📋 {line.name}</p>
                        <p className="text-xs text-gray-400">{line.cardName} · {(parseFloat(line.interestRate)*12).toFixed(1)}% anual · {line.currency}</p>
                      </div>
                      <Badge color="orange">{line.currency}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-2 text-xs">
                      <div><span className="text-gray-400">Usado</span><p className="font-bold text-red-600">{sym}{parseFloat(line.balanceUsed).toFixed(2)}</p></div>
                      <div><span className="text-gray-400">Límite</span><p className="font-semibold">{sym}{parseFloat(line.creditLimit).toFixed(2)}</p></div>
                      <div><span className="text-gray-400">Interés/mes</span><p className="font-semibold text-red-500">{sym}{int.toFixed(2)}</p></div>
                    </div>
                    <PBar value={parseFloat(line.balanceUsed)} max={parseFloat(line.creditLimit)} color="#F97316" height={5} showLabel label={`${pct.toFixed(0)}% utilizado`}/>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Edit/Create loan modal */}
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Préstamo":"Nuevo Préstamo"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Nombre" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Préstamo Personal"/>
            <F label="Tipo"   value={fm.type} onChange={v=>setFm({...fm,type:v})} options={Object.entries(DT).map(([k,v])=>({value:k,label:v}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Monto Original" type="number" prefix="RD$" value={fm.original} onChange={v=>setFm({...fm,original:v})}/>
            <F label="Balance Actual" type="number" prefix="RD$" value={fm.balance}  onChange={v=>setFm({...fm,balance:v})}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Tasa Mensual (%)" type="number" step="0.01" value={fm.monthlyRate} onChange={v=>setFm({...fm,monthlyRate:v,annualRate:v?(parseFloat(v)*12).toFixed(2):""})}/>
            <F label="Tasa Anual (%)"   type="number" step="0.01" value={fm.annualRate}  onChange={v=>setFm({...fm,annualRate:v})}/>
            <F label="Cuota Mensual"    type="number" prefix="RD$" value={fm.payment}   onChange={v=>setFm({...fm,payment:v})}/>
          </div>
          <F label="Día de Pago" type="number" value={fm.payDate} onChange={v=>setFm({...fm,payDate:v})}/>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar este préstamo?"/>
    </div>
  );
};



// ── Savings Page ───────────────────────────────────────────────────────────
const SavingsPage = () => {
  const {data, loading, reload} = useResource(savingsApi.list, []);
  const [show,        setShow]        = useState(false);
  const [eid,         setEid]         = useState(null);
  const [cdel,        setCdel]        = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmt,  setContribAmt]  = useState("");
  const [lT, setLT] = useState(null);
  const blank = {name:"", target:"", currentAmount:"", deadline:"", monthlyContrib:"", icon:"🎯"};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (g=null) => { setFm(g?{...g}:blank); setEid(g?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      const p = {name:fm.name, target:parseFloat(fm.target), currentAmount:parseFloat(fm.currentAmount)||0, deadline:fm.deadline||null, monthlyContrib:parseFloat(fm.monthlyContrib)||0, icon:fm.icon};
      if (eid) await savingsApi.update(eid,p); else await savingsApi.create(p);
      await reload(); setShow(false); showT(eid?"Actualizado":"Meta creada");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await savingsApi.remove(id); await reload(); showT("Eliminado"); }
    catch(e) { showT(e.message,"error"); }
  };

  const addContrib = async () => {
    if (!contribAmt||!contribGoal) return;
    const g = data.find(x=>x.id===contribGoal);
    if (!g) return;
    const newAmt = Math.min(parseFloat(g.target), parseFloat(g.currentAmount)+parseFloat(contribAmt));
    try {
      await savingsApi.update(contribGoal, {...g, currentAmount:newAmt});
      await reload(); setContribGoal(null); setContribAmt(""); showT("Aporte registrado");
    } catch(e) { showT(e.message,"error"); }
  };

  const tS = data.reduce((s,g)=>s+parseFloat(g.currentAmount),0);
  const tT = data.reduce((s,g)=>s+parseFloat(g.target),0);

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Ahorro y Metas</h2><p className="text-sm text-gray-500">Objetivos financieros</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nueva Meta</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={PiggyBank}  label="Ahorrado"    value={DOP(tS)} color="#22C55E"/>
        <StatCard icon={Target}     label="Meta Total"  value={DOP(tT)} color="#6366F1"/>
        <StatCard icon={TrendingUp} label="Progreso"    value={tT>0?`${((tS/tT)*100).toFixed(0)}%`:"0%"} color="#0D9488"/>
        <StatCard icon={DollarSign} label="Aporte/Mes"  value={DOP(data.reduce((s,g)=>s+parseFloat(g.monthlyContrib),0))} color="#F59E0B"/>
      </div>
      {loading ? <Spinner/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(g => {
            const p  = parseFloat(g.target)>0 ? (parseFloat(g.currentAmount)/parseFloat(g.target))*100 : 0;
            const mo = parseFloat(g.monthlyContrib)>0 ? Math.ceil((parseFloat(g.target)-parseFloat(g.currentAmount))/parseFloat(g.monthlyContrib)) : 0;
            return (
              <Card key={g.id} className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{g.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold">{g.name}</p>
                    <p className="text-xs text-gray-400">{mo} meses restantes</p>
                  </div>
                  <button onClick={()=>open(g)}     className="text-gray-400 hover:text-gray-600"><Edit3  size={14}/></button>
                  <button onClick={()=>setCdel(g.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
                <div className="text-center mb-4 relative w-28 h-28 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="6"/>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#0D9488" strokeWidth="6" strokeDasharray={`${p*2.64} 264`} strokeLinecap="round"/>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{p.toFixed(0)}%</span>
                </div>
                <div className="space-y-1 text-xs mb-3">
                  <div className="flex justify-between"><span className="text-gray-500">Ahorrado</span><span className="font-semibold text-emerald-600">{DOP(g.currentAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Faltante</span><span className="font-semibold">{DOP(parseFloat(g.target)-parseFloat(g.currentAmount))}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Aporte/mes</span><span className="font-semibold">{DOP(g.monthlyContrib)}</span></div>
                </div>
                <Btn full size="sm" icon={Plus} onClick={()=>{setContribGoal(g.id);setContribAmt("");}}>Agregar Aporte</Btn>
              </Card>
            );
          })}
          {data.length===0 && <p className="text-sm text-gray-400 col-span-3 text-center py-8">Sin metas. Crea la primera.</p>}
        </div>
      )}
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Meta":"Nueva Meta"}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <F label="Icono" value={fm.icon} onChange={v=>setFm({...fm,icon:v})} placeholder="🎯"/>
            <div className="col-span-3"><F label="Nombre" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Fondo de emergencia"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Meta"     type="number" prefix="RD$" value={fm.target}        onChange={v=>setFm({...fm,target:v})}/>
            <F label="Ahorrado" type="number" prefix="RD$" value={fm.currentAmount} onChange={v=>setFm({...fm,currentAmount:v})}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Aporte Mensual"  type="number" prefix="RD$" value={fm.monthlyContrib} onChange={v=>setFm({...fm,monthlyContrib:v})}/>
            <F label="Fecha Objetivo"  type="date" value={fm.deadline} onChange={v=>setFm({...fm,deadline:v})}/>
          </div>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Modal open={!!contribGoal} onClose={()=>setContribGoal(null)} title="Agregar Aporte">
        <div className="space-y-4">
          <F label="Monto a aportar" type="number" prefix="RD$" value={contribAmt} onChange={setContribAmt} placeholder="5000"/>
          <Btn full icon={Check} onClick={addContrib}>Registrar Aporte</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar esta meta?"/>
    </div>
  );
};

// ── Budget Page ────────────────────────────────────────────────────────────
const BudgetPage = () => {
  const [bud,      setBud]     = useState({});
  const [loading,  setLoading] = useState(true);
  const [editing,  setEditing] = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [expenses, setExpenses]= useState([]);
  const [userCats, setUserCats]= useState([]);
  const [lT,       setLT]      = useState(null);
  const [showAdd,  setShowAdd] = useState(false);
  const [newLine,  setNewLine] = useState({name:"", icon:"📌", color:"#64748B", amount:""});

  const showT = (msg, type="success") => setLT({msg,type});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [b,exp,cats] = await Promise.all([
        budgetsApi.get(CUR_MONTH,CUR_YEAR),
        expensesApi.list(),
        categoriesApi.list("expense"),
      ]);
      setBud(b); setExpenses(exp); setUserCats(cats);
    } catch(e) { showT(e.message,"error"); } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const saveBud = async () => {
    setSaving(true);
    try {
      await budgetsApi.save({budgets:bud, month:CUR_MONTH, year:CUR_YEAR});
      setEditing(false); showT("Presupuesto guardado");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const addCustomLine = () => {
    if (!newLine.name.trim() || !newLine.amount) return;
    const key = `custom_${newLine.name.toLowerCase().replace(/\s+/g,"_")}_${Date.now()}`;
    setBud(prev => ({...prev, [key]: parseFloat(newLine.amount)||0}));
    setNewLine({name:"", icon:"📌", color:"#64748B", amount:""});
    setShowAdd(false);
    setEditing(true);
  };

  const removeLine = key => {
    const next = {...bud};
    delete next[key];
    setBud(next);
  };

  // Unified category map: system CATS + user custom categories
  const allCatsMap = {
    ...Object.fromEntries(Object.entries(CATS).map(([k,c])=>[k,{key:k,name:c.name,icon:c.icon,color:c.color,isSystem:true}])),
    ...Object.fromEntries(userCats.filter(c=>!CATS[c.slug]).map(c=>[c.slug,{key:c.slug,name:c.name,icon:c.icon,color:c.color,isSystem:false}])),
  };

  const allKeys = [...new Set([...Object.keys(CATS), ...Object.keys(bud)])];
  const visibleRows = allKeys.map(key => {
    const cat    = allCatsMap[key] || {key, name:key, icon:"📌", color:"#64748B", isSystem:false};
    const spent  = expenses.filter(e=>e.category===key).reduce((s,e)=>s+parseFloat(e.amount),0);
    const budget = parseFloat(bud[key])||0;
    const pct    = budget>0?(spent/budget)*100:0;
    return {...cat, spent, budget, pct};
  }).filter(r => editing ? true : r.budget>0)
    .sort((a,b)=>b.pct-a.pct||b.budget-a.budget);

  const tBud = Object.values(bud).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const tSp  = expenses.reduce((s,e)=>s+parseFloat(e.amount),0);

  const PRESET_ICONS  = ["🏠","🍽️","🚗","💡","🏥","📚","🎬","👤","💰","💳","🛍️","✈️","🐾","🎮","⚡","🏃","🌿","🎵","🔧","💊","🎁","🏋️","🍕","☕","🎓"];
  const PRESET_COLORS = ["#0D9488","#F59E0B","#6366F1","#EC4899","#EF4444","#8B5CF6","#F97316","#14B8A6","#3B82F6","#22C55E","#64748B","#DC2626"];

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Presupuesto</h2>
          <p className="text-sm text-gray-500">{TODAY.toLocaleDateString("es-DO",{month:"long",year:"numeric"})}</p>
        </div>
        <div className="flex gap-2">
          {editing && (
            <Btn icon={Plus} variant="outline" size="sm" onClick={()=>setShowAdd(true)}>
              Agregar renglón
            </Btn>
          )}
          <Btn icon={editing?Check:Edit3} variant={editing?"primary":"outline"}
            onClick={editing?saveBud:()=>setEditing(true)} loading={saving}>
            {editing?"Guardar":"Editar"}
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Wallet}         label="Presupuestado" value={DOP(tBud)} color="#0D9488"/>
        <StatCard icon={ArrowDownRight} label="Ejecutado"      value={DOP(tSp)}  color="#EF4444"/>
        <StatCard icon={DollarSign}     label="Disponible"     value={DOP(Math.max(0,tBud-tSp))} color="#22C55E"/>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Resumen Global</h3>
          <Badge color={tSp>tBud?"red":tSp>tBud*0.8?"yellow":"green"}>
            {tSp>tBud?"⚠️ Excedido":tSp>tBud*0.8?"⚡ Ajustado":"✅ En control"}
          </Badge>
        </div>
        <PBar value={tSp} max={tBud} color={tSp>tBud?"#EF4444":"#0D9488"} height={10} showLabel
          label={`${DOP(tSp)} gastado de ${DOP(tBud)} presupuestado`}/>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">
            {editing?"Todas las categorías":`Categorías (${visibleRows.length})`}
          </h3>
          {!editing && visibleRows.length===0 && (
            <button onClick={()=>setEditing(true)} className="text-xs text-teal-600 font-semibold hover:underline">
              Configurar →
            </button>
          )}
        </div>

        {loading ? <Spinner/> : visibleRows.length===0 ? (
          <div className="text-center py-10">
            <Wallet size={36} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-sm text-gray-400">No hay presupuesto configurado</p>
            <p className="text-xs text-gray-300 mt-1">Haz clic en "Editar" para asignar montos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRows.map(c => (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{backgroundColor:c.color+"18"}}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold truncate">{c.name}</span>
                      {!c.isSystem && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md shrink-0">Custom</span>
                      )}
                    </div>
                    {editing ? (
                      <input type="number" value={bud[c.key]||""}
                        onChange={e=>setBud({...bud,[c.key]:parseFloat(e.target.value)||0})}
                        className="w-32 px-2 py-1 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        placeholder="0"/>
                    ) : (
                      <span className={`text-xs font-semibold ${c.pct>100?"text-red-600":"text-gray-500"}`}>
                        {DOP(c.spent)} / {DOP(c.budget)}
                      </span>
                    )}
                  </div>
                  {c.budget>0
                    ? <PBar value={c.spent} max={c.budget} height={6}
                        color={c.pct>100?"#EF4444":c.pct>80?"#F59E0B":c.color}/>
                    : editing && <div className="h-1.5 rounded-full bg-gray-100"/>
                  }
                </div>
                {editing ? (
                  <button onClick={()=>removeLine(c.key)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <X size={14}/>
                  </button>
                ) : c.budget>0 ? (
                  <span className={`text-xs font-bold w-12 text-right shrink-0 ${c.pct>100?"text-red-600":c.pct>80?"text-amber-500":"text-gray-400"}`}>
                    {c.pct.toFixed(0)}%
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {editing && (
          <button onClick={()=>setShowAdd(true)}
            className="mt-5 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
            <Plus size={15}/> Agregar categoría personalizada
          </button>
        )}
      </Card>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Agregar renglón al presupuesto">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Icono</label>
              <input value={newLine.icon} onChange={e=>setNewLine({...newLine,icon:e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-center text-xl focus:outline-none"/>
            </div>
            <div className="col-span-3">
              <F label="Nombre del renglón" value={newLine.name}
                onChange={v=>setNewLine({...newLine,name:v})}
                placeholder="Ej: Mascota, Gimnasio..."/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Iconos rápidos</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(ic=>(
                <button key={ic} onClick={()=>setNewLine({...newLine,icon:ic})}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all hover:scale-110
                    ${newLine.icon===ic?"bg-teal-100 ring-2 ring-teal-400":"hover:bg-gray-100"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(col=>(
                <button key={col} onClick={()=>setNewLine({...newLine,color:col})}
                  className={`w-7 h-7 rounded-lg transition-transform hover:scale-110
                    ${newLine.color===col?"scale-125 ring-2 ring-offset-1 ring-gray-400":""}`}
                  style={{backgroundColor:col}}/>
              ))}
            </div>
          </div>
          <F label="Monto presupuestado (RD$)" type="number" prefix="RD$"
            value={newLine.amount} onChange={v=>setNewLine({...newLine,amount:v})}
            placeholder="5,000"/>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
            💡 Las categorías creadas en <strong>Categorías</strong> aparecen aquí automáticamente.
          </div>
          <Btn full icon={Check} onClick={addCustomLine}
            disabled={!newLine.name.trim()||!newLine.amount}>
            Agregar al presupuesto
          </Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── Transactions Page ──────────────────────────────────────────────────────
const TransactionsPage = () => {
  const [search,   setSearch]   = useState("");
  const [tf,       setTf]       = useState("all");
  const [incomes,  setIncomes]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try { const [inc,exp] = await Promise.all([incomesApi.list(), expensesApi.list()]); setIncomes(inc); setExpenses(exp); }
      catch(e) { console.error(e); } finally { setLoading(false); }
    };
    loadAll();
  }, []);

  const all = useMemo(() => [
    ...incomes.map(i => ({...i, txT:"income",  cn:IT[i.type]||i.type, ci:"📈", cc:"#22C55E"})),
    ...expenses.map(e => { const c=CATS[e.category]||CATS.other; return {...e, txT:"expense", cn:c.name, ci:c.icon, cc:c.color}; })
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)), [incomes,expenses]);

  const filtered = useMemo(() => {
    let f = all;
    if (tf!=="all") f = f.filter(t=>t.txT===tf);
    if (search) { const s=search.toLowerCase(); f=f.filter(t=>t.description.toLowerCase().includes(s)); }
    return f;
  }, [all,tf,search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Transacciones</h2><p className="text-sm text-gray-500">{all.length} movimientos</p></div>
      </div>
      <Card className="p-4 flex items-center gap-3">
        <Search size={18} className="text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="flex-1 text-sm outline-none bg-transparent"/>
        <div className="flex gap-1">
          {[{v:"all",l:"Todos"},{v:"income",l:"Ingresos"},{v:"expense",l:"Gastos"}].map(f => (
            <button key={f.v} onClick={()=>setTf(f.v)} className={`px-3 py-1 text-xs font-semibold rounded-lg ${tf===f.v?"bg-teal-600 text-white":"text-gray-500 hover:bg-gray-100"}`}>{f.l}</button>
          ))}
        </div>
      </Card>
      {loading ? <Spinner/> : (
        <Card className="divide-y divide-gray-50">
          {filtered.length===0 && <p className="text-sm text-gray-400 text-center py-8">Sin resultados.</p>}
          {filtered.map(tx => (
            <div key={`${tx.txT}-${tx.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.txT==="income"?"bg-emerald-50":""}`}
                style={tx.txT!=="income"?{backgroundColor:tx.cc+"15"}:{}}>
                {tx.txT==="income" ? <ArrowUpRight size={18} className="text-emerald-600"/> : <span className="text-lg">{tx.ci}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
                <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString("es-DO",{weekday:"short",month:"short",day:"numeric"})} · {tx.cn}</p>
              </div>
              <Badge color={tx.txT==="income"?"green":"red"}>{tx.txT==="income"?"Ingreso":"Gasto"}</Badge>
              <span className={`text-sm font-bold w-32 text-right ${tx.txT==="income"?"text-emerald-600":"text-red-600"}`}>
                {tx.txT==="income"?"+":"-"}{DOP(tx.amount)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};


// ── Accounts Page ─────────────────────────────────────────────────────────
const AccountsPage = () => {
  const {data, loading, reload} = useResource(accountsApi.list, []);
  const [show,   setShow]   = useState(false);
  const [eid,    setEid]    = useState(null);
  const [cdel,   setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT, setLT] = useState(null);
  const blank = {name:"", type:"bank", bankName:"", balance:"", icon:"🏦"};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (item=null) => { setFm(item?{...item}:blank); setEid(item?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      const p = {name:fm.name, type:fm.type, bankName:fm.bankName||null, balance:parseFloat(fm.balance)||0, icon:fm.icon||"🏦"};
      if (eid) await accountsApi.update(eid,p); else await accountsApi.create(p);
      await reload(); setShow(false); showT(eid?"Actualizado":"Cuenta agregada");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await accountsApi.remove(id); await reload(); showT("Cuenta eliminada"); }
    catch(e) { showT(e.message,"error"); }
  };

  const totalBalance = data.reduce((s,a)=>s+parseFloat(a.balance),0);
  const typeColors = {bank:"#0D9488", cash:"#22C55E", savings:"#6366F1", investment:"#F59E0B"};
  const typeLabels = {bank:"Banco", cash:"Efectivo", savings:"Ahorro", investment:"Inversión"};

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Cuentas</h2><p className="text-sm text-gray-500">Gestión de cuentas y balance</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nueva Cuenta</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet}     label="Balance Total" value={DOP(totalBalance)} color="#0D9488"/>
        <StatCard icon={Building2}  label="Cuentas"       value={String(data.length)} color="#6366F1"/>
        <StatCard icon={Banknote}   label="Bancos"        value={DOP(data.filter(a=>a.type==="bank").reduce((s,a)=>s+parseFloat(a.balance),0))} color="#0D9488"/>
        <StatCard icon={DollarSign} label="Efectivo"      value={DOP(data.filter(a=>a.type==="cash").reduce((s,a)=>s+parseFloat(a.balance),0))} color="#22C55E"/>
      </div>
      {loading ? <Spinner/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(acc => (
            <Card key={acc.id} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{backgroundColor:(typeColors[acc.type]||"#0D9488")+"15"}}>
                    {acc.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-400">{acc.bankName || typeLabels[acc.type]}</p>
                  </div>
                </div>
                <Badge color={acc.type==="bank"?"teal":acc.type==="cash"?"green":acc.type==="savings"?"purple":"yellow"}>
                  {typeLabels[acc.type]}
                </Badge>
              </div>
              <p className="text-2xl font-bold mb-4" style={{color:typeColors[acc.type]||"#0D9488"}}>{DOP(acc.balance)}</p>
              <div className="flex gap-2">
                <Btn size="sm" variant="outline" icon={Edit3} onClick={()=>open(acc)} full>Editar</Btn>
                <Btn size="sm" variant="danger"  icon={Trash2} onClick={()=>setCdel(acc.id)}>Borrar</Btn>
              </div>
            </Card>
          ))}
          {data.length===0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <p className="text-sm font-semibold">No hay cuentas registradas.</p>
              <p className="text-xs mt-1">Agrega tu primera cuenta para ver el balance total.</p>
            </div>
          )}
        </div>
      )}
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Cuenta":"Nueva Cuenta"}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <F label="Icono" value={fm.icon} onChange={v=>setFm({...fm,icon:v})} placeholder="🏦"/>
            <div className="col-span-3">
              <F label="Nombre de la cuenta" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Banco Popular — Nómina"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Tipo" value={fm.type} onChange={v=>setFm({...fm,type:v})} options={Object.entries(typeLabels).map(([k,v])=>({value:k,label:v}))}/>
            <F label="Banco / Institución" value={fm.bankName} onChange={v=>setFm({...fm,bankName:v})} placeholder="Banco Popular"/>
          </div>
          <F label="Balance actual" type="number" prefix="RD$" value={fm.balance} onChange={v=>setFm({...fm,balance:v})} placeholder="0.00"/>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Guardar"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar esta cuenta? Se eliminará del balance total."/>
    </div>
  );
};

// ── Settings Page ──────────────────────────────────────────────────────────
const SettingsPage = ({user, onLogout}) => (
  <div className="space-y-4">
    <div><h2 className="text-xl font-bold">Configuración</h2><p className="text-sm text-gray-500">Cuenta y preferencias</p></div>
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
          {(user?.name||"U")[0].toUpperCase()}
        </div>
        <div><p className="font-bold">{user?.name}</p><p className="text-sm text-gray-400">{user?.email}</p></div>
      </div>
    </Card>
    {[
      {t:"Moneda",           d:"DOP (Peso Dominicano)",  i:"💱"},
      {t:"Pagos Quincenales",d:"Días de cobro: 15 y 30", i:"📅"},
      {t:"Categorías",       d:`${Object.keys(CATS).length} categorías`, i:"🏷️"},
      {t:"API Backend",      d:import.meta.env.VITE_API_URL||"http://localhost:4000/api/v1", i:"🔗"},
    ].map((x,i) => (
      <Card key={i} className="p-4 flex items-center gap-4">
        <span className="text-2xl">{x.i}</span>
        <div className="flex-1"><p className="text-sm font-bold">{x.t}</p><p className="text-xs text-gray-400 truncate">{x.d}</p></div>
        <ChevronRight size={18} className="text-gray-300"/>
      </Card>
    ))}
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <span className="text-2xl">🚪</span>
        <div className="flex-1"><p className="text-sm font-bold text-red-600">Cerrar sesión</p><p className="text-xs text-gray-400">Salir de tu cuenta</p></div>
        <Btn variant="danger" size="sm" icon={LogOut} onClick={onLogout}>Salir</Btn>
      </div>
    </Card>
  </div>
);


// ══════════════════════════════════════════════════════════════════════════
// USERS ADMIN PAGE
// ══════════════════════════════════════════════════════════════════════════
const UsersPage = ({currentUser}) => {
  const {data, loading, reload} = useResource(adminUsers.list, []);
  const [show,   setShow]   = useState(false);
  const [eid,    setEid]    = useState(null);
  const [cdel,   setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT,     setLT]     = useState(null);
  const [selUser, setSelUser] = useState(null); // for stats modal

  const blank = {name:"", email:"", password:"", role:"user", active:true};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg, type});

  const open = (item=null) => {
    setFm(item ? {...item, password:""} : blank);
    setEid(item?.id ?? null);
    setShow(true);
  };

  const save = async () => {
    if (!fm.name?.trim())  return showT("El nombre es requerido", "error");
    if (!fm.email?.trim()) return showT("El correo es requerido", "error");
    if (!eid && !fm.password) return showT("La contraseña es requerida", "error");
    if (fm.password && fm.password.length < 6) return showT("La contraseña debe tener mínimo 6 caracteres", "error");

    setSaving(true);
    try {
      const payload = {name:fm.name, email:fm.email, role:fm.role, active:fm.active};
      if (fm.password) payload.password = fm.password;

      if (eid) {
        await adminUsers.update(eid, payload);
        showT("Usuario actualizado");
      } else {
        await adminUsers.create(payload);
        showT("Usuario creado correctamente");
      }
      await reload();
      setShow(false);
    } catch(e) { showT(e.message, "error"); }
    finally { setSaving(false); }
  };

  const toggle = async (id) => {
    try { await adminUsers.toggle(id); await reload(); showT("Estado actualizado"); }
    catch(e) { showT(e.message, "error"); }
  };

  const remove = async (id) => {
    try { await adminUsers.remove(id); await reload(); showT("Usuario eliminado"); }
    catch(e) { showT(e.message, "error"); }
  };

  const activeCount   = data.filter(u => u.active).length;
  const inactiveCount = data.filter(u => !u.active).length;
  const adminCount    = data.filter(u => u.role === "admin").length;

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-500">Administra las cuentas del sistema</p>
        </div>
        <Btn icon={Plus} onClick={()=>open()}>Nuevo Usuario</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}  label="Total usuarios" value={String(data.length)}   color="#0D9488"/>
        <StatCard icon={Check}  label="Activos"         value={String(activeCount)}   color="#22C55E"/>
        <StatCard icon={X}      label="Inactivos"       value={String(inactiveCount)} color="#EF4444"/>
        <StatCard icon={Shield} label="Administradores" value={String(adminCount)}    color="#6366F1"/>
      </div>

      {loading ? <Spinner text="Cargando usuarios..."/> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Usuario</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Email</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Rol</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden lg:table-cell">Registrado</th>
                  <th className="py-3 px-4 w-24 text-right text-xs font-semibold text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {(u.name||"U")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                            {u.id === currentUser?.id && <Badge color="teal">Tú</Badge>}
                          </div>
                          <p className="text-xs text-gray-400 md:hidden truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm hidden md:table-cell">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge color={u.role==="admin" ? "purple" : "gray"}>
                        {u.role==="admin" ? "Admin" : "Usuario"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggle(u.id)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "No puedes desactivarte" : ""}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                          ${u.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}>
                        {u.active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                        {u.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 hidden lg:table-cell">
                      {new Date(u.created_at).toLocaleDateString("es-DO", {day:"2-digit",month:"short",year:"numeric"})}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => open(u)}
                          title="Editar usuario"
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors">
                          <Edit3 size={15}/>
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setCdel(u.id)}
                            title="Eliminar usuario"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={15}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Users size={32} className="mx-auto mb-2 text-gray-200"/>
                      <p className="text-sm text-gray-400">No hay usuarios registrados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal open={show} onClose={()=>setShow(false)} title={eid ? "Editar Usuario" : "Nuevo Usuario"}>
        <div className="space-y-4">
          <F
            label="Nombre completo"
            value={fm.name}
            onChange={v => setFm({...fm, name:v})}
            placeholder="Juan Pérez"
          />
          <F
            label="Correo electrónico"
            type="email"
            value={fm.email}
            onChange={v => setFm({...fm, email:v})}
            placeholder="correo@ejemplo.com"
          />
          <F
            label={eid ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            type="password"
            value={fm.password}
            onChange={v => setFm({...fm, password:v})}
            placeholder="Mínimo 6 caracteres"
          />
          <div className="grid grid-cols-2 gap-3">
            <F
              label="Rol"
              value={fm.role}
              onChange={v => setFm({...fm, role:v})}
              options={[
                {value:"user",  label:"Usuario"},
                {value:"admin", label:"Administrador"},
              ]}
              disabled={eid === currentUser?.id}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <label className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${fm.active ? "border-emerald-200 bg-emerald-50" : "border-gray-200"}`}>
                <input
                  type="checkbox"
                  checked={!!fm.active}
                  onChange={e => setFm({...fm, active:e.target.checked})}
                  disabled={eid === currentUser?.id}
                  className="rounded accent-teal-600"
                />
                <span className={`text-sm font-medium ${fm.active ? "text-emerald-700" : "text-gray-500"}`}>
                  {fm.active ? "Cuenta activa" : "Cuenta inactiva"}
                </span>
              </label>
            </div>
          </div>

          {!eid && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
              <Shield size={14} className="text-blue-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-700">
                Al crear el usuario se le asignarán categorías de gastos e ingresos por defecto.
                Cada usuario solo puede ver y gestionar sus propios datos.
              </p>
            </div>
          )}

          <Btn full icon={eid ? Check : UserPlus} onClick={save} loading={saving}>
            {eid ? "Actualizar Usuario" : "Crear Usuario"}
          </Btn>
        </div>
      </Modal>

      <Confirm
        open={!!cdel}
        onClose={() => setCdel(null)}
        onConfirm={() => remove(cdel)}
        message="¿Eliminar este usuario? Se eliminarán todos sus datos (cuentas, ingresos, gastos, etc.). Esta acción es irreversible."
      />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// CATEGORIES PAGE
// ══════════════════════════════════════════════════════════════════════════
const CategoriesPage = () => {
  const [tab, setTab] = useState("expense");
  const {data, loading, reload} = useResource(() => categoriesApi.list(), []);
  const [show,   setShow]   = useState(false);
  const [eid,    setEid]    = useState(null);
  const [cdel,   setCdel]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [lT, setLT] = useState(null);
  const blank = {name:"", icon:"📌", color:"#64748B", type:"expense"};
  const [fm, setFm] = useState(blank);

  const showT = (msg, type="success") => setLT({msg,type});
  const open = (item=null) => { setFm(item?{...item}:{...blank,type:tab}); setEid(item?.id??null); setShow(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (eid) await categoriesApi.update(eid,{name:fm.name,icon:fm.icon,color:fm.color,type:fm.type});
      else await categoriesApi.create({name:fm.name,icon:fm.icon,color:fm.color,type:fm.type});
      await reload(); setShow(false); showT(eid?"Categoría actualizada":"Categoría creada");
    } catch(e) { showT(e.message,"error"); } finally { setSaving(false); }
  };

  const remove = async id => {
    try { await categoriesApi.remove(id); await reload(); showT("Categoría eliminada"); }
    catch(e) { showT(e.message,"error"); }
  };

  const filtered = data.filter(c => c.type===tab || c.type==="both");

  const PRESET_COLORS = ["#0D9488","#22C55E","#6366F1","#F59E0B","#EF4444","#EC4899","#8B5CF6","#F97316","#14B8A6","#3B82F6","#06B6D4","#64748B"];
  const PRESET_ICONS  = ["🏠","🍽️","🚗","💡","🏥","📚","🎬","👤","💰","💻","🎁","📈","🏘️","💵","✈️","👕","💳","🔧","🎯","🏦","📌","🛍️","⚡","🎮","🏃","🐾","🌿","🎵"];

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Categorías</h2><p className="text-sm text-gray-500">Personaliza tus categorías de ingresos y gastos</p></div>
        <Btn icon={Plus} onClick={()=>open()}>Nueva Categoría</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Tag}           label="Total"    value={String(data.length)}                                                  color="#0D9488"/>
        <StatCard icon={ArrowDownRight} label="Gastos"  value={String(data.filter(c=>c.type==="expense"||c.type==="both").length)}  color="#EF4444"/>
        <StatCard icon={ArrowUpRight}   label="Ingresos" value={String(data.filter(c=>c.type==="income"||c.type==="both").length)}  color="#22C55E"/>
        <StatCard icon={Hash}           label="Sistema"  value={String(data.filter(c=>c.isDefault).length)}                        color="#6366F1"/>
      </div>
      <Card className="p-5">
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {[{v:"expense",l:"Gastos"},{v:"income",l:"Ingresos"}].map(t => (
            <button key={t.v} onClick={()=>setTab(t.v)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab===t.v?"bg-white text-teal-700 shadow-sm":"text-gray-500"}`}>
              {t.l}
            </button>
          ))}
        </div>
        {loading ? <Spinner/> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{backgroundColor:cat.color+"20"}}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:cat.color}}/>
                    <span className="text-xs text-gray-400">{cat.isDefault?"Sistema":"Personalizada"}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>open(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit3 size={13}/></button>
                  {!cat.isDefault && (
                    <button onClick={()=>setCdel(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13}/></button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length===0 && <p className="col-span-3 text-sm text-gray-400 text-center py-8">No hay categorías. Crea la primera.</p>}
          </div>
        )}
      </Card>
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Categoría":"Nueva Categoría"}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Icono</label>
              <input value={fm.icon} onChange={e=>setFm({...fm,icon:e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-center text-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
            </div>
            <div className="col-span-3"><F label="Nombre" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Ej: Comida rápida"/></div>
          </div>
          <F label="Tipo" value={fm.type} onChange={v=>setFm({...fm,type:v})} options={[{value:"expense",label:"Gasto"},{value:"income",label:"Ingreso"},{value:"both",label:"Ambos"}]}/>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={()=>setFm({...fm,color:c})}
                  className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${fm.color===c?"scale-125 ring-2 ring-offset-1 ring-gray-400":""}`}
                  style={{backgroundColor:c}}/>
              ))}
            </div>
            <input type="color" value={fm.color} onChange={e=>setFm({...fm,color:e.target.value})}
              className="w-full h-9 rounded-xl border border-gray-200 cursor-pointer px-1"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Iconos rápidos</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(ic => (
                <button key={ic} onClick={()=>setFm({...fm,icon:ic})}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all hover:scale-110 ${fm.icon===ic?"bg-teal-100 ring-2 ring-teal-400":"hover:bg-gray-100"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <Btn full icon={Check} onClick={save} loading={saving}>{eid?"Actualizar":"Crear Categoría"}</Btn>
        </div>
      </Modal>
      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)} message="¿Eliminar esta categoría? Los registros existentes no serán afectados."/>
    </div>
  );
};

// ── Helper: Account/Card unified selector ──────────────────────────────────
const useAccountsAndCards = () => {
  const [accounts, setAccounts] = useState([]);
  const [cards,    setCards]    = useState([]);
  useEffect(() => {
    Promise.all([accountsApi.list(), ccApi.list()])
      .then(([a,c]) => { setAccounts(a); setCards(c); })
      .catch(() => {});
  }, []);
  return {accounts, cards};
};

const AccountSelector = ({label="Vincular a cuenta / tarjeta", destType, destId, onChange}) => {
  const {accounts, cards} = useAccountsAndCards();
  const fmt = n => new Intl.NumberFormat("es-DO",{style:"currency",currency:"DOP",minimumFractionDigits:0}).format(n);
  const options = [
    {value:"", label:"Sin vincular (no afecta saldo)"},
    ...accounts.map(a => ({value:`account__${a.id}`, label:`🏦 ${a.name} — Saldo: ${fmt(a.balance)}`})),
    ...cards.map(c    => ({value:`credit_card__${c.id}`, label:`💳 ${c.name} — Deuda: ${fmt(c.balance)}`})),
  ];
  const current = destType && destId ? `${destType}__${destId}` : "";
  const handle = v => {
    if (!v) { onChange("", null); return; }
    const idx = v.indexOf("__");
    const type = v.slice(0, idx);
    const id   = parseInt(v.slice(idx+2));
    onChange(type, id);
  };
  return <F label={label} value={current} onChange={handle} options={options}/>;
};


// ══════════════════════════════════════════════════════════════════════════
// CREDIT LINES PAGE
// ══════════════════════════════════════════════════════════════════════════
const TYPE_LABELS  = {purchase:"Compras",cash_advance:"Avance Efectivo",balance_transfer:"Transferencia Saldo",special:"Especial"};
const TYPE_COLORS  = {purchase:"#0D9488",cash_advance:"#EF4444",balance_transfer:"#6366F1",special:"#F59E0B"};
const TYPE_ICONS   = {purchase:"🛒",cash_advance:"💸",balance_transfer:"🔄",special:"⭐"};
const CURR_SYMBOL  = {DOP:"RD$",USD:"$",EUR:"€"};

const fmtCurr = (amount, currency) => {
  const sym = CURR_SYMBOL[currency] || "RD$";
  return `${sym}${parseFloat(amount||0).toLocaleString("es-DO",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
};

const CreditLinesPage = () => {
  const {data:cards,  loading:loadingCards}  = useResource(ccApi.list, []);
  const {data:lines,  loading:loadingLines, reload} = useResource(creditLinesApi.all, []);
  const [summary, setSummary] = useState([]);
  const [show,    setShow]    = useState(false);
  const [eid,     setEid]     = useState(null);
  const [cdel,    setCdel]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [lT,      setLT]      = useState(null);
  const [filterCard, setFilterCard] = useState("all");

  const blank = {cardId:"", name:"", type:"purchase", currency:"DOP", creditLimit:"", balanceUsed:"", interestRate:"", isActive:true, notes:""};
  const [fm, setFm] = useState(blank);

  useEffect(() => {
    creditLinesApi.summary().then(setSummary).catch(()=>{});
  }, [lines]);

  const showT = (msg, type="success") => setLT({msg,type});

  const open = (item=null) => {
    setFm(item ? {
      cardId:       item.cardId,
      name:         item.name,
      type:         item.type,
      currency:     item.currency,
      creditLimit:  item.creditLimit,
      balanceUsed:  item.balanceUsed,
      interestRate: item.interestRate,
      isActive:     !!item.isActive,
      notes:        item.notes||"",
    } : blank);
    setEid(item?.id ?? null);
    setShow(true);
  };

  const save = async () => {
    if (!fm.cardId)       return showT("Selecciona una tarjeta","error");
    if (!fm.name?.trim()) return showT("El nombre es requerido","error");
    if (!fm.creditLimit)  return showT("El límite es requerido","error");
    setSaving(true);
    try {
      const payload = {
        name:         fm.name.trim(),
        type:         fm.type,
        currency:     fm.currency,
        creditLimit:  parseFloat(fm.creditLimit)||0,
        balanceUsed:  parseFloat(fm.balanceUsed)||0,
        interestRate: parseFloat(fm.interestRate)||0,
        isActive:     fm.isActive ? 1 : 0,
        notes:        fm.notes||null,
      };
      if (eid) await creditLinesApi.update(eid, payload);
      else     await creditLinesApi.create(fm.cardId, payload);
      await reload();
      setShow(false);
      showT(eid ? "Línea actualizada" : "Línea de crédito creada");
    } catch(e) { showT(e.message,"error"); }
    finally { setSaving(false); }
  };

  const remove = async id => {
    try { await creditLinesApi.remove(id); await reload(); showT("Línea eliminada"); }
    catch(e) { showT(e.message,"error"); }
  };

  const filtered = filterCard === "all" ? lines : lines.filter(l => l.cardId == filterCard);
  const totalLines    = lines.length;
  const activeLines   = lines.filter(l => l.isActive).length;
  const dopSummary    = summary.find(s => s.currency === "DOP") || {};
  const usdSummary    = summary.find(s => s.currency === "USD") || {};

  return (
    <div className="space-y-6">
      {lT && <Toast msg={lT.msg} type={lT.type} onClose={()=>setLT(null)}/>}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Líneas de Crédito</h2>
          <p className="text-sm text-gray-500">Gestión de líneas por tarjeta</p>
        </div>
        <Btn icon={Plus} onClick={()=>open()}>Nueva Línea</Btn>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CreditCard}  label="Total líneas"  value={String(totalLines)}  color="#0D9488"/>
        <StatCard icon={Check}       label="Activas"        value={String(activeLines)} color="#22C55E"/>
        {dopSummary.totalLimit > 0 && (
          <StatCard icon={Wallet} label="Disponible RD$"
            value={`RD$${parseFloat(dopSummary.total_available||0).toLocaleString("es-DO",{minimumFractionDigits:0})}`}
            sub={`Usado: RD$${parseFloat(dopSummary.total_used||0).toLocaleString("es-DO",{minimumFractionDigits:0})}`}
            color="#6366F1"/>
        )}
        {usdSummary.totalLimit > 0 && (
          <StatCard icon={CircleDollarSign} label="Disponible USD"
            value={`$${parseFloat(usdSummary.total_available||0).toLocaleString("en-US",{minimumFractionDigits:0})}`}
            sub={`Usado: $${parseFloat(usdSummary.total_used||0).toLocaleString("en-US",{minimumFractionDigits:0})}`}
            color="#F59E0B"/>
        )}
      </div>

      {/* Filter by card */}
      {cards.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setFilterCard("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filterCard==="all"?"bg-teal-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Todas las tarjetas
          </button>
          {cards.map(c => (
            <button key={c.id} onClick={()=>setFilterCard(c.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${filterCard==c.id?"text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              style={filterCard==c.id ? {backgroundColor:c.color} : {}}>
              💳 {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Lines grouped by card */}
      {loadingLines ? <Spinner/> : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard size={40} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm font-semibold text-gray-400">No hay líneas de crédito</p>
          <p className="text-xs text-gray-300 mt-1">Crea la primera línea para una de tus tarjetas</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {cards.filter(c => filtered.some(l => l.cardId == c.id)).map(card => {
            const cardLines = filtered.filter(l => l.cardId == card.id);
            const cardTotalLimit = cardLines.reduce((s,l)=>s+parseFloat(l.creditLimit),0);
            const cardTotalUsed  = cardLines.reduce((s,l)=>s+parseFloat(l.balanceUsed),0);

            return (
              <Card key={card.id} className="overflow-hidden">
                {/* Card Header */}
                <div className="px-5 py-4 flex items-center gap-3" style={{background:`linear-gradient(135deg,${card.color}22,${card.color}11)`}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor:card.color}}>
                    💳
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{card.name}</p>
                    <p className="text-xs text-gray-500">{card.bank} · {cardLines.length} línea{cardLines.length!==1?"s":""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Utilización total</p>
                    <p className={`text-sm font-bold ${cardTotalLimit>0&&cardTotalUsed/cardTotalLimit>0.7?"text-red-600":"text-gray-900"}`}>
                      {cardTotalLimit>0?`${((cardTotalUsed/cardTotalLimit)*100).toFixed(0)}%`:"—"}
                    </p>
                  </div>
                </div>

                {/* Lines Table */}
                <div className="divide-y divide-gray-50">
                  {cardLines.map(line => {
                    const avail = parseFloat(line.creditLimit) - parseFloat(line.balanceUsed);
                    const pct   = parseFloat(line.creditLimit)>0
                      ? (parseFloat(line.balanceUsed)/parseFloat(line.creditLimit))*100 : 0;
                    const intMonth = parseFloat(line.balanceUsed) * (parseFloat(line.interestRate)/100);
                    const sym   = CURR_SYMBOL[line.currency]||"RD$";

                    return (
                      <div key={line.id} className={`p-4 hover:bg-gray-50 transition-colors ${!line.isActive?"opacity-50":""}`}>
                        <div className="flex items-start gap-3">
                          {/* Type icon */}
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{backgroundColor:(TYPE_COLORS[line.type]||"#64748B")+"18"}}>
                            {TYPE_ICONS[line.type]||"💳"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-bold text-gray-900">{line.name}</p>
                              <Badge color={line.isActive?"teal":"gray"}>{line.isActive?"Activa":"Inactiva"}</Badge>
                              {line.currency !== "DOP" && (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{line.currency}</span>
                              )}
                              <Badge color="gray">{TYPE_LABELS[line.type]||line.type}</Badge>
                            </div>

                            {/* Progress bar */}
                            <div className="my-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Usado: <strong>{fmtCurr(line.balanceUsed,line.currency)}</strong></span>
                                <span>Límite: <strong>{fmtCurr(line.creditLimit,line.currency)}</strong></span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{
                                    width:`${Math.min(pct,100)}%`,
                                    backgroundColor: pct>80?"#EF4444":pct>60?"#F59E0B":(TYPE_COLORS[line.type]||"#0D9488")
                                  }}/>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                              <span>Disponible: <strong className="text-emerald-600">{fmtCurr(avail,line.currency)}</strong></span>
                              {parseFloat(line.interestRate)>0 && (
                                <span>Tasa: <strong>{line.interestRate}%</strong>/mes · Interés: <strong className="text-red-500">{fmtCurr(intMonth,line.currency)}</strong></span>
                              )}
                              {line.notes && <span className="text-gray-400 italic">{line.notes}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>open(line)}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors">
                              <Edit3 size={14}/>
                            </button>
                            <button onClick={()=>setCdel(line.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={show} onClose={()=>setShow(false)} title={eid?"Editar Línea de Crédito":"Nueva Línea de Crédito"} wide>
        <div className="space-y-4">

          {!eid && (
            <F label="Tarjeta" value={fm.cardId} onChange={v=>setFm({...fm,cardId:v})}
              options={[{value:"",label:"Selecciona una tarjeta"},...cards.map(c=>({value:c.id,label:`💳 ${c.name} — ${c.bank}`}))]}/>
          )}
          {eid && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
              💳 {cards.find(c=>c.id==fm.cardId)?.name || "Tarjeta"}
            </div>
          )}

          <F label="Nombre de la línea" value={fm.name} onChange={v=>setFm({...fm,name:v})} placeholder="Ej: Línea de compras en USD"/>

          <div className="grid grid-cols-2 gap-3">
            <F label="Tipo" value={fm.type} onChange={v=>setFm({...fm,type:v})}
              options={Object.entries(TYPE_LABELS).map(([k,v])=>({value:k,label:`${TYPE_ICONS[k]} ${v}`}))}/>
            <F label="Moneda" value={fm.currency} onChange={v=>setFm({...fm,currency:v})}
              options={[{value:"DOP",label:"🇩🇴 Peso (DOP)"},{value:"USD",label:"🇺🇸 Dólar (USD)"},{value:"EUR",label:"🇪🇺 Euro (EUR)"}]}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label={`Límite (${fm.currency})`} type="number" step="0.01"
              prefix={CURR_SYMBOL[fm.currency]||"RD$"}
              value={fm.creditLimit} onChange={v=>setFm({...fm,creditLimit:v})}
              placeholder="50000"/>
            <F label={`Balance usado (${fm.currency})`} type="number" step="0.01"
              prefix={CURR_SYMBOL[fm.currency]||"RD$"}
              value={fm.balanceUsed} onChange={v=>setFm({...fm,balanceUsed:v})}
              placeholder="0"/>
          </div>

          <F label="Tasa de interés mensual (%)" type="number" step="0.01"
            value={fm.interestRate} onChange={v=>setFm({...fm,interestRate:v})}
            placeholder="Ej: 3.49"/>

          {fm.creditLimit && fm.balanceUsed && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Disponible</span>
                <span className="font-bold text-emerald-600">
                  {fmtCurr(parseFloat(fm.creditLimit||0)-parseFloat(fm.balanceUsed||0), fm.currency)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full bg-teal-500"
                  style={{width:`${Math.min(parseFloat(fm.creditLimit)>0?(parseFloat(fm.balanceUsed)/parseFloat(fm.creditLimit))*100:0,100)}%`}}/>
              </div>
              {parseFloat(fm.interestRate)>0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Interés mensual estimado: <strong className="text-red-500">
                    {fmtCurr(parseFloat(fm.balanceUsed||0)*(parseFloat(fm.interestRate||0)/100), fm.currency)}
                  </strong>
                </p>
              )}
            </div>
          )}

          <F label="Notas (opcional)" value={fm.notes} onChange={v=>setFm({...fm,notes:v})}
            placeholder="Ej: Solo para compras en Amazon"/>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={!!fm.isActive} onChange={e=>setFm({...fm,isActive:e.target.checked})} className="rounded accent-teal-600"/>
            <span className="text-sm text-gray-600">Línea activa</span>
          </label>

          <Btn full icon={Check} onClick={save} loading={saving}>
            {eid ? "Actualizar Línea" : "Crear Línea"}
          </Btn>
        </div>
      </Modal>

      <Confirm open={!!cdel} onClose={()=>setCdel(null)} onConfirm={()=>remove(cdel)}
        message="¿Eliminar esta línea de crédito? Esta acción no se puede deshacer."/>
    </div>
  );
};


// ══════════════════════════════════════════════════════════════════════════
// AI ASSISTANT — CHAT FINANCIERO
// ══════════════════════════════════════════════════════════════════════════



// ══════════════════════════════════════════════════════════════════════════
// AI CHAT WIDGET — reutilizable en página y flotante
// ══════════════════════════════════════════════════════════════════════════
const useAiChat = () => {
  const [messages,    setMessages]    = useState([{
    role:"assistant",
    content:"¡Hola! 👋 Soy tu asistente financiero. Puedo registrar gastos e ingresos, analizar tus finanzas, calcular proyecciones y darte consejos.\n\n¿En qué te puedo ayudar?",
    ts: new Date(),
  }]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [needsReload, setNeedsReload] = useState(false);

  useEffect(() => {
    aiApi.suggestions().then(s => setSuggestions(s||[])).catch(()=>{});
  }, []);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");
    const userMsg    = { role:"user", content, ts: new Date() };
    const newMessages = [...messages.filter(m=>m.role!=="system"), userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const apiMessages = newMessages.map(({role,content})=>({role,content}));
      const res = await aiApi.chat(apiMessages);
      setMessages(prev => [...prev, { role:"assistant", content:res.reply, toolResults:res.toolResults, ts:new Date() }]);
      const mutatingFns = ["registrar_gasto","registrar_ingreso"];
      if (res.toolResults?.some(t => mutatingFns.includes(t.fn) && t.result?.ok)) setNeedsReload(true);
    } catch(e) {
      setMessages(prev => [...prev, { role:"assistant", content:`❌ Error: ${e.message}`, isError:true, ts:new Date() }]);
    } finally { setLoading(false); }
  };

  const clearChat = () => {
    setMessages([{ role:"assistant", content:"Chat reiniciado. ¿En qué te puedo ayudar?", ts:new Date() }]);
    setNeedsReload(false);
  };

  return { messages, input, setInput, loading, suggestions, needsReload, sendMessage, clearChat };
};

const AiChatContent = ({ messages, input, setInput, loading, suggestions, needsReload, sendMessage, clearChat, compact=false }) => {
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fmtTime   = ts => ts ? new Date(ts).toLocaleTimeString("es-DO",{hour:"2-digit",minute:"2-digit"}) : "";
  const MutFns    = { registrar_gasto:"Gasto registrado", registrar_ingreso:"Ingreso registrado" };

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);

  const handleKey = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Asistente MoneyHub</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/>
              Groq · Llama 3.3
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {needsReload && (
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
              <Check size={10}/> Guardado
            </span>
          )}
          <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Limpiar chat">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
        {messages.length === 1 && suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-400 font-medium px-1">💡 Sugerencias</p>
            {suggestions.slice(0,3).map((s,i) => (
              <button key={i} onClick={()=>sendMessage(s)}
                className="w-full text-left px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 text-xs text-gray-700 transition-all shadow-sm">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg,i) => (
          <div key={i} className={`flex gap-2 ${msg.role==="user"?"flex-row-reverse":""}`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0 self-end
              ${msg.role==="user"?"bg-gradient-to-br from-teal-500 to-emerald-600":"bg-gradient-to-br from-violet-500 to-purple-600"}`}>
              {msg.role==="user"?"Tú":<Bot size={12}/>}
            </div>
            <div className={`max-w-[82%] space-y-1.5 flex flex-col ${msg.role==="user"?"items-end":"items-start"}`}>
              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed
                ${msg.role==="user"
                  ?"bg-teal-600 text-white rounded-tr-sm"
                  :msg.isError
                    ?"bg-red-50 text-red-700 border border-red-200 rounded-tl-sm"
                    :"bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"}`}>
                {msg.content.split("\n").map((line,j,arr) => (
                  <span key={j}>{line}{j<arr.length-1&&<br/>}</span>
                ))}
              </div>
              {msg.toolResults?.filter(t=>MutFns[t.fn]&&t.result?.ok).map((t,j) => (
                <div key={j} className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                  <Check size={10}/> {MutFns[t.fn]}
                </div>
              ))}
              <span className="text-[9px] text-gray-300 px-1">{fmtTime(msg.ts)}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-white"/>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1">
                {[0,1,2].map(i=>(
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{animationDelay:`${i*150}ms`}}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-1.5 bg-white border-t border-gray-50 flex gap-1.5 overflow-x-auto shrink-0">
        {["Registra un gasto","¿Mi balance?","Analiza gastos","Dame un consejo"].map((q,i)=>(
          <button key={i} onClick={()=>sendMessage(q)}
            className="shrink-0 px-2.5 py-1 bg-gray-50 hover:bg-violet-50 hover:text-violet-700 border border-gray-200 hover:border-violet-200 rounded-lg text-[10px] font-medium text-gray-500 transition-all whitespace-nowrap">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 max-h-24 overflow-y-auto"
            style={{lineHeight:"1.5"}}
          />
          <button onClick={()=>sendMessage()} disabled={!input.trim()||loading}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
            <Send size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AI Page (full page view) ───────────────────────────────────────────────
const AiPage = () => {
  const chat = useAiChat();
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -m-4 lg:-m-6">
      <AiChatContent {...chat}/>
    </div>
  );
};

// ── Floating AI Button (visible en todas las páginas) ─────────────────────
const FloatingAiBtn = () => {
  const [open, setOpen] = useState(false);
  const chat = useAiChat();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={()=>setOpen(o=>!o)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        title="Asistente IA">
        {open ? <X size={22}/> : <Sparkles size={22}/>}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"/>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-[360px] h-[560px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          style={{maxHeight:"calc(100vh - 120px)"}}>
          <AiChatContent {...chat}/>
        </div>
      )}

      {/* Backdrop on mobile */}
      {open && (
        <div className="fixed inset-0 z-[55] bg-black/20 lg:hidden" onClick={()=>setOpen(false)}/>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// LOAN CALCULATOR PAGE
// ══════════════════════════════════════════════════════════════════════════
const LoanCalculatorPage = () => {
  const [form, setForm] = useState({
    amount:     "",
    rate:       "",
    months:     "",
    system:     "french",   // french | german | american | fixed
    startDate:  new Date().toISOString().split("T")[0],
  });
  const [result,   setResult]   = useState(null);
  const [showTable,setShowTable]= useState(false);
  const [tab,      setTab]      = useState("french");

  const SYSTEMS = [
    { key:"french",   label:"🇫🇷 Sistema Francés",   desc:"Cuota fija, interés decrece y capital aumenta" },
    { key:"german",   label:"🇩🇪 Sistema Alemán",    desc:"Capital fijo, cuota decrece con el tiempo" },
    { key:"american", label:"🇺🇸 Sistema Americano", desc:"Solo intereses hasta el final, capital al vencimiento" },
    { key:"fixed",    label:"📋 Cuota Fija Simple",  desc:"Interés sobre capital original, cuota constante" },
  ];

  const calculate = () => {
    const P  = parseFloat(form.amount);
    const r  = parseFloat(form.rate) / 100;        // tasa mensual
    const n  = parseInt(form.months);
    if (!P || !r || !n) return;

    let schedule = [];
    let totalInterest = 0;
    let totalPayment  = 0;

    if (form.system === "french") {
      // Cuota fija: PMT = P * r / (1 - (1+r)^-n)
      const pmt = r === 0 ? P/n : P * r / (1 - Math.pow(1+r, -n));
      let balance = P;
      for (let i = 1; i <= n; i++) {
        const interest = balance * r;
        const principal = pmt - interest;
        balance = Math.max(0, balance - principal);
        totalInterest += interest;
        totalPayment  += pmt;
        schedule.push({ period:i, payment:pmt, principal, interest, balance });
      }
    }
    else if (form.system === "german") {
      // Capital fijo: cuota = P/n + interés sobre saldo
      const principalPmt = P / n;
      let balance = P;
      for (let i = 1; i <= n; i++) {
        const interest = balance * r;
        const payment  = principalPmt + interest;
        balance = Math.max(0, balance - principalPmt);
        totalInterest += interest;
        totalPayment  += payment;
        schedule.push({ period:i, payment, principal:principalPmt, interest, balance });
      }
    }
    else if (form.system === "american") {
      // Solo intereses periódicos + capital al final
      const interest = P * r;
      for (let i = 1; i <= n; i++) {
        const isLast = i === n;
        const payment = isLast ? P + interest : interest;
        const principal = isLast ? P : 0;
        totalInterest += interest;
        totalPayment  += payment;
        schedule.push({ period:i, payment, principal, interest, balance: isLast ? 0 : P });
      }
    }
    else if (form.system === "fixed") {
      // Interés simple sobre capital original
      const interest = P * r;
      const payment  = P/n + interest;
      let balance    = P;
      for (let i = 1; i <= n; i++) {
        const principal = P / n;
        balance = Math.max(0, balance - principal);
        totalInterest += interest;
        totalPayment  += payment;
        schedule.push({ period:i, payment, principal, interest, balance });
      }
    }

    setResult({ schedule, totalInterest, totalPayment, principal: P, months: n, rate: r*100 });
    setShowTable(false);
  };

  const fmt     = n => new Intl.NumberFormat("es-DO",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
  const fmtDOP  = n => `RD$${fmt(n)}`;
  const getDate = (startDate, period) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + period);
    return d.toLocaleDateString("es-DO",{month:"short",year:"2-digit"});
  };

  // Comparison of all systems
  const compareAll = () => {
    const P = parseFloat(form.amount);
    const r = parseFloat(form.rate) / 100;
    const n = parseInt(form.months);
    if (!P || !r || !n) return null;

    return SYSTEMS.map(sys => {
      let totalInt = 0, firstPayment = 0, lastPayment = 0;
      if (sys.key === "french") {
        const pmt = P * r / (1 - Math.pow(1+r, -n));
        let bal = P;
        for (let i=1;i<=n;i++) { const int=bal*r; bal=Math.max(0,bal-(pmt-int)); totalInt+=int; }
        firstPayment = pmt; lastPayment = pmt;
      } else if (sys.key === "german") {
        const pp = P/n;
        totalInt = [...Array(n)].reduce((s,_,i) => s + (P - pp*i)*r, 0);
        firstPayment = pp + P*r;
        lastPayment  = pp + pp*r;
      } else if (sys.key === "american") {
        totalInt = P*r*n;
        firstPayment = P*r;
        lastPayment  = P + P*r;
      } else {
        const int = P*r;
        totalInt = int*n;
        firstPayment = P/n + int;
        lastPayment  = firstPayment;
      }
      return { ...sys, totalInt, totalPayment: P+totalInt, firstPayment, lastPayment };
    });
  };

  const comparison = compareAll();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Calculadora de Préstamos</h2>
          <p className="text-sm text-gray-500">Simula y compara diferentes sistemas de amortización</p>
        </div>
      </div>

      {/* System selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SYSTEMS.map(s => (
          <button key={s.key} onClick={()=>{ setForm({...form,system:s.key}); setTab(s.key); setResult(null); }}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${form.system===s.key?"border-teal-500 bg-teal-50":"border-gray-100 bg-white hover:border-gray-200 shadow-sm"}`}>
            <p className="text-sm font-bold mb-1">{s.label}</p>
            <p className="text-xs text-gray-500 leading-tight">{s.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator size={18} className="text-teal-600"/>Datos del Préstamo
          </h3>
          <div className="space-y-4">
            <F label="Monto del préstamo" type="number" prefix="RD$" value={form.amount}
              onChange={v=>setForm({...form,amount:v})} placeholder="500,000"/>
            <F label="Tasa de interés mensual (%)" type="number" step="0.01" value={form.rate}
              onChange={v=>setForm({...form,rate:v})} placeholder="1.8"/>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
              {form.rate && `Equivale a ${(parseFloat(form.rate)*12||0).toFixed(2)}% anual`}
            </div>
            <F label="Plazo (meses)" type="number" value={form.months}
              onChange={v=>setForm({...form,months:v})} placeholder="60"/>
            <div className="flex gap-2 flex-wrap">
              {[12,24,36,48,60,72,84].map(m=>(
                <button key={m} onClick={()=>setForm({...form,months:String(m)})}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all
                    ${form.months==m?"bg-teal-600 text-white border-teal-600":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300"}`}>
                  {m}m
                </button>
              ))}
            </div>
            <F label="Fecha de inicio" type="date" value={form.startDate}
              onChange={v=>setForm({...form,startDate:v})}/>
            <Btn full icon={Calculator} onClick={calculate}>Calcular</Btn>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 bg-gradient-to-br from-teal-500 to-emerald-600 text-white !border-0">
                  <p className="text-xs opacity-80 mb-1">
                    {form.system==="french"?"Cuota Fija":form.system==="german"?"1ra Cuota":form.system==="american"?"Cuota Mensual":"Cuota Fija"}
                  </p>
                  <p className="text-2xl font-bold">{fmtDOP(result.schedule[0]?.payment)}</p>
                  {form.system==="german"&&<p className="text-xs opacity-70 mt-1">Última: {fmtDOP(result.schedule[result.schedule.length-1]?.payment)}</p>}
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtDOP(result.totalPayment)}</p>
                  <p className="text-xs text-gray-400 mt-1">Capital: {fmtDOP(result.principal)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Total intereses</p>
                  <p className="text-xl font-bold text-red-600">{fmtDOP(result.totalInterest)}</p>
                  <p className="text-xs text-gray-400 mt-1">{((result.totalInterest/result.principal)*100).toFixed(1)}% del capital</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Plazo</p>
                  <p className="text-xl font-bold text-gray-900">{result.months} meses</p>
                  <p className="text-xs text-gray-400 mt-1">{(result.months/12).toFixed(1)} años</p>
                </Card>
              </div>

              {/* Progress bar - capital vs interest */}
              <Card className="p-4">
                <p className="text-xs font-semibold text-gray-600 mb-3">Distribución del pago total</p>
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div className="h-full bg-teal-500 transition-all"
                    style={{width:`${(result.principal/result.totalPayment*100).toFixed(1)}%`}}/>
                  <div className="h-full bg-red-400 flex-1"/>
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"/>Capital {(result.principal/result.totalPayment*100).toFixed(1)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>Intereses {(result.totalInterest/result.totalPayment*100).toFixed(1)}%</span>
                </div>
              </Card>

              {/* Amortization table toggle */}
              <Card className="overflow-hidden">
                <button onClick={()=>setShowTable(t=>!t)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-900 flex items-center gap-2">
                    <Table size={16} className="text-teal-600"/>
                    Tabla de Amortización ({result.schedule.length} cuotas)
                  </span>
                  <ChevronDownIcon size={18} className={`text-gray-400 transition-transform ${showTable?"rotate-180":""}`}/>
                </button>
                {showTable && (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold">#</th>
                          <th className="py-2 px-3 text-left text-gray-500 font-semibold hidden sm:table-cell">Fecha</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-semibold">Cuota</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-semibold">Capital</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-semibold">Interés</th>
                          <th className="py-2 px-3 text-right text-gray-500 font-semibold">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {result.schedule.map(row=>(
                          <tr key={row.period} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-semibold text-gray-600">{row.period}</td>
                            <td className="py-2 px-3 text-gray-400 hidden sm:table-cell">{getDate(form.startDate,row.period)}</td>
                            <td className="py-2 px-3 text-right font-semibold">{fmt(row.payment)}</td>
                            <td className="py-2 px-3 text-right text-teal-600">{fmt(row.principal)}</td>
                            <td className="py-2 px-3 text-right text-red-500">{fmt(row.interest)}</td>
                            <td className="py-2 px-3 text-right text-gray-500">{fmt(row.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                        <tr>
                          <td colSpan={2} className="py-2 px-3 hidden sm:table-cell">Total</td>
                          <td className="py-2 px-3 text-right">{fmt(result.totalPayment)}</td>
                          <td className="py-2 px-3 text-right text-teal-600">{fmt(result.principal)}</td>
                          <td className="py-2 px-3 text-right text-red-500">{fmt(result.totalInterest)}</td>
                          <td className="py-2 px-3 text-right">—</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <Calculator size={48} className="mx-auto mb-4 text-gray-200"/>
              <p className="text-sm font-semibold text-gray-400">Ingresa los datos del préstamo</p>
              <p className="text-xs text-gray-300 mt-1">Selecciona un sistema y presiona Calcular</p>
            </Card>
          )}

          {/* Comparison table */}
          {comparison && form.amount && form.rate && form.months && (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUpIcon size={16} className="text-indigo-500"/>
                  Comparación de Sistemas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left text-gray-500 font-semibold">Sistema</th>
                      <th className="py-2 px-4 text-right text-gray-500 font-semibold">1ra Cuota</th>
                      <th className="py-2 px-4 text-right text-gray-500 font-semibold">Última Cuota</th>
                      <th className="py-2 px-4 text-right text-gray-500 font-semibold">Total Interés</th>
                      <th className="py-2 px-4 text-right text-gray-500 font-semibold">Total Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comparison.map(c=>(
                      <tr key={c.key} className={`hover:bg-gray-50 ${form.system===c.key?"bg-teal-50":""}`}>
                        <td className="py-3 px-4">
                          <p className="font-semibold">{c.label}</p>
                          <p className="text-gray-400 text-[10px]">{c.desc}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{fmt(c.firstPayment)}</td>
                        <td className="py-3 px-4 text-right">{fmt(c.lastPayment)}</td>
                        <td className="py-3 px-4 text-right text-red-500 font-semibold">{fmt(c.totalInt)}</td>
                        <td className="py-3 px-4 text-right font-bold">{fmt(c.totalPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  ✅ El sistema más económico en intereses es el <strong>Alemán</strong> · El de cuota más estable es el <strong>Francés</strong>
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV = [
  {key:"dashboard",    label:"Dashboard",     icon:LayoutDashboard},
  {key:"accounts",     label:"Cuentas",        icon:Building2},
  {key:"incomes",      label:"Ingresos",       icon:ArrowUpRight},
  {key:"expenses",     label:"Gastos",         icon:ArrowDownRight},
  {key:"cards",        label:"Tarjetas",       icon:CreditCard},
  {key:"credit-lines",  label:"Lineas Credito", icon:ArrowLeftRight},
  {key:"debts",        label:"Deudas",         icon:TrendingDown},
  {key:"budget",       label:"Presupuesto",    icon:Wallet},
  {key:"savings",      label:"Ahorro",         icon:PiggyBank},
  {key:"transactions", label:"Transacciones",  icon:Receipt},
  {key:"categories",   label:"Categorias",     icon:Tag},
  {key:"users",        label:"Usuarios",       icon:Users, adminOnly:true},
  {key:"ai",           label:"Asistente IA",   icon:Sparkles},
  {key:"loan-calc",     label:"Calc. Prestamos", icon:Calculator},
  {key:"settings",     label:"Configuracion",  icon:Settings},
];

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [page,    setPage]    = useState("dashboard");
  const [sb,      setSb]      = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [dark,    setDark]    = useState(() => {
    const saved = localStorage.getItem("frd_dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("frd_dark", dark);
  }, [dark]);

  const showToast = useCallback((msg, type="success") => setToast({msg,type}), []);

  useEffect(() => {
    const init = async () => {
      if (auth.isLoggedIn()) {
        try { const u = await auth.profile(); setUser(u); }
        catch  { auth.clearToken(); }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin  = useCallback((u) => { setUser(u); setPage("dashboard"); }, []);
  const handleLogout = useCallback(() => { auth.logout(); setUser(null); setPage("dashboard"); }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-500">Iniciando MoneyHub...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={handleLogin}/>;

  const renderPage = () => {
    switch(page) {
      case "dashboard":    return <Dashboard toast={showToast}/>;
      case "accounts":     return <AccountsPage/>;
      case "incomes":      return <IncomesPage/>;
      case "expenses":     return <ExpensesPage/>;
      case "cards":        return <CreditCardsPage/>;
      case "credit-lines":  return <CreditLinesPage/>;
      case "debts":        return <DebtsPage/>;
      case "budget":       return <BudgetPage/>;
      case "savings":      return <SavingsPage/>;
      case "transactions": return <TransactionsPage/>;
      case "categories":   return <CategoriesPage/>;
      case "users":        return <UsersPage currentUser={user}/>;
      case "ai":           return <AiPage/>;
      case "loan-calc":    return <LoanCalculatorPage/>;
      case "settings":     return <SettingsPage user={user} onLogout={handleLogout}/>;
      default:             return <Dashboard toast={showToast}/>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {sb && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={()=>setSb(false)}/>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform lg:translate-x-0 ${sb?"translate-x-0":"-translate-x-full"}`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <DollarSign size={18} className="text-white"/>
            </div>
            <div>
              <h1 className="text-base font-bold">MoneyHub</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide">GESTIÓN FINANCIERA</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
          {NAV.filter(n => !n.adminOnly || user?.role==="admin").map(n => (
            <button key={n.key} onClick={() => { setPage(n.key); setSb(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page===n.key?"bg-teal-50 text-teal-700":"text-gray-500 hover:bg-gray-50"}`}>
              <n.icon size={18} className={page===n.key?"text-teal-600":""}/>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
              {(user.name||"U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={()=>setDark(d=>!d)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
              title={dark?"Modo claro":"Modo oscuro"}>
              {dark
                ? <Sun  size={14} className="text-amber-400"/>
                : <Moon size={14} className="text-gray-400"/>
              }
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button onClick={()=>setSb(true)} className="lg:hidden w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <Menu size={20} className="text-gray-600"/>
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold lg:text-base">{NAV.find(n=>n.key===page)?.label}</h2>
          </div>
          <span className="text-xs text-gray-400 hidden sm:inline">
            {TODAY.toLocaleDateString("es-DO",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </span>
          <button
            onClick={()=>setDark(d=>!d)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
            title={dark?"Cambiar a modo claro":"Cambiar a modo oscuro"}>
            {dark
              ? <Sun  size={18} className="text-amber-400"/>
              : <Moon size={18} className="text-gray-500"/>
            }
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-6">{renderPage()}</div>
      </main>
      {page !== "ai" && <FloatingAiBtn/>}
    </div>
  );
}
