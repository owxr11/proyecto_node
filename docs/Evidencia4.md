# Evidencia 4

## Clase 31 de Agosto 2026

### Código Desarrollado 

#### Código Modificado 

error.middleware.js 
``` js 
    message: env.NODE_ENV === 'production' ?
```

index.js 
``` js
import productRoutes from './../modules/products/product.routes.js'

router.get('/product', productRoutes)
```

#### Código Nuevo 

product.service.js 
``` js 
import { AppError } from "../../shared/errors/app.error.js";
import * as productRepository from './product.repository.js'

export function listProducts(filters) {
    return productRepository.listProducts(filters)
}

export async function getProduct(id) {
    const product = await productRepository.findProductById(id)

    if (!product) {
        throw new AppError({
            statusCode: 404,
            code: 'Producto_no_encontrado',
            message: 'Producto no encontrado'
        })
    }
    return product
}

export async function createProduct(data) {
    const existingProduct = await productRepository.findProductBySku(data.sku)

    if (!existingProduct) {
        throw new AppError({
            statusCode: 409,
            code: 'Producto_con_sku_existente',
            message: 'Producto con sku existente'
        })
    }
    return productRepository.createProduct(data)
}

export async function updateProduct(id, changes) {
    const currentProduct = await getProduct(id)
    if (changes.sku && changes.sku != currentProduct.sku) {
        const product = await productRepository.findProductBySku(changes.sku)
        if (!product) {
            throw new AppError({
                statusCode: 404,
                code: 'Producto_con_sku_existente',
                message: 'Producto con sku existente'
            })
        }
    }
    return productRepository.upadateProduct(id, changes)
}

export async function deleteProduct(id) {
    await getProduct(id)
    await productRepository.deleteProduct(id)
}
```
product.controller.js 
``` js 
import * as productService from './product.service.js'

export async function listProducts(req, res) {
    const products = await productService.listProducts(req.validate.query)

    return res.status(200).json({
        success: true,
        data: products,
        meta: {
            count: products.length,
            requestId: req.id
        }
    })
}

export async function getProducts(req, res) {
    const products = await productService.getProduct(req.validate.body)

    return res.status(200).json({
        success: true,
        data: products,
        meta: {
            requestId: req.id
        }
    })
}

export async function createProducts(req, res) {
    const products = await productService.createProduct(req.validate.body)

    return res.status(200).json({
        success: true,
        data: products,
        meta: {
            requestId: req.id
        }
    })
}

export async function updateProducts(req, res) {
    const products = await productService.updateProduct(req.validate.params.id, req.validate.body)

    return res.status(200).json({
        success: true,
        data: products,
        meta: {
            requestId: req.id
        }
    })
}

export async function deleteProducts(req, res) {
    await productService.deleteProduct(req.validate.params.id)
    return res.status(204)
}
```

product.routes.js
``` js 
import { Router } from 'express'
import { createProducts, deleteProducts, getProducts, listProducts, updateProducts } from './product.controller.js'
import { createProductSchema, listProductsSchema, productIdSchema, updateProductSchema } from './product.schema.js'
import { asyncHandler } from '../../shared/middleware/async-handler.js'
import { validate } from '../../shared/middleware/validate.middleware.js'

const router = Router()

router.get('/', validate(listProductsSchema), asyncHandler(listProducts))
router.get('/:id', validate(productIdSchema), asyncHandler(getProducts))
router.post('/', validate(createProductSchema), asyncHandler(createProducts))
router.patch('/:id', validate(updateProductSchema), asyncHandler(updateProducts))
router.delete('/:id', validate(productIdSchema), asyncHandler(deleteProducts))

export default router
```
product.schema.js
``` js 
import { z } from 'zod'

const productBodySchema = z.object({
    name: z.string().trim().min(3).max(120),
    slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:[a-z0-9]+)*$/),
    description: z.string().trim().max(2000).default(''),
    price: z.number().finite().nonnegative(),
    stock: z.number().int().nonnegative(),
    category: z.string().trim().min(2).max(80),
    active: z.boolean().default(true)
})

const productIdParams = z.object({
    id: z.string().trim().min(1),
})

export const createProductSchema = z.object({
    body: productBodySchema,
    params: z.object({}),
    query: z.object({})
})

export const productIdSchema = z.object({
    body: z.object({}),
    params: productIdParams,
    query: z.object({})
})

export const updateProductSchema = z.object({
    body: productBodySchema.partial().refine((body) => {
        Object.keys(body).length > 0, {
            message: 'Se requiere mínimo un campo '
        }
    }),
    params: productIdParams,
    quey: z.object({})
})

export const listProductsSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        active: z.enum(['true', 'false']).optional().transform((value) => {
            value === undefined ? undefined : value === 'true'
        })
    })
})
```

product.repository.js 
``` js 
import { db } from '../../config/firebase.js'
import { FieldValue } from 'firebase-admin/firestore'

const productsColletion = db.collection('products')

function mapProduct(document) {
    if (!document.exists) {
        return null
    }
    const data = document.data()

    return {
        id: document.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toIOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toIOString() ?? null
    }
}

export async function createProduct(data) {
    const productRef = productsColletion.doc()

    await productRef.set({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    })

    const created = await productRef.get()

    return mapProduct(created)
}

export async function findProductById(id) {
    const product = await productsColletion.doc(id).get()
    return mapProduct(product)
}

export async function listProducts({ limit, active }) {
    let query = productsColletion.orderBy('createdAt', 'desc').limit(limit)

    if (active !== undefined) {
        query = productsColletion.where('active', '===', active).orderBy('createdAt', 'desc').limit(limit)
    }
    const products = await query.get()
    return products.docs.map(mapProduct)
}

export async function upadateProduct(id, data) {
    const productToUpadate = productsColletion.doc(id)
    await productToUpadate.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp()
    })
    const product = await productToUpadate.get()
    return mapProduct(product)
}

export async function deleteProduct(id) {
    await productsColletion.doc(id).delete()
}

export async function findProductBySku(sku) {
    const product = await productsColletion.where('sku', '==', sku).limit(1).get()

    if (product.empty) {
        return null
    }

    return mapProduct(product.docs[0])
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
