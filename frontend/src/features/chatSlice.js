import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const CONVERSATION_ENDPOINT = `${process.env.REACT_APP_API_ENDPOINT}/conversation`;
const MESSAGE_ENDPOINT = `${process.env.REACT_APP_API_ENDPOINT}/message`;

const initialState = {
  status: "",
  error: "",
  conversations: [],
  activeConversation: {},
  messages: [],
  notifications: [],
  files: [],
  unreadByConversation: {},
  favoriteConversationIds: [],
};

//functions
export const getConversations = createAsyncThunk(
  "conervsation/all",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(CONVERSATION_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const open_create_conversation = createAsyncThunk(
  "conervsation/open_create",
  async (values, { rejectWithValue }) => {
    const { token, receiver_id, isGroup } = values;
    try {
      const { data } = await axios.post(
        CONVERSATION_ENDPOINT,
        { receiver_id, isGroup },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const getConversationMessages = createAsyncThunk(
  "conervsation/messages",
  async (values, { rejectWithValue }) => {
    const { token, convo_id } = values;
    try {
      const { data } = await axios.get(`${MESSAGE_ENDPOINT}/${convo_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const sendMessage = createAsyncThunk(
  "message/send",
  async (values, { rejectWithValue }) => {
    const { token, message, convo_id, files } = values;
    try {
      const { data } = await axios.post(
        MESSAGE_ENDPOINT,
        {
          message,
          convo_id,
          files,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const createGroupConversation = createAsyncThunk(
  "conervsation/create_group",
  async (values, { rejectWithValue }) => {
    const { token, name, users } = values;
    try {
      const { data } = await axios.post(
        `${CONVERSATION_ENDPOINT}/group`,
        { name, users },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data.error.message);
    }
  }
);
export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      if (action.payload?._id) {
        state.unreadByConversation[action.payload._id] = 0;
      }
    },
    updateMessagesAndConversations: (state, action) => {
      //update messages
      let convo = state.activeConversation;
      if (convo._id === action.payload.conversation._id) {
        state.messages = [...state.messages, action.payload];
      } else {
        const convoId = action.payload.conversation._id;
        state.unreadByConversation[convoId] =
          (state.unreadByConversation[convoId] || 0) + 1;
      }
      //update conversations
      let conversation = {
        ...action.payload.conversation,
        latestMessage: action.payload,
      };
      let newConvos = [...state.conversations].filter(
        (c) => c._id !== conversation._id
      );
      newConvos.unshift(conversation);
      state.conversations = newConvos;
    },
    setUnreadCountForConversation: (state, action) => {
      const { conversationId, count } = action.payload;
      state.unreadByConversation[conversationId] = count;
    },
    clearUnreadForConversation: (state, action) => {
      const conversationId = action.payload;
      state.unreadByConversation[conversationId] = 0;
    },
    setFavoriteConversationIds: (state, action) => {
      state.favoriteConversationIds = action.payload || [];
    },
    toggleFavoriteConversation: (state, action) => {
      const conversationId = action.payload;
      const exists = state.favoriteConversationIds.includes(conversationId);
      if (exists) {
        state.favoriteConversationIds = state.favoriteConversationIds.filter(
          (id) => id !== conversationId
        );
      } else {
        state.favoriteConversationIds.push(conversationId);
      }
    },
    addFiles: (state, action) => {
      state.files = [...state.files, action.payload];
    },
    clearFiles: (state, action) => {
      state.files = [];
    },
    removeFileFromFiles: (state, action) => {
      let index = action.payload;
      let files = [...state.files];
      let fileToRemove = [files[index]];
      state.files = files.filter((file) => !fileToRemove.includes(file));
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      const message = state.messages.find((m) => m._id === messageId);
      if (message) {
        message.status = status;
      }
    },
    toggleMessageStarred: (state, action) => {
      const { messageId, userId, starred } = action.payload;
      const message = state.messages.find((m) => m._id === messageId);
      if (!message) return;
      const currentStarredBy = Array.isArray(message.starredBy)
        ? [...message.starredBy]
        : [];

      if (starred) {
        if (!currentStarredBy.some((id) => String(id) === String(userId))) {
          currentStarredBy.push(userId);
        }
      } else {
        message.starredBy = currentStarredBy.filter(
          (id) => String(id) !== String(userId)
        );
        return;
      }

      message.starredBy = currentStarredBy;
    },
    removeMessageById: (state, action) => {
      const messageId = action.payload;
      state.messages = state.messages.filter((m) => m._id !== messageId);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getConversations.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.conversations = action.payload;

        const updatedUnread = { ...state.unreadByConversation };
        action.payload.forEach((conversation) => {
          if (!(conversation._id in updatedUnread)) {
            updatedUnread[conversation._id] = 0;
          }
        });
        state.unreadByConversation = updatedUnread;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(open_create_conversation.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(open_create_conversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.activeConversation = action.payload;
        state.files = [];
        if (action.payload?._id) {
          state.unreadByConversation[action.payload._id] = 0;
        }
      })
      .addCase(open_create_conversation.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(getConversationMessages.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(getConversationMessages.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = action.payload;
      })
      .addCase(getConversationMessages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(sendMessage.pending, (state, action) => {
        state.status = "loading";
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages = [...state.messages, action.payload];
        let conversation = {
          ...action.payload.conversation,
          latestMessage: action.payload,
        };
        let newConvos = [...state.conversations].filter(
          (c) => c._id !== conversation._id
        );
        newConvos.unshift(conversation);
        state.conversations = newConvos;
        state.files = [];
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});
export const {
  setActiveConversation,
  updateMessagesAndConversations,
  addFiles,
  clearFiles,
  removeFileFromFiles,
  updateMessageStatus,
  toggleMessageStarred,
  removeMessageById,
  setUnreadCountForConversation,
  clearUnreadForConversation,
  setFavoriteConversationIds,
  toggleFavoriteConversation,
} = chatSlice.actions;

export default chatSlice.reducer;
