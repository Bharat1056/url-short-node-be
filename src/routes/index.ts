import { Router } from 'express';
import {
  createLink,
  getLinks,
  getLinkStats,
  deleteLink,
  redirectLink,
} from '../controllers/linkController';

const router = Router();

router.post('/links', createLink);
router.get('/links', getLinks);
router.get('/links/:code', getLinkStats);
router.delete('/links/:code', deleteLink);
router.get('/:code', redirectLink);

export default router;
