import axios from "axios";

const cloud_name = process.env.REACT_APP_CLOUD_NAME2;
const cloud_secret = process.env.REACT_APP_CLOUD_SECRET2;
const apiBase = process.env.REACT_APP_API_ENDPOINT;

const hasValidCloudinaryConfig = () => {
  if (!cloud_name || !cloud_secret) return false;
  const invalidNames = ["name-cloudinary", "put-same-name-here"];
  const invalidPresets = ["secrets-cloudinary", "put-same-secret-here"];
  return !invalidNames.includes(cloud_name) && !invalidPresets.includes(cloud_secret);
};

const normalizeUploadedFile = (uploaded, originalFile) => {
  const secureUrl = uploaded?.secure_url || uploaded?.url || "";
  const extension = originalFile?.name?.includes(".")
    ? originalFile.name.split(".").pop()
    : "bin";

  return {
    secure_url: secureUrl,
    url: secureUrl,
    public_id: uploaded?.public_id || originalFile?.name || `file.${extension}`,
    original_filename:
      uploaded?.original_filename ||
      (originalFile?.name ? originalFile.name.replace(/\.[^/.]+$/, "") : "file"),
    bytes: uploaded?.bytes || originalFile?.size || 0,
    resource_type: uploaded?.resource_type || "raw",
    format: uploaded?.format || extension,
  };
};

const uploadToBackend = async (file, token) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await axios.post(`${apiBase}/user/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    secure_url: data?.url,
    url: data?.url,
    public_id: data?.public_id,
    original_filename: data?.original_filename,
    bytes: data?.bytes,
  };
};

export const uploadFiles = async (files, token) => {
  let uploaded = [];
  const canUseCloudinary = hasValidCloudinaryConfig();

  for (const f of files) {
    const { file, type } = f;
    let res;

    if (canUseCloudinary) {
      let formData = new FormData();
      formData.append("upload_preset", cloud_secret);
      formData.append("file", file);
      res = await uploadToCloudinary(formData, file?.type);
    }

    if (!res?.secure_url && token) {
      try {
        res = await uploadToBackend(file, token);
      } catch {
        res = null;
      }
    }

    if (!res?.secure_url) {
      throw new Error("File upload failed. Please verify upload settings.");
    }

    uploaded.push({
      file: normalizeUploadedFile(res, file),
      type: type,
    });
  }
  return uploaded;
};
const uploadToCloudinary = async (formData, mimeType = "") => {
  const resourceType = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("video/")
    ? "video"
    : "raw";

  return new Promise(async (resolve) => {
    return await axios
      .post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`,
        formData
      )
      .then(({ data }) => {
        resolve(data);
      })
      .catch((err) => {
        resolve(null);
      });
  });
};
