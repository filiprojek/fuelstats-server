import path from "path";
import { Schema, model } from "mongoose";

export const schemaName = path.basename(__filename).split(".")[0];

// External sign-in identity (OpenID Connect provider account) linked to a user
const identitySchema = new Schema(
	{
		provider: { type: String, required: true },
		subject: { type: String, required: true },
		email: { type: String },
		linkedAt: { type: Date, default: Date.now },
	},
	{ _id: false },
);

const schema = new Schema(
	{
		username: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		// optional: accounts created through single sign-on have no password until one is set
		password: { type: String },
		identities: { type: [identitySchema], default: [] },
		verification_code: { type: Number, length: 6 },
		verified: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

schema.index({ "identities.provider": 1, "identities.subject": 1 }, { unique: true, partialFilterExpression: { "identities.subject": { $exists: true } } });

export default model(path.basename(__filename).split(".")[0], schema);
