import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { setUser } from "../features/userSlice";
import axios from "axios";
import { ReturnIcon } from "../svg";
import { getTwoLetterAvatarUrl } from "../utils/avatar";

const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  return process.env.REACT_APP_API_ENDPOINT || "http://localhost:5001/api/v1";
};

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
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [pendingPictureName, setPendingPictureName] = useState("profile-picture.jpg");
  const [activeSettingsSection, setActiveSettingsSection] = useState("privacy");
  const [preferences, setPreferences] = useState(() => {
    try {
      const raw = localStorage.getItem(`settings:${user._id}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // no-op
    }
    return {
      privacyLastSeen: true,
      privacyProfilePhoto: true,
      privacyTwoStep: false,
      notificationsMessage: true,
      notificationsDesktop: true,
      notificationsPreview: true,
    };
  });
  const [notificationPrefs, setNotificationPrefs] = useState(() => ({
    muteAllNotifications: Boolean(user?.notificationSettings?.muteAllNotifications),
    muteLoginNotifications: Boolean(user?.notificationSettings?.muteLoginNotifications),
  }));
  const [appLockEnabled, setAppLockEnabled] = useState(Boolean(user.appLockEnabled));
  const [currentAppLockPin, setCurrentAppLockPin] = useState("");
  const [appLockPin, setAppLockPin] = useState("");
  const [appLockConfirmPin, setAppLockConfirmPin] = useState("");
  const [appLockSaving, setAppLockSaving] = useState(false);

  useEffect(() => {
    setNotificationPrefs({
      muteAllNotifications: Boolean(user?.notificationSettings?.muteAllNotifications),
      muteLoginNotifications: Boolean(user?.notificationSettings?.muteLoginNotifications),
    });
  }, [
    user?.notificationSettings?.muteAllNotifications,
    user?.notificationSettings?.muteLoginNotifications,
  ]);

  const savePreferences = (nextPrefs) => {
    setPreferences(nextPrefs);
    localStorage.setItem(`settings:${user._id}`, JSON.stringify(nextPrefs));
  };

  const togglePreference = (key) => {
    const nextPrefs = {
      ...preferences,
      [key]: !preferences[key],
    };
    savePreferences(nextPrefs);
  };

  const toggleNotificationPreference = async (key) => {
    const nextValue = !notificationPrefs[key];
    const nextPrefs = {
      ...notificationPrefs,
      [key]: nextValue,
    };

    setNotificationPrefs(nextPrefs);
    try {
      const { data } = await axios.patch(
        `${resolveApiEndpoint()}/user/notification-settings`,
        { [key]: nextValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.user?.notificationSettings) {
        dispatch(setUser({ notificationSettings: data.user.notificationSettings }));
      }
    } catch (err) {
      setNotificationPrefs((prev) => ({
        ...prev,
        [key]: !nextValue,
      }));
      setError(err?.response?.data?.error?.message || "Failed to save notification settings.");
    }
  };

  const getLocalStorageUsageKb = () => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key) || "";
        total += key.length + value.length;
      }
      return (total / 1024).toFixed(1);
    } catch {
      return "0.0";
    }
  };

  const saveAppLock = async () => {
    if (appLockEnabled && !/^\d{4}$/.test(currentAppLockPin)) {
      setError("Current PIN is required to change PIN.");
      return;
    }

    if (!/^\d{4}$/.test(appLockPin)) {
      setError("App lock PIN must be exactly 4 digits.");
      return;
    }

    if (appLockPin !== appLockConfirmPin) {
      setError("PIN and confirm PIN do not match.");
      return;
    }

    setAppLockSaving(true);
    setError("");
    try {
      const { data } = await axios.patch(
        `${resolveApiEndpoint()}/user/app-lock`,
        {
          enabled: true,
          pin: appLockPin,
          currentPin: appLockEnabled ? currentAppLockPin : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppLockEnabled(Boolean(data?.user?.appLockEnabled));
      setCurrentAppLockPin("");
      setAppLockPin("");
      setAppLockConfirmPin("");
      dispatch(setUser({ appLockEnabled: Boolean(data?.user?.appLockEnabled) }));
      setError(appLockEnabled ? "App PIN changed." : "App lock enabled.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save app lock.");
    } finally {
      setAppLockSaving(false);
    }
  };

  const disableAppLock = async () => {
    setAppLockSaving(true);
    setError("");
    try {
      const { data } = await axios.patch(
        `${resolveApiEndpoint()}/user/app-lock`,
        { enabled: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppLockEnabled(Boolean(data?.user?.appLockEnabled));
      setCurrentAppLockPin("");
      setAppLockPin("");
      setAppLockConfirmPin("");
      dispatch(setUser({ appLockEnabled: Boolean(data?.user?.appLockEnabled) }));
      sessionStorage.removeItem(`appLockUnlocked:${user._id}`);
      setError("App lock disabled.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to disable app lock.");
    } finally {
      setAppLockSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePictureUpload = async (file) => {
    const formDataToSend = new FormData();
    formDataToSend.append("file", file);

    try {
      const response = await axios.post(
        `${resolveApiEndpoint()}/user/upload`,
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
        `${resolveApiEndpoint()}/user/profile`,
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

  const handleSelectPicture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large. Please choose an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTempImage(evt.target?.result || "");
      setPendingPictureName(file.name || "profile-picture.jpg");
      setShowCropper(true);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (err) => reject(err));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedBlob = async () => {
    const image = await createImage(tempImage);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  };

  const confirmCropAndUpload = async () => {
    if (!croppedAreaPixels || !tempImage) return;
    setLoading(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) throw new Error("Crop failed");

      const croppedFile = new File([blob], pendingPictureName, {
        type: "image/jpeg",
      });

      await handlePictureUpload(croppedFile);
      setShowCropper(false);
      setTempImage("");
    } catch {
      setError("Failed to crop image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.put(
        `${resolveApiEndpoint()}/user/profile`,
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
        `${resolveApiEndpoint()}/user/profile`,
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
    <div className="w-full min-h-[100dvh] dark:bg-dark_bg_2 flex">
      <div className="w-full max-w-full md:max-w-[900px] lg:max-w-[1200px] mx-auto min-h-[100dvh] border-r dark:border-r-dark_border_2 dark:bg-dark_bg_1 flex flex-col">
        <div className="h-[88px] sm:h-[108px] dark:bg-dark_bg_2 px-3 sm:px-4 pb-3 sm:pb-4 pt-8 sm:pt-12 flex items-end gap-3 sm:gap-6 border-b dark:border-b-dark_border_2">
          <button className="btn" onClick={() => navigate("/")}>
            <ReturnIcon className="fill-dark_svg_1" />
          </button>
          <h1 className="text-lg sm:text-xl dark:text-dark_text_1 font-medium">Profile</h1>
        </div>

        <div className="h-[calc(100dvh-88px)] sm:h-[calc(100dvh-108px)] overflow-y-auto scrollbar grid grid-cols-1 md:grid-cols-2">
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
                      onChange={handleSelectPicture}
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
              <div className="space-y-2 text-sm dark:text-dark_text_2">
                <button
                  className={`w-full text-left hover:dark:text-dark_text_1 ${
                    activeSettingsSection === "privacy" ? "text-green_1" : ""
                  }`}
                  onClick={() => setActiveSettingsSection("privacy")}
                >
                  🔒 Privacy & Security
                </button>
                <button
                  className={`w-full text-left hover:dark:text-dark_text_1 ${
                    activeSettingsSection === "notifications" ? "text-green_1" : ""
                  }`}
                  onClick={() => setActiveSettingsSection("notifications")}
                >
                  🔔 Notifications
                </button>
                <button
                  className={`w-full text-left hover:dark:text-dark_text_1 ${
                    activeSettingsSection === "storage" ? "text-green_1" : ""
                  }`}
                  onClick={() => setActiveSettingsSection("storage")}
                >
                  📱 Storage & Data
                </button>
                <button
                  className={`w-full text-left hover:dark:text-dark_text_1 ${
                    activeSettingsSection === "help" ? "text-green_1" : ""
                  }`}
                  onClick={() => setActiveSettingsSection("help")}
                >
                  ❓ Help & Support
                </button>
              </div>
            </div>

            <div className="dark:bg-dark_bg_1 rounded-lg p-4 border dark:border-dark_border_2">
              {activeSettingsSection === "privacy" && (
                <div className="space-y-3">
                  <h4 className="text-sm text-green_1 font-medium">Privacy & Security</h4>
                  <label className="flex items-center justify-between text-sm dark:text-dark_text_1">
                    Last seen visibility
                    <input
                      type="checkbox"
                      checked={preferences.privacyLastSeen}
                      onChange={() => togglePreference("privacyLastSeen")}
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm dark:text-dark_text_1">
                    Profile photo visibility
                    <input
                      type="checkbox"
                      checked={preferences.privacyProfilePhoto}
                      onChange={() => togglePreference("privacyProfilePhoto")}
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm dark:text-dark_text_1">
                    Two-step verification
                    <input
                      type="checkbox"
                      checked={preferences.privacyTwoStep}
                      onChange={() => togglePreference("privacyTwoStep")}
                    />
                  </label>
                  <div className="border-t dark:border-dark_border_2 pt-3 mt-2 space-y-2">
                    <p className="text-sm dark:text-dark_text_1 font-medium">App lock (4-digit PIN)</p>
                    <p className="text-xs dark:text-dark_text_2">
                      Require PIN every time you login.
                    </p>
                    {appLockEnabled && (
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={currentAppLockPin}
                        onChange={(e) =>
                          setCurrentAppLockPin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Current PIN"
                        className="w-full rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={appLockPin}
                        onChange={(e) => setAppLockPin(e.target.value.replace(/\D/g, ""))}
                        placeholder={appLockEnabled ? "New PIN" : "PIN"}
                        className="rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={appLockConfirmPin}
                        onChange={(e) =>
                          setAppLockConfirmPin(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Confirm PIN"
                        className="rounded-md bg-[#1f2c33] px-3 py-2 text-sm dark:text-dark_text_1 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded-md text-sm bg-green_1 text-white disabled:opacity-50"
                        onClick={saveAppLock}
                        disabled={appLockSaving}
                      >
                        {appLockEnabled ? "Change app PIN" : "Enable app lock"}
                      </button>
                      {appLockEnabled && (
                        <button
                          className="px-3 py-2 rounded-md text-sm bg-[#1f2c33] dark:text-dark_text_1 disabled:opacity-50"
                          onClick={disableAppLock}
                          disabled={appLockSaving}
                        >
                          Turn off
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsSection === "notifications" && (
                <div className="space-y-3">
                  <h4 className="text-sm text-green_1 font-medium">Notifications</h4>
                  <label className="flex items-center justify-between text-sm dark:text-dark_text_1">
                    Mute all chat notifications
                    <input
                      type="checkbox"
                      checked={notificationPrefs.muteAllNotifications}
                      onChange={() =>
                        toggleNotificationPreference("muteAllNotifications")
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm dark:text-dark_text_1">
                    Mute login notifications
                    <input
                      type="checkbox"
                      checked={notificationPrefs.muteLoginNotifications}
                      onChange={() =>
                        toggleNotificationPreference("muteLoginNotifications")
                      }
                    />
                  </label>
                  <p className="text-xs dark:text-dark_text_2">
                    Per-chat mute can be changed from each chat info drawer.
                  </p>
                </div>
              )}

              {activeSettingsSection === "storage" && (
                <div className="space-y-3">
                  <h4 className="text-sm text-green_1 font-medium">Storage & Data</h4>
                  <p className="text-sm dark:text-dark_text_1">
                    Approx local storage usage: {getLocalStorageUsageKb()} KB
                  </p>
                  <button
                    className="px-3 py-2 rounded-md text-sm bg-[#1f2c33] dark:text-dark_text_1"
                    onClick={() => {
                      localStorage.removeItem(`pinned:${user._id}`);
                      localStorage.removeItem(`archived:${user._id}`);
                      setError("Cleared pinned and archived cache.");
                    }}
                  >
                    Clear chat layout cache
                  </button>
                </div>
              )}

              {activeSettingsSection === "help" && (
                <div className="space-y-3">
                  <h4 className="text-sm text-green_1 font-medium">Help & Support</h4>
                  <button
                    className="px-3 py-2 rounded-md text-sm bg-[#1f2c33] dark:text-dark_text_1 mr-2"
                    onClick={() => window.open("https://faq.whatsapp.com/", "_blank")}
                  >
                    Open FAQ
                  </button>
                  <button
                    className="px-3 py-2 rounded-md text-sm bg-[#1f2c33] dark:text-dark_text_1"
                    onClick={() =>
                      setError("Support: support@aswath-whatsapp-clone.com")
                    }
                  >
                    Contact support
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showCropper && tempImage && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md dark:bg-dark_bg_2 rounded-lg p-4">
              <h3 className="dark:text-dark_text_1 text-sm font-semibold mb-3">Crop profile image</h3>
              <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="mt-3">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 py-2 rounded-md dark:bg-dark_bg_3 dark:text-dark_text_1"
                  onClick={() => {
                    setShowCropper(false);
                    setTempImage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2 rounded-md bg-green_1 text-white"
                  onClick={confirmCropAndUpload}
                  disabled={loading}
                >
                  {loading ? "Uploading..." : "Crop & Upload"}
                </button>
              </div>
            </div>
          </div>
        )}

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
