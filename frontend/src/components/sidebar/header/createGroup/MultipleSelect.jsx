import Select from "react-select";
import { getTwoLetterAvatarUrl } from "../../../../utils/avatar";

export default function MultipleSelect({
  selectedUsers,
  setSelectedUsers,
  searchResults,
  searchValue,
  setSearchValue,
}) {
  return (
    <div className="mt-4">
      <Select
        options={searchResults}
        onChange={setSelectedUsers}
        inputValue={searchValue}
        onInputChange={(value, { action }) => {
          if (action === "input-change") {
            setSearchValue(value);
          }
        }}
        onMenuClose={() => setSearchValue("")}
        placeholder="Search, select users"
        isMulti
        formatOptionLabel={(user) => (
          <div className="flex items-center gap-1">
            <img
              src={user.picture || getTwoLetterAvatarUrl(user.label)}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getTwoLetterAvatarUrl(user.label);
              }}
              className="w-8 h-8 object-cover rounded-full"
            />
            <span className="text-[#222]">{user.label}</span>
          </div>
        )}
        styles={{
          control: (baseStyles, state) => ({
            ...baseStyles,
            border: "none",
            borderColor: "transparent",
            background: "transparent",
          }),
        }}
      />
    </div>
  );
}
