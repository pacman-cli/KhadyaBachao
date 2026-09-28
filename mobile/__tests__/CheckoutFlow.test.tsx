import { claimListing } from '../src/api/requests';
import { api } from '../src/api/client';

jest.mock('../src/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('iOS Checkout / Claim Flow', () => {
  const mockListingId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Claim Success Flow: Recipient successfully claims available surplus food', async () => {
    const mockResponse = {
      data: {
        id: 'claim-111',
        listingId: mockListingId,
        status: 'ACCEPTED',
        createdAt: new Date().toISOString(),
      },
    };
    (api.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await claimListing(mockListingId);

    expect(api.post).toHaveBeenCalledWith(`/api/listings/${mockListingId}/claim`);
    expect(result.status).toBe('ACCEPTED');
  });

  test('Race Condition Failure (409 Conflict): Listing claimed by another user simultaneously', async () => {
    const mockError = {
      response: {
        status: 409,
        data: {
          detail: 'Listing is no longer available',
        },
      },
    };
    (api.post as jest.Mock).mockRejectedValueOnce(mockError);

    await expect(claimListing(mockListingId)).rejects.toMatchObject({
      response: {
        status: 409,
        data: {
          detail: 'Listing is no longer available',
        },
      },
    });
  });

  test('Authorization Failure (403 Forbidden): Donors forbidden from claiming food', async () => {
    const mockError = {
      response: {
        status: 403,
        data: {
          detail: 'Only recipients and volunteers can claim listings',
        },
      },
    };
    (api.post as jest.Mock).mockRejectedValueOnce(mockError);

    await expect(claimListing(mockListingId)).rejects.toMatchObject({
      response: {
        status: 403,
        data: {
          detail: 'Only recipients and volunteers can claim listings',
        },
      },
    });
  });

  test('Expired Deadline Failure (400 Bad Request): Listing pickup deadline passed', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          detail: 'Listing has expired',
        },
      },
    };
    (api.post as jest.Mock).mockRejectedValueOnce(mockError);

    await expect(claimListing(mockListingId)).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          detail: 'Listing has expired',
        },
      },
    });
  });
});
