import axios from "axios";

const API_URL = "";

export const auth = {
  // Fix: Added types (email: string, password: string)
  login: async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data;
  },
  // Fix: Added types here too
  register: async (email: string, password: string, fullName: string) => {
    const res = await axios.post(`${API_URL}/auth/register`, { 
      email, 
      password, 
      full_name: fullName 
    });
    return res.data;
  }
};

export const getToken = () => localStorage.getItem("fv_token");
export const setToken = (token: string) => localStorage.setItem("fv_token", token);
export const removeToken = () => localStorage.removeItem("fv_token");
export const getUser = () => JSON.parse(localStorage.getItem("fv_user") || "null");