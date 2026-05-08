import { useEffect } from 'react';
import { toast } from 'sonner';
import { useStore } from './store';

const CHANNEL_NAME = 'aqua_gel_notifications';

export const notifyStatusChange = (customerId: string, orderId: string, status: string) => {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({
    type: 'ORDER_STATUS_UPDATE',
    customerId,
    orderId,
    status
  });
  channel.close();
};

export function useCustomerNotifications() {
  const { session } = useStore();

  useEffect(() => {
    if (!session || session.role !== 'customer') return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    
    channel.onmessage = (event) => {
      const { type, customerId, orderId, status } = event.data;
      
      if (type === 'ORDER_STATUS_UPDATE' && customerId === session.id) {
        toast.success(`Order Update`, {
          description: `Your order #${orderId} is now: ${status}`,
          duration: 6000,
        });
      }
    };

    return () => {
      channel.close();
    };
  }, [session]);
}
