import { AuthProvider } from "~/services/auth-provider";
import "./App.css";
import StatusData from "./components/status-data";
import { Route, Routes } from "react-router";
import { LoginPage } from "~/components/login-page";
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<StatusData />} />
          </Routes>
        </AuthProvider>
      </header>
    </div>
  );
}

export default App;
