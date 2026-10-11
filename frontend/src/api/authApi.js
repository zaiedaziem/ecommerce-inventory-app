import axiosClient from './axiosClient';

export const register = (data) => axiosClient.post('/auth/register', data);
export const login = (data) => axiosClient.post('/auth/login', data);
export const getMe = () => axiosClient.get('/auth/me');
export const updateProfile = (data) => axiosClient.put('/auth/me', data);
export const changePassword = (data) => axiosClient.put('/auth/password', data);
