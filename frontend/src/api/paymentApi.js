import axiosClient from './axiosClient';

export const createCheckoutSession = (orderId) =>
  axiosClient.post('/payments/checkout-session', { orderId });
