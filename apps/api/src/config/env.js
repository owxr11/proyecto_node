import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFile)
const envPath = path.resolve(currentDirectory, '../../.env')

dotenv.config({
    path: envPath
})

const port = Number(process.env.PORT ?? 4000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('El puerto debe ser válido')
}

export const env = Object.freeze({
    NODE_ENV: process.env.NODE_ENV,
    PORT: port,
    API_PREFIX: process.env.API_PREFIX,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
})

if (!env.FIREBASE_PROJECT_ID) {
    throw new Error('Falta la variable de entorno FIREBASE_PROJECT_ID')
}

if (!env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Falta la variable de entorno FIREBASE_CLIENT_EMAIL')
}

if (!env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Falta la variable de entorno FIREBASE_PRIVATE_KEY')
}
