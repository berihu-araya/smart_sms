"use client";

import { createContext, useState, useEffect } from "react";
import authService from "@/services/authService"; // Importing the authentication service for handling login and logout operations

export const AuthContext = createContext(); // Creating a context for authentication to share state and functions across components

export function AuthProvider({ children }) { // Creating a provider component to wrap around the application and provide authentication state and functions
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      return;
    }

    if (!token) {
      return;
    }

    authService
      .getProfile()
      .then((response) => {
        if (response?.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          setUser(response.user);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      });
  }, []);

  async function login(credentials) {
    setLoading(true);

    try {
      const response = await authService.login(credentials);

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      setUser(response.user);

      window.location.href = "/dashboard";
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    window.location.href = "/login";
  }

  async function updateProfileImage(profileImage) {
    const response = await authService.updateProfileImage(profileImage);
    const updatedUser = { ...user, profileImage: response.profileImage };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);

    return updatedUser;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateProfileImage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}