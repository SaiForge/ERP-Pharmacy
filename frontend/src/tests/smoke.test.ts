/**
 * Frontend Component and Store Smoke Tests
 */
import { useAuthStore } from '../store/authStore';

describe('HPMS Frontend Smoke Suite', () => {
  it('initializes auth store with null user and logged out state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('sets and removes auth tokens correctly', () => {
    const dummyUser = {
      id: 1,
      full_name: 'Dr. Test Pharmacist',
      email: 'test@hpms.hospital',
      role: 'PHARMACIST' as const,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(dummyUser, 'mock_token_123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('test@hpms.hospital');

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
