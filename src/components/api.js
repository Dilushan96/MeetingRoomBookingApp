import axios from "axios";

const api = axios.create({
  baseURL: "http://10.1.99.99:5000",
});

export default api;