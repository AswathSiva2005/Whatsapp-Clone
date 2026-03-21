import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const AUTH_ENDPOINT = `${resolveApiEndpoint()}/auth`;

const initialState = {
  status: "",
  error: "",
  user: {
    id: "",
    name: "",
    email: "",
    phone: "",
    picture: "",
    status: "",
    token: "",
    blockedUsers: [],
    appLockEnabled: false,
    notificationSettings: {
      muteAllNotifications: false,
      muteLoginNotifications: false,
      mutedConversations: [],
    },
  },
};

export const registerUser = createAsyncThunk(
  "auth/register",
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${AUTH_ENDPOINT}/register`, {
        ...values,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const loginUser = createAsyncThunk(
  "auth/login",
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${AUTH_ENDPOINT}/login`, {
        ...values,
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.status = "";
      state.error = "";
      state.user = {
        id: "",
        name: "",
        email: "",
        phone: "",
        picture: "",
        status: "",
        token: "",
        blockedUsers: [],
        appLockEnabled: false,
        notificationSettings: {
          muteAllNotifications: false,
          muteLoginNotifications: false,
          mutedConversations: [],
        },
      };
    },
    setUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    changeStatus: (state, action) => {
      state.status = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(registerUser.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = "";
        state.user = {
          ...initialState.user,
          ...action.payload.user,
          notificationSettings: {
            ...initialState.user.notificationSettings,
            ...(action.payload.user?.notificationSettings || {}),
          },
        };
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = "";
        state.user = {
          ...initialState.user,
          ...action.payload.user,
          notificationSettings: {
            ...initialState.user.notificationSettings,
            ...(action.payload.user?.notificationSettings || {}),
          },
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { logout, setUser, changeStatus } = userSlice.actions;

export default userSlice.reducer;
