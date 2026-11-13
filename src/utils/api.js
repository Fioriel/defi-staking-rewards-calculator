import axios from "axios";
import { getCookie } from "./cookie";
import { BASE_URL } from "../config/config";

const apiHost = new URL(BASE_URL).hostname;
if (apiHost !== "127.0.0.1" && apiHost !== "localhost") {
  throw new Error("Refusing a non-local API base URL");
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json" // Set your desired headers
  }
});

const axiosFormdataInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "multipart/form-data" // Set your desired headers
  }
});

const api = {
  get: async (url, params = {}) => {
    try {
      const response = await axiosInstance.get(url, { params });
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  },
  post: async (url, data = {}) => {
    try {
      const response = await axiosInstance.post(url, data);
      return response.data;
    } catch (error) {
      console.log(error);
      throw error.response.data;
    }
  },
  formPost: async (url, data) => {
    try {
      const token = getCookie("token");
      axiosFormdataInstance.defaults.headers.common["x-auth-token"] = token;
      const response = await axiosFormdataInstance.post(url, data);
      return response.data;
    } catch (error) {
      console.log(error);
      throw error.response.data;
    }
  },
  authPost: async (url, data) => {
    try {
      const token = getCookie("token");
      axiosInstance.defaults.headers.common["x-auth-token"] = token;
      const response = await axiosInstance.post(url, data);
      return response.data;
    } catch (error) {
      console.log(error);
      throw error.response.data;
    }
  }
  // Add functions for other HTTP methods (PUT, DELETE) as needed
};

export default api;
