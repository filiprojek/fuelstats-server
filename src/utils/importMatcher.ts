import { isValidObjectId, Model } from "mongoose";

/**
 * Finds the existing record a CSV import row duplicates, so that row can be skipped.
 *
 * Each existing record matches at most one row, and records created by the same import never match.
 * So identical rows within one file are all imported, while importing the same file again skips every row.
 * Use one matcher per import.
 */
export class ImportMatcher {
	private readonly taken: unknown[] = [];

	constructor(private readonly model: Model<any>) {}

	/** Takes the record with this id if it fits `scope` (e.g. same user and vehicle). Ids that are not ObjectIds never match. */
	async takeById(id: string | undefined, scope: Record<string, unknown>): Promise<boolean> {
		if (!isValidObjectId(id)) return false;
		return this.take(await this.model.exists({ ...scope, _id: id }));
	}

	/** Takes an existing record with these field values that no earlier row has taken. */
	async takeMatch(fields: Record<string, unknown>): Promise<boolean> {
		return this.take(await this.model.exists({ ...fields, _id: { $nin: this.taken } }));
	}

	/** Records the import just created, so later rows of the same import do not match them. */
	created(id: unknown): void {
		this.taken.push(id);
	}

	private take(match: { _id: unknown } | null): boolean {
		if (match) this.taken.push(match._id);
		return match !== null;
	}
}
