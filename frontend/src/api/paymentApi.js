import axiosClient from './axiosClient';

export const createCheckoutSession = (orderId) =>
  axiosClient.post('/payments/checkout-session', { orderId });
export const verifyPayment = (orderId) => axiosClient.post(`/payments/verify/${orderId}`);
