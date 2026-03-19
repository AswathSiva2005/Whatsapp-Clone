import { useSelector } from "react-redux";
import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import SocketContext from "./context/SocketContext";
//Pages
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import SettingsPage from "./pages/settings";

const API_ENDPOINT =
  process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
//socket io
const socket = io(API_ENDPOINT.split("/api/v1")[0], {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

function App() {
  //const [connected, setConnected] = useState(false);
  const { user } = useSelector((state) => state.user);
  const { token } = user;

  useEffect(() => {
    if (token && !socket.connected) {
      socket.connect();
    }

    if (!token && socket.connected) {
      socket.disconnect();
    }
  }, [token]);

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
