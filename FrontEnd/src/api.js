// src/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

const getToken    = () => localStorage.getItem("frd_token");
const setToken    = t  => localStorage.setItem("frd_token", t);
const clearToken  = ()  => localStorage.removeItem("frd_token");

const request = async (method, path, body=null, isPublic=false) => {
  const headers = {"Content-Type":"application/json"};
  if (!isPublic) { const t=getToken(); if(t) headers["Authorization"]=`Bearer ${t}`; }
  const res = await fetch(`${BASE}${path}`, { method, headers, ...(body?{body:JSON.stringify(body)}:{}) });
  if (res.status===204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message||"Error en la solicitud");
  return json.data??json;
};

const get     = p       => request("GET",    p);
const post    = (p,b)   => request("POST",   p, b);
const put     = (p,b)   => request("PUT",    p, b);
const patch   = (p,b)   => request("PATCH",  p, b);
const del     = p       => request("DELETE", p);
const postPub = (p,b)   => request("POST",   p, b, true);

// AUTH
export const auth = {
  register:  d => postPub("/auth/register", d),
  login:     d => postPub("/auth/login", d),
  profile:   () => get("/auth/profile"),
  logout:    () => clearToken(),
  setToken, getToken, clearToken,
  isLoggedIn: () => !!getToken(),
};

// ADMIN — USERS
export const adminUsers = {
  list:         ()       => get("/admin/users"),
  get:          id       => get(`/admin/users/${id}`),
  stats:        id       => get(`/admin/users/${id}/stats`),
  create:       d        => post("/admin/users", d),
  update:       (id,d)   => put(`/admin/users/${id}`, d),
  remove:       id       => del(`/admin/users/${id}`),
  toggle:       id       => patch(`/admin/users/${id}/toggle`, {}),
};

// CATEGORIES
export const categoriesApi = {
  list:   (type) => get(`/categories${type?`?type=${type}`:""}`),
  create: d      => post("/categories", d),
  update: (id,d) => put(`/categories/${id}`, d),
  remove: id     => del(`/categories/${id}`),
};

// DASHBOARD
export const dashboard = {
  stats:  () => get("/dashboard"),
  budget: () => get("/dashboard/budget"),
};

// ACCOUNTS
export const accounts = {
  list:    ()        => get("/accounts"),
  create:  d         => post("/accounts", d),
  update:  (id,d)    => put(`/accounts/${id}`, d),
  remove:  id        => del(`/accounts/${id}`),
  history: accountId => get(`/accounts/${accountId}/history`),
};

// CREDIT CARDS
export const creditCards = {
  list:    ()      => get("/credit-cards"),
  create:  d       => post("/credit-cards", d),
  update:  (id,d)  => put(`/credit-cards/${id}`, d),
  remove:  id      => del(`/credit-cards/${id}`),
  payment: d       => post("/credit-cards/payment", d),
};

// DEBTS
export const debtsApi = {
  list:    ()      => get("/debts"),
  create:  d       => post("/debts", d),
  update:  (id,d)  => put(`/debts/${id}`, d),
  remove:  id      => del(`/debts/${id}`),
  payment: d       => post("/debts/payment", d),
};

// INCOMES
export const incomesApi = {
  list:   ()      => get("/incomes"),
  create: d       => post("/incomes", d),
  update: (id,d)  => put(`/incomes/${id}`, d),
  remove: id      => del(`/incomes/${id}`),
};

// EXPENSES
export const expensesApi = {
  list:   ()      => get("/expenses"),
  create: d       => post("/expenses", d),
  update: (id,d)  => put(`/expenses/${id}`, d),
  remove: id      => del(`/expenses/${id}`),
};

// SAVINGS
export const savingsApi = {
  list:   ()      => get("/savings"),
  create: d       => post("/savings", d),
  update: (id,d)  => put(`/savings/${id}`, d),
  remove: id      => del(`/savings/${id}`),
};

// BUDGETS
export const budgetsApi = {
  get:  (month,year) => get(`/budgets?month=${month}&year=${year}`),
  save: d            => post("/budgets", d),
};

// HISTORY
export const historyApi = { list: () => get("/history") };

// CREDIT LINES
export const creditLinesApi = {
  all:          ()         => get("/credit-lines"),
  summary:      ()         => get("/credit-lines/summary"),
  byCard:       cardId     => get(`/credit-cards/${cardId}/lines`),
  create:       (cardId,d) => post(`/credit-cards/${cardId}/lines`, d),
  update:       (id,d)     => put(`/credit-lines/${id}`, d),
  remove:       id         => del(`/credit-lines/${id}`),
};

// AI ASSISTANT
export const aiApi = {
  chat:        messages => post("/ai/chat", { messages }),
  suggestions: ()       => get("/ai/suggestions"),
};
