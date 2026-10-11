// Mirrors MALAYSIAN_STATES in backend/models/addressSchema.js, which validates the value.
export const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'W.P. Kuala Lumpur',
  'W.P. Labuan',
  'W.P. Putrajaya',
];

// "12, Jalan SS 2/24, Taman Bahagia, 47300 Petaling Jaya, Selangor"
export function formatAddress(address) {
  if (!address) return '';
  return [address.line1, address.line2, `${address.postcode} ${address.city}`, address.state]
    .filter(Boolean)
    .join(', ');
}
