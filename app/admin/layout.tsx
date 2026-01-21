import Header from "@/components/admin/header";
import Sidebar from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background-light overflow-hidden">
      {/* Sidebar Fija - Se mantiene igual en todas las subrutas de /admin */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header superior para notificaciones y perfil */}
        <Header />

        {/* Contenido Dinámico (Inventory, Transactions, etc.) */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
