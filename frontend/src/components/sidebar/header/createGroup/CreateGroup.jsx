import { useEffect, useState } from "react";
import { ReturnIcon, ValidIcon } from "../../../../svg";
import UnderlineInput from "./UnderlineInput";
import MultipleSelect from "./MultipleSelect";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { createGroupConversation } from "../../../../features/chatSlice";
import { uploadFiles } from "../../../../utils/upload";
import { getTwoLetterAvatarUrl } from "../../../../utils/avatar";
export default function CreateGroup({ setShowCreateGroup }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { status } = useSelector((state) => state.chat);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const keyword = memberSearchTerm.trim();
    if (!keyword) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${process.env.REACT_APP_API_ENDPOINT}/user?search=${encodeURIComponent(keyword)}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        const selectedIds = new Set(selectedUsers.map((selected) => selected.value));

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data
            .filter((candidate) => !selectedIds.has(candidate._id))
            .map((candidate) => ({
              value: candidate._id,
              label: candidate.name,
              picture: candidate.picture,
            }));
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [memberSearchTerm, selectedUsers, user.token]);

  const onGroupImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    setGroupImage(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setGroupImagePreview(evt.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const createGroupHandler = async () => {
    if (status !== "loading") {
      if (!name.trim()) {
        alert("Please enter group name.");
        return;
      }
      if (selectedUsers.length < 2) {
        alert("Please select at least 2 users.");
        return;
      }

      let users = [];
      selectedUsers.forEach((user) => {
        users.push(user.value);
      });

      let picture = "";
      if (groupImage) {
        const uploaded = await uploadFiles(
          [
          {
            file: groupImage,
            type: "IMAGE",
          },
        ],
          user.token
        );
        picture = uploaded?.[0]?.file?.secure_url || "";
      }

      let values = {
        name: name.trim(),
        description: description.trim(),
        picture,
        users,
        token: user.token,
      };
      await dispatch(createGroupConversation(values));
      setShowCreateGroup(false);
    }
  };
  return (
    <div className="createGroupAnimation relative flex0030 h-full z-40">
      {/*Container*/}
      <div className="mt-5">
        {/*Return/Close button*/}
        <button
          className="btn w-6 h-6 border"
          onClick={() => setShowCreateGroup(false)}
        >
          <ReturnIcon className="fill-white" />
        </button>

        <div className="mt-4 flex items-center gap-3">
          <label className="cursor-pointer">
            <img
              src={groupImagePreview || getTwoLetterAvatarUrl(name || "Group")}
              alt="Group"
              className="w-14 h-14 rounded-full object-cover border border-dark_border_2"
            />
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={onGroupImageChange}
            />
          </label>
          <p className="text-sm text-dark_text_2">Tap image to upload group icon</p>
        </div>

        {/*Group name input*/}
        <UnderlineInput name={name} setName={setName} />

        <textarea
          rows={3}
          placeholder="Group description"
          className="w-full mt-4 rounded-md bg-[#1f2c33] text-dark_text_1 p-3 text-sm outline-none"
          value={description}
          maxLength={300}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/*Multiple select */}
        <MultipleSelect
          selectedUsers={selectedUsers}
          searchResults={searchResults}
          setSelectedUsers={setSelectedUsers}
          searchValue={memberSearchTerm}
          setSearchValue={setMemberSearchTerm}
        />
        {/*Create group button*/}
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
          <button
            className="btn bg-green_1 scale-150 hover:bg-green-500"
            onClick={() => createGroupHandler()}
          >
            {status === "loading" ? (
              <ClipLoader color="#E9EDEF" size={25} />
            ) : (
              <ValidIcon className="fill-white mt-2 h-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
