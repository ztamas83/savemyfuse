import { AuthProvider, RequireAuth } from "~/services/auth-provider";
import "./App.css";
import StatusData from "./components/status-data";
import { Route, Routes } from "react-router";
import { LoginPage } from "~/components/login-page";
import { ThemeProvider } from "~/components/theme-provider";
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <StatusData />
                  </RequireAuth>
                }
              />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </header>
    </div>
  );
}

export default App;
