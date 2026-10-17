import { Router } from "express";
import AuthController from "../controllers/AuthController";
import OidcController from "../controllers/OidcController";
import { requireAuth } from "../middlewares/AuthMiddleware";

const router = Router();

// Public auth endpoints
router.post("/signup", AuthController.signup);
router.post("/signin", AuthController.signin);
router.post("/signout", AuthController.signout);

// Single sign-on (OpenID Connect)
router.get("/providers", OidcController.providers);
router.get("/oidc/:provider/start", OidcController.start);
router.get("/oidc/:provider/callback", OidcController.callback);
router.post("/oidc/:provider/link", requireAuth, OidcController.link);

export default router;
