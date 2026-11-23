import mongoose from "mongoose";

/**
 * Runs a lookup by `_id` and resolves to null when the id is not an ObjectId, instead of failing with a CastError.
 * Such an id cannot match any document, so callers treat it like any other id that was not found.
 * Other errors, including invalid values in an update, are rethrown.
 */
export async function nullIfInvalidId<T>(query: PromiseLike<T>): Promise<T | null> {
	try {
		return await query;
	} catch (err) {
		if (err instanceof mongoose.Error.CastError && err.path === "_id") return null;
		throw err;
	}
}
