import axiosClient from './axiosClient';

export const createOrder = (items) => axiosClient.post('/orders', { items });
export const getMyOrders = () => axiosClient.get('/orders/my-orders');
export const getAllOrders = () => axiosClient.get('/orders');
export const updateOrderStatus = (id, status) =>
  axiosClient.put(`/orders/${id}/status`, { status });
