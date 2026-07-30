import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    desc: String,
    cat: String,
    zone: String,
    services: [String],
    specialties: [String],
    paymentMethods: [String],
    delivery: Boolean,
    acceptsWhatsapp: Boolean,
    phone: String,
    ig: String,
    logo: String,
    photos: [String],
    loc: String,
    lat: Number,
    lng: Number,
    weekHours: { type: mongoose.Schema.Types.Mixed },
    featured: { type: Boolean, default: false },
    status: { type: String, default: "active" },
    createdAt: String,
    expiresAt: String,
    lastRenewal: String,
    views: { type: Number, default: 0 },
    reviews: { type: mongoose.Schema.Types.Mixed, default: [] },
    discounts: { type: mongoose.Schema.Types.Mixed, default: [] },
    ownerCode: String,
  },
  { timestamps: true, strict: false }
);

export default mongoose.model("Business", businessSchema);
