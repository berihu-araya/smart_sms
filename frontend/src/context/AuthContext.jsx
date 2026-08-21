"use client";

import { createContext, useState, useEffect } from "react";
import authService from "@/services/authService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (storedUser && !cancelled) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem("user");
          }
        }

        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const response = await authService.getProfile();
        if (!cancelled) {
          if (response?.user) {
            localStorage.setItem("user", JSON.stringify(response.user));
            setUser(response.user);
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      cancelled = true;
    };
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