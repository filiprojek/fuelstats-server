import User from "../src/models/User";

describe("User model", () => {
	it("allows a user without a password (SSO-only account)", () => {
		const user = new User({ email: "sso@example.com", username: "sso" });
		expect(user.validateSync()).toBeUndefined();
	});

	it("still requires email and username", () => {
		const err = new User({}).validateSync();
		expect(err?.errors).toHaveProperty("email");
		expect(err?.errors).toHaveProperty("username");
	});

	it("stores linked identities", () => {
		const user = new User({
			email: "a@example.com",
			username: "a",
			identities: [{ provider: "authelia", subject: "sub-1", email: "a@example.com" }],
		});
		expect(user.validateSync()).toBeUndefined();
		expect(user.identities).toHaveLength(1);
		expect(user.identities[0]).toMatchObject({ provider: "authelia", subject: "sub-1" });
		expect(user.identities[0].linkedAt).toBeInstanceOf(Date);
	});

	it("requires provider and subject on identities", () => {
		const user = new User({ email: "a@example.com", username: "a", identities: [{ email: "x" }] });
		const err = user.validateSync();
		expect(Object.keys(err?.errors || {})).toEqual(expect.arrayContaining(["identities.0.provider", "identities.0.subject"]));
	});

	it("declares a unique index on provider + subject", () => {
		const indexes = User.schema.indexes();
		expect(indexes).toContainEqual([{ "identities.provider": 1, "identities.subject": 1 }, expect.objectContaining({ unique: true, partialFilterExpression: { "identities.subject": { $exists: true } } })]);
	});
});
