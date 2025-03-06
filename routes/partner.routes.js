import Router from "express";
import { multerUpload } from "../middlewares/multerService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { registerPartner,loginPartner, removePartner } from "../controllers/partner.controller.js";


const router=Router();

router.post("/registerPartner",multerUpload.fields([
    {
        name:"imgUrl",
        maxCount:2
    }
]),registerPartner)

router.delete('/remove', authMiddleware, removePartner)


export default router;