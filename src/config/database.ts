import mongoose from 'mongoose'
import env from './environment'
import { Err, Succ } from '../services/globalService'

// MongoDB
const dbURI: string = env.DB_URI
async function connect(): Promise<boolean> {
	try {
		if (!env.NORK.database) {
			new Err(500, 'no database is in norkcfg.json')
			return false
		}

		if (env.NORK.database.orm == 'mongoose') {
			await mongoose.connect(dbURI)
			new Succ(200, 'connected to db')
			return true
		}

		// unsupported orm
		new Err(500, `unsupported database ${env.NORK.database.db}`)
		return false
	} catch (err: any) {
		new Err(500, err.message || err)
		return false
	}
}

export default connect
