import { Save } from "lucide-react";

export const Header = ({
  disabledState,
  headerText,
}: {
  disabledState?: boolean;
  headerText: string;
}) => {
  return (
    <div className="mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gold tracking-tight mb-2">
            {headerText}
          </h1>
        </div>

        {disabledState ? (
          <div className="flex gap-3">
            <a
              href="/admin/inventory"
              className="px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-400 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm active:scale-95"
            >
              Descartar
            </a>
            <button
              type="submit"
              disabled={disabledState}
              className="cursor-pointer flex items-center gap-2 px-8 py-3 rounded-2xl bg-gold text-primary font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-slate-200 transition-all text-xs active:scale-95"
            >
              <Save size={16} />
              Guardar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
