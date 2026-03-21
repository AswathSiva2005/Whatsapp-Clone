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
            <span className="text-white">{user.label}</span>
          </div>
        )}
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            border: "none",
            borderColor: "transparent",
            background: "transparent",
            boxShadow: "none",
          }),
          input: (baseStyles) => ({
            ...baseStyles,
            color: "#ffffff",
          }),
          placeholder: (baseStyles) => ({
            ...baseStyles,
            color: "#d1d5db",
          }),
          singleValue: (baseStyles) => ({
            ...baseStyles,
            color: "#ffffff",
          }),
          menu: (baseStyles) => ({
            ...baseStyles,
            background: "#111b21",
            border: "1px solid #1f2a30",
          }),
          option: (baseStyles, state) => ({
            ...baseStyles,
            color: "#ffffff",
            background: state.isFocused ? "#1f2c33" : "#111b21",
          }),
          multiValue: (baseStyles) => ({
            ...baseStyles,
            background: "#1f2c33",
            borderRadius: "8px",
          }),
          multiValueLabel: (baseStyles) => ({
            ...baseStyles,
            color: "#ffffff",
          }),
          multiValueRemove: (baseStyles) => ({
            ...baseStyles,
            color: "#ffffff",
            ":hover": {
              backgroundColor: "#314047",
              color: "#ffffff",
            },
          }),
        }}
      />
    </div>
  );
}
