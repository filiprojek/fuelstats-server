import { isValidObjectId, Model } from "mongoose";

/**
 * In-memory stand-in for a Mongoose collection, used by the CSV import specs.
 * `save()` stores the document and `exists(filter)` evaluates the filter against stored documents.
 * Supported filter values: plain equality, `null` (field missing or null), Dates and `{ $nin: [...] }`.
 * Like Mongoose, querying `_id` with a string that is not an ObjectId fails with a CastError.
 */
export function fakeStore(model: Model<any>) {
	const docs: any[] = [];

	const matches = (doc: any, filter: Record<string, any>) =>
		Object.entries(filter).every(([key, expected]) => {
			const actual = doc[key];
			if (expected === null) return actual === null || actual === undefined;
			if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
			if (typeof expected === "object" && "$nin" in expected) return !expected.$nin.some((v: any) => String(v) === String(actual));
			return String(actual) === String(expected);
		});

	jest.spyOn(model.prototype, "save").mockImplementation(function (this: any) {
		docs.push(this);
		return Promise.resolve(this);
	});

	jest.spyOn(model, "exists").mockImplementation(((filter: Record<string, any>) => {
		if (typeof filter._id === "string" && !isValidObjectId(filter._id)) {
			return Promise.reject(new Error(`CastError: Cast to ObjectId failed for value "${filter._id}"`));
		}
		const found = docs.find((doc) => matches(doc, filter));
		return Promise.resolve(found ? { _id: found._id } : null);
	}) as any);

	return {
		docs,
		/** Store documents that existed before the import under test. */
		seed: (...fields: Array<Record<string, any>>) => docs.push(...fields.map((f) => new model(f))),
	};
}
