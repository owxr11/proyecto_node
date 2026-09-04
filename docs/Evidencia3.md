# Evidencia 3

## Clase 27 de Agosto 2026

### Codigo Desarollado 

#### Codigo Modificado 
env.js
``` js 
export const env = Object.freeze({
    NODE_ENV: process.env.NODE_ENV,
    PORT: port,
    API_PREFIX: process.env.API_PREFIX,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    FIREBAE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
})

if (!env.FIREBAE_PROJECT_ID) {
    throw new Error('Falta la variable de entornO FIREBASE_PROJECT_ID')
}
```

error.midddleware.js
``` js 
import { env } from '../../config/env.js'
import { AppError } from '../errors/app.error.js'


export function errorMiddleware(err, req, res, _next) {
    if (err instanceof AppError) {
        logger.warm({
            code: err.code,
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            details: err.details
        }, err.message)
        return res.status(err.statusCode)
            .json({
                succes: false,
                error: {
                    code: err.code,
                    message: err.message,
                    ...(err.details ? { details: err.details } : {})
                },
                meta: {
                    requestId: req.id
                }
            })
    }
```

#### Codigo Nuevo
firebase.js 
``` js
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from './env.js'

const firebaseApp = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: applicationDefault(),
        projectId: env.FIREBAE_PROJECT_ID
    })

export const db = getFirestore(firebaseApp)
```

app.error.js 
``` js 
export class AppError extends Error {
    constructor({
        statusCode,
        code,
        message,
        details
    }) {
        super(message)
        this.name = 'AppError'
        this.statusCode = statusCode
        this.code = code
        this.datails = details
    }
}
```

async-handler.js
``` js 
export function asyncHandler(handler) {
    return function wrapperHandler(
        req,
        res,
        next
    ) {
        Promise.resolve(
            handler(req, res, next)
        ).catch(next)
    }
}
```

validate.middleware.js 
``` js 
import { ZodError } from 'zod'
import { AppError } from '../errors/app.error.js'

export function validate(schema) {
    return function validationMiddleware(
        req, _res, next
    ) {
        try {
            const result = schema.parse({
                body: req.body,
                params: req.params,
                query: req.query
            })
            req.validated = result
            next()
        } catch (error) {
            if (error instanceof ZodError) {
                new AppError({
                    statusCode: 400,
                    code: 'VALIDATION_ERROR',
                    datails: error.issues
                })
            }
        }
    }
}
```

#### Estructura Actual 
``` markdown
proyecto_node/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── health/
│   │       │   │   ├── health.controller.js
│   │       │   │   └── health.routes.js
│   │       │   └── products/
│   │       │       ├── product.controller.js
│   │       │       ├── product.repository.js
│   │       │       ├── product.routes.js
│   │       │       ├── product.schema.js
│   │       │       └── product.service.js
│   │       ├── routes/
│   │       │   └── index.js
│   │       ├── shared/
│   │       │   ├── errors/
│   │       │   │   └── app.error.js
│   │       │   └── middleware/
│   │       │       ├── async-handler.js
│   │       │       ├── error.middleware.js
│   │       │       ├── not-found.middleware.js
│   │       │       └── validate.middleware.js
│   │       ├── app.js
│   │       └── server.js
│   │   ├── .env
│   │   ├── eslint.config.js
│   │   └── package.json
│   └── web/
├── docs/
├── node_modules/
├── packages/
├── .editorconfig
├── .gitignore
├── .nvmrc
├── package-lock.json
└── package.json
```
