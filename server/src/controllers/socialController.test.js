const SocialController = require('./socialController');
const SocialService = require('../services/socialService');

// Mock the service
jest.mock('../services/socialService');

describe('SocialController', () => {
  let socialController;
  let mockSocialService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock service instance
    mockSocialService = new SocialService();
    
    // Create controller instance
    socialController = new SocialController();
    socialController.socialService = mockSocialService;

    // Mock request and response objects
    mockReq = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('getFriends', () => {
    it('should return friends list successfully', async () => {
      const mockFriends = [
        { id: 2, displayName: 'John Doe', totalCoins: 5000 }
      ];

      mockSocialService.getUserFriends.mockResolvedValue(mockFriends);

      await socialController.getFriends(mockReq, mockRes, mockNext);

      expect(mockSocialService.getUserFriends).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          friends: mockFriends,
          count: 1
        }
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockSocialService.getUserFriends.mockRejectedValue(error);

      await socialController.getFriends(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendGift', () => {
    beforeEach(() => {
      mockReq.body = {
        receiverId: 2,
        amount: 100,
        message: 'Test gift'
      };
    });

    it('should send gift successfully', async () => {
      const mockResult = {
        gift: { id: 1, amount: 100 },
        remainingGifts: 4
      };

      mockSocialService.sendGift.mockResolvedValue(mockResult);

      await socialController.sendGift(mockReq, mockRes, mockNext);

      expect(mockSocialService.sendGift).toHaveBeenCalledWith(1, 2, 100, 'Test gift');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Insufficient coins');
      mockSocialService.sendGift.mockRejectedValue(error);

      await socialController.sendGift(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('claimGift', () => {
    beforeEach(() => {
      mockReq.params = { giftId: '1' };
    });

    it('should claim gift successfully', async () => {
      const mockResult = {
        gift: { id: 1, amount: 100 },
        coinsReceived: 100
      };

      mockSocialService.claimGift.mockResolvedValue(mockResult);

      await socialController.claimGift(mockReq, mockRes, mockNext);

      expect(mockSocialService.claimGift).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Gift not found');
      mockSocialService.claimGift.mockRejectedValue(error);

      await socialController.claimGift(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('importTelegramFriends', () => {
    beforeEach(() => {
      mockReq.body = {
        telegramFriends: [
          { id: 123456789, first_name: 'John', username: 'john_doe' }
        ]
      };
    });

    it('should import friends successfully', async () => {
      const mockResult = {
        imported: 1,
        existing: 0,
        notFound: 0,
        errors: []
      };

      mockSocialService.importTelegramFriends.mockResolvedValue(mockResult);

      await socialController.importTelegramFriends(mockReq, mockRes, mockNext);

      expect(mockSocialService.importTelegramFriends).toHaveBeenCalledWith(1, mockReq.body.telegramFriends);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should return error for invalid telegram friends data', async () => {
      mockReq.body.telegramFriends = 'invalid';

      await socialController.importTelegramFriends(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid telegram friends data',
        code: 'INVALID_FRIENDS_DATA'
      });
    });
  });

  describe('addFriend', () => {
    beforeEach(() => {
      mockReq.body = { friendId: 2 };
    });

    it('should add friend successfully', async () => {
      const mockResult = {
        success: true,
        friend: { id: 2, displayName: 'Jane Doe' }
      };

      mockSocialService.addFriend.mockResolvedValue(mockResult);

      await socialController.addFriend(mockReq, mockRes, mockNext);

      expect(mockSocialService.addFriend).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('removeFriend', () => {
    beforeEach(() => {
      mockReq.params = { friendId: '2' };
    });

    it('should remove friend successfully', async () => {
      const mockResult = { success: true };

      mockSocialService.removeFriend.mockResolvedValue(mockResult);

      await socialController.removeFriend(mockReq, mockRes, mockNext);

      expect(mockSocialService.removeFriend).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getSocialStats', () => {
    it('should return social stats successfully', async () => {
      const mockStats = {
        friendsCount: 5,
        giftsSent: 10,
        giftsReceived: 8,
        totalCoinsGifted: 1000,
        totalCoinsReceived: 800
      };

      mockSocialService.getUserSocialStats.mockResolvedValue(mockStats);

      await socialController.getSocialStats(mockReq, mockRes, mockNext);

      expect(mockSocialService.getUserSocialStats).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getFriendsLeaderboard', () => {
    beforeEach(() => {
      mockReq.query = { limit: '10' };
    });

    it('should return friends leaderboard successfully', async () => {
      const mockLeaderboard = [
        { rank: 1, id: 2, displayName: 'John Doe', totalCoins: 10000 }
      ];

      mockSocialService.getFriendsLeaderboard.mockResolvedValue(mockLeaderboard);

      await socialController.getFriendsLeaderboard(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendsLeaderboard).toHaveBeenCalledWith(1, 10);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          leaderboard: mockLeaderboard,
          count: 1
        }
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = {};
      mockSocialService.getFriendsLeaderboard.mockResolvedValue([]);

      await socialController.getFriendsLeaderboard(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendsLeaderboard).toHaveBeenCalledWith(1, 50);
    });
  });

  describe('validateGiftSending', () => {
    beforeEach(() => {
      mockReq.params = { receiverId: '2' };
    });

    it('should return validation result successfully', async () => {
      const mockValidation = {
        canSend: true,
        remainingGifts: 3
      };

      mockSocialService.validateGiftSending.mockResolvedValue(mockValidation);

      await socialController.validateGiftSending(mockReq, mockRes, mockNext);

      expect(mockSocialService.validateGiftSending).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidation
      });
    });
  });

  describe('getReceivedGifts', () => {
    it('should return received gifts successfully', async () => {
      const mockGifts = [
        { id: 1, senderName: 'John Doe', amount: 100 }
      ];

      mockSocialService.getReceivedGifts.mockResolvedValue(mockGifts);

      await socialController.getReceivedGifts(mockReq, mockRes, mockNext);

      expect(mockSocialService.getReceivedGifts).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          gifts: mockGifts,
          count: 1
        }
      });
    });
  });

  describe('getFriendActivity', () => {
    beforeEach(() => {
      mockReq.query = { limit: '15' };
    });

    it('should return friend activity successfully', async () => {
      const mockActivities = [
        { activity_type: 'achievement', friend_id: 2, achievement_name: 'First Million' }
      ];

      mockSocialService.getFriendActivityFeed.mockResolvedValue(mockActivities);

      await socialController.getFriendActivity(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendActivityFeed).toHaveBeenCalledWith(1, 15);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          activities: mockActivities,
          count: 1
        }
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = {};
      mockSocialService.getFriendActivityFeed.mockResolvedValue([]);

      await socialController.getFriendActivity(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendActivityFeed).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('getFriendSuggestions', () => {
    beforeEach(() => {
      mockReq.query = { limit: '5' };
    });

    it('should return friend suggestions successfully', async () => {
      const mockSuggestions = [
        { id: 3, displayName: 'Alice Smith', mutualFriends: 2 }
      ];

      mockSocialService.getFriendSuggestions.mockResolvedValue(mockSuggestions);

      await socialController.getFriendSuggestions(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendSuggestions).toHaveBeenCalledWith(1, 5);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          suggestions: mockSuggestions,
          count: 1
        }
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = {};
      mockSocialService.getFriendSuggestions.mockResolvedValue([]);

      await socialController.getFriendSuggestions(mockReq, mockRes, mockNext);

      expect(mockSocialService.getFriendSuggestions).toHaveBeenCalledWith(1, 10);
    });
  });
});