import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { useContext, createContext, useEffect, useReducer } from "react";
import { useNavigate } from "react-router-dom";
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
      if (user) {
        dispatch({
          type: "INITIALISE",
          payload: { isAuthenticated: true, user },
        });
      } else {
        dispatch({
          type: "INITIALISE",
          payload: { isAuthenticated: false, user: undefined },
        });
      }
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

  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      console.log("Authenticated: ", state.user);
      navigate("/");
    } else {
      console.log("Not authenticated");
      navigate("/login");
    }
  }, [state, navigate]);

  return (
    <AuthContext.Provider value={{ loginWithGoogle, logout, ...state }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };

// Add this new component in the same file
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useContext(AuthContext);

  // Removed useNavigate as per the requirement that navigation is not allowed within the guard.
  // The parent routing will handle rendering the login page if the user is not authenticated.

  if (!isInitialized) return null;

  // If authenticated, render children. Otherwise, render null.
  // The parent router will decide what to render when this returns null.
  return isAuthenticated ? <>{children}</> : null;
}
