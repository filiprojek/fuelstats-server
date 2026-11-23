import { Router } from "express";
import * as rootController from "../controllers/rootController";
import handleValidation from "../middlewares/handleValidation";
import rootValidator from "../validators/rootValidator";

export const router = Router();
const mws = [handleValidation.handleValidationError];

router.get("/", rootValidator.checkRootGet(), mws, rootController.root_get);
