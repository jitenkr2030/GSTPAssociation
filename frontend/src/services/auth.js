import axios from 'axios';

export const login = async (credentials) => {
  const response = await axios.post('/api/auth/login', credentials);
    return response.data;
    };

    export const register = async (details) => {
      const response = await axios.post('/api/auth/register', details);
        return response.data;
        };

        export const logout = () => {
          return axios.post('/api/auth/logout');
          };
          