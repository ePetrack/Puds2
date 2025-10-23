import { pb } from '$lib/pocketbase';

// Initialize auth state on client load
if (pb) {
  pb.authStore.loadFromCookie(document.cookie);
}
