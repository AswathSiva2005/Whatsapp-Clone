import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../../svg/Eye";

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
          className="w-full dark:bg-dark_bg_3 text-base py-2 px-4 pr-10 rounded-lg outline-none"
          type={inputType}
          placeholder={placeholder}
          {...register(name)}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green_1 hover:text-green_2 transition ease-in duration-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        ) : null}
      </div>
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}
