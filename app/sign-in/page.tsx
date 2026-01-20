import { SignIn } from "@stackframe/stack";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="max-w-md w-full space-y-8">
        <div>
          {" "}
          <h1 className="text-center text-3xl font-extrabold text-gray-900">bienvenido al login de Tienda DAGO</h1>
        </div>

        <SignIn />
      </div>
    </div>
  );
};

export default SignInPage;
