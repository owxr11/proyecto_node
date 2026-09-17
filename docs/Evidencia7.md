# Evidencia 6

## Clase 14 de Septiembre del 2026

### Código Desarrollado 

Se agrego la carpeta web, proporcionada por el profesor la cual tiene la siguiente estrucutra 
``` markdown
web/
├── .nuxt/
├── assets/
│   └── css/
│       └── main.css
├── components/
│   ├── AdminProductForm.vue
│   ├── AppHeader.vue
│   ├── EmptyState.vue
│   └── ProductCard.vue
├── composables/
│   └── useApi.ts
├── middleware/
│   ├── admin.ts
│   └── auth.ts
├── node_modules/
├── pages/
│   ├── admin/
│   ├── orders/
│   ├── cart.vue
│   ├── index.vue
│   ├── login.vue
│   └── register.vue
├── stores/
│   ├── auth.ts
│   ├── cart.ts
│   ├── catalog.ts
│   └── orders.ts
├── tests/
│   └── e2e/
│       └── home.spec.ts
├── types/
│   └── api.ts
├── .env
├── .env.example
├── app.vue
├── eslint.config.mjs
├── nuxt.config.ts
├── package.json
├── playwright.config.ts
└── tsconfig.json
```


permissions.js 
``` js 
export const permissionByRole =
    Object.freeze({
        CUSTOMER: new Set([
            'products: read',
            'orders: create',
            'orders: read-own'
        ]),
        ADMIN: new Set([
            'products: read',
            'products: created',
            'products: update',
            'products: delete',
            'users: read',
            'orders: read',
            'orders: update'
        ]),
        SUPER_ADMIN: new Set([
            '*'
        ])
    })
```

authorize.middleware.js 
``` js
import { permissionByRole } from "../../config/permissions.js";
import { AppError } from '../errors/app.error.js'

export function authorize(permission) {
    return function auhorizationMiddleware(req, _res, next) {
        const role = req.auth?.role
        const permissions = permissionByRole[role]
        if (!permissions || (!permissions.has('*') && !permissions.has(permission))) {
            return next(new AppError({
                statusCode: 403,
                code: 'FORBIDDEN',
                message: 'No tiene permisos para realizar la operación'
            }))
        }
        return next
    }
}

```

product.routes.js 
``` js 
import { Router } from 'express'

import {
    createProduct,
    deleteProduct,
    getProduct,
    listProducts,
    updateProduct
} from './product.controller.js'

import {
    createProductSchema,
    deleteProductSchema,
    getProductSchema,
    listProductsSchema,
    updateProductSchema
} from './product.schema.js'

import { asyncHandler } from '../../shared/middleware/async-handler.js'
import { validate } from '../../shared/middleware/validate.middleware.js'
import { authorize } from '../../shared/middleware/authorize.middleware.js'
//import { authenticate } from '../../shared/middleware/authenticate.middleware.js'

const router = Router()

// Rutas Publicas
router.get(
    '/',
    validate(listProductsSchema),
    asyncHandler(listProducts)
)

router.get(
    '/:id',
    validate(getProductSchema),
    asyncHandler(getProduct)
)

// Rutas Administrativas
router.post(
    '/',
    authorize('products: create'),
    validate(createProductSchema),
    asyncHandler(createProduct)
)

router.patch(
    '/:id',
    authorize('products: update'),
    validate(updateProductSchema),
    asyncHandler(updateProduct)
)

router.delete(
    '/:id',
    authorize('products: delete'),
    validate(deleteProductSchema),
    asyncHandler(deleteProduct)
)

export default router

```

promote-admin.js
``` js 
import {
    db
} from '../src/config/firebase.js'

const email =
    process.argv[2]

if (!email) {
    console.error(
        'Uso: node apps/api/scripts/promote-admin.js correo@dominio.com'
    )

    process.exit(1)
}

const snapshot =
    await db
        .collection('users')
        .where(
            'email',
            '==',
            email.toLowerCase()
        )
        .limit(1)
        .get()

if (snapshot.empty) {
    console.error(
        'Usuario no encontrado'
    )

    process.exit(1)
}

await snapshot.docs[0]
    .ref
    .update({
        role:
            'ADMIN'
    })

console.log(
    `Usuario ${email} promovido a ADMIN`
)

process.exit(0)

```
