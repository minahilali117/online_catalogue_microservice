
# Online Catalog - 3 Microservices Local Setup

This project runs as a local microservices system with one frontend and three backend microservices. It now includes product CRUD, cart + checkout, order details with line items, and order lifecycle history.

## Architecture

### Services
1. Frontend UI (React): port 3000
2. Catalog Management (products + CRUD): port 8081
3. Customer Support (customers + aggregation): port 8082
4. Order Processing (checkout + status lifecycle): port 8083

### Data Stores
1. Catalog service uses SQLite file database: `backend/catalog-management/catalog.sqlite`
2. Customer support uses SQLite file database: `backend/customer-support/db/development.sqlite`
3. Order processing uses SQLite file database: `backend/order-processing/db/development.sqlite`

## New Functionality Added

1. Real cart flow in frontend (add item, adjust quantity, checkout)
2. Checkout endpoint that creates orders and order items
3. Order status lifecycle endpoint (`pending`, `processing`, `shipped`, `completed`, `cancelled`)
4. Order status history endpoint and UI viewer
5. Product CRUD API and UI management in catalog service
6. Customer CRUD API and order summary endpoint in customer-support service

## Ports

1. Frontend: `http://localhost:3000`
2. Catalog service: `http://localhost:8081`
3. Customer-support service: `http://localhost:8082`
4. Order-processing service: `http://localhost:8083`

## Local Setup

### Prerequisites
1. Node.js 22+
2. npm
3. Windows PowerShell (for helper scripts)

### Install Dependencies

Run these once:

```powershell
cd online_catalog/backend/catalog-management
npm install

cd ../customer-support
npm install

cd ../order-processing
npm install

cd ../../frontend
npm install
```

### Apply Order DB Migrations

```powershell
cd online_catalog/backend/order-processing
npx dotenv sequelize db:migrate
```

## Run Commands

### Run Everything in One Command

From `online_catalog`:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

This starts all 4 local processes in background and prints active listeners.

### Stop Everything in One Command

From `online_catalog`:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-all.ps1
```

### Run Manually (Separate Terminals)

1. Catalog management

```powershell
cd online_catalog/backend/catalog-management
npm start
```

2. Customer support

```powershell
cd online_catalog/backend/customer-support
npm run start:development
```

3. Order processing

```powershell
cd online_catalog/backend/order-processing
npm run start:development
```

4. Frontend

```powershell
cd online_catalog/frontend
npm start
```

## Core API Endpoints

### Catalog Management (8081)
1. `GET /products`
2. `GET /products/:id`
3. `POST /products`
4. `PUT /products/:id`
5. `DELETE /products/:id`

### Customer Support (8082)
1. `GET /customers`
2. `GET /customers/:id`
3. `POST /customers`
4. `PUT /customers/:id`
5. `DELETE /customers/:id`
6. `GET /customers/:id/order-summary`

### Order Processing (8083)
1. `GET /orders`
2. `GET /orders/:customerId`
3. `GET /orders/by-id/:orderId`
4. `POST /checkout`
5. `PATCH /orders/:orderId/status`
6. `GET /orders/:orderId/status-history`

## Frontend Feature Checklist

1. Product cards with add-to-cart
2. Product create/update/delete form
3. Customer list with customer ID visibility
4. Customer create form
5. Checkout panel with customer ID input
6. Order status update panel
7. Status history panel
8. Order details panel with line items

## Troubleshooting

### Port Already in Use

```powershell
Get-NetTCPConnection -LocalPort 3000,8081,8082,8083 -State Listen
```

Then stop by process id:

```powershell
Stop-Process -Id <PID> -Force
```

### Frontend White Screen

1. Ensure all backends are running on `8081/8082/8083`
2. Hard refresh browser with Ctrl+F5
3. Check browser console errors

### Migration Errors

Re-run migrations in order-processing:

```powershell
cd online_catalog/backend/order-processing
npx dotenv sequelize db:migrate
```

## Notes

This README reflects the current local architecture in this repository (3 backend microservices + frontend) and replaces older consolidated-service instructions.

## License

ISC
