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
    const { token, message, convo_id, files, poll } = values;
    try {
      const { data } = await axios.post(
        MESSAGE_ENDPOINT,
        {
          message,
          convo_id,
          files,
          poll,
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
    const { token, name, users, description, picture } = values;
    try {
      const { data } = await axios.post(
        `${CONVERSATION_ENDPOINT}/group`,
        { name, users, description, picture },
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
export const updateGroupConversation = createAsyncThunk(
  "conervsation/update_group",
  async (values, { rejectWithValue }) => {
    const { token, conversationId, name, description, picture } = values;
    try {
      const { data } = await axios.patch(
        `${CONVERSATION_ENDPOINT}/group/${conversationId}`,
        { name, description, picture },
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
export const addMembersToGroupConversation = createAsyncThunk(
  "conervsation/add_members",
  async (values, { rejectWithValue }) => {
    const { token, conversationId, users } = values;
    try {
      const { data } = await axios.post(
        `${CONVERSATION_ENDPOINT}/group/${conversationId}/members`,
        { users },
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
export const removeMemberFromGroupConversation = createAsyncThunk(
  "conervsation/remove_member",
  async (values, { rejectWithValue }) => {
    const { token, conversationId, memberId } = values;
    try {
      const { data } = await axios.delete(
        `${CONVERSATION_ENDPOINT}/group/${conversationId}/members/${memberId}`,
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
export const exitGroupConversation = createAsyncThunk(
  "conervsation/exit_group",
  async (values, { rejectWithValue }) => {
    const { token, conversationId } = values;
    try {
      const { data } = await axios.post(
        `${CONVERSATION_ENDPOINT}/group/${conversationId}/exit`,
        {},
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
export const setDisappearingMessagesSetting = createAsyncThunk(
  "conervsation/disappearing",
  async (values, { rejectWithValue }) => {
    const { token, conversationId, mode, seconds } = values;
    try {
      const { data } = await axios.patch(
        `${CONVERSATION_ENDPOINT}/${conversationId}/disappearing`,
        { mode, seconds },
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
export const votePollMessage = createAsyncThunk(
  "message/vote_poll",
  async (values, { rejectWithValue }) => {
    const { token, messageId, optionIndex } = values;
    try {
      const { data } = await axios.patch(
        `${MESSAGE_ENDPOINT}/${messageId}/poll/vote`,
        { optionIndex },
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
    upsertConversationFromServer: (state, action) => {
      const conversation = action.payload;
      if (!conversation?._id) return;

      const list = [...state.conversations].filter(
        (c) => c._id !== conversation._id
      );
      list.unshift(conversation);
      state.conversations = list;

      if (state.activeConversation?._id === conversation._id) {
        state.activeConversation = conversation;
      }
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
      })
      .addCase(createGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (!action.payload?._id) return;
        const newConvos = [...state.conversations].filter(
          (c) => c._id !== action.payload._id
        );
        newConvos.unshift(action.payload);
        state.conversations = newConvos;
        state.activeConversation = action.payload;
      })
      .addCase(updateGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (!action.payload?._id) return;
        const newConvos = [...state.conversations].filter(
          (c) => c._id !== action.payload._id
        );
        newConvos.unshift(action.payload);
        state.conversations = newConvos;
        if (state.activeConversation?._id === action.payload._id) {
          state.activeConversation = action.payload;
        }
      })
      .addCase(addMembersToGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (!action.payload?._id) return;
        const newConvos = [...state.conversations].filter(
          (c) => c._id !== action.payload._id
        );
        newConvos.unshift(action.payload);
        state.conversations = newConvos;
        if (state.activeConversation?._id === action.payload._id) {
          state.activeConversation = action.payload;
        }
      })
      .addCase(removeMemberFromGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        const payload = action.payload;
        if (payload?.deleted) {
          state.conversations = state.conversations.filter(
            (c) => c._id !== payload.conversationId
          );
          if (state.activeConversation?._id === payload.conversationId) {
            state.activeConversation = {};
            state.messages = [];
          }
          return;
        }
        if (!payload?._id) return;
        const newConvos = [...state.conversations].filter(
          (c) => c._id !== payload._id
        );
        newConvos.unshift(payload);
        state.conversations = newConvos;
        if (state.activeConversation?._id === payload._id) {
          state.activeConversation = payload;
        }
      })
      .addCase(exitGroupConversation.fulfilled, (state, action) => {
        state.status = "succeeded";
        const payload = action.payload;
        const targetId = payload?.conversationId || payload?._id;
        if (targetId) {
          state.conversations = state.conversations.filter(
            (c) => c._id !== targetId
          );
          if (state.activeConversation?._id === targetId) {
            state.activeConversation = {};
            state.messages = [];
          }
        }
      })
      .addCase(setDisappearingMessagesSetting.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (!action.payload?._id) return;
        const newConvos = [...state.conversations].filter(
          (c) => c._id !== action.payload._id
        );
        newConvos.unshift(action.payload);
        state.conversations = newConvos;
        if (state.activeConversation?._id === action.payload._id) {
          state.activeConversation = action.payload;
        }
      })
      .addCase(votePollMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        const updatedMessage = action.payload;
        if (!updatedMessage?._id) return;
        state.messages = state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        );
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
  upsertConversationFromServer,
} = chatSlice.actions;

export default chatSlice.reducer;
