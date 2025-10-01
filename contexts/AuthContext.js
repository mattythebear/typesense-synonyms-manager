// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const storedUser = localStorage.getItem("typesense-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });

      if (!response.ok) throw new Error("Login failed");

      const data = await response.json();

      const userData = { username: data.user.fullName, loggedIn: true };
      setUser(userData);
      localStorage.setItem('typesense-user', JSON.stringify({ username: data.user.fullName, loggedIn: true }));
      router.push("/");
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Invalid credentials' };
    }

  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("typesense-user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
