import axiosClient from './axiosClient';

export const getAllProducts = () => axiosClient.get('/products');
export const getProduct = (id) => axiosClient.get(`/products/${id}`);
export const createProduct = (data) => axiosClient.post('/products', data);
export const updateProduct = (id, data) => axiosClient.put(`/products/${id}`, data);
export const deleteProduct = (id) => axiosClient.delete(`/products/${id}`);
