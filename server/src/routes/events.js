const express = require('express');
const EventController = require('../controllers/eventController');
const auth = require('../middleware/auth');

const router = express.Router();
const eventController = new EventController();

// Get all active events (public)
router.get('/active', eventController.getActiveEvents.bind(eventController));

// Get upcoming events (public)
router.get('/upcoming', eventController.getUpcomingEvents.bind(eventController));

// Get event details by ID (public)
router.get('/:eventId', eventController.getEventById.bind(eventController));

// Get user's event multipliers (authenticated)
router.get('/user/multipliers', auth, eventController.getUserEventMultipliers.bind(eventController));

// Purchase event upgrade (authenticated)
router.post('/upgrade/purchase', auth, eventController.purchaseEventUpgrade.bind(eventController));

// Create new event (admin only - would need admin middleware)
router.post('/', auth, eventController.createEvent.bind(eventController));

module.exports = router;