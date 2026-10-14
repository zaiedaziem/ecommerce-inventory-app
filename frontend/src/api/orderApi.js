import axiosClient from './axiosClient';

export const createOrder = (items) => axiosClient.post('/orders', { items });
export const getMyOrders = () => axiosClient.get('/orders/my-orders');
export const getAllOrders = () => axiosClient.get('/orders');
export const shipOrder = (id) => axiosClient.put(`/orders/${id}/ship`);
export const receiveOrder = (id) => axiosClient.put(`/orders/${id}/receive`);
