import axiosClient from './axiosClient';

export const getAllProducts = () => axiosClient.get('/products');
export const getProduct = (id) => axiosClient.get(`/products/${id}`);
