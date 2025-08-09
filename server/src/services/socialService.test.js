const SocialService = require('./socialService');
const SocialRepository = require('../repositories/SocialRepository');
const UserRepository = require('../repositories/UserRepository');
const { SOCIAL_LIMITS } = require('../../../shared/constants/gameConfig');

// Mock the repositories
jest.mock('../repositories/SocialRepository');
jest.mock('../repositories/UserRepository');

describe('SocialService', () => {
  let socialService;
  let mockSocialRepository;
  let mockUserRepository;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockSocialRepository = new SocialRepository();
    mockUserRepository = new UserRepository();
    
    // Create service instance
    socialService = new SocialService();
    socialService.socialRepository = mockSocialRepository;
    socialService.userRepository = mockUserRepository;
  });

  describe('getUserFriends', () => {
    it('should return formatted friends list', async () => {
      const mockFriends = [
        {
          id: 1,
          username: 'john_doe',
          first_name: 'John',
          last_name: 'Doe',
          total_coins_earned: 5000,
          prestige_level: 1,
          last_login: new Date(),
          activity_status: 'online',
          friendship_created: new Date()
        }
      ];

      mockSocialRepository.getUserFriends.mockResolvedValue(mockFriends);

      const result = await socialService.getUserFriends(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        username: 'john_doe',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        totalCoins: 5000,
        prestigeLevel: 1,
        activityStatus: 'online',
        canReceiveGift: true
      });
    });

    it('should handle empty friends list', async () => {
      mockSocialRepository.getUserFriends.mockResolvedValue([]);

      const result = await socialService.getUserFriends(1);

      expect(result).toEqual([]);
    });
  });

  describe('sendGift', () => {
    const mockSender = {
      id: 1,
      coins: 1000,
      is_active: true
    };

    const mockReceiver = {
      id: 2,
      is_active: true
    };

    beforeEach(() => {
      mockUserRepository.findById
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);
      mockSocialRepository.getDailyGiftCount.mockResolvedValue(0);
      mockSocialRepository.sendGift.mockResolvedValue({
        id: 1,
        sender_id: 1,
        receiver_id: 2,
        amount: 100
      });
      mockUserRepository.updateCoins.mockResolvedValue();
    });

    it('should send gift successfully', async () => {
      const result = await socialService.sendGift(1, 2, 100, 'Test message');

      expect(result).toMatchObject({
        gift: {
          id: 1,
          sender_id: 1,
          receiver_id: 2,
          amount: 100
        },
        remainingGifts: 4
      });

      expect(mockUserRepository.updateCoins).toHaveBeenCalledWith(1, -100);
    });

    it('should throw error if sender has insufficient coins', async () => {
      mockUserRepository.findById.mockReset();
      mockUserRepository.findById
        .mockResolvedValueOnce({ ...mockSender, coins: 50 })
        .mockResolvedValueOnce(mockReceiver);

      await expect(socialService.sendGift(1, 2, 100))
        .rejects.toThrow('Insufficient coins to send gift');
    });

    it('should throw error if receiver not found', async () => {
      mockUserRepository.findById.mockReset();
      mockUserRepository.findById
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(null);

      await expect(socialService.sendGift(1, 2, 100))
        .rejects.toThrow('Receiver not found or inactive');
    });

    it('should throw error if gift amount is invalid', async () => {
      mockUserRepository.findById.mockReset();
      mockUserRepository.findById
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      await expect(socialService.sendGift(1, 2, 5))
        .rejects.toThrow(`Gift amount must be between ${SOCIAL_LIMITS.MIN_GIFT_AMOUNT} and ${SOCIAL_LIMITS.MAX_GIFT_AMOUNT} coins`);

      mockUserRepository.findById.mockReset();
      mockUserRepository.findById
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockReceiver);

      await expect(socialService.sendGift(1, 2, 2000))
        .rejects.toThrow(`Gift amount must be between ${SOCIAL_LIMITS.MIN_GIFT_AMOUNT} and ${SOCIAL_LIMITS.MAX_GIFT_AMOUNT} coins`);
    });

    it('should throw error if daily gift limit reached', async () => {
      mockSocialRepository.getDailyGiftCount.mockResolvedValue(5);

      await expect(socialService.sendGift(1, 2, 100))
        .rejects.toThrow('Daily gift limit reached');
    });
  });

  describe('claimGift', () => {
    it('should claim gift successfully', async () => {
      const mockGift = {
        id: 1,
        amount: 100,
        receiver_id: 1
      };

      mockSocialRepository.claimGift.mockResolvedValue(mockGift);
      mockUserRepository.updateCoins.mockResolvedValue();

      const result = await socialService.claimGift(1, 1);

      expect(result).toMatchObject({
        gift: mockGift,
        coinsReceived: 100
      });

      expect(mockUserRepository.updateCoins).toHaveBeenCalledWith(1, 100);
    });

    it('should throw error if gift not found', async () => {
      mockSocialRepository.claimGift.mockResolvedValue(null);

      await expect(socialService.claimGift(1, 1))
        .rejects.toThrow('Gift not found, already claimed, or expired');
    });
  });

  describe('importTelegramFriends', () => {
    it('should import friends successfully', async () => {
      const telegramFriends = [
        { id: 123456789, first_name: 'John', username: 'john_doe' },
        { id: 987654321, first_name: 'Jane', username: 'jane_smith' }
      ];

      mockUserRepository.findByTelegramId
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 });

      mockSocialRepository.areFriends
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      mockSocialRepository.addFriend.mockResolvedValue();

      const result = await socialService.importTelegramFriends(1, telegramFriends);

      expect(result).toMatchObject({
        imported: 2,
        existing: 0,
        notFound: 0,
        errors: []
      });

      expect(mockSocialRepository.addFriend).toHaveBeenCalledTimes(4); // Bidirectional
    });

    it('should handle friends not found in game', async () => {
      const telegramFriends = [
        { id: 123456789, first_name: 'John', username: 'john_doe' }
      ];

      mockUserRepository.findByTelegramId.mockResolvedValue(null);

      const result = await socialService.importTelegramFriends(1, telegramFriends);

      expect(result).toMatchObject({
        imported: 0,
        existing: 0,
        notFound: 1,
        errors: []
      });
    });

    it('should handle existing friendships', async () => {
      const telegramFriends = [
        { id: 123456789, first_name: 'John', username: 'john_doe' }
      ];

      mockUserRepository.findByTelegramId.mockResolvedValue({ id: 2 });
      mockSocialRepository.areFriends.mockResolvedValue(true);

      const result = await socialService.importTelegramFriends(1, telegramFriends);

      expect(result).toMatchObject({
        imported: 0,
        existing: 1,
        notFound: 0,
        errors: []
      });
    });
  });

  describe('addFriend', () => {
    it('should add friend successfully', async () => {
      const mockFriend = {
        id: 2,
        username: 'jane_doe',
        first_name: 'Jane',
        last_name: 'Doe',
        total_coins_earned: 3000,
        is_active: true
      };

      mockUserRepository.findById.mockResolvedValue(mockFriend);
      mockSocialRepository.addFriend.mockResolvedValue();

      const result = await socialService.addFriend(1, 2);

      expect(result.success).toBe(true);
      expect(result.friend).toMatchObject({
        id: 2,
        username: 'jane_doe',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane Doe',
        totalCoins: 3000
      });

      expect(mockSocialRepository.addFriend).toHaveBeenCalledTimes(2); // Bidirectional
    });

    it('should throw error when adding self as friend', async () => {
      await expect(socialService.addFriend(1, 1))
        .rejects.toThrow('Cannot add yourself as a friend');
    });

    it('should throw error if friend not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(socialService.addFriend(1, 2))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('getDisplayName', () => {
    it('should return full name when available', () => {
      const user = {
        first_name: 'John',
        last_name: 'Doe',
        username: 'john_doe'
      };

      const result = socialService.getDisplayName(user);
      expect(result).toBe('John Doe');
    });

    it('should return first name only when last name not available', () => {
      const user = {
        first_name: 'John',
        username: 'john_doe'
      };

      const result = socialService.getDisplayName(user);
      expect(result).toBe('John');
    });

    it('should return username when names not available', () => {
      const user = {
        username: 'john_doe'
      };

      const result = socialService.getDisplayName(user);
      expect(result).toBe('@john_doe');
    });

    it('should return anonymous when no identifying info available', () => {
      const user = {};

      const result = socialService.getDisplayName(user);
      expect(result).toBe('Anonymous User');
    });
  });

  describe('validateGiftSending', () => {
    it('should return valid when all conditions met', async () => {
      mockSocialRepository.areFriends.mockResolvedValue(true);
      mockSocialRepository.getDailyGiftCount.mockResolvedValue(2);
      mockUserRepository.findById.mockResolvedValue({ id: 2, is_active: true });

      const result = await socialService.validateGiftSending(1, 2);

      expect(result).toMatchObject({
        canSend: true,
        remainingGifts: 3
      });
    });

    it('should return invalid when not friends', async () => {
      mockSocialRepository.areFriends.mockResolvedValue(false);

      const result = await socialService.validateGiftSending(1, 2);

      expect(result).toMatchObject({
        canSend: false,
        reason: 'Not friends'
      });
    });

    it('should return invalid when daily limit reached', async () => {
      mockSocialRepository.areFriends.mockResolvedValue(true);
      mockSocialRepository.getDailyGiftCount.mockResolvedValue(5);

      const result = await socialService.validateGiftSending(1, 2);

      expect(result).toMatchObject({
        canSend: false,
        reason: 'Daily limit reached'
      });
    });

    it('should return invalid when receiver inactive', async () => {
      mockSocialRepository.areFriends.mockResolvedValue(true);
      mockSocialRepository.getDailyGiftCount.mockResolvedValue(2);
      mockUserRepository.findById.mockResolvedValue({ id: 2, is_active: false });

      const result = await socialService.validateGiftSending(1, 2);

      expect(result).toMatchObject({
        canSend: false,
        reason: 'Receiver inactive'
      });
    });
  });
});