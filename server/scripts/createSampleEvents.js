const EventService = require('../src/services/eventService');

async function createSampleEvents() {
  const eventService = new EventService();
  
  try {
    console.log('Creating sample events...');
    
    // Create a weekend multiplier event
    const weekendEvent = await eventService.createEvent({
      name: 'Weekend Boost',
      description: 'Double coins for the entire weekend!',
      type: 'weekend_multiplier',
      start_time: new Date(),
      end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      multiplier: 2.0,
      config: {
        recurring: true,
        recurrence_pattern: 'weekly'
      }
    });
    
    console.log('Created weekend event:', weekendEvent.name);
    
    // Create a global multiplier event
    const globalEvent = await eventService.createEvent({
      name: 'Holiday Celebration',
      description: 'Special holiday event with 3x coin multiplier!',
      type: 'global_multiplier',
      start_time: new Date(Date.now() + 60000), // 1 minute from now
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      multiplier: 3.0,
      config: {
        theme: 'holiday',
        special_effects: true
      }
    });
    
    console.log('Created global event:', globalEvent.name);
    
    // Create an exclusive upgrade event
    const upgradeEvent = await eventService.createEvent({
      name: 'Power-Up Paradise',
      description: 'Exclusive upgrades available for a limited time!',
      type: 'exclusive_upgrade',
      start_time: new Date(Date.now() + 2 * 60000), // 2 minutes from now
      end_time: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      multiplier: 1.0,
      config: {
        exclusive_upgrades: true,
        max_purchases: 5
      }
    });
    
    console.log('Created upgrade event:', upgradeEvent.name);
    
    console.log('Sample events created successfully!');
    
  } catch (error) {
    console.error('Error creating sample events:', error);
  } finally {
    eventService.stopEventMonitoring();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  createSampleEvents();
}

module.exports = createSampleEvents;