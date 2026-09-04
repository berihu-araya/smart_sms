# Smart SMS Frontend Code Walkthrough

This document connects the real frontend code in this project with the concepts you need to understand as a senior-level developer.

## 1. Project layout

The frontend codebase is structured as follows:

- app/ — route pages and layouts
- components/ — reusable UI blocks
- context/ — global app state like auth
- hooks/ — custom logic and shared access patterns
- services/ — API requests and business interaction layer
- styles/ — global or shared styling patterns
- utils/ — small helper functions

Main files to study first:

- [frontend/src/app/layout.js](../frontend/src/app/layout.js)
- [frontend/src/app/dashboard/layout.js](../frontend/src/app/dashboard/layout.js)
- [frontend/src/context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx)
- [frontend/src/services/apiClient.js](../frontend/src/services/apiClient.js)
- [frontend/src/services/authService.js](../frontend/src/services/authService.js)
- [frontend/src/components/layout/Sidebar/Sidebar.jsx](../frontend/src/components/layout/Sidebar/Sidebar.jsx)
- [frontend/src/app/dashboard/page.js](../frontend/src/app/dashboard/page.js)

---

## 2. Root app and layout logic

The root app is defined in [frontend/src/app/layout.js](../frontend/src/app/layout.js).

It wraps every page with the application shell. That is important because it gives the project a shared global structure.

```js
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "Smart SMS",
  description: "Smart school management system built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Why this matters

- `metadata` defines page metadata
- `AuthProvider` makes auth available everywhere
- `Header` is included globally
- `children` represents the current route output

This is the central composition pattern in Next.js.

---

## 3. Dashboard layout pattern

The dashboard area is a nested layout in [frontend/src/app/dashboard/layout.js](../frontend/src/app/dashboard/layout.js).

This layout is responsible for the shell of all dashboard pages:

- sidebar
- header/content area
- responsive collapse

```js
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar/Sidebar";

export default function DashboardLayout({ children }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Sidebar isVisible={isSidebarVisible} />
      <main
        style={{
          marginLeft: isSidebarVisible ? 280 : 0,
          transition: "margin-left 0.3s ease",
          width: isSidebarVisible ? "calc(100% - 280px)" : "100%",
        }}
      >
        {children}
      </main>
    </>
  );
}
```

### Senior lesson

This is a good example of handling layout state in a client component. It is not magic; it is just responsive UI logic with state and effects.

---

## 4. Auth system in detail

The auth logic is centralized in [frontend/src/context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx).

```js
"use client";

import { createContext, useState, useEffect } from "react";
import authService from "@/services/authService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authService.getProfile();
      if (response?.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        setUser(response.user);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }

      setLoading(false);
    }

    initAuth();
  }, []);

  async function login(credentials) {
    const response = await authService.login(credentials);

    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);

    window.location.href = "/dashboard";
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Why this is important

This is how a real app keeps the user session available globally.

The pattern is:

- store token in localStorage
- restore on reload
- validate session with backend
- update state globally
- expose methods to components

This is the classic frontend auth architecture.

---

## 5. API layer pattern

The service layer is defined in [frontend/src/services/apiClient.js](../frontend/src/services/apiClient.js).

```js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || response.statusText || "Request failed");
  }

  return payload;
}
```

### Senior lesson

This file keeps all API logic in one place. That is important because it creates a single abstraction layer for:

- token injection
- JSON parsing
- error handling
- base URL management

Then all individual feature services become simple and clean.

For example, [frontend/src/services/authService.js](../frontend/src/services/authService.js) wraps those endpoints.

---

## 6. Sidebar and role-based navigation

The sidebar in [frontend/src/components/layout/Sidebar/Sidebar.jsx](../frontend/src/components/layout/Sidebar/Sidebar.jsx) is not just a visual component. It demonstrates real product logic.

Important points:

- Menu is generated from `menuData`
- User role decides visible items
- Active path highlights the current menu item
- Children menus can expand/collapse

```js
const filteredMenuData = filterMenuByRole(menuData, user?.role);
```

This is senior product thinking because the same view can adapt for different users without creating separate UIs for each role.

---

## 7. Dashboard data fetching pattern

The dashboard home page in [frontend/src/app/dashboard/page.js](../frontend/src/app/dashboard/page.js) is a practical example of client-side data loading.

```js
useEffect(() => {
  let isMounted = true;

  async function fetchDashboardData() {
    try {
      const payload = await request("/api/dashboard");

      if (isMounted) {
        setData(payload);
        setError(null);
      }
    } catch (err) {
      if (isMounted) {
        setError(err.message || "Something went wrong");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }

  fetchDashboardData();

  return () => {
    isMounted = false;
  };
}, []);
```

### Why this is good

- avoids stale state after unmount
- handles loading and error states cleanly
- keeps API logic separate

This is a common beginner-friendly pattern and a real-world app pattern.

---

## 8. Next.js logic to catch clearly

### 8.1 App Router

This project uses the modern App Router architecture.

Examples:

- [frontend/src/app/page.js](../frontend/src/app/page.js)
- [frontend/src/app/dashboard/page.js](../frontend/src/app/dashboard/page.js)
- [frontend/src/app/login/page.js](../frontend/src/app/login/page.js)

Each file under app represents a route.

### 8.2 Client components

When a component uses browser features, it must be explicitly marked:

```js
"use client";
```

Examples:

- dashboard layout
- auth context
- sidebar component

### 8.3 Rendering and composition

The page is ultimately just a React function returning JSX.

```js
export default function Home() {
  return <main>...</main>;
}
```

This is the core of Next.js: files render components that combine to form the interface.

### 8.4 Shared layouts

The app has a root layout and a dashboard layout. That means the shell is reused while the inner route changes.

This is exactly how large apps keep structure consistent.

---

## 9. Typical senior developer thinking

As a senior developer, I would evaluate this frontend along these dimensions:

### Security

- token stored securely enough for a browser app
- frontend role checks are not security enforcement
- backend must enforce permissions

### UX quality

- sidebar is responsive
- dashboard state is handled gracefully
- route-based pages are clear and modular

### Maintainability

- services centralize API communication
- layout shell reduces duplication
- route files are clean and organized

### Scalability

- more modules can be added under app/
- services can scale by feature
- components can be reused instead of duplicated

---

## 10. What to learn next

To become strong in this area, learn the following in order:

1. React fundamentals: props, state, hooks
2. Context API and state design
3. Next.js App Router
4. client/server component differences
5. form validation and error handling
6. auth flows and route protection
7. API caching and data fetching patterns
8. TypeScript for frontend systems

---

## 11. Final interpretation

This frontend is a good example of a real-world Next.js app in a school management system environment. It is not random code; it is a structured system where:

- routes map to pages
- global state is kept in context
- API interactions are centralized
- UI is split into reusable components
- the dashboard shell is responsive and modular

That is exactly the type of architecture a senior developer should aim for.
