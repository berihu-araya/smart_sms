const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5200";

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      "The backend service is not running yet. Please make sure the backend server is started."
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || response.statusText || "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function downloadFile(path, fallbackFilename) {
  const token = getToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch (error) {
    throw new Error(
      "The backend service is not running yet. Please make sure the backend server is started."
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || response.statusText || "Download failed");
  }

  const filename = response.headers
    .get("Content-Disposition")
    ?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { API_BASE_URL, request, downloadFile };
