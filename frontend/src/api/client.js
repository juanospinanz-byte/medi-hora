import axios from 'axios';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const client = axios.create({
  baseURL: getBaseUrl(),
});

export const setAuthToken = (token) => {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
};

export default client;