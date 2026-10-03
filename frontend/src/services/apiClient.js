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

export { API_BASE_URL, request };
