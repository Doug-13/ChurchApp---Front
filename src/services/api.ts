import axios from "axios";
import auth from "@react-native-firebase/auth";

export const api = axios.create({
  baseURL: "http://10.1.91.176:3000", // seu backend
  timeout: 15000,
  // timeout: 500,
});

api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
