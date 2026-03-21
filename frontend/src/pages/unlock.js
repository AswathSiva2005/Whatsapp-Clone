import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

export default function UnlockPage({ onUnlock }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyPin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter your 4-digit PIN.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${resolveApiEndpoint()}/user/app-lock/verify`,
        { pin },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      sessionStorage.setItem(`appLockUnlocked:${user._id}`, "true");
      if (typeof onUnlock === "function") {
        onUnlock();
      }
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Invalid PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-dark_bg_1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm dark:bg-dark_bg_2 rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold dark:text-dark_text_1">Unlock WhatsApp</h1>
        <p className="text-sm dark:text-dark_text_2">
          Enter your 4-digit app lock PIN for {user?.name || "your account"}.
        </p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              verifyPin();
            }
          }}
          className="w-full rounded-lg bg-[#202c33] px-4 py-3 text-lg tracking-[0.35em] text-center dark:text-dark_text_1 outline-none"
          placeholder="••••"
        />

        {error && <p className="text-sm text-[#f15c6d]">{error}</p>}

        <button
          onClick={verifyPin}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-green_1 text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Unlock"}
        </button>
      </div>
    </div>
  );
}
