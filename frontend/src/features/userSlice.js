import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

const AUTH_ENDPOINT = `${resolveApiEndpoint()}/auth`;
const USER_ENDPOINT = `${resolveApiEndpoint()}/user`;

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
    contacts: [],
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

export const fetchContacts = createAsyncThunk(
  "user/contacts",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${USER_ENDPOINT}/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return data?.contacts || [];
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.error?.message || "Failed to load contacts."
      );
    }
  }
);

export const createContact = createAsyncThunk(
  "user/createContact",
  async (values, { rejectWithValue }) => {
    try {
      const { token, firstName, lastName, countryCode, phone, syncToPhone } = values;
      const { data } = await axios.post(
        `${USER_ENDPOINT}/contacts`,
        {
          firstName,
          lastName,
          countryCode,
          phone,
          syncToPhone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.error?.message || "Failed to save contact."
      );
    }
  }
);

export const updateContactNickname = createAsyncThunk(
  "user/updateContactNickname",
  async (values, { rejectWithValue }) => {
    try {
      const { token, contactId, nickname } = values;
      const { data } = await axios.patch(
        `${USER_ENDPOINT}/contacts/${contactId}/nickname`,
        { nickname },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.error?.message || "Failed to update nickname."
      );
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
        contacts: [],
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
          contacts: Array.isArray(action.payload.user?.contacts)
            ? action.payload.user.contacts
            : [],
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
          contacts: Array.isArray(action.payload.user?.contacts)
            ? action.payload.user.contacts
            : [],
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.user.contacts = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(createContact.fulfilled, (state, action) => {
        if (Array.isArray(action.payload?.contacts)) {
          state.user.contacts = action.payload.contacts;
        }
      })
      .addCase(updateContactNickname.fulfilled, (state, action) => {
        if (Array.isArray(action.payload?.contacts)) {
          state.user.contacts = action.payload.contacts;
        }
      });
  },
});

export const { logout, setUser, changeStatus } = userSlice.actions;

export default userSlice.reducer;
