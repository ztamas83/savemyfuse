import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { useContext, createContext, useEffect, useReducer } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { auth as clientAuth } from "~/firebase.client";

const initialState: AuthState = {
  isAuthenticated: false,
  isInitialized: false,
  user: undefined,
};

interface AuthStateDispatch {
  type: string;
  payload: AuthState;
}

interface AuthState {
  isAuthenticated: boolean;
  isInitialized?: boolean;
  user: User | undefined;
}

const reducer = (state: AuthState, action: AuthStateDispatch) => {
  if (action.type === "INITIALISE") {
    const { isAuthenticated, user } = action.payload;
    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  }

  return state;
};

const AuthContext = createContext({
  ...initialState,
  loginWithGoogle: () => Promise.resolve(),
  logout: () => Promise.resolve(),
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();

  const logout = async () => {
    await clientAuth.signOut();
    navigate("/login");
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    await logout();
    console.log("loginWIthGoogle - Signed out");

    try {
      const res = await signInWithPopup(clientAuth, provider);
      console.log("loginWIthGoogle - Signed in");
      console.log(res);
      console.log(res.user.uid);

      dispatch({
        type: "INITIALISE",
        payload: { isAuthenticated: true, user: res.user },
      });
    } catch (err) {
      console.error("Sign in error", err);
    }
  };

  useEffect(() => {
    const unsubscribe = clientAuth.onAuthStateChanged((user) => {
      dispatch({
        type: "INITIALISE",
        payload: {
          isAuthenticated: !!user,
          user: user ?? undefined,
        },
      });
    });
    return unsubscribe;
  }, [dispatch]);

  // Global redirect removed in favor of RequireAuth component


  return (
    <AuthContext.Provider value={{ loginWithGoogle, logout, ...state }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useContext(AuthContext);

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
