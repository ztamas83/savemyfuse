import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "~/services/auth-provider";

export function LoginPage() {
  const { loginWithGoogle, isInitialized, isAuthenticated } =
    useContext(AuthContext);

  if (isInitialized && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <button
          onClick={loginWithGoogle}
          disabled={!isInitialized}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}
