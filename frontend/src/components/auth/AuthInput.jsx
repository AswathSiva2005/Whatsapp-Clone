import { useState } from "react";

export default function AuthInput({
  name,
  type,
  placeholder,
  register,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="mt-8 content-center dark:text-dark_text_1 space-y-1">
      <label htmlFor={name} className="text-sm font-bold tracking-wide">
        {placeholder}
      </label>
      <div className="relative">
        <input
          className="w-full dark:bg-dark_bg_3 text-base py-2 px-4 rounded-lg outline-none"
          type={inputType}
          placeholder={placeholder}
          {...register(name)}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium dark:text-dark_text_1"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}
