export const Header = ({ headerText }: { headerText: string }) => {
  return (
    <div className="mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gold tracking-tight mb-2">
            {headerText}
          </h1>
        </div>
      </div>
    </div>
  );
};
