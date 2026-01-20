export default async function AddClientPage() {
  return (
    <div className="bg-[#ffece3] min-h-screen flex items-center justify-center font-sans">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md text-center relative overflow-hidden">
        {/* <!-- Decorativos --> */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-pink-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-yellow-200 rounded-full opacity-30 animate-ping"></div>

        {/* <!-- Contenido principal --> */}
        <h1 className="text-2xl font-bold text-pink-600 mb-4">
          ¡Gracias por tu envío! 🌟
        </h1>
        <p className="text-gray-700 mb-6">
          Hemos recibido tu información correctamente. Pronto nos pondremos en
          contacto contigo para coordinar el envío.
        </p>
        <div className="flex justify-center gap-4 mb-6">
          <span className="text-xl">💌</span>
          <span className="text-xl">📦</span>
          <span className="text-xl">✨</span>
        </div>
      </div>
    </div>
  );
}
