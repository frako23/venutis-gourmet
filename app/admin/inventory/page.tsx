"use client";

import React, { useState } from "react";
import {
  Warehouse,
  MoreHorizontal,
  TrendingUp,
  Hourglass,
  Wallet,
  Filter,
  Download,
  BellRing,
  Utensils,
} from "lucide-react";

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState("All Products");

  return (
    <>
      <div className="p-8 space-y-8 max-w-[1400px]">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Total SKUs"
            value="1,240"
            trend="+2.4%"
            icon={Warehouse}
            color="text-primary"
          />
          <StatCard
            label="Low Stock Items"
            value="12"
            trend="Action Required"
            icon={Hourglass}
            color="text-red-500"
            warning
          />
          <StatCard
            label="In-Stock Value"
            value="$42.8k"
            trend="+8% growth"
            icon={Wallet}
            color="text-primary"
          />
        </div>

        {/* Table Controls */}
        <div className="flex items-center justify-between border-b border-[#dbe0d7] dark:border-[#3a3e44]">
          <div className="flex gap-8">
            {[
              "All Products",
              "Oils & Vinegars",
              "Artisan Pastas",
              "Cheeses",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 text-sm font-bold transition-all ${activeTab === tab ? "border-b-2 border-primary text-primary dark:text-white" : "text-[#738165] dark:text-gray-400 hover:text-primary"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-2">
            <IconButton icon={Filter} />
            <IconButton icon={Download} />
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white dark:bg-[#1a1c20] border border-[#dbe0d7] dark:border-[#3a3e44] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-background-light dark:bg-[#2c3036] text-[#738165] dark:text-gray-400 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Stock Level</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbe0d7] dark:divide-[#3a3e44]">
                <TableRow
                  img="18"
                  name="Extra Virgin Olive Oil"
                  sub="Tuscany, 500ml"
                  cat="Oils"
                  sku="VG-OIL-01"
                  stock={142}
                  total={200}
                  price="34.50"
                  status="In Stock"
                />
                <TableRow
                  img="19"
                  name="Aged Parmigiano"
                  sub="24-Month Reserve"
                  cat="Cheeses"
                  sku="VG-CHZ-42"
                  stock={8}
                  total={100}
                  price="18.90"
                  status="Low Stock"
                  urgent
                />
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <footer className="bg-white dark:bg-[#1a1c20] px-6 py-4 border-t border-[#dbe0d7] dark:border-[#3a3e44] flex items-center justify-between">
            <p className="text-[11px] text-[#738165] font-bold uppercase tracking-wider">
              Showing{" "}
              <span className="text-[#141712] dark:text-white">1 to 10</span> of
              1,240 results
            </p>
            <div className="flex gap-1">
              <PaginationBtn label="Prev" />
              <PaginationBtn label="1" active />
              <PaginationBtn label="2" />
              <PaginationBtn label="Next" />
            </div>
          </footer>
        </div>
      </div>

      {/* Floating Notification */}
      <div className="fixed bottom-8 right-8 bg-primary text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10 animate-bounce cursor-pointer">
        <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center">
          <BellRing size={16} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">
            Alert
          </p>
          <p className="text-sm font-bold">New Sicily shipment arrived.</p>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  color,
  warning = false,
}: any) {
  return (
    <div className="bg-white dark:bg-[#1a1c20] p-6 rounded-xl border border-[#dbe0d7] dark:border-[#3a3e44] shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
      <div>
        <p className="text-[#738165] dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
          {label}
        </p>
        <h3
          className={`text-3xl font-black tracking-tight ${warning ? "text-red-500" : "dark:text-white"}`}
        >
          {value}
        </h3>
        <p
          className={`text-[10px] font-black flex items-center gap-1 mt-2 uppercase ${warning ? "text-amber-600" : "text-emerald-600"}`}
        >
          {warning ? (
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
          ) : (
            <TrendingUp size={12} />
          )}
          {trend}
        </p>
      </div>
      <div
        className={`size-14 rounded-xl flex items-center justify-center ${warning ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-primary/10 text-primary"}`}
      >
        <Icon size={28} />
      </div>
    </div>
  );
}

function TableRow({
  img,
  name,
  sub,
  cat,
  sku,
  stock,
  total,
  price,
  status,
  urgent = false,
}: any) {
  const isOutOfStock = stock === 0;
  return (
    <tr
      className={`hover:bg-[#fafbf9] dark:hover:bg-white/5 transition-colors ${urgent ? "bg-red-50/30 dark:bg-red-900/5" : ""} ${isOutOfStock ? "grayscale opacity-60" : ""}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <img
            className="size-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            src={`http://googleusercontent.com/profile/picture/${img}`}
            alt={name}
          />
          <div>
            <p className="font-bold text-sm text-[#141712] dark:text-white">
              {name}
            </p>
            <p className="text-[11px] text-[#738165] font-medium">{sub}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-[#738165] dark:text-gray-300">
        {cat}
      </td>
      <td className="px-6 py-4 text-xs font-mono text-gray-400">{sku}</td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1.5">
          <span
            className={`text-xs font-black ${urgent ? "text-red-500" : "text-[#141712] dark:text-white"}`}
          >
            {stock} units
          </span>
          <div className="w-24 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${urgent ? "bg-red-500" : "bg-primary"}`}
              style={{ width: `${(stock / total) * 100}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-black dark:text-white">${price}</td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
          ${urgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}
        >
          <span
            className={`size-1.5 rounded-full ${urgent ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
          />
          {status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <button className="text-gray-400 hover:text-primary transition-colors p-1">
          <MoreHorizontal size={20} />
        </button>
      </td>
    </tr>
  );
}

function IconButton({ icon: Icon }: any) {
  return (
    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors">
      <Icon size={18} />
    </button>
  );
}

function PaginationBtn({ label, active = false }: any) {
  return (
    <button
      className={`px-3 py-1.5 rounded text-[11px] font-black uppercase transition-all 
      ${active ? "bg-primary text-white shadow-md shadow-primary/20" : "border border-[#dbe0d7] dark:border-[#3a3e44] text-[#738165] hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}
