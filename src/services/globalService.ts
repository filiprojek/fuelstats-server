import colors from "colors";
import fs from "fs";
import path from "path";

export interface ErrType {
	code: number;
	message: string;
	data?: any;
}

export class Err implements ErrType {
	code: number;
	message: string;
	data: any;

	constructor(code: number, message: string | object, data: any = null) {
		this.code = code;
		this.message = typeof message === "object" ? JSON.stringify(message) : message;
		this.data = data;
		this.drop();
	}

	drop() {
		if (this.data !== null && this.data !== undefined) {
			// stringify object data
			const dataStr = typeof this.data === "object" ? JSON.stringify(this.data, null, 2) : String(this.data);

			console.log(colors.bgRed(`${this.code}`) + colors.bgBlack.red(` ${this.message}`) + " " + colors.red(dataStr));
			Log.make("Err", this.code, this.message, this.data);
			return {
				code: this.code,
				message: this.message,
				data: this.data,
			};
		}

		console.log(colors.bgRed(`${this.code}`) + colors.bgBlack.red(` ${this.message}`));
		Log.make("Err", this.code, this.message);
		return {
			code: this.code,
			message: this.message,
		};
	}
}

export class Succ {
	code: number;
	message: string;
	data?: any;

	constructor(code: number, message: string, data: any = null) {
		this.code = code;
		this.message = message;
		this.data = data;
		this.drop();
	}

	drop() {
		if (this.data !== null && this.data !== undefined) {
			const dataStr = typeof this.data === "object" ? JSON.stringify(this.data, null, 2) : String(this.data);

			console.log(colors.bgGreen.black(`${this.code}`) + colors.green.bgBlack(` ${this.message}`) + " " + colors.green(dataStr));
			return {
				code: this.code,
				message: this.message,
				data: this.data,
			};
		}

		console.log(colors.bgGreen.black(`${this.code}`) + colors.green.bgBlack(` ${this.message}`));
		return {
			code: this.code,
			message: this.message,
		};
	}
}

export interface LogType {
	type: "Err" | "Succ" | "Info";
	code?: number;
	message?: string;
	data?: any;
	logFile?: string;
}
export class Log implements LogType {
	type: "Err" | "Succ" | "Info";
	code?: number;
	message?: string;
	data?: any;
	logFile?: string;

	constructor(type: "Err" | "Succ" | "Info", code?: number, message?: string, data?: any, logFile?: string) {
		this.type = type;
		this.code = code;
		this.message = message;
		this.data = data;
		this.logFile = logFile ? `${logFile}.log` : `${type}.global.log`;
		this.logFile = path.join(__dirname, this.logFile);
	}

	static pathMake(type: string, name?: string) {
		const logName = name ? `${name}.log` : `${type}.global.log`;
		return path.join(__dirname, "../logs/", logName);
	}

	static dateNow(): string {
		const add0 = (num: number) => (num < 10 ? "0" + num : String(num));
		const d = new Date();
		return `${d.getFullYear()}-${add0(d.getMonth() + 1)}-${add0(d.getDate())} ${add0(d.getHours())}:${add0(d.getMinutes())}:${add0(d.getSeconds())}`;
	}

	static make(type: "Err" | "Succ" | "Info", code?: number, message?: string, data?: any, logFile?: string) {
		const realPath = Log.pathMake(type, logFile);
		let formattedData = `Date: "${Log.dateNow()}" Type: "${type}"`;
		if (code !== undefined) formattedData += ` Code: "${code}"`;
		if (message) formattedData += ` Message: "${message}"`;
		if (data !== undefined) {
			const d = typeof data === "object" ? JSON.stringify(data) : data;
			formattedData += ` Data: "${d}"`;
		}
		formattedData += "\n";

		if (fs.existsSync(realPath)) {
			fs.appendFileSync(realPath, formattedData);
		} else {
			fs.writeFileSync(realPath, formattedData);
		}
	}
}
