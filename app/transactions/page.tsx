"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Users,
  PieChart,
  LogOut,
  Search,
  Bell,
  Settings,
  TrendingUp,
  ShoppingBag,
  CalendarDays,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";

export default function TransactionsDashboard() {
  const [activeFilter, setActiveFilter] = useState("All Orders");

  return (
    <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-700 antialiased selection:bg-primary/10">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-primary flex flex-col justify-between p-6 text-white/80 shrink-0 shadow-2xl">
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-lg p-1.5 flex items-center justify-center border border-white/5">
              <UtensilsCrossed className="text-accent-gold" size={24} />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-white tracking-tight">
                Venuti's
              </h1>
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mt-1">
                Gourmet Admin
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            <SidebarLink icon={LayoutDashboard} label="Dashboard" />
            <SidebarLink icon={ReceiptText} label="Transactions" active />
            <SidebarLink icon={Package} label="Inventory" />
            <SidebarLink icon={Users} label="Customers" />
            <SidebarLink icon={PieChart} label="Reports" />
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 group cursor-pointer hover:bg-white/10 transition-all">
            <div
              className="size-9 rounded-full bg-cover bg-center border border-white/20"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCw0_zVXlyrTjYCc_VcgqJfzdB0Mm0zkkbwJvl67WC5wOPYN9NdU41M41BkHSreLlH-zY6N4iU84Kt5Hvs9eIvVyqY4f2paCw8Wa1G_H02rz2M-J4JJWu4LGypt5v_snrEr_MatqawCyY3bqK-_KhKknFbUMD2BzNC-G5rzCX5WhvZ9LUzK5XQ_1MreudM3sFZrk-cyc59E3tadHGRMU9PROjYS-RFm_nF7d3RoGYxS79T_pSIoFrOZDEg0qGo1Sj-pJw5U5RlaBzg')",
              }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none text-white">
                A. Venuti
              </span>
              <span className="text-[10px] text-white/40 uppercase tracking-tighter font-bold">
                Store Owner
              </span>
            </div>
          </div>
          <button className="flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white transition-colors group">
            <LogOut
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-border-light bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
                size={18}
              />
              <input
                className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400 outline-none"
                placeholder="Search order ID, customer name..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IconButton icon={Bell} />
            <IconButton icon={Settings} />
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
          {/* Top KPI Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPIColCard
              label="Total Revenue"
              value="$42,850.12"
              trend="12.5%"
              trendUp={true}
            />
            <KPIGaugeCard
              label="Orders Today"
              value="158"
              progress={78}
              sub="78% of daily target"
            />
            <KPICustomersCard label="Avg. Order Value" value="$271.20" />
          </section>

          {/* Transactions Table Section */}
          <section className="flex flex-col bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm shadow-slate-200/50">
            {/* Table Header / Filters */}
            <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-light">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Manage and monitor latest store orders
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-slate-50 rounded-xl p-1 border border-border-light">
                  {["All Orders", "Pending", "Shipped"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === filter ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <CalendarDays size={14} />
                  Oct 1 - Oct 31
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">
                  <Filter size={14} />
                  Filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-border-light">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  <TransactionRow
                    id="#VG-8829"
                    name="Alessandro Venuti"
                    initials="AV"
                    date="Oct 24, 2023"
                    amount="142.50"
                    status="Delivered"
                  />
                  <TransactionRow
                    id="#VG-8830"
                    name="Sophia Martinez"
                    initials="SM"
                    date="Oct 24, 2023"
                    amount="89.10"
                    status="Shipped"
                  />
                  <TransactionRow
                    id="#VG-8831"
                    name="Julian Rossi"
                    initials="JR"
                    date="Oct 24, 2023"
                    amount="315.00"
                    status="Pending"
                  />
                  <TransactionRow
                    id="#VG-8832"
                    name="Luca Bianchi"
                    initials="LB"
                    date="Oct 23, 2023"
                    amount="210.45"
                    status="Delivered"
                  />
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Showing 5 of 1,248 transactions
              </span>
              <div className="flex items-center gap-2">
                <PaginationArrow icon={ChevronLeft} />
                <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-black shadow-md shadow-primary/20">
                  1
                </button>
                <button className="size-8 flex items-center justify-center rounded-lg border border-border-light bg-white text-slate-500 text-xs font-bold hover:text-primary transition-colors">
                  2
                </button>
                <PaginationArrow icon={ChevronRight} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---

function SidebarLink({ icon: Icon, label, active = false }: any) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active ? "bg-white/10 text-white shadow-inner" : "hover:bg-white/5 text-white/70 hover:text-white"}`}
    >
      <Icon
        size={20}
        className={
          active
            ? "text-accent-gold"
            : "text-white/40 group-hover:text-accent-gold transition-colors"
        }
      />
      <span className={`text-sm ${active ? "font-bold" : "font-semibold"}`}>
        {label}
      </span>
    </a>
  );
}

function KPIColCard({ label, value, trend, trendUp }: any) {
  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-white border-l-4 border-accent-gold shadow-sm border border-border-light hover:translate-y-[-2px] transition-transform">
      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </span>
        <h2 className="text-3xl font-black text-slate-800">{value}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
          >
            <TrendingUp size={10} className="mr-1" /> {trend}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            vs last month
          </span>
        </div>
      </div>
      <ReceiptText
        className="absolute -right-4 -bottom-4 opacity-[0.03] text-accent-gold"
        size={120}
      />
    </div>
  );
}

function KPIGaugeCard({ label, value, progress, sub }: any) {
  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-white border-l-4 border-accent-gold shadow-sm border border-border-light">
      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </span>
        <h2 className="text-3xl font-black text-slate-800">{value}</h2>
        <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-accent-gold h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">
          {sub}
        </span>
      </div>
      <ShoppingBag
        className="absolute -right-4 -bottom-4 opacity-[0.03] text-accent-gold"
        size={120}
      />
    </div>
  );
}

function KPICustomersCard({ label, value }: any) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-border-light shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-colors">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </span>
        <h2 className="text-3xl font-black mt-1 text-slate-800">{value}</h2>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex -space-x-2">
          {[24, 25, 26].map((i) => (
            <div
              key={i}
              className="size-8 rounded-full border-2 border-white bg-slate-200 bg-cover shadow-sm"
              style={{
                backgroundImage: `url('http://googleusercontent.com/profile/picture/${i}')`,
              }}
            />
          ))}
          <div className="size-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            +12
          </div>
        </div>
        <span className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-0.5">
          VIP Segments
        </span>
      </div>
    </div>
  );
}

function TransactionRow({ id, name, initials, date, amount, status }: any) {
  const statusStyles: any = {
    Delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Shipped: "bg-blue-50 text-blue-600 border-blue-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group cursor-pointer">
      <td className="px-6 py-4 text-sm font-bold text-primary">{id}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center font-black text-[10px] text-accent-gold border border-accent-gold/10">
            {initials}
          </div>
          <span className="text-sm font-bold text-slate-700">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500 font-medium">{date}</td>
      <td className="px-6 py-4 text-sm font-black text-slate-800">${amount}</td>
      <td className="px-6 py-4">
        <div className="flex justify-center">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyles[status]}`}
          >
            {status}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-primary">
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
}

function IconButton({ icon: Icon }: any) {
  return (
    <button className="size-10 flex items-center justify-center rounded-xl bg-white border border-border-light text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-slate-50 transition-all">
      <Icon size={20} />
    </button>
  );
}

function PaginationArrow({ icon: Icon }: any) {
  return (
    <button className="size-8 flex items-center justify-center rounded-lg border border-border-light text-slate-400 hover:bg-white hover:text-primary transition-all">
      <Icon size={16} />
    </button>
  );
}
