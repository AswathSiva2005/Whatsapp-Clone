import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { signUpSchema } from "../../utils/validation";
import AuthInput from "./AuthInput";
import { useDispatch, useSelector } from "react-redux";
import PulseLoader from "react-spinners/PulseLoader";
import { Link, useNavigate } from "react-router-dom";
import { changeStatus, registerUser } from "../../features/userSlice";
import { useState } from "react";
import Picture from "./Picture";
import axios from "axios";
export default function RegisterForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.user);
  const [picture, setPicture] = useState();
  const [readablePicture, setReadablePicture] = useState("");
  const [uploadError, setUploadError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(signUpSchema),
  });
  const onSubmit = async (data) => {
    dispatch(changeStatus("loading"));
    setUploadError("");
    let pictureUrl = "";

    if (picture) {
      try {
        const response = await uploadImage();
        pictureUrl = response?.secure_url || "";
        if (!pictureUrl) {
          setUploadError(
            "Image upload failed. Please check upload settings or continue without image."
          );
        }
      } catch (err) {
        setUploadError(
          "Image upload failed. Please check Cloudinary keys or continue without image."
        );
      }
    }

    let res = await dispatch(registerUser({ ...data, picture: pictureUrl }));
    if (res?.payload?.user) {
      navigate("/");
    }
  };
  const uploadImage = async () => {
    const cloud_name =
      process.env.REACT_APP_CLOUD_NAME2 || process.env.REACT_APP_CLOUD_NAME;
    const cloud_secret =
      process.env.REACT_APP_CLOUD_SECRET2 || process.env.REACT_APP_CLOUD_SECRET;

    // Validate Cloudinary config
    const invalidNames = ["name-cloudinary", "put-same-name-here"];
    const invalidSecrets = ["secrets-cloudinary", "put-same-secret-here"];
    const hasValidConfig =
      cloud_name &&
      cloud_secret &&
      !invalidNames.includes(cloud_name) &&
      !invalidSecrets.includes(cloud_secret);

    if (!hasValidConfig) {
      console.warn("Cloudinary not configured. Skipping picture upload.");
      return null; // Picture is optional
    }

    try {
      let formData = new FormData();
      formData.append("upload_preset", cloud_secret);
      formData.append("file", picture);

      const { data } = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        formData
      );

      return data;
    } catch (err) {
      // fallback to backend upload so registration avatar still works without client cloud config
      try {
        let localFormData = new FormData();
        localFormData.append("file", picture);
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_ENDPOINT}/auth/upload`,
          localFormData
        );
        return data;
      } catch {
        return null;
      }
    }
  };
  return (
    <div className="w-full flex items-center justify-center">
      {/* Container */}
      <div className="w-full max-w-md space-y-6 sm:space-y-8 p-5 sm:p-8 md:p-10 dark:bg-dark_bg_2 rounded-xl">
        {/*Heading*/}
        <div className="text-center dark:text-dark_text_1">
          <h2 className="mt-6 text-3xl font-bold">Welcome</h2>
          <p className="mt-2 text-sm">Sign up</p>
        </div>
        {/*Form*/}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <AuthInput
            name="name"
            type="text"
            placeholder="Full Name"
            register={register}
            error={errors?.name?.message}
          />
          <AuthInput
            name="email"
            type="text"
            placeholder="Email address"
            register={register}
            error={errors?.email?.message}
          />
          <AuthInput
            name="phone"
            type="text"
            placeholder="Phone number (+91xxxxxxxxxx)"
            register={register}
            error={errors?.phone?.message}
          />
          <AuthInput
            name="status"
            type="text"
            placeholder="Status (Optional)"
            register={register}
            error={errors?.status?.message}
          />
          <AuthInput
            name="password"
            type="password"
            placeholder="Password"
            register={register}
            error={errors?.password?.message}
          />
          {/* Picture */}
          <Picture
            readablePicture={readablePicture}
            setReadablePicture={setReadablePicture}
            setPicture={setPicture}
          />
          {/*if we have an error*/}
          {uploadError ? (
            <div>
              <p className="text-red-400">{uploadError}</p>
            </div>
          ) : null}
          {error ? (
            <div>
              <p className="text-red-400">{error}</p>
            </div>
          ) : null}
          {/*Submit button*/}
          <button
            className="w-full flex justify-center bg-green_1 text-gray-100 p-4 rounded-full tracking-wide
          font-semibold focus:outline-none hover:bg-green_2 shadow-lg cursor-pointer transition ease-in duration-300
          "
            type="submit"
          >
            {status === "loading" ? (
              <PulseLoader color="#fff" size={16} />
            ) : (
              "Sign up"
            )}
          </button>
          {/* Sign in link */}
          <p className="flex flex-col items-center justify-center mt-10 text-center text-md dark:text-dark_text_1">
            <span>have an account ?</span>
            <Link
              to="/login"
              className=" hover:underline cursor-pointer transition ease-in duration-300"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
