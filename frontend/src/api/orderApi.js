import axiosClient from './axiosClient';

export const createOrder = (items) => axiosClient.post('/orders', { items });
export const getMyOrders = () => axiosClient.get('/orders/my-orders');
