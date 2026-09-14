# Evidencia 6

## Clase 10 de Septiembre del 2026

### Código Desarrollado 

auth.service.js
``` js 
import { AppError } from '../../shared/errors/app.error.js'
import { hashPassword, verifyPassword } from '../../shared/security/password.js'
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
    console.log('@@@ data => ', data);
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

export async function login(data) {
    const user = userRepository.findByEmail(data.email)
    if (!user) {
        throw new AppError({
            statusCode: 401,
            code: 'IVALID_CREDENTIALS',
            message: 'Credenciales Inválidas'
        })
    }

    const validPassword = await verifyPassword(data.password, user.passwordHash)

    if (!validPassword || !user.active) {

        throw new AppError({
            statusCode: 401,
            code: 'IVALID_CREDENTIALS',
            message: 'Credenciales Inválidas'
        })
    }

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

export async function refresh(refreshToken) {
    let payload
    try {
        payload = verifyRefreshToken(refreshToken)
    } catch {
        throw new AppError({
            statusCode: 401,
            code: 'IVALID_TOKEN',
            message: 'Refresh token inválido'
        })
    }

    const tokenHash = hashToken(refreshToken)
    const storedToken = await authRepository.findReFreshToken(tokenHash)
    if (!storedToken || storedToken.revoked || storedToken.userId !== payload.sub) {
        throw new AppError({
            statusCode: 401,
            code: 'IVALID_TOKEN',
            message: 'Refresh token inválido'
        })
    }

    await authRepository.revokeRefreshToken(tokenHash)
    const user = await userRepository.findById(payload.sub)
    if (!user || !user.active) {
        throw new AppError({
            statusCode: 401,
            code: 'USER_DISABLED',
            message: 'Usuario no disponible'
        })
    }

    const tokens = issuesTokens(user)
    await authRepository.saveRefreshToken({
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken)
    })

    return tokens
}

```

auth.controller.js
```js
import * as authService from './auth.service.js'

export async function register(req, res) {
    console.log('@@@ body => ', req.validate.body, req.body);
    const data = authService.register(req.validated.body)

    return res.status(201).json({
        success: true,
        data,
        meta: {
            requestId: req.id
        }
    })
}

export async function login(req, res) {
    const data = authService.login(req.validated.body)

    return res.status(200).json({
        success: true,
        data,
        meta: {
            requestId: req.id
        }
    })
}

export async function refresh(req, res) {
    const data = authService.refresh(req.validated.body.refreshToken)

    return res.status(200).json({
        success: true,
        data,
        meta: {
            requestId: req.id
        }
    })
}

```

auth routes.js
``` js 
import { Router } from 'express'
import { login, refresh, register } from './auth.controller.js'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js'
import { asyncHandler } from '../../shared/middleware/async-handler.js'
import { validate } from '../../shared/middleware/validate.middleware.js'


const router = Router()

router.post('/register', validate(registerSchema), asyncHandler(register))
router.post('/login', validate(loginSchema), asyncHandler(login))
router.post('/refresh', validate(refreshSchema), asyncHandler(refresh))

export default router

```

authenticate.middleware.js
```js 
import { AppError } from "../errors/app.error.js";
import { verifyAcessToken } from "../security/tokens.js";

export function authenticate(req, _res, next) {
    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new AppError({
            statusCode: 401,
            code: 'AUTH_REQUIRED',
            message: 'Autenticación Requerida'
        })
    }

    const token = authorization.slice(7)

    try {
        const payload = verifyAcessToken(token)
        req.auth = {
            userId: payload.sub,
            role: payload.role
        }
        return next()
    } catch {
        return next(
            new AppError({
                statusCode: 401,
                code: 'AUTH_REQUIRED',
                message: 'Autenticación Requerida'
            })
        )
    }
}

```

user.controller.js
``` js 
import { AppError } from "../../shared/errors/app.error.js";
import * as userRepository from './user.repository.js'

export async function me(req, res) {
    const user = await userRepository.findById(req.auth.userId)
    if (!user) {
        throw new AppError({
            statusCode: 404,
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado'
        })
    }
    return res.status(200).json({
        sucess: true,
        data: user,
        meta: {
            requestId: req.id
        }
    })
}

```

user.routes
``` js 
import { Router } from "express";
import { me } from "./user.controller.js";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { authenticate } from "../../shared/middleware/authenticate.middleware.js";

const router = Router()

router.get('/me', authenticate, asyncHandler(me))

export default router

```

index.js
``` js 
import { Router } from 'express'

import healthRoutes from './../modules/health/health.routes.js'
import productRoutes from './../modules/products/product.routes.js'
import authRoutes from './../modules/auth/auth.routes.js'
import userRoutes from './../modules/users/user.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/products', productRoutes)

export default router

```
