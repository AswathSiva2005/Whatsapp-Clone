import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CloseIcon } from "../../../svg";
import { createContact } from "../../../features/userSlice";
import { open_create_conversation } from "../../../features/chatSlice";
import SocketContext from "../../../context/SocketContext";

function AddContactPanel({ onClose, socket }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [syncToPhone, setSyncToPhone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      alert("First name is required.");
      return;
    }
    if (!phone.trim()) {
      alert("Phone number is required.");
      return;
    }

    setSaving(true);
    try {
      const result = await dispatch(
        createContact({
          token: user.token,
          firstName,
          lastName,
          countryCode,
          phone,
          syncToPhone,
        })
      );

      if (result?.error) {
        alert(result.payload || "Failed to save contact.");
        return;
      }

      const linkedUserId = result?.payload?.contact?.user?._id;
      if (linkedUserId) {
        const convoResult = await dispatch(
          open_create_conversation({
            token: user.token,
            receiver_id: linkedUserId,
          })
        );
        if (convoResult?.payload?._id) {
          socket?.emit("join conversation", convoResult.payload._id);
        }
      } else {
        alert("Contact saved. This number is not registered on WhatsApp clone yet.");
      }

      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const countryOptions = [
    { code: "+1", label: "US (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+61", label: "AU (+61)" },
    { code: "+91", label: "IN (+91)" },
    { code: "+971", label: "AE (+971)" },
  ];

  return (
    <aside className="fixed right-0 top-0 h-screen w-full sm:w-[360px] max-w-full dark:bg-[#0f171d] border-l dark:border-l-[#2a2f33] z-50 flex flex-col">
      <div className="h-[60px] px-4 dark:bg-[#0f171d] flex items-center gap-4 border-b dark:border-b-[#222a2f]">
        <button className="btn" onClick={onClose} aria-label="Close add contact panel">
          <CloseIcon className="fill-white" />
        </button>
        <h2 className="dark:text-dark_text_1 text-xl font-medium">New contact</h2>
      </div>

      <form className="flex-1 overflow-y-auto px-5 py-5" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label className="block text-dark_text_2 text-sm mb-1">First name</label>
            <input
              type="text"
              className="w-full bg-transparent border-b border-green_1 text-white text-base py-2 outline-none"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-dark_text_2 text-sm mb-1">Last name</label>
            <input
              type="text"
              className="w-full bg-transparent border-b dark:border-dark_border_2 text-white text-base py-2 outline-none"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-dark_text_2 text-sm mb-2">Country</label>
              <select
                className="w-full bg-transparent border-b dark:border-dark_border_2 text-white text-base py-2 outline-none"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {countryOptions.map((option) => (
                  <option key={option.code} value={option.code} className="bg-[#0f171d] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-dark_text_2 text-sm mb-2">Phone</label>
              <input
                type="tel"
                className="w-full bg-transparent border-b dark:border-dark_border_2 text-white text-base py-2 outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 pt-2">
            <div>
              <p className="text-white text-base leading-6">Sync contact to phone</p>
              <p className="text-dark_text_2 text-sm mt-1 max-w-[240px]">
                This contact will be added to your phone's address book.
              </p>
            </div>
            <button
              type="button"
              className={`relative w-14 h-8 rounded-full transition ${
                syncToPhone ? "bg-green_1" : "bg-[#252d32]"
              }`}
              onClick={() => setSyncToPhone((prev) => !prev)}
              aria-label="Toggle sync contact to phone"
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-[#0d141a] transition ${
                  syncToPhone ? "left-7" : "left-1"
                }`}
              ></span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-full bg-green_1 text-[#0b141a] font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save contact"}
          </button>
        </div>
      </form>
    </aside>
  );
}

const AddContactPanelWithSocket = (props) => (
  <SocketContext.Consumer>
    {(socket) => <AddContactPanel {...props} socket={socket} />}
  </SocketContext.Consumer>
);

export default AddContactPanelWithSocket;
