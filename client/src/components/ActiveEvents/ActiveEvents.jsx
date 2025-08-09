import React from 'react';
import EventCountdown from '../EventCountdown/EventCountdown';
import EventUpgrades from '../EventUpgrades/EventUpgrades';
import './ActiveEvents.css';

const ActiveEvents = ({ 
  activeEvents, 
  userCoins, 
  onEventEnd, 
  onUpgradePurchase,
  isExpanded = false,
  onToggleExpanded 
}) => {
  if (!activeEvents || activeEvents.length === 0) {
    return null;
  }

  const weekendMultiplierEvents = activeEvents.filter(event => 
    event.type === 'weekend_multiplier'
  );
  
  const globalMultiplierEvents = activeEvents.filter(event => 
    event.type === 'global_multiplier'
  );
  
  const exclusiveUpgradeEvents = activeEvents.filter(event => 
    event.type === 'exclusive_upgrade'
  );

  const getTotalMultiplier = () => {
    let multiplier = 1.0;
    activeEvents.forEach(event => {
      if (event.type === 'weekend_multiplier' || event.type === 'global_multiplier') {
        multiplier *= parseFloat(event.multiplier);
      }
    });
    return multiplier;
  };

  const totalMultiplier = getTotalMultiplier();

  return (
    <div className={`active-events ${isExpanded ? 'expanded' : ''}`}>
      <div className="active-events-header" onClick={onToggleExpanded}>
        <div className="events-summary">
          <span className="events-icon">🎉</span>
          <div className="events-info">
            <h3>Active Events ({activeEvents.length})</h3>
            {totalMultiplier > 1 && (
              <span className="total-multiplier">
                {totalMultiplier.toFixed(1)}x Coins Active!
              </span>
            )}
          </div>
        </div>
        <button className="expand-toggle">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="active-events-content">
          {/* Weekend/Global Multiplier Events */}
          {(weekendMultiplierEvents.length > 0 || globalMultiplierEvents.length > 0) && (
            <div className="multiplier-events">
              <h4>🚀 Active Multipliers</h4>
              {weekendMultiplierEvents.map(event => (
                <EventCountdown
                  key={event.id}
                  event={event}
                  onEventEnd={onEventEnd}
                />
              ))}
              {globalMultiplierEvents.map(event => (
                <EventCountdown
                  key={event.id}
                  event={event}
                  onEventEnd={onEventEnd}
                />
              ))}
            </div>
          )}

          {/* Exclusive Upgrade Events */}
          {exclusiveUpgradeEvents.length > 0 && (
            <div className="upgrade-events">
              <h4>🎁 Exclusive Upgrades</h4>
              {exclusiveUpgradeEvents.map(event => (
                <div key={event.id} className="upgrade-event">
                  <EventCountdown
                    event={event}
                    onEventEnd={onEventEnd}
                  />
                  <EventUpgrades
                    event={event}
                    userCoins={userCoins}
                    onUpgradePurchase={onUpgradePurchase}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Event Tips */}
          <div className="event-tips">
            <h4>💡 Event Tips</h4>
            <ul>
              {totalMultiplier > 1 && (
                <li>Your coins are multiplied by {totalMultiplier.toFixed(1)}x during active events!</li>
              )}
              {exclusiveUpgradeEvents.length > 0 && (
                <li>Exclusive upgrades are only available during events - don't miss out!</li>
              )}
              <li>Events can stack - multiple multipliers combine for maximum earnings!</li>
              <li>Check back regularly for new limited-time events.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveEvents;