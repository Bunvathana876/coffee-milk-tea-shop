import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth.js';
import { validId } from '../utils/adminCatalogValidation.js';
import {
  listCustomerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeCustomerStream,
} from '../utils/notificationHub.js';

const router = Router();
router.use(authenticateCustomer);

// GET /api/notifications — list authenticated customer's notifications
router.get(['/', ''], async (req, res, next) => {
  try {
    const rawUnread = req.query.unread_only;
    if (
      rawUnread !== undefined &&
      !['true', 'false', '1', '0'].includes(String(rawUnread).toLowerCase())
    ) {
      return res.status(400).json({ detail: 'Invalid unread_only query parameter.' });
    }
    const unreadOnly = ['true', '1'].includes(String(rawUnread || '').toLowerCase());
    const result = await listCustomerNotifications(req.customer.id, {
      unreadOnly,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/stream — real-time SSE stream for authenticated customer
router.get('/stream', (req, res) => {
  subscribeCustomerStream(req.customer.id, req, res);
});

// PATCH /api/notifications/read-all — mark all unread notifications as read
router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await markAllNotificationsRead(req.customer.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — mark a single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ detail: 'Invalid notification ID.' });
    }
    const result = await markNotificationRead(req.customer.id, Number(req.params.id));
    if (!result) {
      return res.status(404).json({ detail: 'Notification not found.' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
