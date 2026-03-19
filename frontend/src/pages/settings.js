import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../features/userSlice";
import axios from "axios";
import { ReturnIcon } from "../svg";
import { getTwoLetterAvatarUrl } from "../utils/avatar";

const SettingsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = user;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    status: user.status || "",
    picture: user.picture || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large. Please choose an image under 5MB.");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("file", file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_ENDPOINT}/user/upload`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const uploadedUrl = response.data.url;

      // Save picture immediately so it is persisted in MongoDB (visible in Compass).
      const profileResponse = await axios.put(
        `${process.env.REACT_APP_API_ENDPOINT}/user/profile`,
        {
          picture: uploadedUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFormData((prev) => ({
        ...prev,
        picture: uploadedUrl,
      }));
      dispatch(setUser(profileResponse.data.user));
      setError("");
    } catch (err) {
      console.warn("Picture upload failed:", err.message);
      if (err.message === "Network Error") {
        setError("Backend server is not running. Start backend on port 5001 and try again.");
      } else {
        setError(err?.response?.data?.error?.message || "Failed to upload picture.");
      }
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.put(
        `${process.env.REACT_APP_API_ENDPOINT}/user/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(setUser(data.user));
      setIsEditing(false);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/login");
      } else {
        if (err.message === "Network Error") {
          setError("Backend server is not running. Start backend on port 5001 and try again.");
        } else {
          setError(err?.response?.data?.error?.message || "Error updating profile.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.put(
        `${process.env.REACT_APP_API_ENDPOINT}/user/profile`,
        {
          picture: "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormData((prev) => ({
        ...prev,
        picture: "",
      }));
      dispatch(setUser(data.user));
    } catch (err) {
      if (err.message === "Network Error") {
        setError("Backend server is not running. Start backend on port 5001 and try again.");
      } else {
        setError(err?.response?.data?.error?.message || "Failed to remove profile picture.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || "",
      status: user.status || "",
      picture: user.picture || "",
    });
    setIsEditing(false);
    setError("");
  };

  return (
    <div className="w-full h-screen dark:bg-dark_bg_2 flex">
      <div className="w-full max-w-full md:max-w-[900px] lg:max-w-[1200px] mx-auto h-full border-r dark:border-r-dark_border_2 dark:bg-dark_bg_1 flex flex-col">
        <div className="h-[108px] dark:bg-dark_bg_2 px-4 pb-4 pt-12 flex items-end gap-6 border-b dark:border-b-dark_border_2">
          <button className="btn" onClick={() => navigate("/")}>
            <ReturnIcon className="fill-dark_svg_1" />
          </button>
          <h1 className="text-xl dark:text-dark_text_1 font-medium">Profile</h1>
        </div>

        <div className="h-[calc(100vh-108px)] overflow-y-auto scrollbar grid grid-cols-1 md:grid-cols-2">
          {/* Left Column - Profile Picture and Basic Info */}
          <div className="border-r dark:border-r-dark_border_2">
            <div className="dark:bg-dark_bg_2 p-6 md:p-8 flex flex-col items-center gap-4 border-b dark:border-b-dark_border_2">
              <div className="relative w-[200px] h-[200px] rounded-full overflow-hidden ring-2 ring-green_1">
                <img
                  src={formData.picture || getTwoLetterAvatarUrl(formData.name || user.name)}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getTwoLetterAvatarUrl(formData.name || user.name);
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              {isEditing && (
                <div className="flex flex-col items-center gap-2">
                  <label className="cursor-pointer text-sm text-green_1 hover:underline">
                    Change profile photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveProfilePicture}
                    disabled={loading}
                    className="text-sm text-[#f15c6d] hover:underline disabled:opacity-50"
                  >
                    {loading ? "Removing..." : "Remove profile"}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-green_1 px-2 font-medium">Your name</p>
                <div className="dark:bg-dark_bg_1 rounded-lg p-3 border dark:border-dark_border_2">
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-transparent outline-none dark:text-dark_text_1"
                    />
                  ) : (
                    <p className="dark:text-dark_text_1">{user.name}</p>
                  )}
                </div>
              </div>

              <div className="px-2 py-1">
                <p className="text-xs dark:text-dark_text_2">
                  This is not your username or pin. This name will be visible to your WhatsApp contacts.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-green_1 px-2 font-medium">About</p>
                <div className="dark:bg-dark_bg_1 rounded-lg p-3 border dark:border-dark_border_2">
                  {isEditing ? (
                    <textarea
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      maxLength={100}
                      rows="3"
                      className="w-full bg-transparent outline-none dark:text-dark_text_1 resize-none"
                    />
                  ) : (
                    <p className="dark:text-dark_text_1">{user.status || "Hey there! I am using WhatsApp."}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Info */}
          <div className="p-4 md:p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-green_1 px-2 font-medium">Phone</p>
              <div className="dark:bg-dark_bg_1 rounded-lg p-3 border dark:border-dark_border_2">
                <p className="dark:text-dark_text_1">{user.phone || "Not set"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-green_1 px-2 font-medium">Email</p>
              <div className="dark:bg-dark_bg_1 rounded-lg p-3 border dark:border-dark_border_2">
                <p className="dark:text-dark_text_1">{user.email || "Not set"}</p>
              </div>
            </div>

            <div className="dark:bg-dark_bg_1 rounded-lg p-4 border dark:border-dark_border_2 mt-6">
              <h3 className="text-green_1 text-sm font-medium mb-3">Account Settings</h3>
              <ul className="space-y-2 text-sm dark:text-dark_text_2">
                <li className="hover:dark:text-dark_text_1 cursor-pointer">🔒 Privacy & Security</li>
                <li className="hover:dark:text-dark_text_1 cursor-pointer">🔔 Notifications</li>
                <li className="hover:dark:text-dark_text_1 cursor-pointer">📱 Storage & Data</li>
                <li className="hover:dark:text-dark_text_1 cursor-pointer">❓ Help & Support</li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="fixed bottom-20 left-4 right-4 md:left-8 md:right-8 px-4 py-3 rounded-lg bg-[#f15c6d] dark:text-white">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="p-4 md:p-6 flex gap-3 border-t dark:border-t-dark_border_2 dark:bg-dark_bg_2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-3 rounded-lg bg-green_1 text-white font-medium hover:opacity-90 transition"
            >
              Edit profile
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-lg dark:bg-dark_bg_3 dark:text-dark_text_1 border dark:border-dark_border_2 hover:dark:bg-dark_bg_2 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 py-3 rounded-lg bg-green_1 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
