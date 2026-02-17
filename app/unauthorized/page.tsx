export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-red-700 mb-4">
          Acceso denegado
        </h1>
        <p className="text-lg text-gray-700 mb-6 max-w-xl mx-auto">
          Tu cuenta no está autorizada para acceder a esta aplicación. Si crees
          que esto es un error, contacta al administrador.
        </p>
        <a
          href="/"
          className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
