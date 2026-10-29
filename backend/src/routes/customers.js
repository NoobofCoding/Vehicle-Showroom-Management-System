import { Router } from "express"

import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../controllers/customers.js"

const router = Router()

router.route("/").get(listCustomers).post(createCustomer)

router
  .route("/:id")
  .get(getCustomer)
  .patch(updateCustomer)
  .delete(archiveCustomer)

export default router
