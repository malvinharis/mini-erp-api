# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.4](https://github.com/malvinharis/mini-erp-api/compare/v0.1.3...v0.1.4) (2026-08-05)

## [0.1.3](https://github.com/malvinharis/mini-erp-api/compare/v0.1.2...v0.1.3) (2026-08-05)

## [0.1.2](https://github.com/malvinharis/mini-erp-api/compare/v0.1.1...v0.1.2) (2026-08-05)

## 0.1.1 (2026-08-04)


### Features

* add production Docker deployment config ([7142988](https://github.com/malvinharis/mini-erp-api/commit/7142988a5227a2b3850ff4f6c75ba0eed754351d))
* **api:** split into gateway + auth + users microservices ([cb024a6](https://github.com/malvinharis/mini-erp-api/commit/cb024a67aca766843e27a72ee9c9e3b4ddd8371a))
* **audit:** record createdBy and updatedBy on customers and invoices ([74df936](https://github.com/malvinharis/mini-erp-api/commit/74df93692839ae6ae6cf9c54911a74192b701f76))
* **customers:** add customer CRUD module ([aad88b3](https://github.com/malvinharis/mini-erp-api/commit/aad88b3c153d3eb1977324e0a27aca455f625d47))
* **dashboard:** add summary aggregation endpoint ([9b3bc2f](https://github.com/malvinharis/mini-erp-api/commit/9b3bc2f6c81b15e7e0d194389d31390d3ffe42a6))
* initial project setup ([f972750](https://github.com/malvinharis/mini-erp-api/commit/f972750150119f6a188e9d454d36bb5600233a04))
* **invoices:** add invoice CRUD module ([674811f](https://github.com/malvinharis/mini-erp-api/commit/674811f75bdd8ff756879595fed967b4faf06f8d))
* **services:** add core-svc for customers, invoices, and dashboard ([df62ae2](https://github.com/malvinharis/mini-erp-api/commit/df62ae2a302b943efa043bd87f56ff4d78879207))
* **users:** add RBAC user management, remove example module ([7fda3d8](https://github.com/malvinharis/mini-erp-api/commit/7fda3d81b03a44532c93b424a3c39ad8ec41159f))


### Bug Fixes

* **users:** exclude soft-deleted users from the list ([a16c158](https://github.com/malvinharis/mini-erp-api/commit/a16c158fd00b806854835c6bec1a785790ce5af9))


### Refactoring

* **prisma:** split schema per module into prisma/schema/ ([2a3195e](https://github.com/malvinharis/mini-erp-api/commit/2a3195e3cd443603c3f5bd10ffc148d3ef101ec7))
