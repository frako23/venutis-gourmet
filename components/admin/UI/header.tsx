export const Header = ({ headerText }: { headerText: string }) => {
  return (
    <div className="mb-7">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="admin-eyebrow">Catálogo y existencias</p>
          <h1 className="admin-title mt-2">
            {headerText}
          </h1>
          <p className="admin-subtitle mt-3">Mantén la información comercial y la disponibilidad listas para el siguiente pedido.</p>
        </div>
      </div>
    </div>
  );
};
