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
