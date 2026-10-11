const mongoose = require('mongoose');

const MALAYSIAN_STATES = [
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

// Malaysian postal address. Embedded in User (saved address) and Order (shipping snapshot).
const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: [true, 'Address line 1 is required'], trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    postcode: {
      type: String,
      required: [true, 'Postcode is required'],
      match: [/^\d{5}$/, 'Postcode must be 5 digits'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      enum: { values: MALAYSIAN_STATES, message: 'Please choose a valid Malaysian state' },
    },
  },
  { _id: false }
);

module.exports = { addressSchema, MALAYSIAN_STATES };
