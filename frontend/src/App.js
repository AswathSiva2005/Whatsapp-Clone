import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import SocketContext from "./context/SocketContext";
import { logout } from "./features/userSlice";
//Pages
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import SettingsPage from "./pages/settings";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const API_ENDPOINT = resolveApiEndpoint();
//socket io
const socket = io(API_ENDPOINT.split("/api/v1")[0], {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const [tokenVerified, setTokenVerified] = useState(false);

  // Verify token on app startup
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenVerified(true);
        return;
      }

      try {
        // Try to fetch user data or conversations to verify token validity
        await axios.get(`${API_ENDPOINT}/conversation`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        });
        setTokenVerified(true);
      } catch (err) {
        // Any verification failure should force fresh login.
        dispatch(logout());
        setTokenVerified(true);
      }
    };

    verifyToken();
  }, []);

  useEffect(() => {
    if (token && !socket.connected) {
      socket.connect();
    }

    if (!token && socket.connected) {
      socket.disconnect();
    }
  }, [token]);

  if (!tokenVerified) {
    return (
      <div className="dark flex items-center justify-center w-full h-screen bg-dark_bg_1">
        <div className="text-center">
          <div className="text-dark_text_1 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <SocketContext.Provider value={socket}>
        <Router>
          <Routes>
            <Route
              exact
              path="/"
              element={
                token ? <Home socket={socket} /> : <Navigate to="/login" />
              }
            />
            <Route
              exact
              path="/login"
              element={!token ? <Login /> : <Navigate to="/" />}
            />
            <Route
              exact
              path="/register"
              element={!token ? <Register /> : <Navigate to="/" />}
            />
            <Route
              exact
              path="/settings"
              element={
                token ? <SettingsPage /> : <Navigate to="/login" />
              }
            />
          </Routes>
        </Router>
      </SocketContext.Provider>
    </div>
  );
}

export default App;
