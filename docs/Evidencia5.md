# Evidencia 5

## Clase 07 de Septiembre del 2026

### Código Desarrollado 

auth.js
``` js 
import { env } from './env.js'

if (!env.JWT_ACCESS_SECRET) {
    throw new Error('JWT ACCESS SECRET es requerido')
}

if (!env.JWT_REFRESH_SECRET) {
    throw new Error('JWT REFRESH SECRET es requerido')
}
export const authConfig = Object.freeze({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
})

```

tokens.js 
``` js 
import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { authConfig } from '../../config/auth.js'

export function signAccessToken(payload) {
    return jwt.sign(payload, authConfig.accessSecret, {
        expiresIn: authConfig.accessExpiresIn
    })
}

export function signRefreshToken(payload) {
    return jwt.sign(payload, authConfig.refreshSecret, {
        expiresIn: authConfig.refreshExpiresIn
    })
}

export function verifyAcessToken(token) {
    return jwt.verify(token, authConfig.accessSecret)
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, authConfig.refreshSecretSecret)
}

export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex')
}
```

user.repository.js
``` js
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";

const usersCollection = db.collection('users')

function mapTimestamp(value) {
    return value?.toDate?.()?.toISOString() ?? null
}

function mapUser(document) {
    if (!document.exists) {
        return null
    }

    const data = document.data()

    return {
        id: document.id,
        email: data.email,
        name: data.name,
        role: data.role,
        active: data.active,
        createdAt: mapTimestamp(data.createdAt),
        updatedAt: mapTimestamp(data.updatedAt)
    }
}

export async function createUser(data) {
    const user = usersCollection.doc()
    await user.set({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    })
    const created = await user.get()
    return mapUser(created)
}

export async function findById(id) {
    const doc = await usersCollection.doc(id).get()
    return mapUser(doc)
}

export async function findByEmail(email) {
    const user = await usersCollection.where('email', '==', email)
        .limit(1)
        .get()

    if (user.empty) {
        return null
    }

    const foundUser = user[0]
    return {
        ...mapUser(foundUser),
        passwordHash: foundUser.data().passwordHash
    }
}

```

auth.repository.js
``` js 
import { FieldValue } from "firebase-admin/firestore";
import { db } from '../../config/firebase.js'

const refreshTokensCollection = db.collection('refreshTokens')

export async function saveRefreshToken({
    userId,
    tokenHash
}) {
    await refreshTokensCollection.doc(tokenHash)
        .set({
            userId,
            revoked: false,
            createdAt: FieldValue.serverTimestamp()
        })
}

export async function findRefreshToken(tokenHash) {
    const token = await refreshTokensCollection.doc(tokenHash).get()
    if (!token.exists) {
        return null
    }
    return {
        id: token.data,
        ...token.data()
    }
}

export async function revokeRefreshToken(tokenHash) {
    await refreshTokensCollection.doc(tokenHash)
        .set({
            revoked: true,
            revokedAt: FieldValue.serverTimestamp()
        }), {
        merge: true
    }
}

```

auth.service.js
```js 
import { sign } from 'jsonwebtoken'
import { AppError } from '../../shared/errors/app.error.js'
import { hashPassword } from '../../shared/security/password.js'
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/security/tokens.js'
import * as userRepository from '../users/user.repository.js'
import * as authRepository from './auth.repository.js'

function issuesTokens(user) {
    const payload = {
        sub: user.id,
        role: user.role
    }
    return {
        accessToken: signAccessToken(payload),
        refresh: signRefreshToken(payload)
    }
}

export async function register(data) {
    const existingUser = await userRepository.findByEmail(data.email)
    if (existingUser) {
        throw new AppError({
            statusCode: 409,
            code: 'EMAIL_EXISTS',
            message: 'El correo ya fue registrado'
        })
    }
    const user = userRepository.createUser({
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: 'CUSTOMER',
        active: true
    })
    const tokens = issuesTokens(user)
    await authRepository.saveRefreshToken({
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken)
    })
    return {
        user,
        ...tokens
    }
}

```

auth.schema.js
``` js
import { z } from 'zod'

const empty = z.object({}).default({})

const email = z.string().trim().toLowerCase().email()
const password = z.string().min(8).max(100)

export const registerSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(120),
        email,
        password
    }),
    params: empty,
    query: empty
})

export const loginSchema = z.object({
    body: z.object({
        email,
        password
    }),
    params: empty,
    query: empty
})

export const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1)
    }),
    params: empty,
    query: empty
})

```

password.js
``` js 
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS)
}

export function verifyPassword(password, hashPassword) {
    return bcrypt.compare(password, hashPassword)
}

```
