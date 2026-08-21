import { request } from "./apiClient";

const authService = {
  register: async (userData) => {
    const response = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    return response.data;
  },

  getRoles: async () => {
    const response = await request("/api/v1/auth/roles", {
      method: "GET",
    });

    return response.data;
  },

  login: async (credentials) => {
    const response = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    return response.data;
  },

  resetPassword: async ({ token, password, confirmPassword }) => {
    const response = await request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password, confirmPassword }),
    });

    return response.data;
  },

  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    const response = await request("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    return response.data;
  },

  getProfile: async () => {
    const response = await request("/api/v1/auth/profile", {
      method: "GET",
    });

    return response.data;
  },

  updateProfileImage: async (profileImage) => {
    const response = await request("/api/v1/auth/profile/image", {
      method: "PATCH",
      body: JSON.stringify({ profileImage }),
    });

    return response.data;
  },
};

export default authService;