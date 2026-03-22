export const resolveApiEndpoint = () => {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5001/api/v1";
  }
  if (process.env.REACT_APP_API_ENDPOINT) {
    return process.env.REACT_APP_API_ENDPOINT;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }

  return "http://localhost:5001/api/v1";
};

export const resolveMediaUrl = (rawUrl = "") => {
  const url = String(rawUrl || "").trim();
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const apiHost = resolveApiEndpoint().split("/api/v1")[0];

  if (url.startsWith("/uploads/")) {
    return `${apiHost}${url}`;
  }

  if (url.startsWith("uploads/")) {
    return `${apiHost}/${url}`;
  }

  if (url.startsWith("/")) {
    return `${apiHost}${url}`;
  }

  return `${apiHost}/uploads/${url}`;
};
