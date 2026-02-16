import { ActionButton } from "@/components/admin/UI/actionButton";
import { PrismaClient } from "@prisma/client";
import {
  CalendarDays,
  Filter,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

export default async function TransactionsDashboard() {
  // const [activeFilter, setActiveFilter] = useState("All Orders");
  const prisma = new PrismaClient();

  const transacciones = await prisma.transaccion.findMany({
    include: {
      cliente: { include: { direcciones: true } },
      detalles: { include: { producto: true } },
      pagos: true,
    },
  });

  console.log(transacciones);

  return (
    <div className="p-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full bg-background-dark">
      {/* Top KPI Cards */}
      {/* <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </section> */}

      {/* Transactions Table Section */}
      <section className="flex flex-col rounded-2xl border border-border-light  shadow-sm shadow-slate-200/50 bg-[#1a1c20]">
        {/* Table Header / Filters */}
        <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-light">
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Transacciones
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* <div className="flex bg-slate-50 rounded-xl p-1 border border-border-light">
                {["All Orders", "Pending", "Shipped"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === filter ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-primary"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div> */}
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
        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left">
            <thead>
              <tr className=" text-[10px] uppercase tracking-widest font-black text-slate-300 border-b border-border-light">
                <th className="px-6 py-4"># Orden</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Celular</th>
                <th className="px-6 py-4">Monto $</th>
                <th className="px-6 py-4">Monto Bs</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {transacciones.map((transaccion, index) => (
                <TransactionRow
                  key={transaccion.id || transaccion.numeroOrden || index}
                  id={transaccion.id}
                  name={
                    transaccion.cliente.nombre +
                    " " +
                    transaccion.cliente.apellido
                  }
                  date={transaccion.fechaCompra.toLocaleDateString()}
                  phone={transaccion.cliente.celular}
                  amount$={transaccion.pagos[0].montoUsd}
                  amountBs={transaccion.pagos[0].montoBs}
                  status={transaccion.estado}
                />
              ))}

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
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Showing 5 of 1,248 transactions
          </span>
          {/* <div className="flex items-center gap-2">
              <PaginationArrow icon={ChevronLeft} />
              <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-black shadow-md shadow-primary/20">
                1
              </button>
              <button className="size-8 flex items-center justify-center rounded-lg border border-border-light bg-white text-slate-500 text-xs font-bold hover:text-primary transition-colors">
                2
              </button>
              <PaginationArrow icon={ChevronRight} />
            </div> */}
        </div>
      </section>
    </div>
  );
}

// --- Helper Components ---

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

function TransactionRow({
  id,
  name,
  date,
  amount$,
  amountBs,
  status,
  phone,
}: any) {
  const statusStyles: any = {
    Delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Shipped: "bg-blue-50 text-blue-600 border-blue-100",
    pagado: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group cursor-pointer">
      <td className="px-6 py-4 text-sm font-bold text-gold group-hover:text-primary">
        {id}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-200 group-hover:text-primary">
            {name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-200 font-medium group-hover:text-primary">
        {date}
      </td>
      <td className="px-6 py-4 text-sm text-slate-200 font-medium group-hover:text-primary">
        {phone}
      </td>
      <td className="px-6 py-4 text-sm font-black text-slate-200 group-hover:text-primary">
        ${amount$}
      </td>
      <td className="px-6 py-4 text-sm font-black text-slate-200 group-hover:text-primary">
        Bs{amountBs}
      </td>
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
        <ActionButton operacion="transaccion" transaccionId={id} />
      </td>
    </tr>
  );
}

function PaginationArrow({ icon: Icon }: any) {
  return (
    <button className="size-8 flex items-center justify-center rounded-lg border border-border-light text-slate-400 hover:bg-white hover:text-primary transition-all">
      <Icon size={16} />
    </button>
  );
}
