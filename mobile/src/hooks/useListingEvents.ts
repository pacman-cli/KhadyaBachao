import {useEffect, useRef} from 'react';
import {
  ensureConnected,
  subscribeWhenConnected,
  type ListingEvent,
} from '../api/wsClient';

/**
 * Subscribes to live listing events over STOMP WebSocket.
 * - pass a listingId to receive that listing's events
 * - omit it to receive global discover-feed events
 */
export function useListingEvents(
  onEvent: (event: ListingEvent) => void,
  listingId?: string,
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    ensureConnected();
    const destination = listingId
      ? `/topic/listing/${listingId}`
      : '/topic/discover';

    return subscribeWhenConnected(destination, body => {
      try {
        handlerRef.current(JSON.parse(body) as ListingEvent);
      } catch {
        // ignore malformed frames
      }
    });
  }, [listingId]);
}
